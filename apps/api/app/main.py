import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import get_settings
from app.routes import auth, health, profiles

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    # Create the upload directory when the server starts, not at import time,
    # so test collection doesn't need filesystem access.
    os.makedirs(settings.upload_dir, exist_ok=True)
    yield


app = FastAPI(title="Deximon API", version="0.1.0", lifespan=lifespan)

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

# check_dir=False so mounting doesn't fail if the directory doesn't exist yet
# at import time (lifespan creates it before any request is served).
app.mount("/static", StaticFiles(directory=settings.upload_dir, check_dir=False), name="static")

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(profiles.router)


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "deximon-api", "version": "0.1.0"}
