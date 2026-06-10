from pydantic import BaseModel, Field


class ImageInfo(BaseModel):
    width: int
    height: int
    format: str
    mode: str
    processed_bytes: int = Field(ge=0)


class ScanCandidate(BaseModel):
    id: str
    name: str
    set_name: str
    set_code: str
    number: str
    rarity: str | None = None
    image_url: str | None = None
    confidence: float = Field(ge=0, le=1)


class ScanResponse(BaseModel):
    candidate: ScanCandidate
    image: ImageInfo
    source: str
    ocr_text: list[str] = Field(default_factory=list)
    image_key: str | None = None
