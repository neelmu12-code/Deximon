from typing import Any, cast
from uuid import uuid4

import boto3

from app.config import Settings


def build_scan_key(filename: str | None = None) -> str:
    suffix = ""
    if filename and "." in filename:
        suffix = "." + filename.rsplit(".", 1)[-1].lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        suffix = ".jpg"
    return f"scans/{uuid4().hex}{suffix}"


def upload_scan_image(image_bytes: bytes, settings: Settings, filename: str | None = None) -> str:
    key = build_scan_key(filename)
    s3 = boto3.client("s3", region_name=settings.aws_region)
    s3.put_object(
        Bucket=settings.s3_bucket,
        Key=key,
        Body=image_bytes,
        ContentType="image/jpeg",
    )
    return key


def detect_text_from_s3(settings: Settings, key: str) -> list[str]:
    rekognition = boto3.client("rekognition", region_name=settings.aws_region)
    response = rekognition.detect_text(
        Image={"S3Object": {"Bucket": settings.s3_bucket, "Name": key}}
    )
    detections = cast("list[dict[str, Any]]", response.get("TextDetections", []))
    lines = [
        str(item.get("DetectedText", "")).strip()
        for item in sorted(detections, key=_text_position)
        if item.get("Type") == "LINE"
        and float(item.get("Confidence", 0)) >= settings.scanner_ocr_min_confidence
        and item.get("DetectedText")
    ]
    return lines


def _text_position(item: dict[str, Any]) -> tuple[float, float]:
    geometry = cast("dict[str, Any]", item.get("Geometry") or {})
    bounding_box = cast("dict[str, Any]", geometry.get("BoundingBox") or {})
    return float(bounding_box.get("Top") or 0), float(bounding_box.get("Left") or 0)
