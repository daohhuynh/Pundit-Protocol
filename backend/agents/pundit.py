from uagents import Agent, Context
from messages import DebateRequest, Argument

PUNDIT_SEED = "pundit_alpha_seed"
pundit = Agent(
    name="Pundit_Alpha",
    seed=PUNDIT_SEED,
    port=8001,
    endpoint=["http://127.0.0.1:8001/submit"],
)


@pundit.on_message(model=DebateRequest)
async def generate_response(ctx: Context, sender: str, msg: DebateRequest):
    ctx.logger.info(f"Processing topic: {msg.topic}")

    # Placeholder for the Data Lead's logic
    reply = f"As a representative of {pundit.name}, I believe {msg.topic} is a transformative force!"

    await ctx.send(sender, Argument(speaker=pundit.name, text=reply))


if __name__ == "__main__":
    pundit.run()
