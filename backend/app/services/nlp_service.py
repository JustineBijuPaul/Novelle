"""
Novelle — NLP Service: sentiment analysis, crisis detection, emotion classification.
Uses VADER for sentiment + keyword-based crisis detection.
"""

from typing import Tuple, List

# Crisis keywords for detecting urgent language
CRISIS_KEYWORDS = {
    "urgent": [
        "suicide", "suicidal", "kill myself", "end my life", "want to die",
        "don't want to live", "no reason to live", "better off dead",
        "harm myself", "self harm", "self-harm", "cutting myself",
    ],
    "review": [
        "hopeless", "worthless", "can't go on", "giving up", "no hope",
        "crying all day", "can't stop crying", "feel empty", "alone",
        "nobody cares", "burden", "overwhelmed", "panic attack",
        "can't breathe", "scared for my baby", "something is wrong",
        "severe pain", "heavy bleeding", "not moving", "baby not moving",
    ],
}

# Emotion keywords
EMOTION_MAP = {
    "joy": ["happy", "excited", "grateful", "blessed", "wonderful", "amazing", "love", "hopeful"],
    "anxious": ["worried", "anxious", "nervous", "scared", "fear", "panic", "tense", "uneasy"],
    "sad": ["sad", "crying", "tears", "depressed", "lonely", "miserable", "heartbroken"],
    "tired": ["tired", "exhausted", "fatigued", "drained", "sleepy", "worn out", "no energy"],
    "calm": ["calm", "peaceful", "relaxed", "serene", "content", "at ease", "tranquil"],
    "grateful": ["thankful", "grateful", "appreciate", "blessed", "fortunate"],
    "angry": ["angry", "frustrated", "irritated", "annoyed", "furious", "mad"],
    "scared": ["terrified", "frightened", "afraid", "petrified", "horrified"],
}


class NLPService:
    def __init__(self):
        self._vader = None

    @property
    def vader(self):
        if self._vader is None:
            try:
                from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
                self._vader = SentimentIntensityAnalyzer()
            except ImportError:
                self._vader = None
        return self._vader

    def analyze_sentiment(self, text: str) -> Tuple[float, str]:
        """Analyze sentiment returning (score, label)."""
        if not text or not text.strip():
            return 0.0, "neutral"

        if self.vader:
            scores = self.vader.polarity_scores(text)
            compound = scores["compound"]
        else:
            # Simple fallback
            positive = sum(1 for w in ["good", "happy", "great", "love", "well", "better", "hope"]
                           if w in text.lower())
            negative = sum(1 for w in ["bad", "sad", "pain", "hurt", "worry", "scared", "terrible"]
                           if w in text.lower())
            total = positive + negative
            compound = (positive - negative) / max(total, 1)

        if compound >= 0.05:
            label = "positive"
        elif compound <= -0.05:
            label = "negative"
        else:
            label = "neutral"

        return round(compound, 4), label

    def detect_crisis(self, text: str) -> str:
        """Detect crisis language: SAFE / REVIEW_NEEDED / URGENT."""
        if not text:
            return "SAFE"

        text_lower = text.lower()

        for keyword in CRISIS_KEYWORDS["urgent"]:
            if keyword in text_lower:
                return "URGENT"

        for keyword in CRISIS_KEYWORDS["review"]:
            if keyword in text_lower:
                return "REVIEW_NEEDED"

        return "SAFE"

    def classify_emotions(self, text: str) -> List[str]:
        """Classify emotions from text."""
        if not text:
            return []

        text_lower = text.lower()
        detected = []

        for emotion, keywords in EMOTION_MAP.items():
            if any(kw in text_lower for kw in keywords):
                detected.append(emotion)

        return detected if detected else ["neutral"]
