from __future__ import annotations

import json
from dataclasses import dataclass

from app.extraction.dedup import ExistingOpportunityRef
from app.extraction.schema import OpportunityExtraction
from app.storage.db import batch, execute, fetchall, fetchone
from app.utils.dt import iso_date_to_epoch_ms, now_epoch_ms
from app.utils.hashing import content_hash
from app.utils.ids import new_id
from app.utils.slug import slugify


def _json(value) -> str:
    """Matches how Prisma itself serializes JSON columns on SQLite (a JSON
    'null' literal for Python None, compact encoding otherwise) — verified
    against rows written by the Prisma seed script."""
    return json.dumps(value)


# ---------------------------------------------------------------------------
# scrape_runs
# ---------------------------------------------------------------------------


def start_scrape_run(scraper_type: str, source: str | None = None) -> str:
    run_id = new_id()
    execute(
        "INSERT INTO scrape_runs (id, scraperType, source, startedAt, status) "
        "VALUES (?, ?, ?, ?, 'running')",
        [run_id, scraper_type, source, now_epoch_ms()],
    )
    return run_id


def finish_scrape_run(
    run_id: str,
    status: str,
    discovered_count: int = 0,
    updated_count: int = 0,
    error_count: int = 0,
    logs: list[dict] | None = None,
) -> None:
    execute(
        "UPDATE scrape_runs SET completedAt = ?, status = ?, discoveredCount = ?, "
        "updatedCount = ?, errorCount = ?, logs = ? WHERE id = ?",
        [now_epoch_ms(), status, discovered_count, updated_count, error_count, _json(logs), run_id],
    )


# ---------------------------------------------------------------------------
# discovery_candidates
# ---------------------------------------------------------------------------


def candidate_url_known(url: str) -> bool:
    if fetchone("SELECT 1 FROM discovery_candidates WHERE url = ?", [url]):
        return True
    return fetchone("SELECT 1 FROM opportunity_sources WHERE url = ?", [url]) is not None


def save_candidate(
    *,
    url: str,
    title: str | None,
    snippet: str | None,
    domain: str | None,
    discovered_by_query: str | None,
    discovery_provider: str | None,
    state: str,
    reason: str | None = None,
    opportunity_id: str | None = None,
    extracted_name: str | None = None,
    legitimacy_confidence: int | None = None,
) -> str:
    candidate_id = new_id()
    execute(
        """
        INSERT INTO discovery_candidates
            (id, url, title, snippet, domain, discoveredByQuery, discoveryProvider,
             extractedName, legitimacyConfidence, state, reason, opportunityId, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(url) DO UPDATE SET
            state = excluded.state,
            reason = excluded.reason,
            opportunityId = excluded.opportunityId,
            extractedName = excluded.extractedName,
            legitimacyConfidence = excluded.legitimacyConfidence
        """,
        [
            candidate_id,
            url,
            title,
            snippet,
            domain,
            discovered_by_query,
            discovery_provider,
            extracted_name,
            legitimacy_confidence,
            state,
            reason,
            opportunity_id,
            now_epoch_ms(),
        ],
    )
    return candidate_id


# ---------------------------------------------------------------------------
# opportunities + related tables
# ---------------------------------------------------------------------------


def list_existing_lightweight() -> list[ExistingOpportunityRef]:
    rows = fetchall("SELECT id, name, officialUrl FROM opportunities")
    return [ExistingOpportunityRef(id=r["id"], name=r["name"], official_url=r["officialUrl"]) for r in rows]


def _unique_slug(base_name: str) -> str:
    base = slugify(base_name)
    slug = base
    suffix = 2
    while fetchone("SELECT 1 FROM opportunities WHERE slug = ?", [slug]):
        slug = f"{base}-{suffix}"
        suffix += 1
    return slug


@dataclass
class ScoredExtraction:
    difficulty_score: int
    value_score: int
    legitimacy_score: int
    source_confidence: int


def create_opportunity(
    extraction: OpportunityExtraction,
    scores: ScoredExtraction,
    *,
    discovery_source: str,
    published: bool = False,
) -> str:
    if not extraction.name:
        raise ValueError("Cannot create an opportunity without a name")

    opp_id = new_id()
    now = now_epoch_ms()
    # _unique_slug does its own read (SELECT ... WHERE slug = ?) before the
    # write batch below — a race is possible if two runs create the same
    # name concurrently, but this service only ever runs one pipeline at a
    # time, so it's not a real risk here.
    slug = _unique_slug(extraction.name)

    statements: list[tuple[str, list]] = [
        (
            """
            INSERT INTO opportunities (
                id, slug, name, organization, description, category, officialUrl,
                applicationUrl, countryScope, eligibleCountries, minGrade, maxGrade,
                minAge, maxAge, individualAllowed, teamAllowed, teamSizeMin, teamSizeMax,
                applicationFee, feeCurrency, prizeDescription, deadline, opensAt, status,
                published, difficultyScore, valueScore, legitimacyScore, sourceConfidence,
                discoverySource, discoveredAt, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                      ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                opp_id,
                slug,
                extraction.name,
                extraction.organization or "Unknown",
                extraction.description or "",
                extraction.category or "other",
                extraction.official_url or "",
                extraction.application_url,
                "country_specific" if extraction.eligible_countries else "global",
                _json(extraction.eligible_countries) if extraction.eligible_countries else _json(None),
                extraction.min_grade,
                extraction.max_grade,
                extraction.min_age,
                extraction.max_age,
                1 if extraction.individual_allowed is not False else 0,
                1 if extraction.team_allowed else 0,
                extraction.team_size_min,
                extraction.team_size_max,
                extraction.application_fee,
                extraction.fee_currency,
                extraction.prize_description,
                iso_date_to_epoch_ms(extraction.deadline),
                iso_date_to_epoch_ms(extraction.opens_at),
                extraction.status or "unknown",
                1 if published else 0,
                scores.difficulty_score,
                scores.value_score,
                scores.legitimacy_score,
                scores.source_confidence,
                discovery_source,
                now,
                now,
                now,
            ],
        )
    ]

    if any(
        [
            extraction.requirements,
            extraction.judging_criteria,
            extraction.submission_requirements,
            extraction.stages,
        ]
    ):
        statements.append(
            (
                """
                INSERT INTO opportunity_requirements
                    (id, opportunityId, requirements, judgingCriteria, submissionRequirements, stages, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    new_id(),
                    opp_id,
                    _json(extraction.requirements),
                    _json(extraction.judging_criteria),
                    _json(extraction.submission_requirements),
                    _json(extraction.stages),
                    now,
                ],
            )
        )

    batch(statements)
    return opp_id


def add_source(
    opportunity_id: str,
    *,
    url: str,
    title: str | None,
    cleaned_text: str,
    is_official: bool,
    source_type: str,
    retrieved_at_ms: int | None = None,
    metadata: dict | None = None,
) -> str:
    source_id = new_id()
    execute(
        """
        INSERT INTO opportunity_sources
            (id, opportunityId, url, sourceType, title, retrievedAt, cleanedText,
             contentHash, isOfficial, metadata, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            source_id,
            opportunity_id,
            url,
            source_type,
            title,
            retrieved_at_ms or now_epoch_ms(),
            cleaned_text,
            content_hash(cleaned_text),
            1 if is_official else 0,
            _json(metadata) if metadata else _json(None),
            now_epoch_ms(),
        ],
    )
    return source_id


def get_official_source(opportunity_id: str) -> dict | None:
    return fetchone(
        "SELECT * FROM opportunity_sources WHERE opportunityId = ? AND isOfficial = 1 "
        "ORDER BY retrievedAt DESC LIMIT 1",
        [opportunity_id],
    )


def update_source_content(source_id: str, *, cleaned_text: str, html_title: str | None) -> str:
    new_hash = content_hash(cleaned_text)
    execute(
        "UPDATE opportunity_sources SET cleanedText = ?, contentHash = ?, title = ?, retrievedAt = ? "
        "WHERE id = ?",
        [cleaned_text, new_hash, html_title, now_epoch_ms(), source_id],
    )
    return new_hash


# ---------------------------------------------------------------------------
# monitoring
# ---------------------------------------------------------------------------


def list_due_for_monitoring(limit: int = 25) -> list[dict]:
    return fetchall(
        """
        SELECT * FROM opportunities
        WHERE officialUrl != ''
        ORDER BY (lastVerifiedAt IS NOT NULL), lastVerifiedAt ASC
        LIMIT ?
        """,
        [limit],
    )


def touch_last_verified(opportunity_id: str) -> None:
    execute(
        "UPDATE opportunities SET lastVerifiedAt = ?, updatedAt = ? WHERE id = ?",
        [now_epoch_ms(), now_epoch_ms(), opportunity_id],
    )


def update_opportunity_fields(opportunity_id: str, fields: dict) -> None:
    if not fields:
        return
    columns = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values())
    execute(
        f"UPDATE opportunities SET {columns}, updatedAt = ? WHERE id = ?",
        [*values, now_epoch_ms(), opportunity_id],
    )


def record_change(
    opportunity_id: str, field: str, old_value: str | None, new_value: str | None, scrape_run_id: str | None
) -> None:
    execute(
        "INSERT INTO opportunity_change_history "
        "(id, opportunityId, field, oldValue, newValue, detectedAt, scrapeRunId) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        [new_id(), opportunity_id, field, old_value, new_value, now_epoch_ms(), scrape_run_id],
    )
