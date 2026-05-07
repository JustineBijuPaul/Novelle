from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

class HospitalResource(Base):
    __tablename__ = "hospital_resources"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False, index=True)
    
    category = Column(String(50), nullable=False) # BEDS, ICU, NICU, EQUIPMENT, EMERGENCY
    name = Column(String(100), nullable=False)
    total_quantity = Column(Integer, default=0)
    available_quantity = Column(Integer, default=0)
    unit = Column(String(20), default="units")
    
    last_updated = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    hospital = relationship("Hospital")
