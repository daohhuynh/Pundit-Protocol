import asyncio
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

from dotenv import load_dotenv
from uagents import Agent, Context

from .messages import DebateRequest, Argument

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

load_dotenv(BASE_DIR / ".env")

from services.news_fetcher import search_news

AGENT_SPECS = [
    {
        "name": "Jacobin (Left)",
        "seed": "pundit_jacobin_seed",
        "port": 8101,
        "tone": "left-leaning and critical",
    },
    {
        "name": "WSJ (Center)",
        "seed": "pundit_wsj_seed",
        "port": 8102,
        "tone": "measured and market-focused",
    },
    {
        "name": "Fox (Right)",
        "seed": "pundit_fox_seed",
        "port": 8103,
        "tone": "skeptical and culture-driven",
    },
    {
        "name": "Wired (Tech)",
        "seed": "pundit_wired_seed",
        "port": 8104,
        "tone": "tech-forward and analytical",
    },
    {
        "name": "Reuters (Neutral)",
        "seed": "pundit_reuters_seed",
        "port": 8105,
        "tone": "neutral and fact-first",
    },
]


def _build_argument(
    topic: str, tone: str, speaker: str, limit: int = 3
) -> Tuple[str, str | None]:
    results = []
    try:
        results = search_news(topic, limit=limit)
    except Exception:
        results = []

    if not results:
        return (
            f"{speaker} view on '{topic}' ({tone}): no verified sources yet.",
            None,
        )

    pick = results[0]
    title = pick.get("title") or "a recent report"
    source = pick.get("source") or "a news outlet"
    snippet = pick.get("snippet") or ""
    text = f"{speaker} view on '{topic}' ({tone}): {title} ({source})."
    if snippet:
        text = f"{text} {snippet}"
    return text, pick.get("url")


def create_pundit_agent(spec: Dict[str, Any], loop: asyncio.AbstractEventLoop | None = None) -> Agent:
    agent = Agent(
        name=spec["name"],
        seed=spec["seed"],
        port=spec["port"],
        endpoint=[f"http://127.0.0.1:{spec['port']}/submit"],
        loop=loop,
    )

    tone = spec.get("tone", "balanced")

    @agent.on_message(model=DebateRequest)
    async def handle_request(ctx: Context, sender: str, msg: DebateRequest):
        text, url = _build_argument(msg.topic, tone, agent.name)
        await ctx.send(
            sender,
            Argument(
                speaker=agent.name,
                text=text,
                source_link=url,
                session_id=msg.session_id,
            ),
        )

    return agent


def build_pundit_agents(loop: asyncio.AbstractEventLoop | None = None) -> List[Agent]:
    return [create_pundit_agent(spec, loop=loop) for spec in AGENT_SPECS]
