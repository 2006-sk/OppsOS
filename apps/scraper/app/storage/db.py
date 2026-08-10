from __future__ import annotations

import libsql_client

from app.config import TURSO_AUTH_TOKEN, TURSO_HTTP_URL

_client: libsql_client.ClientSync | None = None


def get_client() -> libsql_client.ClientSync:
    global _client
    if _client is None:
        if not TURSO_HTTP_URL:
            raise RuntimeError(
                "TURSO_DATABASE_URL is not set. Add it (and TURSO_AUTH_TOKEN) to apps/scraper/.env."
            )
        _client = libsql_client.create_client_sync(url=TURSO_HTTP_URL, auth_token=TURSO_AUTH_TOKEN)
    return _client


def execute(sql: str, params: list | None = None) -> libsql_client.ResultSet:
    return get_client().execute(sql, params or [])


def fetchone(sql: str, params: list | None = None) -> dict | None:
    rs = execute(sql, params)
    return rs.rows[0].asdict() if rs.rows else None


def fetchall(sql: str, params: list | None = None) -> list[dict]:
    rs = execute(sql, params)
    return [row.asdict() for row in rs.rows]


def batch(statements: list[tuple[str, list]]) -> None:
    """Runs multiple statements as a single atomic round-trip."""
    get_client().batch([libsql_client.Statement(sql, params) for sql, params in statements])
