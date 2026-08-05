import math
from datetime import UTC, datetime
from typing import Annotated, Any, cast

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.services.limits import DailyScanLimitError, reserve_daily_aws_scan

router = APIRouter(prefix="/scan", tags=["scanner"])
ImageUpload = Annotated[UploadFile, File(...)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
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
        timeout = httpx.Timeout(settings.scanner_timeout_seconds)
        async with httpx.AsyncClient(timeout=timeout) as client:
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
async def scan_proxy(
    file: ImageUpload,
    response: Response,
    _current_user: CurrentUser,
    db: DbSession,
    settings: SettingsDep,
) -> dict[str, object]:
    try:
        usage = reserve_daily_aws_scan(db, settings.daily_aws_scan_limit)
        db.commit()
    except DailyScanLimitError as exc:
        db.rollback()
        retry_after = max(
            1,
            math.ceil((exc.usage.reset_at - datetime.now(UTC)).total_seconds()),
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="The daily real-scan limit has been reached. Try again after 00:00 UTC.",
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(exc.usage.limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(exc.usage.reset_at.timestamp())),
            },
        ) from None

    response.headers["X-RateLimit-Limit"] = str(usage.limit)
    response.headers["X-RateLimit-Remaining"] = str(usage.remaining)
    response.headers["X-RateLimit-Reset"] = str(int(usage.reset_at.timestamp()))
    return await _forward_to_scanner("/scan", file, settings)
