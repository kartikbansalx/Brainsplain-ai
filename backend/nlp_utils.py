import os
import re
from typing import List

try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize
    try:
        nltk.download("punkt", quiet=True)
        nltk.download("stopwords", quiet=True)
    except Exception:
        pass
except Exception:
    nltk = None
    stopwords = None
    word_tokenize = None

from textblob import TextBlob


def _fallback_keywords(text: str, max_keywords: int = 5) -> List[str]:
    words = re.findall(r"[A-Za-z']+", (text or "").lower())
    excluded = {
        "what", "when", "where", "why", "how", "from", "into", "that", "this",
        "with", "about", "your", "they", "them", "then", "there", "have", "been",
        "will", "could", "should", "their", "these", "those"
    }
    keywords = [word for word in words if len(word) > 2 and word not in excluded]
    return keywords[:max_keywords]


def extract_keywords(text: str, max_keywords: int = 5) -> List[str]:
    cleaned_text = (text or "").strip()
    if not cleaned_text:
        return []

    if nltk and word_tokenize and stopwords:
        try:
            tokens = word_tokenize(cleaned_text.lower())
            stop_words = set(stopwords.words("english"))
            keywords = [
                word for word in tokens
                if word.isalpha() and word not in stop_words and len(word) > 2
            ]

            frequency = {}
            for word in keywords:
                frequency[word] = frequency.get(word, 0) + 1

            ranked = sorted(frequency, key=frequency.get, reverse=True)
            return ranked[:max_keywords]
        except Exception:
            pass

    return _fallback_keywords(cleaned_text, max_keywords=max_keywords)


def analyze_sentiment(text: str) -> str:
    analysis = TextBlob(text or "")
    polarity = analysis.sentiment.polarity

    if polarity > 0.1:
        return "Positive"
    if polarity < -0.1:
        return "Negative"
    return "Neutral"


def extract_entities(text: str, max_entities: int = 5) -> List[str]:
    cleaned_text = (text or "").strip()
    if not cleaned_text:
        return []

    # Simple heuristic NER: capitalized names and multi-word title-cased phrases.
    matches = re.findall(
        r"\b(?:[A-Z][a-z]+(?:\s+(?:[A-Z][a-z]+|of|the|and|in|on|at|for|to|from|by|with|a|an))*)\b",
        cleaned_text,
    )

    entities = []
    seen = set()
    for item in matches:
        candidate = " ".join(item.split())
        if len(candidate.split()) <= 4 and candidate and candidate.lower() not in {
            "the", "a", "an", "how", "what", "when", "where", "why"
        }:
            if candidate not in seen:
                seen.add(candidate)
                entities.append(candidate)

    return entities[:max_entities]
