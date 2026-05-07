import httpx
import asyncio

async def test():
    async with httpx.AsyncClient() as client:
        # We don't have a token here, but 401/403 is better than 404
        r = await client.get("http://localhost:8000/api/hospital-admin/escalations")
        print(f"Status: {r.status_code}")
        print(f"Body: {r.text}")

if __name__ == "__main__":
    asyncio.run(test())
