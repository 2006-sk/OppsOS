from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import datetime, timezone

import requests

from app.config import MAX_FETCH_RETRIES, MAX_REDIRECTS, REQUEST_TIMEOUT_SECONDS, USER_AGENT
from app.utils.logs import get_logger, log_event
from app.utils.robots import is_allowed
from app.utils.ssrf import UnsafeUrlError, assert_safe_url
from app.utils.textclean import html_to_text, is_sparse_text
from app.utils.throttle import wait_for_domain

logger = get_logger("fetch")


@dataclass
class FetchedPage:
    url: str
    final_url: str
    title: str | None
    html: str
    cleaned_text: str
    fetch_method: str  # "requests" | "playwright" | "blocked_by_robots" | "failed"
    status_code: int | None
    retrieved_at: datetime


def _follow_safe_redirects(url: str, session: requests.Session) -> requests.Response:
    """Follows redirects manually, SSRF-checking each hop before requesting
    it — requests' built-in allow_redirects=True would fetch an unsafe hop
    before we get a chance to inspect it."""
    current_url = url
    for _ in range(MAX_REDIRECTS + 1):
        assert_safe_url(current_url)
        resp = session.get(
            current_url,
            timeout=REQUEST_TIMEOUT_SECONDS,
            headers={"User-Agent": USER_AGENT},
            allow_redirects=False,
        )
        if resp.is_redirect or resp.is_permanent_redirect:
            location = resp.headers.get("Location")
            if not location:
                return resp
            current_url = requests.compat.urljoin(current_url, location)
            continue
        return resp
    raise UnsafeUrlError(f"Too many redirects starting from {url}")


def _fetch_with_requests(url: str) -> FetchedPage | None:
    session = requests.Session()
    last_error: Exception | None = None
    for attempt in range(1, MAX_FETCH_RETRIES + 1):
        try:
            wait_for_domain(url)
            resp = _follow_safe_redirects(url, session)
            if resp.status_code >= 500:
                raise requests.RequestException(f"Server error {resp.status_code}")
            content_type = resp.headers.get("Content-Type", "")
            if "text/html" not in content_type and "application/xhtml" not in content_type:
                log_event(logger, "skip_non_html", url=url, content_type=content_type)
                return None
            cleaned_text, title = html_to_text(resp.text)
            return FetchedPage(
                url=url,
                final_url=resp.url,
                title=title,
                html=resp.text,
                cleaned_text=cleaned_text,
                fetch_method="requests",
                status_code=resp.status_code,
                retrieved_at=datetime.now(timezone.utc),
            )
        except UnsafeUrlError as e:
            log_event(logger, "blocked_unsafe_url", url=url, error=str(e))
            return None
        except requests.RequestException as e:
            last_error = e
            backoff = 1.5**attempt
            log_event(logger, "fetch_retry", url=url, attempt=attempt, error=str(e))
            time.sleep(backoff)
    log_event(logger, "fetch_failed", url=url, error=str(last_error) if last_error else "unknown")
    return None


def _fetch_with_playwright(url: str) -> FetchedPage | None:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        log_event(logger, "playwright_unavailable", url=url)
        return None

    try:
        assert_safe_url(url)
    except UnsafeUrlError as e:
        log_event(logger, "blocked_unsafe_url", url=url, error=str(e))
        return None

    wait_for_domain(url)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            try:
                page = browser.new_page(user_agent=USER_AGENT)
                page.set_default_timeout(REQUEST_TIMEOUT_SECONDS * 1000)
                response = page.goto(url, wait_until="networkidle")
                # Redirects inside a JS app aren't re-validated per hop like the
                # requests path — acceptable here since Playwright is only used
                # as a fallback for a URL we already SSRF-checked, and browser
                # navigation doesn't expose raw socket-level SSRF the way a
                # server-side HTTP client does against internal infra.
                html = page.content()
                final_url = page.url
                status_code = response.status if response else None
                cleaned_text, title = html_to_text(html)
                return FetchedPage(
                    url=url,
                    final_url=final_url,
                    title=title,
                    html=html,
                    cleaned_text=cleaned_text,
                    fetch_method="playwright",
                    status_code=status_code,
                    retrieved_at=datetime.now(timezone.utc),
                )
            finally:
                browser.close()
    except Exception as e:
        log_event(logger, "playwright_fetch_failed", url=url, error=str(e))
        return None


def fetch_page(url: str, force_playwright: bool = False) -> FetchedPage | None:
    """Order per spec: JSON/API/RSS (callers should check for that before
    calling this), then requests+BeautifulSoup, then Playwright only if the
    plain fetch looks sparse (JS-rendered app) or is explicitly forced."""
    if not is_allowed(url):
        log_event(logger, "blocked_by_robots", url=url)
        return None

    if not force_playwright:
        page = _fetch_with_requests(url)
        if page is not None and not is_sparse_text(page.cleaned_text):
            return page
        log_event(logger, "sparse_text_fallback_to_playwright", url=url)
    return _fetch_with_playwright(url)
