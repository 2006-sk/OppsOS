from __future__ import annotations

from app.extraction.schema import OpportunityExtraction

# Deterministic v1 heuristics per spec section 19. These are explicitly NOT
# claimed to be objective truths (section 19/36) — they're a documented,
# adjustable starting point. fit_score is intentionally NOT computed here:
# it depends on a specific student's profile and is computed by the web app
# at read time (apps/web/src/lib/fit.ts), joining a profile against these
# opportunity-level scores.

PRESTIGE_KEYWORDS = ["international", "global", "world", "national"]
TECHNICAL_DEPTH_KEYWORDS = ["research paper", "business plan", "prototype", "patent", "thesis", "manuscript"]
RECOGNITION_KEYWORDS = ["scholarship", "internship offer", "published", "represent", "fully funded"]


def _text_blob(extraction: OpportunityExtraction) -> str:
    return " ".join(
        filter(None, [extraction.description, extraction.prize_description, extraction.name])
    ).lower()


def compute_difficulty_score(extraction: OpportunityExtraction) -> int:
    score = 35
    if extraction.stages and len(extraction.stages) > 1:
        score += 15
    if extraction.team_size_max and extraction.team_size_max > 1:
        score += 5
    reqs = (extraction.requirements or []) + (extraction.submission_requirements or [])
    if len(reqs) >= 3:
        score += 15
    text = _text_blob(extraction)
    if any(k in text for k in TECHNICAL_DEPTH_KEYWORDS):
        score += 15
    if any(k in text for k in PRESTIGE_KEYWORDS):
        score += 10
    return max(0, min(100, score))


def _parse_prize_amount(prize_description: str | None) -> float | None:
    if not prize_description:
        return None
    import re

    matches = re.findall(r"[\$₹]\s?([\d,]{2,})", prize_description)
    if not matches:
        return None
    try:
        return max(float(m.replace(",", "")) for m in matches)
    except ValueError:
        return None


def compute_value_score(extraction: OpportunityExtraction, legitimacy_score: int) -> int:
    score = 20 + round(legitimacy_score * 0.3)  # legitimacy is a floor/ceiling influence, not the whole story

    prize_amount = _parse_prize_amount(extraction.prize_description)
    if prize_amount is not None:
        if prize_amount >= 50000:
            score += 25
        elif prize_amount >= 5000:
            score += 15
        elif prize_amount > 0:
            score += 8

    text = _text_blob(extraction)
    if any(k in text for k in RECOGNITION_KEYWORDS):
        score += 15
    if any(k in text for k in PRESTIGE_KEYWORDS):
        score += 10

    return max(0, min(100, score))


def compute_legitimacy_score(
    *, is_official_source: bool, has_organization: bool, has_clear_eligibility: bool, scam_flags: list[str]
) -> int:
    if scam_flags:
        return 5
    score = 40
    if is_official_source:
        score += 30
    if has_organization:
        score += 15
    if has_clear_eligibility:
        score += 15
    return max(0, min(100, score))
