
import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.services.risk_engine import RiskEngine

async def trigger():
    async with AsyncSessionLocal() as db:
        user_res = await db.execute(select(User).where(User.id == 8))
        user = user_res.scalar_one_or_none()
        if not user:
            print("User not found")
            return
        
        engine = RiskEngine(db, user)
        risk = await engine.compute_full_risk()
        print(f"Risk computed: ID {risk.id}, Physical: {risk.physical_risk_level}")

if __name__ == "__main__":
    asyncio.run(trigger())
