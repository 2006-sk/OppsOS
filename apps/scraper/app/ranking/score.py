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


def compute_value_score(extraction: OpportunityExtraction, legitimacy_score: int) -> int:
    # Never derived from prize/cash amount, deliberately — value here means
    # recognition, credential, and opportunity value, not cash. A $100,000
    # prize pool and a $0 prize pool must be able to score identically if
    # everything else about the opportunity is equal.
    score = 20 + round(legitimacy_score * 0.3)  # legitimacy is a floor/ceiling influence, not the whole story

    text = _text_blob(extraction)
    if any(k in text for k in RECOGNITION_KEYWORDS):
        score += 15
    if any(k in text for k in PRESTIGE_KEYWORDS):
        score += 10

    return max(0, min(100, score))


# Recognizable, well-established organizations — a deterministic signal for
# "major" classification. Not exhaustive; anything not on this list defaults
# to standard/hidden-gem based on legitimacy, never to "major" by guesswork.
WELL_KNOWN_ORG_KEYWORDS = [
    "regeneron",
    "intel",
    "google",
    "microsoft",
    "national geographic",
    "society for science",
    "acm",
    "ieee",
    "nasa",
    "mit",
    "harvard",
    "stanford",
    "united nations",
    "unesco",
]


def compute_classification(extraction: OpportunityExtraction, legitimacy_score: int) -> str:
    """Deterministic major/hidden_gem/standard classification (spec section
    on Major vs Hidden Gem). Never derived from prize amount. This is a
    coarse first pass: applicant/finalist/winner-count based classification
    is intentionally deferred until that data is reliably extracted.
    """
    if legitimacy_score < 50:
        return "standard"

    org = (extraction.organization or "").lower()
    text = _text_blob(extraction)
    is_well_known = any(k in org or k in text for k in WELL_KNOWN_ORG_KEYWORDS)

    if is_well_known and legitimacy_score >= 80:
        return "major"
    if legitimacy_score >= 70 and not is_well_known:
        return "hidden_gem"
    return "standard"


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
