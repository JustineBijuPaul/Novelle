import asyncio
from datetime import datetime, timezone, timedelta
from app.core.database import engine, AsyncSession
from app.models.clinical import Appointment
from app.models.user import User

async def seed():
    async with AsyncSession(engine) as db:
        # Get patient 8 (Sarah Patient)
        appo = Appointment(
            patient_id=8,
            doctor_id=6,
            appointment_date=datetime.now(timezone.utc) + timedelta(days=1),
            reason="Routine Checkup",
            appointment_type="IN_PERSON",
            status="scheduled"
        )
        db.add(appo)
        await db.commit()
        print("Seeded appointment")

asyncio.run(seed())
