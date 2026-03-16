"""
Novelle — Application configuration via Pydantic BaseSettings.
Reads from environment variables and .env files.
"""

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────
    APP_NAME: str = "Novelle"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # ── Security ─────────────────────────────────────
    SECRET_KEY: str = "novelle-dev-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── Database ─────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://novelle:novelle_secret@localhost:5432/novelle_db"
    DATABASE_URL_SYNC: str = "postgresql://novelle:novelle_secret@localhost:5432/novelle_db"

    # ── MongoDB ──────────────────────────────────────
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "novelle_db"

    # ── Redis ────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── CORS ─────────────────────────────────────────
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    # ── ML ───────────────────────────────────────────
    ML_MODEL_DIR: str = "app/ml/models"
    RISK_CONFIDENCE_THRESHOLD: float = 0.75

    # ── Escalation ───────────────────────────────────
    ESCALATION_TIMEOUT_HOURS: int = 4
    ESCALATION_FOLLOWUP_HOURS: int = 24

    # ── External APIs (optional) ─────────────────────
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GOOGLE_MAPS_API_KEY: str = ""

    # ── Email (optional) ─────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    model_config = {"env_file": ".env", "case_sensitive": True}


settings = Settings()
