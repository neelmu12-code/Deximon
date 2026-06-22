from typing import Annotated, Any, cast

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.core.config import Settings, get_settings

router = APIRouter(prefix="/scan", tags=["scanner"])
ImageUpload = Annotated[UploadFile, File(...)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
MockQuery = Annotated[str | None, Form()]


async def _forward_to_scanner(
    endpoint: str,
    file: UploadFile,
    settings: Settings,
    data: dict[str, str] | None = None,
) -> dict[str, object]:
    content = await file.read()
    files = {
        "file": (
            file.filename or "scan.jpg",
            content,
            file.content_type or "application/octet-stream",
        )
    }
    url = f"{settings.scanner_url.rstrip('/')}{endpoint}"

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, files=files, data=data)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Scanner service is unavailable.",
        ) from exc

    if response.status_code >= 400:
        detail: Any
        try:
            payload = response.json()
            detail = payload.get("detail", payload) if isinstance(payload, dict) else payload
        except ValueError:
            detail = response.text or "Scanner request failed."
        raise HTTPException(status_code=response.status_code, detail=detail)

    return cast(dict[str, object], response.json())


@router.post("/mock")
async def scan_mock_proxy(
    file: ImageUpload,
    settings: SettingsDep,
    q: MockQuery = None,
) -> dict[str, object]:
    data = {"q": q} if q else None
    return await _forward_to_scanner("/scan/mock", file, settings, data=data)


@router.post("")
async def scan_proxy(file: ImageUpload, settings: SettingsDep) -> dict[str, object]:
    return await _forward_to_scanner("/scan", file, settings)
