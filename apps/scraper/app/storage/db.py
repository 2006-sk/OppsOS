from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from typing import Iterator

from app.config import DB_PATH


def get_connection() -> sqlite3.Connection:
    if not DB_PATH.exists():
        raise RuntimeError(
            f"Database not found at {DB_PATH}. Run `npx prisma migrate dev` in apps/web first "
            "to create the shared schema."
        )
    conn = sqlite3.connect(str(DB_PATH), timeout=30)
    conn.row_factory = sqlite3.Row
    # Both this service and the Next.js app write to the same file — WAL lets
    # readers and writers coexist, and busy_timeout makes SQLite retry
    # instead of raising "database is locked" on the (rare) write collision.
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


@contextmanager
def connection() -> Iterator[sqlite3.Connection]:
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
