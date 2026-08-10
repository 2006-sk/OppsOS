from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import urlparse

from rapidfuzz import fuzz

# The same competition often turns up under slightly different names
# ("Diamond Challenge" vs "University of Delaware Diamond Challenge") — name
# similarity alone is unreliable, so this combines normalized-name fuzzy
# matching with domain matching, per spec section 17.

_SUFFIX_WORDS = {"the", "inc", "foundation", "official", "website", "program", "competition"}


@dataclass
class ExistingOpportunityRef:
    id: str
    name: str
    official_url: str


def normalize_name(name: str) -> str:
    lowered = re.sub(r"[^a-z0-9\s]", " ", name.lower())
    words = [w for w in lowered.split() if w not in _SUFFIX_WORDS]
    return " ".join(words).strip()


def domain_of(url: str | None) -> str:
    if not url:
        return ""
    return urlparse(url).netloc.lower().removeprefix("www.")


def find_duplicate(
    candidate_name: str,
    candidate_official_url: str | None,
    existing: list[ExistingOpportunityRef],
    name_similarity_threshold: int = 88,
    domain_match_similarity_threshold: int = 70,
) -> ExistingOpportunityRef | None:
    norm_candidate = normalize_name(candidate_name)
    candidate_domain = domain_of(candidate_official_url)

    best_match: ExistingOpportunityRef | None = None
    best_score = 0
    for existing_opp in existing:
        norm_existing = normalize_name(existing_opp.name)
        # token_sort_ratio: strict, compares full word sets — used as the
        # standalone (no domain corroboration) high-confidence signal.
        strict_similarity = fuzz.token_sort_ratio(norm_candidate, norm_existing)
        # token_set_ratio: tolerant of one name being a superset of the
        # other's words (e.g. "Diamond Challenge" vs "University of Delaware
        # Diamond Challenge") — only trusted when the domain also matches,
        # since alone it's too easy to collide on a generic shared word.
        lenient_similarity = fuzz.token_set_ratio(norm_candidate, norm_existing)
        same_domain = bool(candidate_domain) and candidate_domain == domain_of(existing_opp.official_url)

        is_duplicate = strict_similarity >= name_similarity_threshold or (
            same_domain and lenient_similarity >= domain_match_similarity_threshold
        )
        similarity = max(strict_similarity, lenient_similarity if same_domain else 0)
        if is_duplicate and similarity > best_score:
            best_score = similarity
            best_match = existing_opp

    return best_match
