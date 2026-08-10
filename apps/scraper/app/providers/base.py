from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class SearchResult:
    url: str
    title: str
    snippet: str
    domain: str


class SearchProvider(ABC):
    name: str

    @abstractmethod
    async def search(self, query: str, max_results: int = 10) -> list[SearchResult]: ...
