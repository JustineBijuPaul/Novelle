"""
Novelle — AI Companion: empathetic pregnancy chatbot.
LLM chain: Gemini → Groq (Llama 3.3) → rule-based fallback.
"""

import random
import time
import logging
from app.services.nlp_service import NLPService
from app.core.config import settings

logger = logging.getLogger(__name__)
nlp = NLPService()

SYSTEM_PROMPT = """You are Novelle Companion, a warm, empathetic AI pregnancy support assistant.

CORE RULES:
1. You provide emotional support, general pregnancy wellness information, and companionship.
2. You are NOT a doctor. NEVER diagnose conditions, prescribe medication, or give specific medical advice.
3. For any medical concern, always recommend consulting their healthcare provider.
4. Be warm, compassionate, and validating. Use a conversational, supportive tone.
5. If the user seems distressed or mentions self-harm, acknowledge their pain and provide crisis helpline numbers.
6. Keep responses concise (2-4 sentences) unless the user asks for detailed information.
7. You can discuss general pregnancy topics: nutrition, exercise, sleep, emotional wellbeing, baby development milestones, common discomforts, and partner/family dynamics.
8. If asked non-pregnancy topics, gently redirect while still being friendly. You may answer briefly, but steer back to how you can help with their journey.
9. Respect cultural sensitivity — users may be from India or other regions.
10. Use occasional emojis sparingly (1-2 per message max) to keep the tone warm.

CONTEXT: The user is a pregnant or postpartum individual using the Novelle maternal health platform."""

TOPIC_RESPONSES = {
    "greeting": [
        "Hello! How are you feeling today? I'm here to listen and support you. 💛",
        "Hi there! I hope you're having a good day. What's on your mind?",
        "Welcome back! How's everything going with your pregnancy journey?",
    ],
    "positive": [
        "That's wonderful to hear! It's great that you're feeling good. Keep taking care of yourself! 🌸",
        "I'm so happy to hear that! Staying positive makes a big difference.",
        "That makes me smile! You're doing an amazing job on this journey.",
    ],
    "negative": [
        "I'm sorry you're going through this. It's okay to feel this way — pregnancy brings so many emotions. Would you like to talk more about it?",
        "That sounds really tough. You're not alone in this. Have you been able to talk to someone you trust?",
        "I hear you, and your feelings are completely valid. Taking things one day at a time is perfectly okay. 💛",
    ],
    "anxiety": [
        "Feeling anxious during pregnancy is very common. Have you tried some gentle breathing exercises? They can really help calm your mind.",
        "Anxiety can feel overwhelming, but you're already doing something positive by talking about it. Would you like some relaxation tips?",
        "It's natural to worry. If the anxiety feels persistent, consider discussing it with your doctor — they can help.",
    ],
    "pain": [
        "I'm sorry you're experiencing pain. If it's severe or persistent, please contact your healthcare provider right away.",
        "Pain during pregnancy can have many causes. Please monitor it and reach out to your doctor if it worsens. Take care of yourself ❤️",
    ],
    "baby_development": [
        "Your baby is growing beautifully! Every week brings new milestones. Would you like to know what developments are happening at your stage?",
        "It's so exciting to think about your little one! Remember to keep up with your prenatal vitamins and stay hydrated.",
    ],
    "sleep": [
        "Sleep can be tricky during pregnancy. Try sleeping on your left side with a pillow between your knees — many moms find this comfortable.",
        "Having trouble sleeping is very common. A warm (not hot) bath before bed and avoiding screens for 30 minutes can help.",
    ],
    "diet": [
        "Good nutrition is so important right now! Focus on iron-rich foods, leafy greens, lean proteins, and plenty of water.",
        "Great pregnancy foods include: spinach, lentils, eggs, nuts, yogurt, and fruits. Small frequent meals can also help with nausea.",
    ],
    "exercise": [
        "Gentle exercise during pregnancy is wonderful! Walking, prenatal yoga, and swimming are all great options. Always check with your doctor first.",
        "Staying active helps with mood, sleep, and energy levels. Even a 15-minute walk can make a difference!",
    ],
    "nausea": [
        "Morning sickness is tough! Try eating small, frequent meals and keeping some crackers by your bedside. Ginger tea can also help.",
        "Nausea usually eases after the first trimester. In the meantime, try bland foods and stay hydrated with small sips throughout the day.",
    ],
    "crisis": [
        "I can sense you're going through a really difficult time. You don't have to face this alone. Please reach out to a healthcare professional or crisis helpline.",
        "What you're sharing concerns me, and I want you to get the support you deserve. Please call your doctor or a helpline right away.",
    ],
}

TOPIC_KEYWORDS = {
    "greeting": ["hello", "hi", "hey", "good morning", "good evening", "good afternoon", "howdy"],
    "anxiety": ["anxious", "worried", "panic", "nervous", "scared", "fear", "stressed", "stress", "overwhelm", "can't stop thinking"],
    "pain": ["pain", "hurting", "ache", "cramp", "cramps", "contraction", "contractions", "bleeding", "spotting"],
    "baby_development": ["baby", "fetus", "kick", "kicks", "movement", "growth", "development", "ultrasound", "scan", "heartbeat"],
    "sleep": ["sleep", "insomnia", "tired", "rest", "fatigue", "exhausted", "can't sleep", "restless"],
    "diet": ["food", "eat", "eating", "diet", "nutrition", "vitamin", "hungry", "cravings", "craving"],
    "nausea": ["nausea", "nauseous", "vomit", "morning sickness", "throw up", "queasy", "sick to my stomach"],
    "exercise": ["exercise", "workout", "yoga", "walk", "walking", "swimming", "active", "gym", "stretch"],
}

CRISIS_KEYWORDS = [
    "suicide", "kill myself", "want to die", "end my life", "harm myself",
    "self-harm", "don't want to live", "better off dead", "no reason to live",
    "can't go on", "hurt myself",
]

HELPLINES = (
    "\n\n📞 **Helplines:**\n"
    "- iCall: 9152987821\n"
    "- Vandrevala Foundation: 1860-2662-345\n"
    "- KIRAN: 1800-599-0019"
)


class CompanionAI:
    def __init__(self):
        self._gemini_client = None
        self._groq_client = None
        self._gemini_checked = False
        self._groq_checked = False
        self._gemini_cooldown_until = 0
        self._groq_cooldown_until = 0

    def _get_gemini(self):
        if self._gemini_checked and self._gemini_client is None:
            return None
        if self._gemini_client is not None:
            if time.time() < self._gemini_cooldown_until:
                return None
            return self._gemini_client
        self._gemini_checked = True
        if not settings.GEMINI_API_KEY:
            logger.info("Gemini API key not set")
            return None
        try:
            from google import genai
            self._gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
            logger.info("Gemini client ready")
            return self._gemini_client
        except Exception as e:
            logger.warning(f"Gemini init failed: {e}")
            return None

    def _get_groq(self):
        if self._groq_checked and self._groq_client is None:
            return None
        if self._groq_client is not None:
            if time.time() < self._groq_cooldown_until:
                return None
            return self._groq_client
        self._groq_checked = True
        if not settings.GROQ_API_KEY:
            logger.info("Groq API key not set")
            return None
        try:
            from groq import Groq
            self._groq_client = Groq(api_key=settings.GROQ_API_KEY)
            logger.info("Groq client ready")
            return self._groq_client
        except Exception as e:
            logger.warning(f"Groq init failed: {e}")
            return None

    # ── public entry ──────────────────────────────────

    def generate_response(self, message: str, user, history: list = None, context: dict = None) -> dict:
        crisis_flag = nlp.detect_crisis(message)
        if self._is_hard_crisis(message):
            crisis_flag = "URGENT"
        if crisis_flag == "URGENT":
            return self._crisis_response()

        sentiment_score, sentiment_label = nlp.analyze_sentiment(message)

        user_context = self._build_context(user, context)
        chat_messages = self._build_messages(message, history, user_context)

        response_text = (
            self._try_gemini(chat_messages)
            or self._try_groq(chat_messages)
            or self._rule_based_response(message, sentiment_label, context)
        )

        suggested_action = None
        if crisis_flag == "REVIEW_NEEDED":
            suggested_action = "Based on what you've shared, I'd encourage you to speak with your doctor soon."
            response_text += f"\n\n🩺 *{suggested_action}*"

        return {
            "response": response_text,
            "disclaimer": "⚠️ This system does not replace professional medical advice.",
            "sentiment": sentiment_label,
            "crisis_flag": crisis_flag,
            "crisis_detected": crisis_flag != "SAFE",
            "suggested_action": suggested_action,
        }

    # ── helpers ───────────────────────────────────────

    def _is_hard_crisis(self, message: str) -> bool:
        return any(kw in message.lower() for kw in CRISIS_KEYWORDS)

    def _crisis_response(self) -> dict:
        return {
            "response": random.choice(TOPIC_RESPONSES["crisis"]) + HELPLINES,
            "disclaimer": "⚠️ This system does not replace professional medical advice.",
            "sentiment": "negative",
            "crisis_flag": "URGENT",
            "crisis_detected": True,
            "suggested_action": "Please contact a healthcare professional or crisis helpline immediately.",
        }

    def _build_context(self, user, context: dict | None) -> str:
        parts = []
        if hasattr(user, "full_name") and user.full_name:
            parts.append(f"User's name: {user.full_name}")
        if context:
            if context.get("pregnancy_week"):
                parts.append(f"Pregnancy week: {context['pregnancy_week']}")
            if context.get("trimester"):
                parts.append(f"Trimester: {context['trimester']}")
        return ". ".join(parts)

    def _build_messages(self, message: str, history: list | None, user_context: str) -> list[dict]:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        if history:
            for h in reversed(history[-5:]):
                messages.append({"role": "user", "content": h.get("user_message", "")})
                messages.append({"role": "assistant", "content": h.get("ai_response", "")})
        prompt = f"[Context: {user_context}]\n\n{message}" if user_context else message
        messages.append({"role": "user", "content": prompt})
        return messages

    # ── Gemini ────────────────────────────────────────

    def _try_gemini(self, messages: list[dict]) -> str | None:
        client = self._get_gemini()
        if not client:
            return None

        from google.genai import types

        contents = []
        for m in messages:
            if m["role"] == "system":
                continue
            role = "model" if m["role"] == "assistant" else "user"
            contents.append(types.Content(
                role=role,
                parts=[types.Part.from_text(text=m["content"])],
            ))

        system_text = next((m["content"] for m in messages if m["role"] == "system"), "")
        config = types.GenerateContentConfig(
            system_instruction=system_text,
            max_output_tokens=300,
            temperature=0.7,
        )

        for model_name in ["gemini-2.0-flash-lite", "gemini-2.0-flash"]:
            try:
                resp = client.models.generate_content(
                    model=model_name, contents=contents, config=config,
                )
                if resp.text:
                    logger.info(f"Response via Gemini/{model_name}")
                    return resp.text.strip()
            except Exception as e:
                err = str(e)
                if "429" in err or "RESOURCE_EXHAUSTED" in err:
                    logger.info(f"Gemini {model_name} quota exhausted, skipping")
                    continue
                logger.warning(f"Gemini {model_name}: {e}")
                continue

        self._gemini_cooldown_until = time.time() + 300
        logger.info("All Gemini models exhausted — cooldown 5 min")
        return None

    # ── Groq ──────────────────────────────────────────

    def _try_groq(self, messages: list[dict]) -> str | None:
        client = self._get_groq()
        if not client:
            return None

        for model in ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]:
            try:
                resp = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    max_tokens=300,
                    temperature=0.7,
                )
                text = resp.choices[0].message.content
                if text:
                    logger.info(f"Response via Groq/{model}")
                    return text.strip()
            except Exception as e:
                err = str(e)
                if "429" in err or "rate_limit" in err.lower():
                    logger.info(f"Groq {model} rate-limited, skipping")
                    continue
                logger.warning(f"Groq {model}: {e}")
                continue

        self._groq_cooldown_until = time.time() + 60
        logger.info("All Groq models failed — cooldown 1 min")
        return None

    # ── Rule-based fallback ───────────────────────────

    def _rule_based_response(self, message: str, sentiment_label: str, context: dict = None) -> str:
        topic = self._detect_topic(message)

        if topic in TOPIC_RESPONSES:
            response_text = random.choice(TOPIC_RESPONSES[topic])
        elif sentiment_label == "negative":
            response_text = random.choice(TOPIC_RESPONSES["negative"])
        elif sentiment_label == "positive":
            response_text = random.choice(TOPIC_RESPONSES["positive"])
        else:
            response_text = self._contextual_default(message)

        if context and context.get("pregnancy_week"):
            week = context["pregnancy_week"]
            if week >= 28:
                response_text += "\n\n💡 *Tip: At your stage, remember to count your baby's kicks daily!*"

        return response_text

    def _detect_topic(self, message: str) -> str:
        msg_lower = message.lower()
        for topic, keywords in TOPIC_KEYWORDS.items():
            if any(kw in msg_lower for kw in keywords):
                return topic
        return "default"

    def _contextual_default(self, message: str) -> str:
        msg_lower = message.lower()
        question_words = ["what", "how", "when", "where", "why", "can", "should", "is", "are", "do", "will"]
        is_question = any(msg_lower.startswith(w) for w in question_words) or "?" in message

        if is_question:
            pregnancy_terms = [
                "pregnan", "baby", "trimester", "birth", "labor", "deliver",
                "contraction", "prenatal", "postnatal", "breastfeed", "doctor",
                "midwife", "ultrasound", "kick", "due date", "morning sickness",
                "weight", "vitamin", "iron", "folate", "exercise", "diet",
            ]
            if any(term in msg_lower for term in pregnancy_terms):
                return random.choice([
                    "That's a great question! For the most accurate answer, I'd recommend discussing this with your healthcare provider at your next visit. They know your specific situation best.",
                    "Good question! While I can offer general support, your doctor is the best person to give you detailed medical guidance on this.",
                    "I understand you're curious about that. Your healthcare provider can give you the most reliable answer. Is there anything else on your mind?",
                ])
            return random.choice([
                "That's an interesting question! I'm mainly here to support you through your pregnancy journey. Is there anything about your pregnancy or wellbeing I can help with?",
                "I appreciate you chatting with me! My specialty is pregnancy support and emotional wellbeing. How are you feeling today?",
                "Good question! I'm best at helping with pregnancy-related topics and emotional support. How has your day been going? 💛",
            ])

        return random.choice([
            "Thank you for sharing that with me. How are you feeling about things overall?",
            "I appreciate you telling me that. Is there anything specific about your pregnancy journey I can help with today?",
            "Thanks for letting me know. I'm always here to chat whenever you need support. How has your week been going?",
            "I hear you! Remember, I'm here to support you through this journey. What's been on your mind lately?",
        ])


companion = CompanionAI()
