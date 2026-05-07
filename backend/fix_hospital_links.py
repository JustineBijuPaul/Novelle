import asyncio
from sqlalchemy import text
from app.core.database import engine

async def fix():
    async with engine.connect() as conn:
        await conn.execute(text("UPDATE users SET hospital_id = 1 WHERE role IN ('pregnant_user', 'postpartum_user', 'doctor')"))
        await conn.commit()
        print("Fixed hospital links for all clinical users")

asyncio.run(fix())
