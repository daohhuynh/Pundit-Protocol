from uagents import Agent, Context
from .messages import DebateRequest, Argument, DebateSummary

# Generate a seed so the address stays consistent during the hackathon
MODERATOR_SEED = "beachhacks_pundit_moderator_2026"
moderator = Agent(
    name="moderator",
    seed=MODERATOR_SEED,
    port=8000,
    endpoint=["http://127.0.0.1:8000/submit"],
)

# List of Pundit addresses (You'll get these once the Pundit agents are run)
PUNDIT_ADDRESSES = []


@moderator.on_event("startup")
async def introduce(ctx: Context):
    ctx.logger.info(f"Moderator is online at {moderator.address}")


@moderator.on_message(model=DebateRequest)
async def handle_debate(ctx: Context, sender: str, msg: DebateRequest):
    ctx.logger.info(f"Received topic: {msg.topic}. Dispatching to Pundits...")
    for addr in PUNDIT_ADDRESSES:
        await ctx.send(addr, msg)


# This is where the Moderator collects the "Fight" results
@moderator.on_message(model=Argument)
async def collect_arguments(ctx: Context, sender: str, msg: Argument):
    ctx.logger.info(f"Received argument from {msg.speaker}")
    # Logic to store these and eventually send a summary back to the UI
