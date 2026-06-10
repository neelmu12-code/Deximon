from dataclasses import dataclass
from io import BytesIO
from typing import cast

from PIL import Image, ImageOps, UnidentifiedImageError

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_EDGE = 1600


@dataclass(frozen=True)
class ProcessedImage:
    bytes: bytes
    width: int
    height: int
    format: str
    mode: str


def preprocess_image(raw: bytes) -> ProcessedImage:
    try:
        with Image.open(BytesIO(raw)) as image:
            image_format = image.format or ""
            if image_format.upper() not in ALLOWED_FORMATS:
                raise ValueError("Only jpg, jpeg, png, and webp images are supported.")

            transposed = cast(Image.Image, ImageOps.exif_transpose(image))
            normalized = transposed.convert("RGB")
            normalized.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)

            output = BytesIO()
            normalized.save(output, format="JPEG", quality=88, optimize=True)
            return ProcessedImage(
                bytes=output.getvalue(),
                width=normalized.width,
                height=normalized.height,
                format=image_format.upper(),
                mode=normalized.mode,
            )
    except UnidentifiedImageError as exc:
        raise ValueError("Uploaded file is not a readable image.") from exc
