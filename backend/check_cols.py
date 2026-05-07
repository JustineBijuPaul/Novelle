import asyncio
from sqlalchemy import inspect
from app.core.database import engine

async def check():
    async with engine.connect() as conn:
        def get_cols(sync_conn):
            return inspect(sync_conn).get_columns('users')
        columns = await conn.run_sync(get_cols)
        print([c['name'] for c in columns])

if __name__ == "__main__":
    asyncio.run(check())
