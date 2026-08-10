from __future__ import annotations

from app.monitoring.pipeline import run_monitoring


def main() -> None:
    result = run_monitoring()
    print(result)


if __name__ == "__main__":
    main()
