import asyncio
from sqlalchemy import text
from app.core.database import engine

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id, email, role, hospital_id FROM users WHERE email='hadmin@novelle.com'"))
        row = res.fetchone()
        print(f"User: {row}")
        
        # Check all hospital admins
        res = await conn.execute(text("SELECT email, role, hospital_id FROM users WHERE role='hospital_admin'"))
        rows = res.fetchall()
        print(f"All Admins: {rows}")

if __name__ == "__main__":
    asyncio.run(check())
