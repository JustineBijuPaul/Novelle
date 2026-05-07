import asyncio
from sqlalchemy import text
from app.core.database import engine

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id, full_name, role, hospital_id FROM users"))
        print('Users:', res.fetchall())
        res = await conn.execute(text("SELECT id, patient_id, doctor_id FROM appointments"))
        print('Appos:', res.fetchall())

asyncio.run(check())
