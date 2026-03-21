from uagents import Model
from typing import List, Optional


class DebateRequest(Model):
    topic: str
    is_chaos_mode: bool


class Argument(Model):
    speaker: str
    text: str
    source_link: Optional[str] = None


class DebateSummary(Model):
    topic: str
    arguments: List[Argument]
    conclusion: str
