from __future__ import annotations

import asyncio

from app.discovery.pipeline import ProcessResult, process_candidate_url
from app.extraction import get_extractor
from app.providers.base import SearchProvider
from app.utils.fetch import fetch_page
from app.utils.logs import get_logger, log_event

logger = get_logger("discovery.winner_mining")


async def mine_query(provider: SearchProvider, query: str, max_results: int = 5) -> list[ProcessResult]:
    """Finds articles/profiles about successful students, extracts
    competition NAMES they mention, then independently verifies each name by
    searching for its official site and running it through the normal
    discovery pipeline — spec section 11 explicitly forbids trusting a
    mentioned award without separately confirming it's a real, describable
    opportunity."""
    results = []
    search_results = await provider.search(query, max_results=max_results)
    extractor = get_extractor()

    mentioned_names: set[str] = set()
    for result in search_results:
        # fetch_page is synchronous and may fall back to Playwright's sync
        # API — must run off this coroutine's thread, same reason as in
        # discovery/run.py.
        page = await asyncio.to_thread(fetch_page, result.url)
        if page is None:
            continue
        mentions = extractor.extract_mentioned_competitions(page)
        mentioned_names.update(mentions.names)

    log_event(logger, "winner_mining_names_found", query=query, count=len(mentioned_names))

    for name in mentioned_names:
        verify_query = f'"{name}" official site'
        verify_results = await provider.search(verify_query, max_results=3)
        for vr in verify_results:
            outcome = await asyncio.to_thread(
                process_candidate_url,
                url=vr.url,
                title=vr.title,
                snippet=vr.snippet,
                domain=vr.domain,
                discovered_by_query=f"winner_mining:{name}",
                discovery_provider=getattr(provider, "last_used_provider", None) or provider.name,
            )
            results.append(outcome)
            if outcome.outcome == "discovered":
                break  # first verified official-looking page for this name is enough
    return results
