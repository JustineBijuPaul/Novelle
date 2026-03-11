#!/usr/bin/env python3
"""
Novelle — One-Shot Database Initializer
========================================
Initializes PostgreSQL, MongoDB, and verifies Redis in one command.

Usage:
    cd pregency-friend
    source backend/venv/bin/activate
    python backend/db/init_db.py

Options:
    --schema-only     Create tables only, skip seeding
    --seed-only       Run seed.sql only (tables must exist)
    --mongo-only      Run MongoDB setup only
    --reset           ⚠️  DROP and recreate all tables (destructive!)

Environment variables (or .env):
    DATABASE_URL      PostgreSQL async URL (postgresql+asyncpg://...)
    MONGODB_URL       MongoDB connection string
    REDIS_URL         Redis connection string
"""

import asyncio
import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime

# ── Make sure we can import from backend/app ──
ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "backend"))

# Load .env if present
try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / "backend" / ".env")
    print("  ✅ Loaded .env")
except ImportError:
    pass

DB_DIR = ROOT / "backend" / "db"

_raw_db_url   = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/novelle")
MONGODB_URL   = os.getenv("MONGODB_URL",  "mongodb://localhost:27017")
MONGODB_DB    = os.getenv("MONGODB_DB_NAME", "novelle")
REDIS_URL     = os.getenv("REDIS_URL",    "redis://localhost:6379")

# asyncpg only accepts a specific set of query params — strip everything else
# Known incompatible params from Neon/Supabase/Railway: sslmode, channel_binding, options
_ASYNCPG_UNSUPPORTED_PARAMS = {"sslmode", "channel_binding", "options", "application_name",
                                "connect_timeout", "sslrootcert", "sslcert", "sslkey"}

def _to_asyncpg_url(url: str) -> tuple[str, dict]:
    """Normalize URL to postgresql+asyncpg:// and strip unsupported query params."""
    import ssl as _ssl

    # Fix the scheme
    for prefix in ("postgresql+psycopg2://", "postgresql+psycopg://", "postgres://", "postgresql://"):
        if url.startswith(prefix):
            url = "postgresql+asyncpg://" + url[len(prefix):]
            break

    connect_args: dict = {}
    needs_ssl = False
    sslmode = "disable"

    # Parse and filter query string
    if "?" in url:
        base, qs = url.split("?", 1)
        kept = []
        for param in qs.split("&"):
            if not param:
                continue
            key = param.split("=", 1)[0]
            if key == "sslmode":
                sslmode = param.split("=", 1)[1]
                needs_ssl = sslmode in ("require", "verify-ca", "verify-full")
            elif key not in _ASYNCPG_UNSUPPORTED_PARAMS:
                kept.append(param)
        url = base + ("?" + "&".join(kept) if kept else "")

    # Build SSL context for cloud providers that require it
    if needs_ssl:
        ctx = _ssl.create_default_context()
        if sslmode == "require":
            # Neon/Supabase require SSL but we don't verify cert by hostname
            ctx.check_hostname = False
            ctx.verify_mode = _ssl.CERT_NONE
        connect_args["ssl"] = ctx

    return url, connect_args

DATABASE_URL, _CONNECT_ARGS = _to_asyncpg_url(_raw_db_url)




def banner(msg):
    print(f"\n{'=' * 60}")
    print(f"  {msg}")
    print(f"{'=' * 60}")


# ─────────────────────────────────────────────────────────
# PostgreSQL — run SQL files via sqlalchemy
# ─────────────────────────────────────────────────────────

async def init_postgres(reset=False, schema_only=False, seed_only=False):
    banner("PostgreSQL — Initializing")

    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text

    engine = create_async_engine(DATABASE_URL, echo=False, connect_args=_CONNECT_ARGS)

    async with engine.begin() as conn:
        if reset and not seed_only:
            print("  ⚠️  RESET MODE — dropping all tables...")
            await conn.execute(text("DROP SCHEMA public CASCADE"))
            await conn.execute(text("CREATE SCHEMA public"))
            print("  ✅ Schema reset")

        if not seed_only:
            schema_sql = (DB_DIR / "schema.sql").read_text()
            print(f"  Running schema.sql ({len(schema_sql)} chars)...")
            # Split and run statement by statement
            statements = [s.strip() for s in schema_sql.split(";") if s.strip() and not s.strip().startswith("--")]
            ok = 0
            for stmt in statements:
                try:
                    await conn.execute(text(stmt))
                    ok += 1
                except Exception as e:
                    err = str(e).split("\n")[0]
                    # Ignore "already exists" without failing
                    if "already exists" not in err.lower():
                        print(f"  ⚠️  Skipped: {err[:80]}")
            print(f"  ✅ schema.sql — {ok} statements executed")

        if not schema_only:
            seed_sql = (DB_DIR / "seed.sql").read_text()
            print(f"  Running seed.sql ({len(seed_sql)} chars)...")
            statements = [s.strip() for s in seed_sql.split(";") if s.strip() and not s.strip().startswith("--")]
            ok = 0
            for stmt in statements:
                try:
                    await conn.execute(text(stmt))
                    ok += 1
                except Exception as e:
                    err = str(e).split("\n")[0]
                    if "already exists" not in err.lower() and "duplicate" not in err.lower():
                        print(f"  ⚠️  Seed skipped: {err[:80]}")
            print(f"  ✅ seed.sql — {ok} statements executed")

        # Count rows
        tables = [
            "users", "pregnancy_profiles", "health_logs",
            "mental_health_assessments", "risk_scores",
            "hospitals", "doctors", "escalations", "reminders",
        ]
        print("\n  Table row counts:")
        for tbl in tables:
            try:
                result = await conn.execute(text(f"SELECT COUNT(*) FROM {tbl}"))
                count = result.scalar()
                print(f"    {tbl:<35s} {count:>5} rows")
            except Exception as e:
                print(f"    {tbl:<35s} ⚠️  {str(e)[:40]}")

    await engine.dispose()


# ─────────────────────────────────────────────────────────
# MongoDB setup
# ─────────────────────────────────────────────────────────

async def init_mongodb():
    banner("MongoDB — Initializing")

    mongo_script = DB_DIR / "mongo_setup.py"
    if not mongo_script.exists():
        print(f"  ⚠️  mongo_setup.py not found at {mongo_script}")
        return

    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("mongo_setup", mongo_script)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        await mod.setup_mongodb()
    except Exception as e:
        err = str(e).split("\n")[0][:120]
        print(f"\n  ⚠️  MongoDB not available — skipping setup.")
        print(f"     Error: {err}")
        print(f"\n  To start MongoDB locally:")
        print(f"     docker-compose up -d mongodb")
        print(f"  Or set MONGODB_URL in backend/.env to a cloud MongoDB URI (e.g. MongoDB Atlas).")
        print(f"\n  You can re-run MongoDB setup later with:")
        print(f"     python backend/db/init_db.py --mongo-only")


# ─────────────────────────────────────────────────────────
# Redis verify
# ─────────────────────────────────────────────────────────

async def verify_redis():
    banner("Redis — Verifying Connection")
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(REDIS_URL, decode_responses=True)
        await r.ping()
        info = await r.info("server")
        print(f"  ✅ Redis connected")
        print(f"     Version:  {info.get('redis_version', 'unknown')}")
        print(f"     Mode:     {info.get('redis_mode', 'standalone')}")
        print(f"     Memory:   {info.get('used_memory_human', 'unknown')}")
        await r.aclose()
    except Exception as e:
        print(f"  ⚠️  Redis not reachable: {e}")
        print(f"     Make sure Redis is running: docker-compose up -d redis")


# ─────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────

async def main():
    args = sys.argv[1:]
    reset       = "--reset"       in args
    schema_only = "--schema-only" in args
    seed_only   = "--seed-only"   in args
    mongo_only  = "--mongo-only"  in args

    print("╔" + "═" * 58 + "╗")
    print("║  NOVELLE — Database Initializer                         ║")
    print("╚" + "═" * 58 + "╝")
    print(f"  Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  PostgreSQL: {DATABASE_URL[:60]}...")
    print(f"  MongoDB:    {MONGODB_URL}")
    print(f"  Redis:      {REDIS_URL}")

    if reset:
        print("\n  ⚠️  WARNING: --reset will DROP all PostgreSQL tables!")
        confirm = input("  Type 'yes' to confirm: ").strip()
        if confirm != "yes":
            print("  Aborted.")
            return

    t0 = datetime.now()

    if not mongo_only:
        await init_postgres(reset=reset, schema_only=schema_only, seed_only=seed_only)

    if not schema_only and not seed_only:
        await init_mongodb()
        await verify_redis()

    elapsed = (datetime.now() - t0).total_seconds()
    banner(f"✅ Initialization Complete ({elapsed:.1f}s)")
    print("  Files used:")
    print(f"    schema.sql   → {DB_DIR / 'schema.sql'}")
    print(f"    seed.sql     → {DB_DIR / 'seed.sql'}")
    print(f"    mongo_setup  → {DB_DIR / 'mongo_setup.py'}")
    print(f"    redis_keys   → {DB_DIR / 'redis_keys.md'}")


if __name__ == "__main__":
    asyncio.run(main())
