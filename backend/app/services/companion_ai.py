"""
Novelle — AI Companion: empathetic pregnancy chatbot.
Rule-based with context awareness. Upgrade path to LLM (GPT-4/Gemini).
"""

import random
from datetime import datetime
from app.services.nlp_service import NLPService

nlp = NLPService()

# Context-aware response templates
RESPONSES = {
    "greeting": [
        "Hello! How are you feeling today? I'm here to listen and support you. 💛",
        "Hi there! I hope you're having a good day. What's on your mind?",
        "Welcome back! How's everything going with your pregnancy journey?",
    ],
    "positive": [
        "That's wonderful to hear! It's great that you're feeling good. Keep taking care of yourself! 🌸",
        "I'm so happy to hear that! Staying positive makes a big difference. How else can I help?",
        "That makes me smile! You're doing an amazing job on this journey.",
    ],
    "negative": [
        "I'm sorry you're going through this. Remember, it's okay to feel this way — pregnancy brings many emotions. Would you like to talk more about what's bothering you?",
        "That sounds really tough. You're not alone in this. Have you been able to talk to someone you trust about how you're feeling?",
        "I hear you, and your feelings are completely valid. Taking things one day at a time is perfectly okay. 💛",
    ],
    "anxiety": [
        "Feeling anxious during pregnancy is very common. Have you tried some gentle breathing exercises? They can really help calm your mind.",
        "Anxiety can feel overwhelming, but you're already doing something positive by talking about it. Would you like some relaxation tips?",
        "It's natural to worry about your baby and your health. If the anxiety feels persistent, consider discussing it with your doctor.",
    ],
    "pain": [
        "I'm sorry you're experiencing pain. If it's severe or persistent, please don't hesitate to contact your healthcare provider.",
        "Pain during pregnancy can have many causes. Please monitor it and reach out to your doctor if it worsens. ❤️",
    ],
    "baby": [
        "Your baby is growing beautifully! Every week brings new milestones. Would you like to know what developments are happening this week?",
        "It's so exciting to think about your little one! Make sure to keep up with your prenatal vitamins and stay hydrated.",
    ],
    "sleep": [
        "Sleep can be tricky during pregnancy. Try sleeping on your left side with a pillow between your knees — many moms find this comfortable.",
        "Having trouble sleeping is very common. Try a warm (not hot) bath before bed, and avoid screens for 30 minutes before bedtime.",
    ],
    "diet": [
        "Good nutrition is so important right now! Focus on iron-rich foods, leafy greens, lean proteins, and plenty of water.",
        "Some great pregnancy foods: spinach, lentils, eggs, nuts, yogurt, and fruits. Small frequent meals can also help with nausea.",
    ],
    "crisis": [
        "I can sense you're going through a really difficult time. You don't have to face this alone. Please reach out to a healthcare professional or crisis helpline.",
        "What you're describing concerns me, and I want you to get the support you deserve. Please call your doctor or a helpline right away.",
    ],
    "default": [
        "Thank you for sharing that with me. I'm always here to listen. Is there anything specific I can help you with?",
        "I appreciate you opening up. Remember, you're doing a great job navigating this journey. What else would you like to talk about?",
        "That's good to know. Please don't hesitate to share anything — I'm here for you throughout this journey. 💛",
    ],
}

# Topic detection keywords
TOPIC_KEYWORDS = {
    "greeting": ["hello", "hi", "hey", "good morning", "good evening", "how are you"],
    "anxiety": ["anxious", "worried", "panic", "nervous", "scared", "fear", "stressed"],
    "pain": ["pain", "hurting", "ache", "cramp", "contraction"],
    "baby": ["baby", "fetus", "kick", "movement", "growth", "development"],
    "sleep": ["sleep", "insomnia", "tired", "rest", "fatigue", "exhausted"],
    "diet": ["food", "eat", "diet", "nutrition", "vitamin", "hungry", "nausea"],
}


class CompanionAI:
    def generate_response(self, message: str, user, history: list = None, context: dict = None) -> dict:
        """Generate empathetic response based on message content and user context."""
        # Crisis check first
        crisis_flag = nlp.detect_crisis(message)
        if crisis_flag == "URGENT":
            return {
                "response": random.choice(RESPONSES["crisis"]) + "\n\n📞 **Emergency Helplines:**\n- iCall: 9152987821\n- Vandrevala Foundation: 1860-2662-345\n- KIRAN: 1800-599-0019",
                "disclaimer": "⚠️ This system does not replace professional medical advice.",
                "sentiment": "negative",
                "crisis_flag": "URGENT",
                "crisis_detected": True,
                "suggested_action": "Please contact a healthcare professional or crisis helpline immediately.",
            }

        # Sentiment analysis
        sentiment_score, sentiment_label = nlp.analyze_sentiment(message)

        # Topic detection
        topic = self._detect_topic(message)

        # Select response
        if topic in RESPONSES:
            response_text = random.choice(RESPONSES[topic])
        elif sentiment_label == "negative":
            response_text = random.choice(RESPONSES["negative"])
        elif sentiment_label == "positive":
            response_text = random.choice(RESPONSES["positive"])
        else:
            response_text = random.choice(RESPONSES["default"])

        # Add context-aware suffix
        if context and context.get("pregnancy_week"):
            week = context["pregnancy_week"]
            if week >= 28:
                response_text += "\n\n💡 *Tip: At your stage, remember to count your baby's kicks daily!*"

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

    def _detect_topic(self, message: str) -> str:
        """Detect conversation topic from message."""
        msg_lower = message.lower()
        for topic, keywords in TOPIC_KEYWORDS.items():
            if any(kw in msg_lower for kw in keywords):
                return topic
        return "default"
