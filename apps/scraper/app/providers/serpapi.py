from __future__ import annotations

from urllib.parse import urlparse

import httpx

from app.providers.base import SearchProvider, SearchResult

SERPAPI_SEARCH_URL = "https://serpapi.com/search.json"


class SerpApiSearchProvider(SearchProvider):
    """Backup search provider — used automatically when Tavily is unset or
    fails (see providers.get_search_provider)."""

    name = "serpapi"

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def search(self, query: str, max_results: int = 10) -> list[SearchResult]:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                SERPAPI_SEARCH_URL,
                params={
                    "engine": "google",
                    "q": query,
                    "num": max_results,
                    "api_key": self.api_key,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        results = []
        for item in data.get("organic_results", [])[:max_results]:
            url = item.get("link") or ""
            if not url:
                continue
            results.append(
                SearchResult(
                    url=url,
                    title=item.get("title") or "",
                    snippet=(item.get("snippet") or "")[:500],
                    domain=urlparse(url).netloc,
                )
            )
        return results
