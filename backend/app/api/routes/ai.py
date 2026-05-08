from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.user import User
from app.api.routes.auth import _current_user
from app.services.maternal_ai_platform import maternal_ai
from pydantic import BaseModel

router = APIRouter(prefix="/ai", tags=["AI Intelligence"])

class AIChatRequest(BaseModel):
    message: str

class AIChatResponse(BaseModel):
    response: str
    risk_level: str
    emergency_flag: bool
    clinical_summary: str = ""
    sentiment: str = "neutral"
    crisis_flag: str = "SAFE"

@router.post("/chat", response_model=AIChatResponse)
async def ai_maternal_chat(
    data: AIChatRequest,
    user: User = Depends(_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Advanced Maternal AI Intelligence:
    Analyzes patient data, risk scores, and clinical protocols (RAG) to provide safe guidance.
    """
    try:
        response = await maternal_ai.generate_response(user.id, data.message, db)
        return AIChatResponse(**response)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI Service Error: {str(e)}")

@router.get("/status")
async def get_ai_status():
    return {
        "status": "online",
        "models": ["RiskPredictor-v2", "MaternalRAG-v1", "NovelleCompanion-Llama3"],
        "safety_engine": "active"
    }
