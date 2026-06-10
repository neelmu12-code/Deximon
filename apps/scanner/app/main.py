from pathlib import Path
from typing import Annotated

import httpx
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status

from app.aws import detect_text_from_s3, upload_scan_image
from app.config import Settings, get_settings
from app.image_processing import ProcessedImage, preprocess_image
from app.schemas import ImageInfo, ScanResponse
from app.tcg import best_local_candidate, card_to_candidate, fuzzy_match, lookup_cards

app = FastAPI(title="Deximon Scanner", version="0.1.0")
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

    return ScanResponse(
        candidate=best_local_candidate(query),
        image=_image_info(processed),
        source="local_mock",
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

    query = " ".join(lines).strip() or settings.scanner_mock_default_query
    try:
        cards = lookup_cards(query, settings)
        card, confidence = fuzzy_match(query, cards)
        candidate = card_to_candidate(card, confidence)
    except (httpx.HTTPError, ValueError):
        candidate = best_local_candidate(query)

    return ScanResponse(
        candidate=candidate,
        image=_image_info(processed),
        source="aws_rekognition",
        ocr_text=lines,
        image_key=image_key,
    )
