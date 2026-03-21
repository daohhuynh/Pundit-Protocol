import os
from typing import Any, Dict, List, Optional

import requests

REDDIT_SEARCH_URL = "https://www.reddit.com/search.json"


def _user_agent() -> str:
    return os.getenv("REDDIT_USER_AGENT", "pundit-protocol/0.1")


def _search_url_for_subreddit(subreddit: Optional[str]) -> str:
    if subreddit:
        return f"https://www.reddit.com/r/{subreddit}/search.json"
    return REDDIT_SEARCH_URL


def search_reddit(
    topic: str,
    limit: int = 5,
    sort: str = "relevance",
    time_filter: str = "month",
    subreddits: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """Search Reddit via public JSON endpoints and return normalized results."""
    if not topic.strip():
        return []

    headers = {"User-Agent": _user_agent()}
    results: List[Dict[str, Any]] = []

    targets = subreddits or [None]

    for sub in targets:
        params = {
            "q": topic,
            "limit": max(1, min(limit, 100)),
            "sort": sort,
            "t": time_filter,
            "restrict_sr": 1 if sub else 0,
        }

        url = _search_url_for_subreddit(sub)
        resp = requests.get(url, params=params, headers=headers, timeout=15)
        if resp.status_code != 200:
            raise RuntimeError(
                f"Reddit request failed: {resp.status_code} {resp.text.strip()}"
            )

        payload = resp.json()
        children = (payload.get("data") or {}).get("children", [])

        for child in children:
            data = child.get("data") or {}
            permalink = data.get("permalink")
            results.append(
                {
                    "title": data.get("title"),
                    "url": f"https://www.reddit.com{permalink}" if permalink else data.get("url"),
                    "subreddit": data.get("subreddit"),
                    "score": data.get("score"),
                    "num_comments": data.get("num_comments"),
                    "created_utc": data.get("created_utc"),
                    "snippet": data.get("selftext") or data.get("title"),
                }
            )

            if len(results) >= limit:
                return results

    return results
