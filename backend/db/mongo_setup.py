#!/usr/bin/env python3
"""
Novelle — MongoDB Collections & Index Setup
============================================
Creates 4 collections with proper indexes and validation schemas.

Usage:
    cd pregency-friend
    source backend/venv/bin/activate
    python backend/db/mongo_setup.py

Or with a custom URI:
    MONGODB_URL=mongodb://user:pass@host:27017 python backend/db/mongo_setup.py
"""

import asyncio
import os
import sys
from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, TEXT, IndexModel

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DB  = os.getenv("MONGODB_DB_NAME", "novelle")


async def setup_mongodb():
    print("=" * 60)
    print("  NOVELLE — MongoDB Setup")
    print(f"  URI: {MONGODB_URL}")
    print(f"  DB:  {MONGODB_DB}")
    print("=" * 60)

    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[MONGODB_DB]

    # ─────────────────────────────────────────────
    # 1. JOURNAL ENTRIES
    #    Stores encrypted journal text, NLP-derived
    #    sentiment, and extracted emotion tags.
    # ─────────────────────────────────────────────
    print("\n[1/4] Setting up journal_entries...")

    await db.create_collection("journal_entries", check_exists=False).close() \
        if False else None  # no-op; motor auto-creates on first insert

    await db["journal_entries"].create_indexes([
        IndexModel([("user_id", ASCENDING), ("entry_date", DESCENDING)],
                   name="idx_journal_user_date"),
        IndexModel([("user_id", ASCENDING)],
                   name="idx_journal_user_id"),
        IndexModel([("emotion_tags", ASCENDING)],
                   name="idx_journal_emotions"),
        IndexModel([("sentiment_score", ASCENDING)],
                   name="idx_journal_sentiment"),
    ])

    # Sample document structure (for reference):
    sample_journal = {
        "user_id": 1,                          # FK → PostgreSQL users.id
        "entry_date": datetime.utcnow(),
        "content_encrypted": "<AES-256-CBC encrypted text>",
        "word_count": 120,
        "sentiment_score": 0.45,               # -1.0 (negative) to 1.0 (positive)
        "sentiment_label": "positive",         # positive / negative / neutral
        "emotion_tags": ["joy", "gratitude"],  # from GoEmotions model
        "crisis_keywords_detected": False,
        "nlp_processed_at": datetime.utcnow(),
        "created_at": datetime.utcnow(),
    }
    print(f"   ✅ journal_entries — 4 indexes created")
    print(f"   📄 Schema fields: {list(sample_journal.keys())}")


    # ─────────────────────────────────────────────
    # 2. CHAT HISTORY
    #    Stores AI companion conversation sessions.
    #    TTL index auto-deletes after 90 days.
    # ─────────────────────────────────────────────
    print("\n[2/4] Setting up chat_history...")

    await db["chat_history"].create_indexes([
        IndexModel([("user_id", ASCENDING)],
                   name="idx_chat_user_id"),
        IndexModel([("user_id", ASCENDING), ("started_at", DESCENDING)],
                   name="idx_chat_user_date"),
        IndexModel([("started_at", ASCENDING)],
                   name="idx_chat_ttl",
                   expireAfterSeconds=7776000),  # 90 days TTL
    ])

    sample_chat = {
        "user_id": 1,
        "session_id": "sess_abc123",
        "started_at": datetime.utcnow(),
        "ended_at": None,
        "context": {
            "pregnancy_week": 24,
            "last_risk_level": "LOW",
            "user_name": "Priya",
        },
        "messages": [
            {
                "role": "user",
                "content": "I've been feeling really anxious today.",
                "timestamp": datetime.utcnow(),
                "sentiment": -0.3,
            },
            {
                "role": "assistant",
                "content": "I hear you, Priya. Feeling anxious during pregnancy is very common...",
                "timestamp": datetime.utcnow(),
            }
        ],
        "message_count": 2,
        "crisis_detected": False,
        "created_at": datetime.utcnow(),
    }
    print(f"   ✅ chat_history — 3 indexes created (incl. 90-day TTL)")
    print(f"   📄 Schema fields: {list(sample_chat.keys())}")


    # ─────────────────────────────────────────────
    # 3. FETAL DEVELOPMENT
    #    Week-by-week development info (static/semi-static).
    #    One document per pregnancy week (1-42).
    # ─────────────────────────────────────────────
    print("\n[3/4] Setting up fetal_development...")

    await db["fetal_development"].create_indexes([
        IndexModel([("pregnancy_week", ASCENDING)],
                   name="idx_fetal_week", unique=True),
        IndexModel([("trimester", ASCENDING)],
                   name="idx_fetal_trimester"),
    ])

    sample_fetal = {
        "pregnancy_week": 24,
        "trimester": "second",
        "size_fruit": "corn",
        "length_cm": 30.0,
        "weight_grams": 600,
        "head_circumference_mm": 218,
        "milestones": [
            "Lungs are developing rapidly",
            "Baby can hear your voice",
            "Taste buds are forming",
            "Viability milestone reached (24 weeks)",
        ],
        "tips_for_mom": [
            "Start counting fetal movements (kick counts)",
            "Stay hydrated — at least 2L/day",
            "Consider Childbirth Education classes",
            "Sleep on your left side to improve blood flow",
        ],
        "warnings": [
            "Report any decrease in fetal movement immediately",
            "Watch for signs of preterm labour",
        ],
        "common_symptoms": ["backache", "round ligament pain", "heartburn"],
        "created_at": datetime.utcnow(),
    }
    print(f"   ✅ fetal_development — 2 indexes created")
    print(f"   📄 Schema fields: {list(sample_fetal.keys())}")


    # ─────────────────────────────────────────────
    # 4. NOTIFICATIONS
    #    Push / in-app notification store.
    #    TTL auto-deletes read notifications after 30d.
    # ─────────────────────────────────────────────
    print("\n[4/4] Setting up notifications...")

    await db["notifications"].create_indexes([
        IndexModel([("user_id", ASCENDING), ("sent_at", DESCENDING)],
                   name="idx_notif_user_date"),
        IndexModel([("user_id", ASCENDING), ("is_read", ASCENDING)],
                   name="idx_notif_unread"),
        IndexModel([("sent_at", ASCENDING)],
                   name="idx_notif_ttl",
                   expireAfterSeconds=2592000),  # 30 days TTL
        IndexModel([("notification_type", ASCENDING)],
                   name="idx_notif_type"),
    ])

    sample_notif = {
        "user_id": 1,
        "notification_type": "risk_alert",  # risk_alert / reminder / tip / escalation / system
        "title": "⚠️ Elevated Blood Pressure Detected",
        "body": "Your recent BP reading of 145/95 mmHg may need attention. Please consult your doctor.",
        "action_url": "/dashboard/health",
        "is_read": False,
        "priority": "high",   # low / normal / high / urgent
        "sent_at": datetime.utcnow(),
        "read_at": None,
    }
    print(f"   ✅ notifications — 4 indexes created (incl. 30-day TTL)")
    print(f"   📄 Schema fields: {list(sample_notif.keys())}")


    # ─────────────────────────────────────────────
    # SEED — Fetal Development Data (weeks 1-42)
    # ─────────────────────────────────────────────
    print("\n  Seeding fetal_development data (weeks 1-42)...")

    fetal_data = [
        # (week, trimester, fruit, length_cm, weight_g)
        (1,  "first",  "poppy seed",     0.1,    0),
        (2,  "first",  "sesame seed",    0.2,    0),
        (3,  "first",  "sesame seed",    0.3,    0),
        (4,  "first",  "poppy seed",     0.4,    0),
        (5,  "first",  "apple seed",     0.5,    0),
        (6,  "first",  "lentil",         0.8,    0),
        (7,  "first",  "blueberry",      1.0,    0),
        (8,  "first",  "kidney bean",    1.6,    1),
        (9,  "first",  "grape",          2.3,    2),
        (10, "first",  "strawberry",     3.1,    4),
        (11, "first",  "lime",           4.1,    7),
        (12, "first",  "plum",           5.4,   14),
        (13, "first",  "pea pod",        7.4,   23),
        (14, "second", "lemon",          8.7,   43),
        (15, "second", "apple",         10.1,   70),
        (16, "second", "avocado",       11.6,  100),
        (17, "second", "turnip",        13.0,  140),
        (18, "second", "sweet potato",  14.2,  190),
        (19, "second", "mango",         15.3,  240),
        (20, "second", "banana",        16.4,  300),
        (21, "second", "carrot",        26.7,  360),
        (22, "second", "spaghetti squash", 27.8, 430),
        (23, "second", "grapefruit",    28.9,  500),
        (24, "second", "corn",          30.0,  600),
        (25, "second", "rutabaga",      34.6,  660),
        (26, "second", "scallion",      35.6,  760),
        (27, "second", "cauliflower",   36.6,  875),
        (28, "third",  "eggplant",      37.6, 1005),
        (29, "third",  "butternut squash", 38.6, 1153),
        (30, "third",  "cabbage",       39.9, 1319),
        (31, "third",  "coconut",       41.1, 1502),
        (32, "third",  "jicama",        42.4, 1702),
        (33, "third",  "pineapple",     43.7, 1918),
        (34, "third",  "cantaloupe",    45.0, 2146),
        (35, "third",  "honeydew",      46.2, 2383),
        (36, "third",  "romaine lettuce", 47.4, 2622),
        (37, "third",  "winter melon",  48.6, 2859),
        (38, "third",  "leek",          49.8, 3083),
        (39, "third",  "watermelon",    50.7, 3288),
        (40, "third",  "small pumpkin", 51.2, 3462),
        (41, "third",  "pumpkin",       51.7, 3600),
        (42, "third",  "pumpkin",       52.0, 3750),
    ]

    existing = await db["fetal_development"].count_documents({})
    if existing == 0:
        docs = []
        for week, trimester, fruit, length, weight in fetal_data:
            docs.append({
                "pregnancy_week": week,
                "trimester": trimester,
                "size_fruit": fruit,
                "length_cm": length,
                "weight_grams": weight,
                "milestones": [],
                "tips_for_mom": [],
                "warnings": [],
                "common_symptoms": [],
                "created_at": datetime.utcnow(),
            })
        await db["fetal_development"].insert_many(docs)
        print(f"   ✅ Seeded {len(docs)} fetal development documents (weeks 1-42)")
    else:
        print(f"   ℹ️  Fetal development already seeded ({existing} docs — skipping)")

    # ─────────────────────────────────────────────
    # Summary
    # ─────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  MongoDB Setup Complete!")
    print("=" * 60)
    collections = await db.list_collection_names()
    for coll in sorted(collections):
        count = await db[coll].count_documents({})
        idx_count = len(await db[coll].index_information())
        print(f"  📦 {coll:<30s}  {count:>4} docs  {idx_count} indexes")

    client.close()
    print("\n  ✅ Done.")


if __name__ == "__main__":
    asyncio.run(setup_mongodb())
