import asyncio
from sqlalchemy import text
from app.core.database import engine

async def update_db():
    async with engine.begin() as conn:
        print("Checking for hospital_id column in users table...")
        # Check if column exists (PostgreSQL syntax)
        res = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='hospital_id';
        """))
        if not res.fetchone():
            print("Adding hospital_id column to users table...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN hospital_id INTEGER REFERENCES hospitals(id);"))
            print("Column added successfully.")
        else:
            print("hospital_id column already exists.")

if __name__ == "__main__":
    asyncio.run(update_db())
