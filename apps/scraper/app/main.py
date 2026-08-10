from __future__ import annotations

import time

from fastapi import Depends, FastAPI, Header, HTTPException, Request

from app.config import SCRAPER_API_SECRET
from app.discovery.run import run_discovery
from app.monitoring.pipeline import run_monitoring
from app.utils.fetch import fetch_page
from app.utils.logs import get_logger, log_event
from app.utils.ssrf import UnsafeUrlError, assert_safe_url

logger = get_logger("api")

app = FastAPI(title="Opportunity OS Scraper", version="0.1.0")

# --- simple in-process rate limit for operational endpoints -----------------
_RATE_LIMIT_WINDOW_SECONDS = 60
_RATE_LIMIT_MAX_REQUESTS = 5
_request_log: dict[str, list[float]] = {}


def rate_limit(request: Request) -> None:
    client_key = request.client.host if request.client else "unknown"
    now = time.monotonic()
    history = [t for t in _request_log.get(client_key, []) if now - t < _RATE_LIMIT_WINDOW_SECONDS]
    if len(history) >= _RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    history.append(now)
    _request_log[client_key] = history


def require_api_secret(x_api_key: str | None = Header(default=None)) -> None:
    if not SCRAPER_API_SECRET:
        raise HTTPException(status_code=503, detail="SCRAPER_API_SECRET is not configured on the server")
    if x_api_key != SCRAPER_API_SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key header")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/discovery/run", dependencies=[Depends(require_api_secret), Depends(rate_limit)])
async def trigger_discovery() -> dict:
    log_event(logger, "api_discovery_run_triggered")
    return await run_discovery()


@app.post("/monitoring/run", dependencies=[Depends(require_api_secret), Depends(rate_limit)])
def trigger_monitoring() -> dict:
    log_event(logger, "api_monitoring_run_triggered")
    return run_monitoring()


@app.post("/scrape/url", dependencies=[Depends(require_api_secret), Depends(rate_limit)])
def scrape_url(payload: dict) -> dict:
    url = payload.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="Missing 'url' in request body")
    try:
        assert_safe_url(url)
    except UnsafeUrlError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    page = fetch_page(url)
    if page is None:
        raise HTTPException(status_code=502, detail="Failed to fetch URL")
    return {
        "url": page.url,
        "final_url": page.final_url,
        "title": page.title,
        "fetch_method": page.fetch_method,
        "status_code": page.status_code,
        "cleaned_text_preview": page.cleaned_text[:1000],
    }
