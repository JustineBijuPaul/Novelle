import asyncio
import os
import sys
from sqlalchemy import select

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from app.core.database import AsyncSessionLocal, engine
from app.models.user import User

async def check_users():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        print(f"Total users found: {len(users)}")
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_users())
