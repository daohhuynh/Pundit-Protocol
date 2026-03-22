from dotenv import load_dotenv
load_dotenv()
import json
import os
import asyncio
from uagents import Agent, Context, Bureau

try:
    from ..services.debate_context import build_context_snippets
    from ..services.briefing import articles_from_json
    from .messages import Argument, DebateTurn
    from .personas import resolve_personality
    from .local_resolver import LocalResolver
except ImportError:
    from services.debate_context import build_context_snippets
    from services.briefing import articles_from_json
    from agents.messages import Argument, DebateTurn
    from agents.personas import resolve_personality
    from agents.local_resolver import LocalResolver

PUNDIT_CONFIGS = [
    {"name": "The_Contrarian", "seed": "pundit_contrarian_seed", "personality": "WSJ Business Columnist style."},
    {"name": "The_Hype_Man", "seed": "pundit_hype_seed", "personality": "Guardian Progressive style."},
    {"name": "The_Materialist", "seed": "pundit_materialist_seed", "personality": "Fox News Populist style."},
]

LOCAL_RESOLVER = LocalResolver(default_endpoint="http://127.0.0.1:8000/submit")

def create_bureau() -> Bureau:
    bureau = Bureau(port=8001, endpoint=["http://127.0.0.1:8001/submit"])

    for slot_index, config in enumerate(PUNDIT_CONFIGS):
        pundit = Agent(
            name=config["name"],
            seed=config["seed"],
            resolve=LOCAL_RESOLVER,
        )

        @pundit.on_event("startup")
        async def set_personality(
            ctx: Context,
            personality: str = config["personality"],
            idx: int = slot_index
        ):
            ctx.storage.set("personality", personality)
            ctx.storage.set("slot_index", idx) 
            ctx.logger.info(f"{ctx.agent.name} is online at {ctx.agent.address}")

        @pundit.on_message(model=DebateTurn)
        async def generate_response(ctx: Context, sender: str, msg: DebateTurn):
            import os
            import aiohttp
            
            my_slot_index = ctx.storage.get("slot_index") 
            base_personality = ctx.storage.get("personality")
            
            personality_data = resolve_personality(
                ctx.agent.name, msg.persona_mode, my_slot_index, msg.source_personas_json, base_personality
            )
            
            persona_prompt = f"You are channeling the voice of '{personality_data.get('name', 'Pundit')}': {personality_data.get('blurb', '')}" if isinstance(personality_data, dict) else str(personality_data)

            # Keep only the very last turn for context to prevent rambling
            try:
                hist = json.loads(msg.history_json)
                context_history = json.dumps(hist[-1:]) if len(hist) > 0 else "[]"
            except:
                context_history = "[]"

            prompt = f"""
            {persona_prompt}
            Topic: {msg.topic}
            Context: {msg.overview}
            Last Turn: {context_history}
            
            TASK: React to the topic and the last turn in character.
            CONSTRAINT: Use exactly 2 punchy sentences. Maximum 40 words total. 
            Do not provide introductions like 'As a columnist...' or 'I think...'. Just speak.
            """

            await asyncio.sleep(my_slot_index * 2.5)
            
            api_key = os.getenv("GEMINI_API_KEY")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
            
            # Removed the maxOutputTokens hard limit to stop the truncation
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.9, # Higher temp for more chaos
                },
                "safetySettings": [
                    {
                        "category": "HARM_CATEGORY_HARASSMENT",
                        "threshold": "BLOCK_NONE"
                    },
                    {
                        "category": "HARM_CATEGORY_HATE_SPEECH",
                        "threshold": "BLOCK_NONE"
                    },
                    {
                        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        "threshold": "BLOCK_NONE"
                    },
                    {
                        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                        "threshold": "BLOCK_NONE"
                    }
                ]
            }
            
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(url, json=payload) as resp:
                        data = await resp.json()
                        if "candidates" in data and data["candidates"]:
                            reply_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                        else:
                            # Fallback if safety filters trigger
                            reply_text = f"This topic of {msg.topic} is too sensitive for my current primary sources."
            except Exception as e:
                reply_text = f"I have strong thoughts on {msg.topic}, but the connection is unstable."

            await ctx.send(sender, Argument(speaker=ctx.agent.name, text=reply_text, source_link=""))

        bureau.add(pundit)

    return bureau

if __name__ == "__main__":
    create_bureau().run()