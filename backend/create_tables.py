import asyncio
from app.core.database import engine, Base
from app.models.resource import HospitalResource
# Import other models to ensure they are registered
from app.models.user import User
from app.models.hospital import Hospital
from app.models.clinical import Appointment
from app.models.escalation import Escalation
from app.models.communication import HospitalAnnouncement, InternalMessage

async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tables created successfully!")

if __name__ == "__main__":
    asyncio.run(create_tables())
