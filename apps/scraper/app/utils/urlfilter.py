from __future__ import annotations

from urllib.parse import urlparse

# Obvious junk domains that never host an opportunity's own content — social
# media homepages, search engines, video platforms, generic marketplaces.
# This is a coarse pre-filter, not a legitimacy check (that's the LLM/
# heuristic classification step).
BLOCKED_DOMAINS = {
    "facebook.com",
    "www.facebook.com",
    "twitter.com",
    "x.com",
    "instagram.com",
    "youtube.com",
    "www.youtube.com",
    "tiktok.com",
    "pinterest.com",
    "linkedin.com",
    "reddit.com",
    "amazon.com",
    "google.com",
    "www.google.com",
}

BLOCKED_EXTENSIONS = (".jpg", ".jpeg", ".png", ".gif", ".mp4", ".zip", ".exe", ".dmg")


def is_garbage_url(url: str) -> bool:
    parsed = urlparse(url)
    domain = parsed.netloc.lower()
    if domain in BLOCKED_DOMAINS:
        return True
    if parsed.path.lower().endswith(BLOCKED_EXTENSIONS):
        return True
    return False
