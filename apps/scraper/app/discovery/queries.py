from __future__ import annotations

import json

import yaml

from app.config import QUERIES_CONFIG_PATH, SCRAPER_ROOT

STATE_PATH = SCRAPER_ROOT / ".discovery_state.json"

# Groups excluded from the default rotation (pick_rotating_queries() with no
# `group` argument) — each has its own dedicated entry point instead, so
# adding a new group here never changes what the default/scheduled
# discovery.yml run does. "undergraduate_usa" is its own lane
# (discovery-undergrad.yml) precisely so the existing high-school lane's
# behavior stays identical to before it was added.
DEFAULT_ROTATION_EXCLUDED_GROUPS = {"winner_mining", "undergraduate_usa"}


def load_query_groups() -> dict[str, list[str]]:
    with open(QUERIES_CONFIG_PATH) as f:
        return yaml.safe_load(f)


def _flatten(groups: dict[str, list[str]], *, excluded: set[str]) -> list[tuple[str, str]]:
    return [(group, query) for group, queries in groups.items() if group not in excluded for query in queries]


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


def pick_rotating_queries(count: int = 5, *, group: str | None = None) -> list[tuple[str, str]]:
    """Round-robins through configured queries across runs, so a scheduled
    job doesn't hammer the same handful of queries every time (spec: "Run
    rotating queries, not every query every hour").

    With no `group`, rotates the default pool (every group except the ones
    in DEFAULT_ROTATION_EXCLUDED_GROUPS) — this is exactly what it did
    before dedicated lanes existed, unchanged. Pass `group` to rotate a
    single dedicated lane (its own cursor, independent of the default pool's)
    — see discovery/run.py's `query_group` param and discovery-undergrad.yml.
    """
    groups = load_query_groups()
    if group is not None:
        flat = [(group, q) for q in groups.get(group, [])]
        return _rotate(flat, count, f"cursor_{group}")
    flat = _flatten(groups, excluded=DEFAULT_ROTATION_EXCLUDED_GROUPS)
    return _rotate(flat, count, "cursor")


def pick_rotating_winner_mining_queries(count: int = 2) -> list[str]:
    queries = load_query_groups().get("winner_mining", [])
    return _rotate(queries, count, "winner_mining_cursor")
