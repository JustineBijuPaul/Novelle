import asyncio
import httpx
from app.core.security import create_access_token
from datetime import timedelta

async def test_endpoints():
    token = create_access_token(data={"sub": "11"}, expires_delta=timedelta(minutes=5))
    headers = {"Authorization": f"Bearer {token}"}
    
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        # Test Stats
        r = await client.get("/api/hospital-admin/stats", headers=headers)
        print(f"Stats: {r.status_code} {r.text}")
        
        # Test Patients
        r = await client.get("/api/hospital-admin/patients", headers=headers)
        print(f"Patients: {r.status_code} {r.text}")
        
        # Test Staff
        res = await client.get("/api/hospital-admin/staff", headers=headers)
        print(f"Staff: {res.status_code} {res.text}")
        
        res = await client.get("/api/hospital-admin/appointments", headers=headers)
        print(f"Appointments: {res.status_code} {res.text}")
        
        res = await client.get("/api/hospital-admin/escalations", headers=headers)
        print(f"Escalations: {res.status_code} {res.text}")

if __name__ == "__main__":
    asyncio.run(test_endpoints())
