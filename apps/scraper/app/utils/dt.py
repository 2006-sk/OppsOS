from __future__ import annotations

from datetime import date, datetime, timezone

# Prisma's SQLite connector stores DateTime columns as INTEGER epoch
# milliseconds (verified empirically against rows the Next.js/Prisma side
# wrote — NOT ISO strings). Every write from this service must match that
# representation or the web app will fail to parse dates back out.


def now_epoch_ms() -> int:
    return to_epoch_ms(datetime.now(timezone.utc))


def to_epoch_ms(dt: datetime) -> int:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp() * 1000)


def epoch_ms_to_datetime(ms: int | None) -> datetime | None:
    if ms is None:
        return None
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc)


def iso_date_to_epoch_ms(iso_date: str | None) -> int | None:
    """Date-only strings (e.g. '2026-10-03') from extraction are treated as
    UTC midnight, matching how `new Date('2026-10-03')` behaves in JS."""
    if not iso_date:
        return None
    try:
        d = date.fromisoformat(iso_date)
    except ValueError:
        return None
    return to_epoch_ms(datetime(d.year, d.month, d.day, tzinfo=timezone.utc))
