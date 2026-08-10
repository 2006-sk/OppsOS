from __future__ import annotations

import asyncio

from app.discovery.pipeline import process_candidate_url
from app.discovery.queries import pick_rotating_queries, pick_rotating_winner_mining_queries
from app.discovery.winner_mining import mine_query
from app.providers import get_search_provider
from app.storage import repository as repo
from app.utils.logs import get_logger, log_event

logger = get_logger("discovery.run")


async def run_discovery(
    query_count: int = 5, winner_mining_count: int = 1, max_results_per_query: int = 8
) -> dict:
    run_id = repo.start_scrape_run("discovery")
    provider = get_search_provider()
    discovered = duplicate = rejected = errors = 0
    logs: list[dict] = []

    queries = pick_rotating_queries(query_count)
    log_event(logger, "discovery_run_started", run_id=run_id, query_count=len(queries))

    for group, query in queries:
        try:
            results = await provider.search(query, max_results=max_results_per_query)
        except Exception as e:
            errors += 1
            log_event(logger, "search_failed", query=query, error=str(e))
            logs.append({"stage": "search", "query": query, "error": str(e)})
            continue

        for result in results:
            try:
                # process_candidate_url is synchronous and may fall back to
                # Playwright's sync API internally — calling it directly
                # here (on the thread running this asyncio event loop)
                # makes Playwright refuse with "Sync API inside the asyncio
                # loop". Running it on a worker thread via to_thread sidesteps
                # that; it also means one slow URL doesn't block the loop.
                outcome = await asyncio.to_thread(
                    process_candidate_url,
                    url=result.url,
                    title=result.title,
                    snippet=result.snippet,
                    domain=result.domain,
                    discovered_by_query=query,
                    discovery_provider=getattr(provider, "last_used_provider", None) or provider.name,
                )
            except Exception as e:
                # One bad domain/page must not kill the whole run (spec section 30).
                errors += 1
                log_event(logger, "process_url_failed", url=result.url, error=str(e))
                logs.append({"stage": "process", "url": result.url, "error": str(e)})
                continue

            if outcome.outcome == "discovered":
                discovered += 1
            elif outcome.outcome == "duplicate":
                duplicate += 1
            else:
                rejected += 1

    for winner_query in pick_rotating_winner_mining_queries(winner_mining_count):
        try:
            outcomes = await mine_query(provider, winner_query)
            for outcome in outcomes:
                if outcome.outcome == "discovered":
                    discovered += 1
                elif outcome.outcome == "duplicate":
                    duplicate += 1
                else:
                    rejected += 1
        except Exception as e:
            errors += 1
            log_event(logger, "winner_mining_failed", query=winner_query, error=str(e))
            logs.append({"stage": "winner_mining", "query": winner_query, "error": str(e)})

    status = "success" if errors == 0 else ("partial" if discovered or duplicate else "failed")
    repo.finish_scrape_run(
        run_id, status, discovered_count=discovered, updated_count=0, error_count=errors, logs=logs
    )
    summary = {"discovered": discovered, "duplicate": duplicate, "rejected": rejected, "errors": errors}
    log_event(logger, "discovery_run_complete", run_id=run_id, **summary)
    return summary


def main() -> None:
    result = asyncio.run(run_discovery())
    print(result)


if __name__ == "__main__":
    main()
