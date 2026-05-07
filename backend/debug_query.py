import asyncio
from sqlalchemy import select
from app.core.database import engine, AsyncSession
from app.models.user import User
from app.models.clinical import Appointment

async def test():
    async with AsyncSession(engine) as db:
        try:
            # Simulate the query
            query = select(Appointment, User.full_name.label("patient_name"), User.email.label("patient_email"))\
                .join(User, Appointment.patient_id == User.id)\
                .where(User.hospital_id == 1)
            
            result = await db.execute(query)
            for row in result:
                print(row)
            print("Success")
        except Exception as e:
            print(f"Error: {e}")

asyncio.run(test())
