from __future__ import annotations

from app.monitoring.pipeline import run_monitoring


def main() -> None:
    try:
        result = run_monitoring()
        print(result)
    finally:
        # Without this the process hangs indefinitely — see db.close_client().
        from app.storage.db import close_client

        close_client()


if __name__ == "__main__":
    main()
