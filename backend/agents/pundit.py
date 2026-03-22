from uagents import Agent, Context, Bureau
from .messages import DebateRequest, Argument

# 1. Define our Pundit Personalities for the MVP
PUNDIT_CONFIGS = [
    {
        "name": "The_Contrarian",
        "seed": "pundit_contrarian_seed",
        "personality": "You are extremely skeptical. No matter the topic, find the hidden flaws and risks.",
    },
    {
        "name": "The_Hype_Man",
        "seed": "pundit_hype_seed",
        "personality": "You are an eternal optimist. Focus only on progress, innovation, and 'to the moon' energy.",
    },
    {
        "name": "The_Materialist",
        "seed": "pundit_materialist_seed",
        "personality": "You analyze everything through the lens of class struggle and economic resource distribution.",
    },
]

# 2. Create the Bureau to manage them all
bureau = Bureau(port=8001, endpoint=["http://127.0.0.1:8001/submit"])

for config in PUNDIT_CONFIGS:
    pundit = Agent(
        name=config["name"],
        seed=config["seed"]
    )

    # We store the personality in the agent's storage for the MVP
    @pundit.on_event("startup")
    async def set_personality(ctx: Context, personality=config["personality"]):
        ctx.storage.set("personality", personality)
        ctx.logger.info(f"{ctx.agent.name} is online at {pundit.address}")

    @pundit.on_message(model=DebateRequest)
    async def generate_response(ctx: Context, sender: str, msg: DebateRequest):
        personality = ctx.storage.get("personality")
        ctx.logger.info(f"{ctx.agent.name} is processing: {msg.topic}")

        # MVP Logic: For now, we just prepend the personality to the response
        # In the next phase, you will send this 'personality' to an LLM
        reply = f"[{ctx.agent.name} Perspective]: Based on my worldview ({personality}), I think {msg.topic} is something we must scrutinize closely."

        await ctx.send(sender, Argument(speaker=ctx.agent.name, text=reply))

    bureau.add(pundit)

if __name__ == "__main__":
    bureau.run()
