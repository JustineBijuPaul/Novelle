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


# ── PostgreSQL (async) ──────────────────────────────
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=20,
    max_overflow=10,
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
