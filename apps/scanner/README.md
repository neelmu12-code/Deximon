# apps/scanner — Card Recognition Microservice

FastAPI service. Heavy image deps (Pillow + OpenCV) and AWS Rekognition. Deployed independently from `apps/api` because of resource profile.

## Local dev

```bash
poetry install
poetry run uvicorn app.main:app --reload --port 8001
poetry run pytest
```

## Pokemon TCG catalog

The scanner can use the free [`PokemonTCG/pokemon-tcg-data`](https://github.com/PokemonTCG/pokemon-tcg-data) JSON catalog instead of requiring a paid API key. Clone it at the repo root before starting Docker:

```bash
mkdir -p data
git clone https://github.com/PokemonTCG/pokemon-tcg-data data/pokemon-tcg-data
```

Docker Compose mounts that folder into the scanner at `/data/pokemon-tcg-data`. If the folder is missing, the scanner still starts and falls back to the live Pokemon TCG API and then the small local mock list.

## Endpoints

- `GET /healthz` and `GET /health` return service health.
- `POST /scan/mock` accepts an uploaded card image and returns a local fuzzy-matched candidate from the catalog when available.
- `POST /scan` is the AWS-backed path. It preprocesses the image, uploads to S3, runs Rekognition OCR, then fuzzy-matches against the local catalog. It returns `503` until `S3_BUCKET` and AWS credentials are configured.

Example local mock scan:

```bash
curl -F "file=@pikachu.png" http://localhost:8001/scan/mock
```

The mock path does not require AWS credentials and is intended for local frontend integration.
