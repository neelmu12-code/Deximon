import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import get_settings
from app.routes import auth, health, profiles

settings = get_settings()

app = FastAPI(title="Deximon API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.oauth_session_secret,
    same_site="lax",
    https_only=settings.auth_cookie_secure,
)

# Serve uploaded files (avatars, etc.) at /static.
# In dev the api container mounts ./apps/api:/app so files persist on the host.
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=settings.upload_dir), name="static")

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(profiles.router)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "deximon-api", "version": "0.1.0"}
