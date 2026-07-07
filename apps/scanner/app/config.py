import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    pokemon_tcg_api_url: str = os.getenv("POKEMON_TCG_API_URL", "https://api.pokemontcg.io/v2")
    pokemon_tcg_api_key: str = os.getenv("POKEMON_TCG_API_KEY", "")
    pokemon_tcg_data_dir: str = os.getenv("POKEMON_TCG_DATA_DIR", "/data/pokemon-tcg-data")
    aws_region: str = os.getenv("AWS_REGION", "us-east-1")
    s3_bucket: str = os.getenv("S3_BUCKET", "")
    scanner_aws_enabled: bool = os.getenv("SCANNER_AWS_ENABLED", "false").lower() == "true"
    scanner_mock_default_query: str = os.getenv("SCANNER_MOCK_DEFAULT_QUERY", "Pikachu")
    scanner_ocr_min_confidence: float = float(os.getenv("SCANNER_OCR_MIN_CONFIDENCE", "45"))

    @property
    def aws_enabled(self) -> bool:
        return self.scanner_aws_enabled and bool(self.s3_bucket)


def get_settings() -> Settings:
    return Settings()
