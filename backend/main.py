"""
Novelle — FastAPI Application Entry Point
AI-Powered Maternal Health Risk Support Platform
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import init_db, init_mongo, close_mongo, init_redis, close_redis


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    print(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # Initialize databases
    try:
        await init_db()
        print("✅ PostgreSQL tables initialized")
    except Exception as e:
        print(f"⚠️  PostgreSQL connection failed: {e}")
        print("   App will start but database operations will fail until DB is available")

    try:
        await init_mongo()
        print("✅ MongoDB connected")
    except Exception as e:
        print(f"⚠️  MongoDB connection failed (non-critical): {e}")

    try:
        await init_redis()
        print("✅ Redis connected")
    except Exception as e:
        print(f"⚠️  Redis connection failed (non-critical): {e}")

    # Check ML models
    from app.ml.utils import models_available
    available = models_available()
    for name, status in available.items():
        emoji = "✅" if status else "⚠️ "
        print(f"  {emoji} ML Model [{name}]: {'loaded' if status else 'not found'}")

    print(f"📡 API ready at http://0.0.0.0:8000")
    print(f"📖 Docs at http://0.0.0.0:8000/docs")

    yield

    # Shutdown
    await close_mongo()
    await close_redis()
    print(f"👋 {settings.APP_NAME} shutdown complete")


# ── Create App ───────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Maternal Mental, Physical & Fetal Health Risk Support Platform",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register Routes ──────────────────────────────────
from app.api.routes.auth import router as auth_router
from app.api.routes.profile import router as profile_router
from app.api.routes.health import router as health_router
from app.api.routes.mental_health import router as mental_router
from app.api.routes.risk import router as risk_router
from app.api.routes.features import router as features_router
from app.api.routes.doctor import router as doctor_router

app.include_router(auth_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(health_router, prefix="/api")
app.include_router(mental_router, prefix="/api")
app.include_router(risk_router, prefix="/api")
app.include_router(features_router, prefix="/api")
app.include_router(doctor_router, prefix="/api")


# ── Root & Health Check ──────────────────────────────
@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": "AI-Powered Maternal Health Risk Support Platform",
        "docs": "/docs",
        "disclaimer": "⚠️ This system does not replace professional medical advice. All risk predictions are informational only.",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}
