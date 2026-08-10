from __future__ import annotations

from app.extraction import get_extractor
from app.storage import repository as repo
from app.utils.dt import epoch_ms_to_datetime, iso_date_to_epoch_ms
from app.utils.fetch import fetch_page
from app.utils.hashing import content_hash
from app.utils.logs import get_logger, log_event

logger = get_logger("monitoring.pipeline")

# Field -> (opportunity column, extraction attribute). Only fields where a
# *stated* new value differs from the old one are ever written — a null from
# re-extraction never overwrites a previously known fact (spec section 18).
MONITORED_FIELDS = {
    "deadline": "deadline",
    "status": "status",
    "prizeDescription": "prize_description",
    "applicationFee": "application_fee",
}


def _diff_and_apply(opportunity: dict, extraction, run_id: str) -> int:
    changes = {}
    for column, attr in MONITORED_FIELDS.items():
        new_value = getattr(extraction, attr, None)
        if new_value is None:
            continue

        if column == "deadline":
            new_stored = iso_date_to_epoch_ms(new_value)
            old_stored = opportunity.get(column)
            if new_stored is not None and new_stored != old_stored:
                repo.record_change(
                    opportunity["id"],
                    column,
                    str(epoch_ms_to_datetime(old_stored)) if old_stored else None,
                    str(epoch_ms_to_datetime(new_stored)),
                    run_id,
                )
                changes[column] = new_stored
        else:
            old_value = opportunity.get(column)
            if new_value != old_value:
                repo.record_change(opportunity["id"], column, str(old_value) if old_value is not None else None, str(new_value), run_id)
                changes[column] = new_value

    if changes:
        repo.update_opportunity_fields(opportunity["id"], changes)
    return len(changes)


def run_monitoring(batch_size: int = 20) -> dict:
    run_id = repo.start_scrape_run("monitoring")
    updated = errors = checked = 0
    logs: list[dict] = []

    due = repo.list_due_for_monitoring(batch_size)
    log_event(logger, "monitoring_run_started", run_id=run_id, count=len(due))

    for opportunity in due:
        try:
            page = fetch_page(opportunity["officialUrl"])
            if page is None:
                errors += 1
                logs.append({"opportunity_id": opportunity["id"], "error": "fetch_failed"})
                continue
            checked += 1

            new_hash = content_hash(page.cleaned_text)
            source = repo.get_official_source(opportunity["id"])

            if source and source.get("contentHash") == new_hash:
                repo.touch_last_verified(opportunity["id"])
                continue

            extractor = get_extractor()
            extraction = extractor.extract(page)
            changed_fields = _diff_and_apply(opportunity, extraction, run_id)
            if changed_fields:
                updated += 1
                log_event(
                    logger,
                    "opportunity_changed",
                    opportunity_id=opportunity["id"],
                    name=opportunity["name"],
                    fields_changed=changed_fields,
                )

            if source:
                repo.update_source_content(source["id"], cleaned_text=page.cleaned_text, html_title=page.title)
            else:
                repo.add_source(
                    opportunity["id"],
                    url=page.final_url,
                    title=page.title,
                    cleaned_text=page.cleaned_text,
                    is_official=True,
                    source_type="official",
                )
            repo.touch_last_verified(opportunity["id"])
        except Exception as e:
            # One domain failing must not stop the batch (spec section 30).
            errors += 1
            log_event(logger, "monitor_failed", opportunity_id=opportunity.get("id"), error=str(e))
            logs.append({"opportunity_id": opportunity.get("id"), "error": str(e)})
            continue

    status = "success" if errors == 0 else ("partial" if checked else "failed")
    repo.finish_scrape_run(run_id, status, discovered_count=0, updated_count=updated, error_count=errors, logs=logs)
    summary = {"checked": checked, "updated": updated, "errors": errors}
    log_event(logger, "monitoring_run_complete", run_id=run_id, **summary)
    return summary
