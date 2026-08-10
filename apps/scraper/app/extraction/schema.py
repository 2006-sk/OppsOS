from __future__ import annotations

from pydantic import BaseModel, Field

from app.utils.enums import CATEGORIES, CERTIFICATE_LEVELS, EDUCATION_LEVELS, OPPORTUNITY_STATUSES


class AwardExtraction(BaseModel):
    """A single named award/certificate this opportunity gives out. The
    participation-vs-winner distinction is load-bearing for the UI — never
    collapse it into a single 'awarded' boolean."""

    title: str
    certificate_level: str = Field(description=f"one of: {', '.join(CERTIFICATE_LEVELS)}")
    description: str | None = None


class OpportunityExtraction(BaseModel):
    """Structured facts pulled from a single page. Every field is optional —
    the extractor (LLM or heuristic) must return null for anything not
    directly stated on the page rather than inferring or guessing. See
    extraction/llm.py's system prompt for the enforcement of this rule."""

    name: str | None = None
    organization: str | None = None
    description: str | None = None
    category: str | None = Field(default=None, description=f"one of: {', '.join(CATEGORIES)}")
    official_url: str | None = None
    application_url: str | None = None

    eligible_countries: list[str] | None = None
    min_grade: int | None = None
    max_grade: int | None = None
    min_age: int | None = None
    max_age: int | None = None
    education_levels: list[str] | None = Field(
        default=None, description=f"subset of: {', '.join(EDUCATION_LEVELS)} — only if explicitly stated"
    )
    citizenship_requirements: list[str] | None = Field(
        default=None,
        description="nationality/citizenship restrictions, distinct from residence-based eligible_countries",
    )
    school_nomination_required: bool | None = None
    institution_nomination_required: bool | None = None

    individual_allowed: bool | None = None
    team_allowed: bool | None = None
    team_size_min: int | None = None
    team_size_max: int | None = None

    deadline: str | None = Field(default=None, description="ISO 8601 date, e.g. 2026-10-03")
    opens_at: str | None = None
    application_fee: float | None = None
    fee_currency: str | None = None
    prize_description: str | None = None

    requirements: list[str] | None = None
    judging_criteria: list[str] | None = None
    submission_requirements: list[str] | None = None
    stages: list[str] | None = None
    awards: list[AwardExtraction] | None = None

    status: str | None = Field(default=None, description=f"one of: {', '.join(OPPORTUNITY_STATUSES)}")

    # Evidence: short, quoted or closely-paraphrased snippet from the page
    # that supports the corresponding field, so a human can verify it fast.
    deadline_evidence: str | None = None
    eligibility_evidence: str | None = None
    prize_evidence: str | None = None


class RelevanceClassification(BaseModel):
    is_legitimate_opportunity: bool
    is_relevant_to_secondary_school: bool
    reason: str


class MentionedCompetitions(BaseModel):
    """Output of the winner-mining name-extraction step. These are
    unverified leads, not confirmed opportunities — see discovery/winner_mining.py."""

    names: list[str]
