import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.user import User

async def check():
    async with AsyncSessionLocal() as db:
        users = (await db.execute(select(User))).scalars().all()
        for u in users:
            print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}")

if __name__ == "__main__":
    asyncio.run(check())
