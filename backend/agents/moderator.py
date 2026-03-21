import asyncio
from uagents import Agent, Context
from .messages import DebateRequest, Argument, DebateSummary

MODERATOR_SEED = "beachhacks_pundit_moderator_2026"
moderator = Agent(
    name="moderator",
    seed=MODERATOR_SEED,
    port=8000,
    endpoint=["http://127.0.0.1:8000/submit"],
)

PUNDIT_ADDRESSES = [
    "agent1q2s3982hlxqn5mv60aw9lj5k9jqyf34t7sklaxrwy0dzzfvua5s5s2cx58c",
    "agent1qggjtjmwxdlxv2k2a290fn3e4ke7787lgjgnn92rusv88tnd29k6udp0y57",
    "agent1qggjtjmwxdlxv2k2a290fn3e4ke7787lgjgnn92rusv88tnd29k6udp0y57",
]


@moderator.on_event("startup")
async def introduce(ctx: Context):
    ctx.logger.info(f"Moderator is online at {moderator.address}")


@moderator.on_message(model=DebateRequest)
async def handle_debate(ctx: Context, sender: str, msg: DebateRequest):
    ctx.logger.info(f"New Topic: {msg.topic}. Rallying the pundits...")
    for addr in PUNDIT_ADDRESSES:
        await ctx.send(addr, msg)


# The "Brain" of the real-time bridge
debate_queue = asyncio.Queue()


@moderator.on_message(model=Argument)
async def collect_arguments(ctx: Context, sender: str, msg: Argument):
    ctx.logger.info(f"Argument received from {msg.speaker}")
    # Push the argument into the queue for the WebSocket to pick up
    await debate_queue.put(
        {"speaker": msg.speaker, "text": msg.text, "source": msg.source_link}
    )
