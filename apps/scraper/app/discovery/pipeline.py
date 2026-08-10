from __future__ import annotations

from dataclasses import dataclass

from app.extraction import get_extractor
from app.extraction.dedup import find_duplicate
from app.ranking.score import compute_difficulty_score, compute_legitimacy_score, compute_value_score
from app.storage import repository as repo
from app.storage.repository import ScoredExtraction
from app.utils.fetch import fetch_page
from app.utils.logs import get_logger, log_event
from app.utils.urlfilter import is_garbage_url
from app.validation.validators import (
    application_domain_is_trusted,
    compute_source_confidence,
    detect_scam_language,
    is_plausible_deadline,
    is_sane_grade_range,
    is_valid_url,
    parse_iso_date,
)

logger = get_logger("discovery.pipeline")


@dataclass
class ProcessResult:
    outcome: str  # "discovered" | "duplicate" | "rejected" | "error"
    detail: str = ""


def process_candidate_url(
    *,
    url: str,
    title: str | None,
    snippet: str | None,
    domain: str | None,
    discovered_by_query: str | None,
    discovery_provider: str,
) -> ProcessResult:
    if is_garbage_url(url):
        return ProcessResult("rejected", "garbage_url")

    if repo.candidate_url_known(url):
        return ProcessResult("rejected", "already_known")

    page = fetch_page(url)
    if page is None:
        repo.save_candidate(
            url=url,
            title=title,
            snippet=snippet,
            domain=domain,
            discovered_by_query=discovered_by_query,
            discovery_provider=discovery_provider,
            state="rejected",
            reason="fetch_failed",
        )
        return ProcessResult("rejected", "fetch_failed")

    extractor = get_extractor()

    classification = extractor.classify(page)
    if not classification.is_legitimate_opportunity or not classification.is_relevant_to_secondary_school:
        repo.save_candidate(
            url=url,
            title=title or page.title,
            snippet=snippet,
            domain=domain,
            discovered_by_query=discovered_by_query,
            discovery_provider=discovery_provider,
            state="rejected",
            reason=classification.reason,
        )
        return ProcessResult("rejected", classification.reason)

    extraction = extractor.extract(page)
    extraction.official_url = extraction.official_url or page.final_url
    if not extraction.name:
        extraction.name = page.title

    if not extraction.name:
        repo.save_candidate(
            url=url,
            title=title,
            snippet=snippet,
            domain=domain,
            discovered_by_query=discovered_by_query,
            discovery_provider=discovery_provider,
            state="rejected",
            reason="no_name_extracted",
        )
        return ProcessResult("rejected", "no_name_extracted")

    # --- validation --------------------------------------------------------
    deadline_date = parse_iso_date(extraction.deadline)
    if extraction.deadline and (deadline_date is None or not is_plausible_deadline(deadline_date)):
        log_event(logger, "implausible_deadline_dropped", url=url, raw=extraction.deadline)
        extraction.deadline = None

    if not is_sane_grade_range(extraction.min_grade, extraction.max_grade):
        extraction.min_grade = None
        extraction.max_grade = None

    if extraction.application_url and not is_valid_url(extraction.application_url):
        extraction.application_url = None
    if extraction.application_url and not application_domain_is_trusted(
        extraction.application_url, extraction.official_url
    ):
        log_event(logger, "untrusted_application_domain", url=url, application_url=extraction.application_url)

    scam_flags = detect_scam_language(page.cleaned_text)
    if scam_flags:
        repo.save_candidate(
            url=url,
            title=extraction.name,
            snippet=snippet,
            domain=domain,
            discovered_by_query=discovered_by_query,
            discovery_provider=discovery_provider,
            state="rejected",
            reason=f"scam language detected: {scam_flags}",
        )
        return ProcessResult("rejected", "scam_language")

    # --- dedup ---------------------------------------------------------------
    existing = repo.list_existing_lightweight()
    duplicate = find_duplicate(extraction.name, extraction.official_url, existing)
    if duplicate:
        repo.save_candidate(
            url=url,
            title=extraction.name,
            snippet=snippet,
            domain=domain,
            discovered_by_query=discovered_by_query,
            discovery_provider=discovery_provider,
            state="duplicate",
            reason=f"matches existing opportunity: {duplicate.name}",
            opportunity_id=duplicate.id,
            extracted_name=extraction.name,
        )
        return ProcessResult("duplicate", duplicate.name)

    # --- scoring + persistence ---------------------------------------------
    is_official = extraction.official_url == page.final_url or (domain or "") in (page.final_url or "")
    legitimacy_score = compute_legitimacy_score(
        is_official_source=is_official,
        has_organization=bool(extraction.organization),
        has_clear_eligibility=bool(extraction.eligible_countries or extraction.min_grade or extraction.min_age),
        scam_flags=scam_flags,
    )
    scores = ScoredExtraction(
        difficulty_score=compute_difficulty_score(extraction),
        value_score=compute_value_score(extraction, legitimacy_score),
        legitimacy_score=legitimacy_score,
        source_confidence=compute_source_confidence(
            is_official_source=is_official,
            has_deadline=bool(extraction.deadline),
            has_eligibility=bool(extraction.eligible_countries or extraction.min_grade or extraction.min_age),
            scam_flags=scam_flags,
            extractor_name=extractor.name,
        ),
    )

    opportunity_id = repo.create_opportunity(
        extraction, scores, discovery_source=discovery_provider, published=False
    )
    repo.add_source(
        opportunity_id,
        url=page.final_url,
        title=page.title,
        cleaned_text=page.cleaned_text,
        is_official=is_official,
        source_type="official" if is_official else "other",
        metadata={"fetch_method": page.fetch_method, "discovered_by_query": discovered_by_query},
    )
    repo.save_candidate(
        url=url,
        title=extraction.name,
        snippet=snippet,
        domain=domain,
        discovered_by_query=discovered_by_query,
        discovery_provider=discovery_provider,
        state="pending",
        opportunity_id=opportunity_id,
        extracted_name=extraction.name,
        legitimacy_confidence=scores.source_confidence,
    )
    log_event(logger, "opportunity_discovered", url=url, name=extraction.name, opportunity_id=opportunity_id)
    return ProcessResult("discovered", extraction.name)
