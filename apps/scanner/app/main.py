import re
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

import httpx
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status

from app.aws import detect_text_from_s3, upload_scan_image
from app.config import Settings, get_settings
from app.image_processing import ProcessedImage, preprocess_image
from app.schemas import ImageInfo, ScanResponse
from app.tcg import load_catalog, lookup_cards, top_catalog_candidates, top_local_candidates


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    catalog_count = len(load_catalog(get_settings()))
    if catalog_count:
        print(f"Loaded {catalog_count} Pokemon TCG cards from local catalog.")
    else:
        print("Pokemon TCG local catalog not found; scanner will use API/mock fallback.")
    yield


app = FastAPI(title="Deximon Scanner", version="0.1.0", lifespan=lifespan)
ImageUpload = Annotated[UploadFile, File(...)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
MockQuery = Annotated[str | None, Form()]


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "deximon-scanner", "version": "0.1.0"}


def _image_info(processed: ProcessedImage) -> ImageInfo:
    return ImageInfo(
        width=processed.width,
        height=processed.height,
        format=processed.format,
        mode=processed.mode,
        processed_bytes=len(processed.bytes),
    )


async def _read_image(file: UploadFile) -> bytes:
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        suffix = Path(file.filename or "").suffix.lower()
        if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Upload a jpg, jpeg, png, or webp image.",
            )
    return await file.read()


def _filename_query(filename: str | None) -> str:
    stem = Path(filename or "").stem
    normalized = re.sub(r"[^A-Za-z0-9]+", " ", stem).strip().lower()
    words = [
        word
        for word in normalized.split()
        if word not in {"card", "image", "img", "photo", "scan", "upload"}
        and not re.fullmatch(r"\d+x\d+", word)
    ]
    if not any(re.search(r"[a-z]", word) for word in words):
        return ""
    return " ".join(words[:8])


@app.post("/scan/mock", response_model=ScanResponse)
async def scan_mock(
    file: ImageUpload,
    settings: SettingsDep,
    q: MockQuery = None,
) -> ScanResponse:
    raw = await _read_image(file)
    try:
        processed = preprocess_image(raw)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    query = q or Path(file.filename or "").stem.replace("_", " ").replace("-", " ")
    if not query.strip():
        query = settings.scanner_mock_default_query

    catalog_cards = load_catalog(settings)
    source = "local_catalog" if catalog_cards else "local_mock"
    candidates = top_catalog_candidates(query, catalog_cards) if catalog_cards else top_local_candidates(query)
    return ScanResponse(
        candidate=candidates[0],
        candidates=candidates,
        image=_image_info(processed),
        source=source,
        ocr_text=[query],
    )


@app.post("/scan", response_model=ScanResponse)
async def scan_card(
    file: ImageUpload,
    settings: SettingsDep,
) -> ScanResponse:
    if not settings.aws_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AWS scanner is not configured. Use /scan/mock for local development.",
        )

    raw = await _read_image(file)
    try:
        processed = preprocess_image(raw)
        image_key = upload_scan_image(processed.bytes, settings, file.filename)
        lines = detect_text_from_s3(settings, image_key)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Scanner OCR provider failed.",
        ) from exc

    query_parts = [_filename_query(file.filename), *lines]
    query = "\n".join(part for part in query_parts if part).strip() or settings.scanner_mock_default_query
    catalog_cards = load_catalog(settings)
    if catalog_cards:
        candidates = top_catalog_candidates(query, catalog_cards)
        source = "aws_rekognition_local_catalog"
    else:
        source = "aws_rekognition_api"
        try:
            cards = lookup_cards(query, settings)
            candidates = top_catalog_candidates(query, cards)
        except (httpx.HTTPError, ValueError):
            candidates = top_local_candidates(query)
            source = "aws_rekognition_catalog_fallback"
    if not candidates:
        candidates = top_local_candidates(query)
        source = "aws_rekognition_catalog_fallback"

    return ScanResponse(
        candidate=candidates[0],
        candidates=candidates,
        image=_image_info(processed),
        source=source,
        ocr_text=lines,
        image_key=image_key,
    )
