"""Novelle ORM models — import all models here for Alembic/init_db discovery."""

from app.models.user import User  # noqa: F401
from app.models.profile import PregnancyProfile  # noqa: F401
from app.models.health import HealthLog  # noqa: F401
from app.models.mental import MentalHealthAssessment  # noqa: F401
from app.models.risk import RiskScore  # noqa: F401
from app.models.doctor import Doctor  # noqa: F401
from app.models.hospital import Hospital  # noqa: F401
from app.models.escalation import Escalation  # noqa: F401
from app.models.reminder import Reminder  # noqa: F401

__all__ = [
    "User",
    "PregnancyProfile",
    "HealthLog",
    "MentalHealthAssessment",
    "RiskScore",
    "Doctor",
    "Hospital",
    "Escalation",
    "Reminder",
]
