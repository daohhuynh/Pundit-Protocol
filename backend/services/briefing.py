"""Build moderator overview and safe NewsAPI fetch for the debate pipeline."""

from __future__ import annotations

import json
from typing import Any

from .news_fetcher import search_news


def fetch_articles_for_topic(topic: str, limit: int = 5) -> list[dict[str, Any]]:
    """Return normalized articles; empty list if topic blank or NewsAPI unavailable."""
    if not topic.strip():
        return []
    try:
        return search_news(topic, limit=limit)
    except (ValueError, RuntimeError, OSError):
        return []


def build_overview_from_articles(topic: str, articles: list[dict[str, Any]]) -> str:
    """Returns a sleek system prompt, letting the frontend render the UI."""
    if not articles:
        return f"No live context retrieved for '{topic.strip()}'. Pundits will debate utilizing core systemic logic."
        
    return f"Live context established for '{topic.strip().upper()}'. Ingesting {len(articles[:3])} verified data streams into the multi-agent matrix..."


def articles_to_json(articles: list[dict[str, Any]]) -> str:
    return json.dumps(articles, ensure_ascii=False)


def articles_from_json(raw: str) -> list[dict[str, Any]]:
    if not raw.strip():
        return []
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []