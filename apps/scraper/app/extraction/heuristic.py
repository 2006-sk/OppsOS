from __future__ import annotations

import re

from dateutil import parser as dateparser

from app.extraction.base import Extractor
from app.extraction.schema import (
    MentionedCompetitions,
    OpportunityExtraction,
    RelevanceClassification,
)
from app.utils.fetch import FetchedPage
from app.utils.textclean import meta_description

RELEVANCE_KEYWORDS = [
    "competition",
    "olympiad",
    "fellowship",
    "scholarship",
    "hackathon",
    "challenge",
    "apply now",
    "eligibility",
    "deadline",
    "high school student",
    "secondary school",
    "grade 9",
    "grade 10",
    "grade 11",
    "grade 12",
]

DEADLINE_CONTEXT_RE = re.compile(
    r"(deadline|due date|apply by|submissions? close|submission deadline|closes on)"
    r"[^.\n]{0,60}?"
    r"([A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{1,2}/\d{1,2}/\d{2,4}|\d{4}-\d{2}-\d{2})",
    re.IGNORECASE,
)

FEE_RE = re.compile(
    r"(registration fee|entry fee|application fee)[^.\n]{0,40}?"
    r"(free|no cost|\$\s?\d+[\d,]*|₹\s?\d+[\d,]*|USD\s?\d+|INR\s?\d+)",
    re.IGNORECASE,
)

GRADE_RE = re.compile(r"grades?\s+(\d{1,2})\s*(?:-|to|–|through)\s*(\d{1,2})", re.IGNORECASE)
AGE_RE = re.compile(r"ages?\s+(\d{1,2})\s*(?:-|to|–|through)\s*(\d{1,2})", re.IGNORECASE)
TEAM_SIZE_RE = re.compile(
    r"team[s]?\s+of\s+(?:up to\s+)?(\d{1,2})(?:\s*(?:-|to|–)\s*(\d{1,2}))?", re.IGNORECASE
)

# Capitalized phrase (2-6 words) immediately followed by a competition-type
# noun, e.g. "Diamond Challenge", "The Earth Prize" — a weak signal used only
# when no LLM is configured; every match still goes through independent
# verification in winner_mining before anything is trusted.
MENTION_RE = re.compile(
    r"\b((?:[A-Z][\w&.]*\s+){0,5}[A-Z][\w&.]*\s+"
    r"(?:Competition|Challenge|Olympiad|Fair|Fellowship|Prize|Award|Hackathon|Program))\b"
)


def _parse_fee(text: str) -> float | None:
    lowered = text.lower()
    if "free" in lowered or "no cost" in lowered:
        return 0.0
    digits = re.sub(r"[^\d.]", "", text)
    return float(digits) if digits else None


class HeuristicExtractor(Extractor):
    """Regex/rule-based fallback used when OPENAI_API_KEY is not set, or if
    the LLM call fails. Deliberately conservative: most fields stay null
    rather than risk a wrong guess, and source_confidence is scored lower
    downstream for anything this extractor produces (see validation module)."""

    name = "heuristic"

    def classify(self, page: FetchedPage) -> RelevanceClassification:
        text = page.cleaned_text.lower()
        hits = [kw for kw in RELEVANCE_KEYWORDS if kw in text]
        is_legit = len(hits) >= 2
        return RelevanceClassification(
            is_legitimate_opportunity=is_legit,
            is_relevant_to_secondary_school=is_legit,
            reason=f"heuristic keyword match ({len(hits)} hits: {', '.join(hits[:5])})"
            if hits
            else "no relevant keywords found",
        )

    def extract(self, page: FetchedPage) -> OpportunityExtraction:
        text = page.cleaned_text
        result = OpportunityExtraction()
        result.name = page.title
        result.description = meta_description(page.html)
        result.official_url = page.final_url

        deadline_match = DEADLINE_CONTEXT_RE.search(text)
        if deadline_match:
            raw_date = deadline_match.group(2)
            try:
                parsed = dateparser.parse(raw_date, fuzzy=False)
                result.deadline = parsed.date().isoformat()
                result.deadline_evidence = deadline_match.group(0).strip()
            except (ValueError, OverflowError):
                pass

        fee_match = FEE_RE.search(text)
        if fee_match:
            result.application_fee = _parse_fee(fee_match.group(2))

        grade_match = GRADE_RE.search(text)
        if grade_match:
            result.min_grade = int(grade_match.group(1))
            result.max_grade = int(grade_match.group(2))

        age_match = AGE_RE.search(text)
        if age_match:
            result.min_age = int(age_match.group(1))
            result.max_age = int(age_match.group(2))

        team_match = TEAM_SIZE_RE.search(text)
        if team_match:
            result.team_allowed = True
            result.team_size_min = int(team_match.group(1)) if not team_match.group(2) else 1
            result.team_size_max = int(team_match.group(2) or team_match.group(1))

        return result

    def extract_mentioned_competitions(self, page: FetchedPage) -> MentionedCompetitions:
        matches = {m.group(1).strip() for m in MENTION_RE.finditer(page.cleaned_text)}
        return MentionedCompetitions(names=sorted(matches))
