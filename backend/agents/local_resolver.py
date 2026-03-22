from __future__ import annotations

from typing import Dict, List, Tuple

from uagents.resolver import Resolver


class LocalResolver(Resolver):
    """Local-only resolver to avoid Almanac lookups in dev."""

    def __init__(
        self,
        address_to_endpoint: Dict[str, str] | None = None,
        default_endpoint: str | None = None,
    ) -> None:
        self._mapping = address_to_endpoint or {}
        self._default = default_endpoint

    async def resolve(self, destination: str) -> Tuple[str | None, List[str]]:
        endpoint = self._mapping.get(destination) or self._default
        if endpoint:
            return destination, [endpoint]
        return destination, []
