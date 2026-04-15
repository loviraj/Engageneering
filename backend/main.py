"""
Engageneering™ — FastAPI Application
Entry point. Mounts all routers, configures CORS, rate limiting, and health check.
Run locally: uvicorn main:app --reload
Deploy: Render auto-detects and runs uvicorn main:app
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from loguru import logger
import time

from config import get_settings
from routers.auth import router as auth_router

settings = get_settings()

# ── RATE LIMITER ────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ── APP ─────────────────────────────────────────────────────
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="The autonomous crowd learning platform API — powered by ARIA.",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── REQUEST TIMING MIDDLEWARE ───────────────────────────────
@app.middleware("http")
async def add_timing(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    ms = (time.perf_counter() - start) * 1000
    response.headers["X-Response-Time"] = f"{ms:.1f}ms"
    if ms > 2000:
        logger.warning(f"Slow request: {request.method} {request.url.path} — {ms:.0f}ms")
    return response

# ── ROUTERS ─────────────────────────────────────────────────
app.include_router(auth_router, prefix="/api/v1")

# ── HEALTH CHECK ────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health():
    return {
        "status": "ok",
        "version": settings.app_version,
        "platform": "Engageneering™",
    }

@app.get("/", tags=["System"])
async def root():
    return {
        "platform": "Engageneering™",
        "version":  settings.app_version,
        "docs":     "/docs" if settings.debug else "disabled in production",
    }

# ── STARTUP ─────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    logger.info(f"Engageneering™ API v{settings.app_version} starting")
    logger.info(f"Frontend: {settings.frontend_url}")
    logger.info("ARIA agents: standby")
