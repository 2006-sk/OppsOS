from __future__ import annotations

import urllib.robotparser
from urllib.parse import urlparse

import requests

from app.config import REQUEST_TIMEOUT_SECONDS, USER_AGENT

_cache: dict[str, urllib.robotparser.RobotFileParser] = {}


def _get_parser(base_url: str) -> urllib.robotparser.RobotFileParser:
    if base_url in _cache:
        return _cache[base_url]

    parser = urllib.robotparser.RobotFileParser()
    robots_url = f"{base_url}/robots.txt"
    try:
        resp = requests.get(
            robots_url, timeout=REQUEST_TIMEOUT_SECONDS, headers={"User-Agent": USER_AGENT}
        )
        if resp.status_code >= 400:
            parser.parse([])  # no robots.txt -> treat as allow-all
        else:
            parser.parse(resp.text.splitlines())
    except requests.RequestException:
        parser.parse([])  # fail open on robots.txt fetch errors, not on the page itself
    _cache[base_url] = parser
    return parser


def is_allowed(url: str) -> bool:
    parsed = urlparse(url)
    base_url = f"{parsed.scheme}://{parsed.netloc}"
    parser = _get_parser(base_url)
    try:
        return parser.can_fetch(USER_AGENT, url)
    except Exception:
        return True
