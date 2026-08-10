from __future__ import annotations

import time
from urllib.parse import urlparse

from app.config import DOMAIN_THROTTLE_SECONDS

_last_request_at: dict[str, float] = {}


def wait_for_domain(url: str) -> None:
    """In-process, per-run domain throttle. Discovery/monitoring runs are
    short-lived scheduled jobs (GitHub Actions), so an in-memory map is
    sufficient — it resets each run, which is fine since the goal is to
    avoid bursting a single site within one run, not across runs."""
    domain = urlparse(url).netloc
    last = _last_request_at.get(domain)
    now = time.monotonic()
    if last is not None:
        elapsed = now - last
        if elapsed < DOMAIN_THROTTLE_SECONDS:
            time.sleep(DOMAIN_THROTTLE_SECONDS - elapsed)
    _last_request_at[domain] = time.monotonic()
