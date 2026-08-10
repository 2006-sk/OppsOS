from __future__ import annotations

from app.config import SERPAPI_API_KEY, TAVILY_API_KEY
from app.providers.base import SearchProvider, SearchResult
from app.providers.serpapi import SerpApiSearchProvider
from app.providers.tavily import TavilySearchProvider
from app.utils.logs import get_logger, log_event

logger = get_logger("providers")


class FallbackSearchProvider(SearchProvider):
    """Tries each provider in order until one returns results. Tavily is
    primary; SerpAPI is the documented backup (spec section 1/9)."""

    name = "fallback"

    def __init__(self, providers: list[SearchProvider]):
        if not providers:
            raise ValueError("FallbackSearchProvider needs at least one provider")
        self.providers = providers
        # Which underlying provider actually served the most recent search —
        # callers should record this (not `.name`, which is just "fallback")
        # as discoverySource, so the DB reflects the real source per spec's
        # documented enum ("tavily" | "serpapi" | ...).
        self.last_used_provider: str | None = None

    async def search(self, query: str, max_results: int = 10) -> list[SearchResult]:
        last_error: Exception | None = None
        for provider in self.providers:
            try:
                results = await provider.search(query, max_results=max_results)
                if results:
                    self.last_used_provider = provider.name
                    return results
                log_event(logger, "provider_empty_results", provider=provider.name, query=query)
            except Exception as e:
                last_error = e
                log_event(logger, "provider_failed", provider=provider.name, query=query, error=str(e))
        if last_error:
            log_event(logger, "all_providers_failed", query=query, error=str(last_error))
        self.last_used_provider = None
        return []


def get_search_provider() -> SearchProvider:
    providers: list[SearchProvider] = []
    if TAVILY_API_KEY:
        providers.append(TavilySearchProvider(TAVILY_API_KEY))
    if SERPAPI_API_KEY:
        providers.append(SerpApiSearchProvider(SERPAPI_API_KEY))
    if not providers:
        raise RuntimeError(
            "No search provider configured. Set TAVILY_API_KEY and/or SERPAPI_API_KEY in apps/scraper/.env"
        )
    return FallbackSearchProvider(providers)
