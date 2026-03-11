# Novelle — Redis Key Conventions & TTL Reference
# ====================================================
# All keys follow the pattern:  novelle:{scope}:{identifier}
# Serialization: JSON strings unless noted
# ====================================================

## Key Patterns

| Key Pattern | Type | Value | TTL | Description |
|---|---|---|---|---|
| `novelle:session:{user_id}` | STRING | JWT access token | 24h | Active user session |
| `novelle:refresh:{user_id}` | STRING | Refresh token hash | 7d | Refresh token store |
| `novelle:risk_cache:{user_id}` | STRING | RiskScore JSON | 6h | Latest risk score cache |
| `novelle:health_last:{user_id}` | STRING | HealthLog JSON | 2h | Latest health log cache |
| `novelle:mental_last:{user_id}` | STRING | Assessment JSON | 2h | Latest mental assessment |
| `novelle:chat_ctx:{user_id}` | LIST | Message JSON[] | 2h | Last 20 chat messages for context |
| `novelle:otp:{email}` | STRING | 6-digit OTP | 10m | Email verification / password reset |
| `novelle:profile:{user_id}` | STRING | ProfileData JSON | 12h | Cached pregnancy profile |
| `novelle:fetal_week:{week}` | STRING | WeekInfo JSON | 7d | Fetal development by week (static) |
| `novelle:rate:{ip}:{endpoint}` | STRING | Request count | 1m | Rate limiting counter |
| `novelle:blacklist:{jti}` | STRING | "1" | Until expiry | Revoked JWT token IDs |
| `novelle:notif_count:{user_id}` | STRING | Integer count | 1h | Unread notification badge count |
| `novelle:hospital_near:{lat}_{lng}` | STRING | Hospital[] JSON | 24h | Nearby hospital cache |

---

## Usage Examples (Python — aioredis)

```python
import json
import redis.asyncio as aioredis

redis = aioredis.from_url("redis://localhost:6379", decode_responses=True)

# Cache a risk score
async def cache_risk_score(user_id: int, score: dict):
    key = f"novelle:risk_cache:{user_id}"
    await redis.setex(key, 21600, json.dumps(score))  # 6 hours

# Get cached risk score
async def get_cached_risk(user_id: int) -> dict | None:
    key = f"novelle:risk_cache:{user_id}"
    data = await redis.get(key)
    return json.loads(data) if data else None

# Store OTP
async def store_otp(email: str, otp: str):
    key = f"novelle:otp:{email}"
    await redis.setex(key, 600, otp)  # 10 minutes

# Rate limiting
async def check_rate_limit(ip: str, endpoint: str, max_req: int = 30) -> bool:
    key = f"novelle:rate:{ip}:{endpoint}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 60)  # 1 minute window
    return count <= max_req

# Push chat message to context window
async def push_chat_message(user_id: int, message: dict):
    key = f"novelle:chat_ctx:{user_id}"
    await redis.lpush(key, json.dumps(message))
    await redis.ltrim(key, 0, 19)  # keep last 20 messages
    await redis.expire(key, 7200)

# Blacklist a JWT on logout
async def blacklist_token(jti: str, expires_in: int):
    key = f"novelle:blacklist:{jti}"
    await redis.setex(key, expires_in, "1")

async def is_token_blacklisted(jti: str) -> bool:
    return await redis.exists(f"novelle:blacklist:{jti}") == 1
```

---

## Redis Configuration (redis.conf recommendations)

```conf
# Memory policy — evict least-recently-used keys when full
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence — RDB snapshot for crash recovery
save 900 1
save 300 10
save 60 10000

# Security
requirepass your_redis_password_here
bind 127.0.0.1

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
```

---

## docker-compose Redis Service (already in docker-compose.yml)

```yaml
redis:
  image: redis:7-alpine
  command: redis-server --requirepass ${REDIS_PASSWORD:-novelle_redis}
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
```
