# apps/scanner — Card Recognition Microservice

FastAPI service. Heavy image deps (Pillow + OpenCV) and AWS Rekognition. Deployed independently from `apps/api` because of resource profile.

## Local dev

```bash
poetry install
poetry run uvicorn app.main:app --reload --port 8001
poetry run pytest
```
