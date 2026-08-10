from __future__ import annotations

from datetime import date, datetime, timedelta
from urllib.parse import urlparse

MAX_FUTURE_YEARS = 3
MAX_PAST_DAYS_UNLESS_ARCHIVED = 400  # a stale-but-plausible past deadline; older is suspicious

SCAM_PHRASES = [
    "wire transfer",
    "processing fee to claim your prize",
    "guaranteed winner",
    "send money via gift card",
    "claim your prize now",
    "you have been selected to receive",
    "no purchase necessary to win cash",
    "urgent: claim within 24 hours",
]

TRUSTED_APPLICATION_DOMAINS = [
    "docs.google.com",
    "forms.gle",
    "form.jotform.com",
    "submittable.com",
    "airtable.com",
    "typeform.com",
]


def parse_iso_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value).date()
    except ValueError:
        return None


def is_plausible_deadline(value: date | None, today: date | None = None) -> bool:
    if value is None:
        return True  # absence is fine; implausibility is about a *stated* bad value
    today = today or date.today()
    if value > today + timedelta(days=365 * MAX_FUTURE_YEARS):
        return False
    if value < today - timedelta(days=MAX_PAST_DAYS_UNLESS_ARCHIVED):
        return False
    return True


def is_sane_grade_range(min_grade: int | None, max_grade: int | None) -> bool:
    if min_grade is not None and not (1 <= min_grade <= 12):
        return False
    if max_grade is not None and not (1 <= max_grade <= 12):
        return False
    if min_grade is not None and max_grade is not None and min_grade > max_grade:
        return False
    return True


def is_valid_url(url: str | None) -> bool:
    if not url:
        return False
    parsed = urlparse(url)
    return parsed.scheme in ("http", "https") and bool(parsed.netloc)


def application_domain_is_trusted(application_url: str | None, official_url: str | None) -> bool:
    if not application_url:
        return True  # nothing to distrust
    app_domain = urlparse(application_url).netloc.lower()
    official_domain = urlparse(official_url or "").netloc.lower()
    if official_domain and app_domain.endswith(official_domain.replace("www.", "")):
        return True
    return any(app_domain.endswith(d) for d in TRUSTED_APPLICATION_DOMAINS)


def detect_scam_language(text: str) -> list[str]:
    lowered = text.lower()
    return [phrase for phrase in SCAM_PHRASES if phrase in lowered]


def compute_source_confidence(
    *,
    is_official_source: bool,
    has_deadline: bool,
    has_eligibility: bool,
    scam_flags: list[str],
    extractor_name: str,
) -> int:
    if scam_flags:
        return 5

    score = 30
    if is_official_source:
        score += 30
    if has_deadline:
        score += 15
    if has_eligibility:
        score += 15
    if extractor_name in ("heuristic", "llm_json_mode"):
        # Neither has a provider-enforced schema guarantee (heuristic is
        # regex-based; llm_json_mode's JSON isn't schema-validated by the
        # API itself, only by us after the fact) — cap confidence for both.
        score = min(score, 55)
    return max(0, min(100, score))
