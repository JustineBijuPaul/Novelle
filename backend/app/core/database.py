"""
Novelle — Database connections: PostgreSQL (async), MongoDB, Redis.
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import redis.asyncio as aioredis


# ── SQLAlchemy Base ──────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── URL normalization (handles Neon/Supabase/Railway URLs) ──
import ssl as _ssl

_ASYNCPG_UNSUPPORTED = {"sslmode", "channel_binding", "options", "connect_timeout",
                         "sslrootcert", "sslcert", "sslkey", "application_name"}

def _normalize_db_url(url: str) -> tuple[str, dict]:
    """Convert any postgres:// URL to postgresql+asyncpg:// and strip unsupported params."""
    for prefix in ("postgresql+psycopg2://", "postgresql+psycopg://", "postgres://", "postgresql://"):
        if url.startswith(prefix):
            url = "postgresql+asyncpg://" + url[len(prefix):]
            break

    connect_args: dict = {}
    if "?" in url:
        base, qs = url.split("?", 1)
        kept, needs_ssl, sslmode = [], False, "disable"
        for param in qs.split("&"):
            if not param:
                continue
            key = param.split("=", 1)[0]
            if key == "sslmode":
                sslmode = param.split("=", 1)[1]
                needs_ssl = sslmode in ("require", "verify-ca", "verify-full")
            elif key not in _ASYNCPG_UNSUPPORTED:
                kept.append(param)
        url = base + ("?" + "&".join(kept) if kept else "")
        if needs_ssl:
            ctx = _ssl.create_default_context()
            if sslmode == "require":
                ctx.check_hostname = False
                ctx.verify_mode = _ssl.CERT_NONE
            connect_args["ssl"] = ctx
    return url, connect_args

_db_url, _connect_args = _normalize_db_url(settings.DATABASE_URL)

# ── PostgreSQL (async) ──────────────────────────────
engine = create_async_engine(
    _db_url,
    echo=settings.DEBUG,
    pool_size=20,
    max_overflow=10,
    connect_args=_connect_args,
)


AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:  # type: ignore[misc]
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# ── MongoDB ─────────────────────────────────────────
mongo_client: AsyncIOMotorClient | None = None
mongo_db = None


def get_mongo_db():
    return mongo_db


async def init_mongo():
    global mongo_client, mongo_db
    mongo_client = AsyncIOMotorClient(settings.MONGODB_URL)
    mongo_db = mongo_client[settings.MONGODB_DB_NAME]


async def close_mongo():
    global mongo_client
    if mongo_client:
        mongo_client.close()


# ── Redis ───────────────────────────────────────────
redis_client: aioredis.Redis | None = None


async def init_redis():
    global redis_client
    redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)


async def get_redis() -> aioredis.Redis:
    return redis_client  # type: ignore[return-value]


async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()


# ── Init All Tables ─────────────────────────────────
async def init_db():
    """Create all PostgreSQL tables from ORM models."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
