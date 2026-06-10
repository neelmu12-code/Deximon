# apps/scanner — Card Recognition Microservice

FastAPI service. Heavy image deps (Pillow + OpenCV) and AWS Rekognition. Deployed independently from `apps/api` because of resource profile.

## Local dev

```bash
poetry install
poetry run uvicorn app.main:app --reload --port 8001
poetry run pytest
```

## Endpoints

- `GET /healthz` and `GET /health` return service health.
- `POST /scan/mock` accepts an uploaded card image and returns a local fuzzy-matched candidate.
- `POST /scan` is the AWS-backed path. It preprocesses the image, uploads to S3, runs Rekognition OCR, then attempts a Pokemon TCG API match. It returns `503` until `S3_BUCKET` and AWS credentials are configured.

Example local mock scan:

```bash
curl -F "file=@pikachu.png" http://localhost:8001/scan/mock
```

The mock path does not require AWS credentials and is intended for local frontend integration.
