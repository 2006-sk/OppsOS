from __future__ import annotations

import json

import yaml

from app.config import QUERIES_CONFIG_PATH, SCRAPER_ROOT

STATE_PATH = SCRAPER_ROOT / ".discovery_state.json"


def load_query_groups() -> dict[str, list[str]]:
    with open(QUERIES_CONFIG_PATH) as f:
        return yaml.safe_load(f)


def _flatten(groups: dict[str, list[str]]) -> list[tuple[str, str]]:
    return [(group, query) for group, queries in groups.items() if group != "winner_mining" for query in queries]


def _load_state() -> dict:
    if STATE_PATH.exists():
        try:
            return json.loads(STATE_PATH.read_text())
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def _save_state(state: dict) -> None:
    STATE_PATH.write_text(json.dumps(state))


def _rotate(items: list, count: int, cursor_key: str) -> list:
    if not items:
        return []
    state = _load_state()
    cursor = state.get(cursor_key, 0) % len(items)
    selected = [items[(cursor + i) % len(items)] for i in range(min(count, len(items)))]
    state[cursor_key] = (cursor + count) % len(items)
    _save_state(state)
    return selected


def pick_rotating_queries(count: int = 5) -> list[tuple[str, str]]:
    """Round-robins through all configured queries across runs, so a
    scheduled job doesn't hammer the same handful of queries every time
    (spec: "Run rotating queries, not every query every hour")."""
    flat = _flatten(load_query_groups())
    return _rotate(flat, count, "cursor")


def pick_rotating_winner_mining_queries(count: int = 2) -> list[str]:
    queries = load_query_groups().get("winner_mining", [])
    return _rotate(queries, count, "winner_mining_cursor")
