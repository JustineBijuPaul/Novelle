"""
Novelle — Pregnancy Expert mode (LLM-only educational layer).

This is NOT a separately trained foundation model. It is a dedicated system prompt and
inference path that uses the same hosted LLMs as the general companion (Gemini → Groq),
optimized for structured, guideline-style **general education** about pregnancy and
postpartum—still non-diagnostic.

Use when you want answers that read like a careful patient-education handout rather
than casual chat.
"""

from __future__ import annotations

import logging
import time
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

EXPERT_SYSTEM_PROMPT = """You are the **Novelle Pregnancy Expert** — a clinical-style **patient education** assistant (not a licensed clinician).

ROLE:
- Give clear, accurate **general** information about pregnancy and postpartum wellbeing: nutrition, common symptoms, prenatal care expectations, mental health, fetal movement awareness, warning signs, and lifestyle topics.
- Default tone: calm, structured, and practical (short headings or bullets when helpful).

ABSOLUTE RULES:
1. **Never diagnose** a condition or label the user’s situation. Use phrases like “many care teams discuss…” or “it’s worth asking your clinician about…”.
2. **Never prescribe or change medications** (doses, starting/stopping drugs, herbal supplements as treatment). Always defer to their prescriber.
3. For **urgent** red flags (heavy bleeding, severe pain, high fever, severe headache with vision changes, sudden swelling, reduced fetal movement after ~28 weeks, signs of preterm labor, thoughts of self-harm): tell them to **seek emergency or same-day in-person care** and give helpline resources if distress is mentioned.
4. Prefer **widely accepted public-health guidance** (e.g. general food safety, avoiding alcohol/smoking, prenatal visit cadence) over niche opinions. If evidence is mixed, say so briefly.
5. Answer the **exact question first**, then add 2–4 bullets only if it improves clarity.
6. Length: ~120–350 words unless the user explicitly asks for a shorter or longer answer.
7. Close with one sentence: individual care must come from their OB/midwife/GP.
8. No more than 2 emojis in the entire reply, optional.

CONTEXT: The user’s name, pregnancy week, or trimester may appear in brackets—use them only when relevant; do not invent medical facts about them."""


class PregnancyExpertAI:
    """Hosted LLM chain for expert-mode replies (no rule-based chat fallback)."""

    def __init__(self) -> None:
        self._gemini_client = None
        self._groq_client = None
        self._gemini_checked = False
        self._groq_checked = False

    def _get_gemini(self):
        if self._gemini_checked and self._gemini_client is None:
            return None
        if self._gemini_client is not None:
            return self._gemini_client
        self._gemini_checked = True
        if not settings.GEMINI_API_KEY:
            return None
        try:
            from google import genai

            self._gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
            return self._gemini_client
        except Exception as e:
            logger.warning("PregnancyExpert Gemini init failed: %s", e)
            return None

    def _get_groq(self):
        if self._groq_checked and self._groq_client is None:
            return None
        if self._groq_client is not None:
            return self._groq_client
        self._groq_checked = True
        if not settings.GROQ_API_KEY:
            return None
        try:
            from groq import Groq

            self._groq_client = Groq(api_key=settings.GROQ_API_KEY)
            return self._groq_client
        except Exception as e:
            logger.warning("PregnancyExpert Groq init failed: %s", e)
            return None

    def _build_user_prompt(self, message: str, context: dict[str, Any] | None) -> str:
        context = context or {}
        bits: list[str] = []
        if context.get("pregnancy_week") is not None:
            bits.append(f"Pregnancy week (approx.): {context['pregnancy_week']}")
        if context.get("trimester"):
            bits.append(f"Trimester: {context['trimester']}")
        prefix = f"[Context: {' | '.join(bits)}]\n\n" if bits else ""
        return prefix + message.strip()

    def _messages_for_groq(self, user_prompt: str, history: list | None) -> list[dict]:
        msgs: list[dict] = [{"role": "system", "content": EXPERT_SYSTEM_PROMPT}]
        if history:
            for h in reversed(history[-8:]):
                u = (h.get("user_message") or "").strip()
                a = (h.get("ai_response") or "").strip()
                if u:
                    msgs.append({"role": "user", "content": u})
                if a:
                    msgs.append({"role": "assistant", "content": a})
        msgs.append({"role": "user", "content": user_prompt})
        return msgs

    def _try_gemini(self, user_prompt: str, history: list | None) -> str | None:
        client = self._get_gemini()
        if not client:
            return None
        from google.genai import types

        contents = []
        if history:
            for h in reversed(history[-8:]):
                u = (h.get("user_message") or "").strip()
                a = (h.get("ai_response") or "").strip()
                if u:
                    contents.append(
                        types.Content(role="user", parts=[types.Part.from_text(text=u)])
                    )
                if a:
                    contents.append(
                        types.Content(role="model", parts=[types.Part.from_text(text=a)])
                    )
        contents.append(
            types.Content(role="user", parts=[types.Part.from_text(text=user_prompt)])
        )

        config = types.GenerateContentConfig(
            system_instruction=EXPERT_SYSTEM_PROMPT,
            max_output_tokens=768,
            temperature=0.45,
        )
        for model_name in ("gemini-2.0-flash-lite", "gemini-2.0-flash"):
            try:
                resp = client.models.generate_content(
                    model=model_name, contents=contents, config=config
                )
                if resp.text:
                    logger.info("PregnancyExpert response via Gemini/%s", model_name)
                    return resp.text.strip()
            except Exception as e:
                err = str(e)
                if "429" in err or "RESOURCE_EXHAUSTED" in err:
                    continue
                logger.warning("PregnancyExpert Gemini %s: %s", model_name, e)
        return None

    def _try_groq(self, user_prompt: str, history: list | None) -> str | None:
        client = self._get_groq()
        if not client:
            return None
        messages = self._messages_for_groq(user_prompt, history)
        for model in ("llama-3.3-70b-versatile", "llama-3.1-8b-instant"):
            try:
                resp = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    max_tokens=768,
                    temperature=0.45,
                )
                text = resp.choices[0].message.content
                if text:
                    logger.info("PregnancyExpert response via Groq/%s", model)
                    return text.strip()
            except Exception as e:
                err = str(e)
                if "429" in err or "rate_limit" in err.lower():
                    continue
                logger.warning("PregnancyExpert Groq %s: %s", model, e)
        return None

    def generate_response(
        self,
        message: str,
        user,
        history: list | None = None,
        context: dict[str, Any] | None = None,
    ) -> dict:
        """Return same shape keys as general companion for API compatibility."""
        user_prompt = self._build_user_prompt(message, context)

        text = self._try_gemini(user_prompt, history) or self._try_groq(user_prompt, history)
        if not text:
            text = (
                "Pregnancy Expert mode needs a configured LLM (Gemini or Groq API key in your backend `.env`). "
                "Once `GEMINI_API_KEY` or `GROQ_API_KEY` is set, restart the server. "
                "Meanwhile, your clinical questions are best answered by your OB, midwife, or GP."
            )

        return {
            "response": text,
            "disclaimer": "⚠️ Educational information only—not a medical diagnosis or personal care plan. Your clinician knows your history.",
            "sentiment": None,
            "crisis_flag": "SAFE",
            "crisis_detected": False,
            "suggested_action": None,
        }


pregnancy_expert = PregnancyExpertAI()
