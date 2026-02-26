"""Hospital model."""

from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, JSON
from datetime import datetime, timezone
from app.core.database import Base


class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    address = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(10), nullable=True)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    phone = Column(String(50), nullable=True)
    has_obgyn = Column(Boolean, default=False)
    has_nicu = Column(Boolean, default=False)
    is_emergency_capable = Column(Boolean, default=False)
    is_24x7 = Column(Boolean, default=False)
    hospital_type = Column(String(50), default="general")  # general / maternity / multi-specialty
    specialties = Column(JSON, default=list)
    rating = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
