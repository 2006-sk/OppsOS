from datetime import date

from app.validation.validators import (
    application_domain_is_trusted,
    compute_source_confidence,
    detect_scam_language,
    is_plausible_deadline,
    is_sane_grade_range,
    is_valid_url,
    parse_iso_date,
)


def test_parse_iso_date_valid_and_invalid():
    assert parse_iso_date("2026-10-03") == date(2026, 10, 3)
    assert parse_iso_date("not a date") is None
    assert parse_iso_date(None) is None


def test_plausible_deadline_rejects_far_future_and_far_past():
    today = date(2026, 8, 8)
    assert is_plausible_deadline(date(2026, 12, 1), today=today) is True
    assert is_plausible_deadline(date(2031, 1, 1), today=today) is False  # >3 years out
    assert is_plausible_deadline(date(2020, 1, 1), today=today) is False  # long past
    assert is_plausible_deadline(None, today=today) is True


def test_sane_grade_range():
    assert is_sane_grade_range(9, 12) is True
    assert is_sane_grade_range(12, 9) is False  # min > max
    assert is_sane_grade_range(0, 12) is False  # out of 1-12
    assert is_sane_grade_range(None, None) is True


def test_valid_url():
    assert is_valid_url("https://example.com/apply") is True
    assert is_valid_url("not-a-url") is False
    assert is_valid_url(None) is False


def test_application_domain_trust():
    assert application_domain_is_trusted(None, "https://example.com") is True
    assert application_domain_is_trusted("https://forms.gle/abc", "https://example.com") is True
    assert application_domain_is_trusted("https://example.com/apply", "https://example.com") is True
    assert application_domain_is_trusted("https://sketchy-forms.biz/x", "https://example.com") is False


def test_detect_scam_language():
    assert detect_scam_language("Please arrange a wire transfer to claim your prize") != []
    assert detect_scam_language("Submit your application by the deadline.") == []


def test_source_confidence_scam_flags_override_everything():
    score = compute_source_confidence(
        is_official_source=True,
        has_deadline=True,
        has_eligibility=True,
        scam_flags=["guaranteed winner"],
        extractor_name="llm",
    )
    assert score == 5


def test_source_confidence_heuristic_capped():
    score = compute_source_confidence(
        is_official_source=True,
        has_deadline=True,
        has_eligibility=True,
        scam_flags=[],
        extractor_name="heuristic",
    )
    assert score <= 55


def test_source_confidence_official_with_full_facts_scores_high():
    score = compute_source_confidence(
        is_official_source=True,
        has_deadline=True,
        has_eligibility=True,
        scam_flags=[],
        extractor_name="llm",
    )
    assert score >= 80
