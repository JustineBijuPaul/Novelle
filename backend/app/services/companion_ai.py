"""
Novelle — AI Companion: empathetic pregnancy chatbot.
Primary: Google Gemini API (free tier).
Fallback: Context-aware rule-based responses with NLP sentiment/emotion analysis.
"""

import random
import logging
from datetime import datetime
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
        self._gemini_model = None
        self._gemini_available = None

    @property
    def gemini(self):
        if self._gemini_available is False:
            return None
        if self._gemini_model is not None:
            return self._gemini_model

        api_key = settings.GEMINI_API_KEY
        if not api_key:
            self._gemini_available = False
            logger.info("Gemini API key not set — using rule-based fallback")
            return None

        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            self._gemini_model = genai.GenerativeModel(
                "gemini-2.0-flash",
                system_instruction=SYSTEM_PROMPT,
                generation_config=genai.GenerationConfig(
                    max_output_tokens=300,
                    temperature=0.7,
                ),
            )
            self._gemini_available = True
            logger.info("Gemini companion model initialized")
            return self._gemini_model
        except Exception as e:
            logger.warning(f"Failed to initialize Gemini: {e}")
            self._gemini_available = False
            return None

    def generate_response(self, message: str, user, history: list = None, context: dict = None) -> dict:
        crisis_flag = nlp.detect_crisis(message)
        if self._is_hard_crisis(message):
            crisis_flag = "URGENT"

        if crisis_flag == "URGENT":
            return self._crisis_response()

        sentiment_score, sentiment_label = nlp.analyze_sentiment(message)

        if self.gemini:
            response_text = self._gemini_response(message, user, history, context)
        else:
            response_text = self._rule_based_response(message, sentiment_label, context)

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

    def _is_hard_crisis(self, message: str) -> bool:
        msg_lower = message.lower()
        return any(kw in msg_lower for kw in CRISIS_KEYWORDS)

    def _crisis_response(self) -> dict:
        return {
            "response": random.choice(TOPIC_RESPONSES["crisis"]) + HELPLINES,
            "disclaimer": "⚠️ This system does not replace professional medical advice.",
            "sentiment": "negative",
            "crisis_flag": "URGENT",
            "crisis_detected": True,
            "suggested_action": "Please contact a healthcare professional or crisis helpline immediately.",
        }

    def _gemini_response(self, message: str, user, history: list = None, context: dict = None) -> str:
        try:
            chat_history = []
            if history:
                for h in reversed(history[-5:]):
                    chat_history.append({"role": "user", "parts": [h.get("user_message", "")]})
                    chat_history.append({"role": "model", "parts": [h.get("ai_response", "")]})

            user_context = ""
            if hasattr(user, 'full_name') and user.full_name:
                user_context += f"User's name: {user.full_name}. "
            if context:
                if context.get("pregnancy_week"):
                    user_context += f"Pregnancy week: {context['pregnancy_week']}. "
                if context.get("trimester"):
                    user_context += f"Trimester: {context['trimester']}. "

            prompt = message
            if user_context:
                prompt = f"[Context: {user_context}]\n\nUser: {message}"

            chat = self.gemini.start_chat(history=chat_history)
            response = chat.send_message(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            return self._rule_based_response(message, "neutral", context)

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
        """Generate a more contextual default response instead of fully generic ones."""
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
            is_pregnancy_related = any(term in msg_lower for term in pregnancy_terms)

            if is_pregnancy_related:
                return random.choice([
                    "That's a great question! For the most accurate answer, I'd recommend discussing this with your healthcare provider at your next visit. They know your specific situation best.",
                    "Good question! While I can offer general support, your doctor is the best person to give you detailed medical guidance on this.",
                    "I understand you're curious about that. Your healthcare provider can give you the most reliable answer for your specific situation. Is there anything else on your mind?",
                ])
            else:
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
