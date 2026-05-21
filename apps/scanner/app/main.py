from fastapi import FastAPI

app = FastAPI(title="Deximon Scanner", version="0.1.0")


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "deximon-scanner", "version": "0.1.0"}
