import os
from typing import Any, Dict, List

import requests

NEWS_API_URL = "https://newsapi.org/v2/everything"


def _get_newsapi_key() -> str:
    key = os.getenv("NEWSAPI_KEY") or os.getenv("NEWS_API_KEY")
    if not key:
        raise ValueError(
            "Missing NewsAPI key. Set NEWSAPI_KEY or NEWS_API_KEY in your environment."
        )
    return key


def search_news(topic: str, limit: int = 5, language: str = "en") -> List[Dict[str, Any]]:
    """Search NewsAPI for a topic and return normalized results."""
    if not topic.strip():
        return []

    params = {
        "q": topic,
        "language": language,
        "sortBy": "relevancy",
        "pageSize": max(1, min(limit, 100)),
        "apiKey": _get_newsapi_key(),
    }

    resp = requests.get(NEWS_API_URL, params=params, timeout=15)
    if resp.status_code != 200:
        raise RuntimeError(
            f"NewsAPI request failed: {resp.status_code} {resp.text.strip()}"
        )

    payload = resp.json()
    articles = payload.get("articles", [])
    results: List[Dict[str, Any]] = []

    for item in articles[:limit]:
        source = item.get("source") or {}
        results.append(
            {
                "title": item.get("title"),
                "url": item.get("url"),
                "source": source.get("name"),
                "published_at": item.get("publishedAt"),
                "snippet": item.get("description") or item.get("content"),
            }
        )

    return results
