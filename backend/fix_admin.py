import asyncio
from sqlalchemy import text
from app.core.database import engine

async def fix_data():
    async with engine.begin() as conn:
        # Get the first hospital ID
        res = await conn.execute(text("SELECT id FROM hospitals LIMIT 1"))
        h_row = res.fetchone()
        if not h_row:
            print("No hospitals found. Cannot link admin.")
            return
        h_id = h_row[0]
        
        print(f"Linking all hospital admins to hospital ID: {h_id}")
        await conn.execute(
            text("UPDATE users SET hospital_id = :h_id WHERE role = 'hospital_admin' AND hospital_id IS NULL"),
            {"h_id": h_id}
        )
        print("Update complete.")

if __name__ == "__main__":
    asyncio.run(fix_data())
