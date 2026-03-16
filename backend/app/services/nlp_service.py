"""
Novelle v1.5 — NLP Service: DistilBERT + VADER + GoEmotions

Sentiment Analysis:
  - Primary: DistilBERT (distilbert-base-uncased-finetuned-sst-2-english)
  - Secondary: VADER (lexicon-based, fast, handles social media/informal text)
  - Combined weighted score for robust sentiment detection

Emotion Classification:
  - GoEmotions via SamLowe/roberta-base-go_emotions (27 emotions + neutral)

Crisis Detection:
  - Keyword-based with severity tiers (URGENT / REVIEW_NEEDED / SAFE)
"""

from typing import Tuple, List, Optional
import os

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

PREGNANCY_EMOTION_MAP = {
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
    """
    Hybrid NLP pipeline combining transformer models with lexicon-based approaches.

    Models are loaded lazily on first use to avoid slowing down app startup.
    Falls back gracefully if transformers/torch are not installed.
    """

    def __init__(self):
        self._vader = None
        self._distilbert_pipeline = None
        self._goemotion_pipeline = None
        self._transformers_available = None

    @property
    def transformers_available(self) -> bool:
        if self._transformers_available is None:
            try:
                import transformers  # noqa: F401
                self._transformers_available = True
            except ImportError:
                self._transformers_available = False
        return self._transformers_available

    @property
    def vader(self):
        if self._vader is None:
            try:
                from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
                self._vader = SentimentIntensityAnalyzer()
            except ImportError:
                self._vader = None
        return self._vader

    @property
    def distilbert(self):
        if self._distilbert_pipeline is None and self.transformers_available:
            try:
                from transformers import pipeline as hf_pipeline
                self._distilbert_pipeline = hf_pipeline(
                    "sentiment-analysis",
                    model="distilbert-base-uncased-finetuned-sst-2-english",
                    device=-1,  # CPU
                    truncation=True,
                    max_length=512,
                )
                print("  ✅ DistilBERT sentiment model loaded")
            except Exception as e:
                print(f"  ⚠️  DistilBERT loading failed: {e}")
                self._distilbert_pipeline = False  # type: ignore[assignment]
        return self._distilbert_pipeline if self._distilbert_pipeline is not False else None

    @property
    def goemotion(self):
        if self._goemotion_pipeline is None and self.transformers_available:
            try:
                from transformers import pipeline as hf_pipeline
                self._goemotion_pipeline = hf_pipeline(
                    "text-classification",
                    model="SamLowe/roberta-base-go_emotions",
                    top_k=None,
                    device=-1,  # CPU
                    truncation=True,
                    max_length=512,
                )
                print("  ✅ GoEmotions model loaded")
            except Exception as e:
                print(f"  ⚠️  GoEmotions loading failed: {e}")
                self._goemotion_pipeline = False  # type: ignore[assignment]
        return self._goemotion_pipeline if self._goemotion_pipeline is not False else None

    # ── Sentiment Analysis (DistilBERT + VADER) ──────────────

    def analyze_sentiment(self, text: str) -> Tuple[float, str]:
        """
        Hybrid sentiment analysis combining DistilBERT and VADER.

        Returns (compound_score, label) where:
          - compound_score: -1.0 (most negative) to +1.0 (most positive)
          - label: "positive" / "negative" / "neutral"

        Strategy:
          - If both available: 60% DistilBERT + 40% VADER weighted blend
          - Falls back to whichever is available
        """
        if not text or not text.strip():
            return 0.0, "neutral"

        bert_score = self._distilbert_score(text)
        vader_score = self._vader_score(text)

        if bert_score is not None and vader_score is not None:
            compound = 0.6 * bert_score + 0.4 * vader_score
        elif bert_score is not None:
            compound = bert_score
        elif vader_score is not None:
            compound = vader_score
        else:
            compound = self._simple_fallback_score(text)

        if compound >= 0.05:
            label = "positive"
        elif compound <= -0.05:
            label = "negative"
        else:
            label = "neutral"

        return round(compound, 4), label

    def _distilbert_score(self, text: str) -> Optional[float]:
        """Get sentiment score from DistilBERT (-1 to +1)."""
        pipe = self.distilbert
        if not pipe:
            return None
        try:
            result = pipe(text[:512])[0]
            score = result["score"]
            if result["label"] == "NEGATIVE":
                return -(score)
            return score
        except Exception:
            return None

    def _vader_score(self, text: str) -> Optional[float]:
        """Get compound score from VADER (-1 to +1)."""
        if not self.vader:
            return None
        try:
            return self.vader.polarity_scores(text)["compound"]
        except Exception:
            return None

    def _simple_fallback_score(self, text: str) -> float:
        """Simple keyword fallback when no models available."""
        text_lower = text.lower()
        positive = sum(1 for w in ["good", "happy", "great", "love", "well", "better", "hope"]
                       if w in text_lower)
        negative = sum(1 for w in ["bad", "sad", "pain", "hurt", "worry", "scared", "terrible"]
                       if w in text_lower)
        total = positive + negative
        return (positive - negative) / max(total, 1)

    # ── Emotion Classification (GoEmotions) ──────────────────

    def classify_emotions(self, text: str, top_k: int = 5) -> List[str]:
        """
        Classify emotions using GoEmotions model.

        Falls back to keyword-based classification if model unavailable.
        Returns list of detected emotion labels.
        """
        if not text or not text.strip():
            return []

        goemotion_results = self._goemotion_classify(text, top_k)
        if goemotion_results:
            return goemotion_results

        return self._keyword_emotions(text)

    def classify_emotions_with_scores(self, text: str, top_k: int = 5) -> List[dict]:
        """
        Classify emotions with confidence scores.

        Returns list of {"emotion": str, "score": float} dicts.
        """
        if not text or not text.strip():
            return [{"emotion": "neutral", "score": 1.0}]

        pipe = self.goemotion
        if pipe:
            try:
                results = pipe(text[:512])[0]
                filtered = [
                    {"emotion": r["label"], "score": round(r["score"], 3)}
                    for r in sorted(results, key=lambda x: x["score"], reverse=True)[:top_k]
                    if r["score"] > 0.05
                ]
                return filtered if filtered else [{"emotion": "neutral", "score": 1.0}]
            except Exception:
                pass

        keywords = self._keyword_emotions(text)
        return [{"emotion": e, "score": 0.8} for e in keywords] or [{"emotion": "neutral", "score": 1.0}]

    def _goemotion_classify(self, text: str, top_k: int) -> Optional[List[str]]:
        """Get emotion labels from GoEmotions model."""
        pipe = self.goemotion
        if not pipe:
            return None
        try:
            results = pipe(text[:512])[0]
            emotions = [
                r["label"]
                for r in sorted(results, key=lambda x: x["score"], reverse=True)[:top_k]
                if r["score"] > 0.08
            ]
            return emotions if emotions else None
        except Exception:
            return None

    def _keyword_emotions(self, text: str) -> List[str]:
        """Keyword-based emotion fallback."""
        text_lower = text.lower()
        detected = []
        for emotion, keywords in PREGNANCY_EMOTION_MAP.items():
            if any(kw in text_lower for kw in keywords):
                detected.append(emotion)
        return detected if detected else ["neutral"]

    # ── Crisis Detection ─────────────────────────────────────

    def detect_crisis(self, text: str) -> str:
        """
        Detect crisis language: SAFE / REVIEW_NEEDED / URGENT.

        Uses keyword matching + sentiment signal.
        If DistilBERT gives very negative score AND review keywords present,
        escalates to URGENT.
        """
        if not text:
            return "SAFE"

        text_lower = text.lower()

        for keyword in CRISIS_KEYWORDS["urgent"]:
            if keyword in text_lower:
                return "URGENT"

        review_hit = False
        for keyword in CRISIS_KEYWORDS["review"]:
            if keyword in text_lower:
                review_hit = True
                break

        if review_hit:
            bert_score = self._distilbert_score(text)
            if bert_score is not None and bert_score < -0.9:
                return "URGENT"
            return "REVIEW_NEEDED"

        return "SAFE"

    # ── Pipeline Status ──────────────────────────────────────

    def get_pipeline_status(self) -> dict:
        """Return status of all NLP components."""
        return {
            "vader": self.vader is not None,
            "distilbert_sentiment": self.distilbert is not None,
            "goemotion_classifier": self.goemotion is not None,
            "transformers_installed": self.transformers_available,
        }
