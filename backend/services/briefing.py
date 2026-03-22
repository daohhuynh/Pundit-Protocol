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
    """Returns a formatted list of live headlines for the debate context."""
    if not articles:
        return (
            f"No live headlines retrieved for '{topic.strip()}'. "
            "Pundits will debate utilizing core systemic logic and historical context."
        )
        
    # Instantly fallback to the list format, saving precious API tokens
    lines = [f"• [{a.get('source', 'News')}] {(a.get('title') or 'Untitled').strip()}" for a in articles[:3]]
    return f"LATEST INTEL ON '{topic.strip().upper()}':\n\n" + "\n".join(lines)


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