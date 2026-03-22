from uagents import Model


class DebateRequest(Model):
    topic: str
    is_chaos_mode: bool


class Argument(Model):
    speaker: str
    text: str
    source_link: str | None = None


class DebateSummary(Model):
    topic: str
    arguments: list[Argument]
    conclusion: str
