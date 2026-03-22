import os
from dotenv import load_dotenv
load_dotenv()
import json
import queue
import asyncio
from typing import Any

from uagents import Agent, Context

from .local_resolver import LocalResolver
from .messages import Argument, DebateBrief, DebateTurn

MODERATOR_SEED = "beachhacks_pundit_moderator_2026"
moderator = Agent(
    name="moderator",
    seed=MODERATOR_SEED,
    port=8000,
    endpoint=["http://127.0.0.1:8000/submit"],
    resolve=LocalResolver(default_endpoint="http://127.0.0.1:8001/submit"),
)

# Dynamically generate addresses from the seeds to prevent routing black holes
PUNDIT_ADDRESSES = [
    Agent(seed="pundit_contrarian_seed").address,
    Agent(seed="pundit_hype_seed").address,
    Agent(seed="pundit_materialist_seed").address,
]

MAX_DEBATE_ROUNDS = max(1, int(os.getenv("DEBATE_ROUNDS", "2")))

# Single active debate (hackathon MVP).
_debate_state: dict[str, Any] | None = None

# Thread-safe bridge: FastAPI runs on the main event loop
debate_queue: queue.Queue[dict] = queue.Queue()


async def _stub_conclusion(topic: str, history: list[dict[str, Any]]) -> str:
    import os
    import aiohttp
    
    prompt = f"""
    You are an impartial, highly analytical moderator summarizing a debate on: {topic}.
    Transcript: {json.dumps(history, indent=2)}
    
    Task: Write a single, nuanced paragraph synthesizing their conflicting arguments into a unified "truth protocol" summary. Highlight where they agreed and where they clashed. Do not take a side.
    """
    
    api_key = os.getenv("GEMINI_API_KEY")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    
    try:
        async with aiohttp.ClientSession() as session:
            # THE FIX: Give Synthesis 3 chances to succeed if Google rate limits it
            for attempt in range(3):
                async with session.post(url, json=payload) as resp:
                    data = await resp.json()
                    
                    if "candidates" in data and data["candidates"]:
                        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    elif "error" in data and data["error"].get("code") == 429:
                        # Rate limited! Wait 5 seconds and try the synthesis again.
                        print(f"Synthesis hit rate limit. Retrying in 5s... (Attempt {attempt + 1}/3)")
                        await asyncio.sleep(5.0)
                        continue
                    else:
                        return f"Synthesis Failed. API Response: {data}"
                        
            return "Synthesis Failed: Google API is too busy right now. Please wait 60 seconds."
    except Exception as e:
        return f"Synthesis Network Error: {str(e)}"


async def _broadcast_round(ctx: Context, state: dict[str, Any]) -> None:
    history_json = json.dumps(state["history"], ensure_ascii=False)
    turn = DebateTurn(
        topic=state["topic"],
        round_index=state["round_index"],
        history_json=history_json,
        overview=state["overview"],
        articles_json=state["articles_json"],
        is_chaos_mode=state["is_chaos_mode"],
        persona_mode=state["persona_mode"],
        source_personas_json=state["source_personas_json"],
    )
    
    # ALL 3 AGENTS STAY IN THE RING
    for addr in PUNDIT_ADDRESSES:
        await ctx.send(addr, turn)


@moderator.on_event("startup")
async def introduce(ctx: Context):
    ctx.logger.info(f"Moderator is online at {moderator.address}")


@moderator.on_message(model=DebateBrief)
async def handle_debate_brief(ctx: Context, sender: str, msg: DebateBrief):
    global _debate_state
    ctx.logger.info(f"New debate: {msg.topic} (mode={msg.persona_mode}, chaos={msg.is_chaos_mode})")

    _debate_state = {
        "topic": msg.topic,
        "overview": msg.overview,
        "articles_json": msg.articles_json,
        "is_chaos_mode": msg.is_chaos_mode,
        "persona_mode": msg.persona_mode,
        "source_personas_json": msg.source_personas_json or "[]",
        "round_index": 1,
        "history": [],
        "pending": [],
        "max_rounds": MAX_DEBATE_ROUNDS,
    }

    try:
        sources = json.loads(msg.articles_json) if msg.articles_json else []
    except json.JSONDecodeError:
        sources = []
        
    debate_queue.put(
        {
            "type": "overview",
            "overview": msg.overview,
            "sources": sources if isinstance(sources, list) else [],
            "topic": msg.topic,
            "persona_mode": msg.persona_mode,
            "is_chaos_mode": msg.is_chaos_mode,
        }
    )

    await _broadcast_round(ctx, _debate_state)


@moderator.on_message(model=Argument)
async def collect_arguments(ctx: Context, sender: str, msg: Argument):
    global _debate_state
    if _debate_state is None:
        return

    state = _debate_state
    state["pending"].append(
        {
            "speaker": msg.speaker,
            "text": msg.text,
            "source": msg.source_link,
        }
    )
    debate_queue.put(
        {
            "type": "turn",
            "round": state["round_index"],
            "speaker": msg.speaker,
            "text": msg.text,
            "source": msg.source_link,
        }
    )

    # WAITING FOR ALL 3 AGENTS
    if len(state["pending"]) < len(PUNDIT_ADDRESSES):
        return

    state["history"].extend(state["pending"])
    state["pending"] = []

    if state["round_index"] >= state["max_rounds"]:
        conclusion = await _stub_conclusion(state["topic"], state["history"])
        debate_queue.put(
            {
                "type": "summary",
                "topic": state["topic"],
                "conclusion": conclusion,
                "arguments": state["history"],
            }
        )
        _debate_state = None
        return

    state["round_index"] += 1
    await _broadcast_round(ctx, state)