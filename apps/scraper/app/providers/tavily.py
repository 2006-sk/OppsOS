from __future__ import annotations

from urllib.parse import urlparse

import httpx

from app.providers.base import SearchProvider, SearchResult

TAVILY_SEARCH_URL = "https://api.tavily.com/search"


class TavilySearchProvider(SearchProvider):
    name = "tavily"

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def search(self, query: str, max_results: int = 10) -> list[SearchResult]:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                TAVILY_SEARCH_URL,
                json={
                    "api_key": self.api_key,
                    "query": query,
                    "max_results": max_results,
                    "search_depth": "basic",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        results = []
        for item in data.get("results", []):
            url = item.get("url") or ""
            if not url:
                continue
            results.append(
                SearchResult(
                    url=url,
                    title=item.get("title") or "",
                    snippet=(item.get("content") or "")[:500],
                    domain=urlparse(url).netloc,
                )
            )
        return results
