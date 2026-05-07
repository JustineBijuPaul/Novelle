"""Feature routes — journal, companion AI, hospitals, reminders."""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime, timezone, date
from math import radians, cos, sin, asin, sqrt
from app.core.database import get_db, get_mongo_db
from app.models.user import User
from app.models.hospital import Hospital
from app.models.reminder import Reminder
from app.schemas.features import (
    JournalCreate, JournalResponse, JournalShare,
    CompanionRequest, CompanionResponse,
    HospitalResponse, ReminderCreate, ReminderResponse,
)
from app.api.routes.auth import _current_user
from app.services.nlp_service import NLPService
from app.services.companion_ai import CompanionAI

router = APIRouter(tags=["Features"])
nlp = NLPService()
companion = CompanionAI()


# ═══════════════════════════════════════════════════
#  JOURNAL
# ═══════════════════════════════════════════════════

@router.post("/journal/entry", response_model=JournalResponse, status_code=201)
@router.post("/journal/", response_model=JournalResponse, status_code=201)
async def create_journal_entry(
    data: JournalCreate,
    user: User = Depends(_current_user),
):
    mongo = get_mongo_db()
    text = data.content or data.text_content or ""
    emotions = data.emotions or data.emotion_tags or []
    entry_date = data.entry_date or str(date.today())

    # NLP analysis
    sentiment_score, sentiment_label = nlp.analyze_sentiment(text)
    crisis_flag = nlp.detect_crisis(text)
    detected_emotions = nlp.classify_emotions(text)

    doc = {
        "user_id": user.id,
        "entry_date": entry_date,
        "title": data.title or "",
        "content": text,
        "text_content": text,
        "mood": data.mood,
        "emotions": emotions or detected_emotions,
        "emotion_tags": emotions or detected_emotions,
        "tags": data.tags or [],
        "sentiment_score": sentiment_score,
        "sentiment_label": sentiment_label,
        "crisis_flag": crisis_flag,
        "shared_with_doctor": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await mongo.journals.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return JournalResponse(**doc)


@router.get("/journal/list", response_model=list[JournalResponse])
async def list_journal_entries(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(_current_user),
):
    mongo = get_mongo_db()
    cursor = mongo.journals.find(
        {"user_id": user.id}
    ).sort("created_at", -1).skip(skip).limit(limit)

    entries = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        entries.append(JournalResponse(**doc))
    return entries


@router.post("/journal/share")
async def share_journal_entry(
    data: JournalShare,
    user: User = Depends(_current_user),
):
    from bson import ObjectId
    mongo = get_mongo_db()
    result = await mongo.journals.update_one(
        {"_id": ObjectId(data.entry_id), "user_id": user.id},
        {"$set": {"shared_with_doctor": data.share}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    return {"status": "ok", "shared": data.share}


@router.get("/journal/sentiment-trend")
async def get_sentiment_trend(
    days: int = Query(14, ge=1, le=365),
    user: User = Depends(_current_user),
):
    from datetime import timedelta
    mongo = get_mongo_db()
    since = (date.today() - timedelta(days=days)).isoformat()
    cursor = mongo.journals.find(
        {"user_id": user.id, "entry_date": {"$gte": since}}
    ).sort("entry_date", 1)

    trend = []
    async for doc in cursor:
        trend.append({
            "date": doc.get("entry_date"),
            "sentiment_score": doc.get("sentiment_score", 0),
            "sentiment_label": doc.get("sentiment_label", "neutral"),
        })
    return {"trend": trend}


# ═══════════════════════════════════════════════════
#  LETTER TO BABY
# ═══════════════════════════════════════════════════

@router.post("/letters/", status_code=201)
async def create_letter(
    data: JournalCreate,
    user: User = Depends(_current_user),
):
    mongo = get_mongo_db()
    text = data.content or data.text_content or ""
    entry_date = data.entry_date or str(date.today())

    doc = {
        "user_id": user.id,
        "entry_date": entry_date,
        "title": data.title or "Letter to My Baby",
        "content": text,
        "mood": data.mood,
        "tags": data.tags or [],
        "type": "letter_to_baby",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await mongo.baby_letters.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return doc


@router.get("/letters/list")
async def list_letters(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(_current_user),
):
    mongo = get_mongo_db()
    cursor = mongo.baby_letters.find(
        {"user_id": user.id}
    ).sort("created_at", -1).skip(skip).limit(limit)

    letters = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        letters.append(doc)
    return letters


@router.delete("/letters/{letter_id}")
async def delete_letter(
    letter_id: str,
    user: User = Depends(_current_user),
):
    from bson import ObjectId
    mongo = get_mongo_db()
    result = await mongo.baby_letters.delete_one(
        {"_id": ObjectId(letter_id), "user_id": user.id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Letter not found")
    return {"status": "deleted"}


# ═══════════════════════════════════════════════════
#  AI COMPANION
# ═══════════════════════════════════════════════════

@router.post("/companion/chat", response_model=CompanionResponse)
async def companion_chat(
    data: CompanionRequest,
    user: User = Depends(_current_user),
):
    mongo = get_mongo_db()

    # Get chat history for context
    cursor = mongo.chat_history.find(
        {"user_id": user.id}
    ).sort("timestamp", -1).limit(5)
    history = []
    async for doc in cursor:
        history.append(doc)

    response = companion.generate_response(data.message, user, history, data.context)

    # Save to chat history
    await mongo.chat_history.insert_one({
        "user_id": user.id,
        "user_message": data.message,
        "ai_response": response["response"],
        "crisis_flag": response.get("crisis_flag", "SAFE"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    return CompanionResponse(**response)


@router.get("/companion/history")
async def get_companion_history(
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(_current_user),
):
    mongo = get_mongo_db()
    cursor = mongo.chat_history.find(
        {"user_id": user.id}
    ).sort("timestamp", -1).limit(limit)

    messages = []
    async for doc in cursor:
        messages.append({
            "user_message": doc.get("user_message", ""),
            "ai_response": doc.get("ai_response", ""),
            "timestamp": doc.get("timestamp", ""),
        })
    return {"messages": list(reversed(messages))}


# ═══════════════════════════════════════════════════
#  HOSPITALS
# ═══════════════════════════════════════════════════

def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate great-circle distance between two points (km)."""
    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    return 2 * 6371 * asin(sqrt(a))


@router.get("/hospitals/nearby", response_model=list[HospitalResponse])
async def find_nearby_hospitals(
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    radius_km: float = Query(20, ge=1, le=10000),
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Hospital))
    hospitals = result.scalars().all()

    nearby = []
    for h in hospitals:
        resp = HospitalResponse.model_validate(h)
        resp.emergency_available = h.is_emergency_capable
        
        if lat is not None and lng is not None and h.location_lat and h.location_lng:
            dist = _haversine(lat, lng, h.location_lat, h.location_lng)
            if dist <= radius_km:
                resp.distance_km = round(dist, 1)
                nearby.append(resp)
        elif lat is None or lng is None:
            # If no location provided, include all
            nearby.append(resp)

    if lat is not None and lng is not None:
        nearby.sort(key=lambda x: x.distance_km or 9999)
    else:
        nearby.sort(key=lambda x: x.name)
        
    return nearby[:50]


# ═══════════════════════════════════════════════════
#  REMINDERS
# ═══════════════════════════════════════════════════

@router.post("/reminders/", response_model=ReminderResponse, status_code=201)
async def create_reminder(
    data: ReminderCreate,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    reminder = Reminder(user_id=user.id, **data.model_dump())
    reminder.is_recurring = data.recurring
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder)
    resp = ReminderResponse.model_validate(reminder)
    resp.is_recurring = reminder.recurring
    return resp


@router.get("/reminders/list", response_model=list[ReminderResponse])
async def list_reminders(
    active_only: bool = Query(True),
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Reminder).where(Reminder.user_id == user.id)
    if active_only:
        query = query.where(Reminder.is_active == True)  # noqa: E712
    query = query.order_by(desc(Reminder.scheduled_at))
    result = await db.execute(query)
    reminders = []
    for r in result.scalars().all():
        resp = ReminderResponse.model_validate(r)
        resp.is_recurring = r.recurring
        reminders.append(resp)
    return reminders


@router.put("/reminders/{reminder_id}/complete", response_model=ReminderResponse)
async def complete_reminder(
    reminder_id: int,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Reminder).where(Reminder.id == reminder_id, Reminder.user_id == user.id)
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    reminder.is_completed = True
    reminder.is_active = False
    await db.commit()
    await db.refresh(reminder)
    resp = ReminderResponse.model_validate(reminder)
    resp.is_recurring = reminder.recurring
    return resp


@router.delete("/reminders/{reminder_id}", status_code=204)
async def delete_reminder(
    reminder_id: int,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Reminder).where(Reminder.id == reminder_id, Reminder.user_id == user.id)
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    await db.delete(reminder)
    await db.commit()
