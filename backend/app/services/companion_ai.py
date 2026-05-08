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

SYSTEM_PROMPT = """You are Novelle Maternal Intelligence, powered by Mistral-7B-Instruct-v0.3.
You are a specialized clinical-grade AI assistant for pregnancy and postpartum care.
Your goal is to provide safe, data-driven, and empathetic guidance based on the user's health logs and risk assessments.

CORE RULES:
1. **Answer the user's actual question first.** Use clinical-grade reasoning while remaining accessible.
2. You provide emotional support, general pregnancy wellness information, and companionship.
3. You are NOT a doctor. For severe symptoms, prioritize safety and tell them to contact their clinician.
4. For Red flags (heavy bleeding, severe pain, high fever, severe headache with vision changes, sudden swelling, reduced fetal movement), tell them to seek urgent in-person care immediately.
5. Substance over vague comfort. Be professional yet warm.
6. If the user seems distressed, provide crisis helpline numbers.
7. Cover nutrition, exercise, sleep, stress, and fetal development.
"""

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
    "stress_relief": [
        "To ease stress in pregnancy, many people combine: slow breathing (inhale 4, exhale 6), a short daily walk, regular sleep, limiting doom-scrolling, and talking to someone they trust. If stress feels constant or affects eating/sleep, mention it at your next prenatal visit — your team can help.",
        "A few practical ideas: gentle movement (walking, prenatal yoga if your clinician says it's OK), box breathing, breaking worries into small 'today only' steps, and asking your partner or a friend for concrete help. If you're overwhelmed most days, your clinician can screen for anxiety or depression — support makes a real difference.",
    ],
    "body_image": [
        "Many people feel strange about their changing body in pregnancy — pride, worry, or feeling 'not like yourself' is more common than people say. You're not vain for noticing. If thoughts feel obsessive or hard to manage, talking with your midwife, OB, or a counselor who works with perinatal mental health is a strong step.",
        "Pregnancy shifts hormones, weight, and skin — feeling self-focused or uncomfortable doesn't mean you're failing. Be gentle with yourself. If the feelings are intense or constant, professional support (your clinician or a therapist) can really help.",
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
    # Richer coping content — match before generic "anxiety" if user asks about stress reduction
    "stress_relief": [
        "less stress", "reduce stress", "manage stress", "cope with stress", "stress during pregnancy",
        "stress in pregnancy", "get in less stress", "deal with stress", "stress relief", "lower stress",
    ],
    "body_image": [
        "self obsessed", "self-obsessed", "obsessed with myself", "feeling obsessed", "i'm obsessed", "im obsessed",
        "hate my body", "disgusted with my body",
        "body image", "feel fat", "ugly", "don't recognize myself", "self-conscious", "embarrassed by my body",
    ],
    "anxiety": [
        "anxious", "worried", "panic", "nervous", "scared", "fear", "stressed", "stress",
        "overwhelm", "can't stop thinking", "calm down", "overwhelmed", "tense",
    ],
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

    def generate_response(self, message: str, user, history: list | None = None, context: dict | None = None) -> dict:
        # Use original message for rule-based logic to avoid internal prompt confusion
        orig_msg = context.get("original_message", message) if context else message
        crisis_flag = nlp.detect_crisis(orig_msg)
        
        if self._is_hard_crisis(orig_msg):
            crisis_flag = "URGENT"
        if crisis_flag == "URGENT":
            return self._crisis_response()

        sentiment_score, sentiment_label = nlp.analyze_sentiment(orig_msg)

        user_context = self._build_context(user, context)
        chat_messages = self._build_messages(message, history, user_context)

        response_text = (
            self._try_gemini(chat_messages)
            or self._try_groq(chat_messages)
            or self._rule_based_response(orig_msg, sentiment_label, context)
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
            max_output_tokens=512,
            temperature=0.55,
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

        self._gemini_cooldown_until = int(time.time()) + 300
        logger.info("All Gemini models exhausted — cooldown 5 min")
        return None

    # ── Groq ──────────────────────────────────────────

    def _try_groq(self, messages: list[dict]) -> str | None:
        client = self._get_groq()
        if not client:
            return None

        for model in ["mistral-7b-instruct-v0.3", "mixtral-8x7b-32768", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"]:
            try:
                resp = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    max_tokens=512,
                    temperature=0.55,
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

        self._groq_cooldown_until = int(time.time()) + 60
        logger.info("All Groq models failed — cooldown 1 min")
        return None

    # ── Question / topic helpers (rule-based fallback) ─

    _PREGNANCY_HINTS = (
        "pregnan", "pregnancy", "pregancy", "pregency", "pregant", "pregnent", "pregnacy",
        "prenatal", "postpartum", "trimester", "baby", "babies", "fetus", "fetal", "kick",
        "ultrasound", "due date", "expecting", "gestation", "obgyn", "ob-gyn", "midwife",
        "labor", "labour", "delivery", "birth", "morning sickness", "miscarriage", "c-section",
        "cesarean",
    )

    _PRECAUTION_HINTS = (
        "cautious", "caution", "careful", "watch out", "look out", "avoid", "should i avoid",
        "danger", "risk", "safe", "safety", "warning", "what should", "things to know",
        "be aware", "red flag", "when to call", "when to worry", "causious", "cautios",
        "worried about", "scared something", "harm my baby",
    )

    def _is_question_message(self, message: str) -> bool:
        ml = message.lower().strip()
        if "?" in ml:
            return True
        starters = (
            "what ", "how ", "when ", "where ", "why ", "which ", "who ",
            "can ", "should ", "is ", "are ", "do ", "does ", "will ", "could ", "would ",
        )
        return any(ml.startswith(s) for s in starters)

    def _is_pregnancy_related(self, message: str) -> bool:
        ml = message.lower()
        if any(t in ml for t in self._PREGNANCY_HINTS):
            return True
        if "preg" in ml:
            return True
        return False

    def _wants_precautions_or_safety_info(self, message: str) -> bool:
        ml = message.lower()
        return any(h in ml for h in self._PRECAUTION_HINTS)

    def _should_answer_precautions(self, message: str) -> bool:
        if not self._is_question_message(message):
            return False
        ml = message.lower()
        if not (self._is_pregnancy_related(message) or "preg" in ml):
            return False
        return self._wants_precautions_or_safety_info(ml)

    def _precautions_education_response(self, context: dict | None) -> str:
        context = context or {}
        week = context.get("pregnancy_week")
        trim = context.get("trimester")
        ctx_line = ""
        if week is not None:
            tstr = str(trim).replace("_", " ") if trim else "your current stage"
            ctx_line = f" At about week {week} ({tstr}), keeping up with prenatal visits matters."

        return (
            "Here are general things many people are careful about in pregnancy — your clinician should personalize this for you:\n\n"
            "• Prenatal visits: go to scheduled checkups and report new or worsening symptoms.\n"
            "• Food safety: avoid unpasteurized dairy/juice, undercooked meat or eggs, and high-mercury fish; wash produce.\n"
            "• Substances: avoid alcohol, smoking, vaping, and recreational drugs. Check every prescription, OTC med, and supplement with your care team.\n"
            "• Caffeine: most people moderate intake — ask your provider what's right for you.\n"
            "• Activity & rest: many stay active with walking or prenatal-approved exercise unless told otherwise; prioritize sleep when you can.\n\n"
            "Seek urgent in-person care for heavy bleeding, severe or worsening belly pain, high fever, trouble breathing, severe headache with vision changes, "
            "sudden swelling, signs of preterm labor, or clearly reduced baby movement (especially after about 28 weeks).\n\n"
            f"I'm glad you asked.{ctx_line} For guidance matched to your history, your OB, midwife, or GP is the best source."
        )

    # ── Rule-based fallback ───────────────────────────

    def _rule_based_response(self, message: str, sentiment_label: str, context: dict | None = None) -> str:
        context = context or {}

        if self._should_answer_precautions(message):
            response_text = self._precautions_education_response(context)
        else:
            topic = self._detect_topic(message)

            if topic in TOPIC_RESPONSES:
                response_text = random.choice(TOPIC_RESPONSES[topic])
            elif sentiment_label == "negative" and not (
                self._is_question_message(message)
                and (self._is_pregnancy_related(message) or self._wants_precautions_or_safety_info(message.lower()))
            ):
                response_text = random.choice(TOPIC_RESPONSES["negative"])
            elif sentiment_label == "positive":
                response_text = random.choice(TOPIC_RESPONSES["positive"])
            else:
                response_text = self._contextual_default(message)

        if context and context.get("pregnancy_week"):
            week = context["pregnancy_week"]
            if week >= 28:
                response_text += "\n\n💡 Tip: At your stage, many care teams suggest daily kick counts — ask how they'd like you to track movement."

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
                "pregnan", "preg", "pregency", "baby", "trimester", "birth", "labor", "deliver", "labour",
                "contraction", "prenatal", "postnatal", "breastfeed", "doctor",
                "midwife", "ultrasound", "kick", "due date", "morning sickness",
                "weight", "vitamin", "iron", "folate", "exercise", "diet", "expecting", "stage",
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
            "I'm here for you! How has your day been so far?",
            "Thank you for sharing that. Is there anything specific on your mind regarding your pregnancy today?",
            "I appreciate you telling me that. Remember, I'm always here to chat whenever you need support.",
            "I hear you! What's been the most interesting part of your journey this week?",
            "Thanks for letting me know. How are you feeling physically and emotionally today?",
        ])


companion = CompanionAI()
