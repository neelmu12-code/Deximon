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
    detections = response.get("TextDetections", [])
    lines = [
        str(item["DetectedText"])
        for item in detections
        if item.get("Type") == "LINE" and item.get("DetectedText")
    ]
    return lines
