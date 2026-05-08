"""
Novelle — AI-Powered Maternal Health Risk Support Platform (v1.1)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
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

    # Start Ingestion Worker
    import asyncio
    from app.services.ingestion.processor import ingestion_processor
    asyncio.create_task(ingestion_processor.process_queue_worker())
    print("✅ Ingestion Background Worker started")

    # Start Event Bus & Notification Engine
    from app.services.events.bus import event_bus
    from app.services.notifications.dispatcher import notification_dispatcher
    
    # Register Subscribers
    event_bus.subscribe("RISK_ALERT", notification_dispatcher.handle_clinical_event)
    event_bus.subscribe("EMERGENCY_ESCALATION", notification_dispatcher.handle_clinical_event)
    event_bus.subscribe("MISSED_MEDICATION", notification_dispatcher.handle_clinical_event)
    
    asyncio.create_task(event_bus.start_event_loop())
    print("✅ Clinical Event Bus & Notification Engine online")

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
from app.api.routes.admin import router as admin_router
from app.api.routes.hospital_admin import router as hospital_admin_router
from app.api.routes.platform_admin import router as platform_admin_router
from app.api.routes.ingestion import router as ingestion_router
from app.api.routes.telemedicine import router as telemedicine_router
from app.api.routes.mlops import router as mlops_router
from app.api.routes.compliance import router as compliance_router

app.include_router(auth_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(health_router, prefix="/api")
app.include_router(mental_router, prefix="/api")
app.include_router(risk_router, prefix="/api")
app.include_router(features_router, prefix="/api")
app.include_router(doctor_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(hospital_admin_router, prefix="/api/hospital-admin")
app.include_router(platform_admin_router, prefix="/api/platform-admin")
app.include_router(ingestion_router, prefix="/api/ingestion")
app.include_router(telemedicine_router, prefix="/api/telemedicine")
app.include_router(mlops_router, prefix="/api/mlops")
app.include_router(compliance_router, prefix="/api/compliance")

@app.get("/api/videos/list")
async def list_available_videos():
    """List available video weeks."""
    video_dir = "/home/linxcapture/Desktop/projects/pregency-friend/video"
    if not os.path.exists(video_dir):
        return []
    try:
        files = os.listdir(video_dir)
        weeks = []
        for f in files:
            if f.startswith("week") and f.endswith(".mp4"):
                try:
                    week_num = int(f.replace("week", "").replace(".mp4", ""))
                    weeks.append(week_num)
                except ValueError:
                    continue
        return sorted(weeks)
    except Exception:
        return []

# ── Serve Fetal Videos ──────────────────────────────
video_dir = "/home/linxcapture/Desktop/projects/pregency-friend/video"
if os.path.exists(video_dir):
    app.mount("/api/videos", StaticFiles(directory=video_dir), name="videos")


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


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    # Run the server via uvicorn programmatically
    # NOTE: We have disabled 'reload' because running inside a OneDrive folder 
    # on Windows often triggers infinite reload loops due to background syncing.
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=port, 
        reload=True
    )
