from __future__ import annotations

import json
import re

from openai import OpenAI
from pydantic import BaseModel, ValidationError

from app.config import LLM_COMPAT_API_KEY, LLM_COMPAT_BASE_URL, LLM_COMPAT_MODEL
from app.extraction.base import Extractor
from app.extraction.schema import (
    MentionedCompetitions,
    OpportunityExtraction,
    RelevanceClassification,
)
from app.utils.fetch import FetchedPage
from app.utils.logs import get_logger, log_event

logger = get_logger("extraction.json_mode_llm")

MAX_PAGE_CHARS = 12000

NULL_RULE = (
    "Only report a fact if it is explicitly stated in the page text. If a field is not "
    "clearly stated, use null for it — do not infer, estimate, or guess. Returning null "
    "is always preferable to a guess."
)

_CODE_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


def _strip_code_fences(text: str) -> str:
    return _CODE_FENCE_RE.sub("", text).strip()


def parse_json_response(raw_text: str, model: type[BaseModel]) -> BaseModel | None:
    """Best-effort JSON parse + Pydantic validation for providers that only
    support `json_object` mode (no schema enforcement from the API side).
    Split out from the network call so it's unit-testable without a live
    request — see tests/test_json_mode_llm.py."""
    cleaned = _strip_code_fences(raw_text)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        log_event(logger, "json_mode_parse_failed", error=str(e), raw_preview=cleaned[:200])
        return None
    try:
        return model.model_validate(data)
    except ValidationError as e:
        log_event(logger, "json_mode_validation_failed", error=str(e), raw_preview=cleaned[:200])
        return None


class JsonModeLLMExtractor(Extractor):
    """LLM extractor for OpenAI-compatible providers that don't support
    strict `json_schema` structured outputs (verified against Novita's
    DeepSeek endpoint: it 400s on response_format=json_schema, but supports
    response_format=json_object). We describe the target schema in the
    prompt via Pydantic's own model_json_schema() and validate the model's
    JSON against it ourselves — a weaker guarantee than provider-enforced
    schemas, so extractions from this path are treated the same as heuristic
    ones for confidence scoring purposes (see validation/validators.py)."""

    name = "llm_json_mode"

    def __init__(self):
        if not LLM_COMPAT_API_KEY:
            raise RuntimeError("LLM_COMPAT_API_KEY not set")
        self.client = OpenAI(api_key=LLM_COMPAT_API_KEY, base_url=LLM_COMPAT_BASE_URL)
        self.model = LLM_COMPAT_MODEL

    def _page_excerpt(self, page: FetchedPage) -> str:
        return page.cleaned_text[:MAX_PAGE_CHARS]

    def _call(self, system_prompt: str, user_content: str, schema_model: type[BaseModel]) -> BaseModel | None:
        schema_json = json.dumps(schema_model.model_json_schema())
        try:
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            f"{system_prompt} Respond with ONLY a single JSON object matching "
                            f"this JSON schema, no other text, no markdown code fences:\n{schema_json}"
                        ),
                    },
                    {"role": "user", "content": user_content},
                ],
                response_format={"type": "json_object"},
                temperature=0,
            )
        except Exception as e:
            log_event(logger, "json_mode_call_failed", error=str(e))
            return None

        content = completion.choices[0].message.content
        if not content:
            return None
        return parse_json_response(content, schema_model)

    def classify(self, page: FetchedPage) -> RelevanceClassification:
        result = self._call(
            "You classify whether a web page describes a legitimate competition, olympiad, "
            "research program, fellowship, summer program, or similar opportunity relevant to "
            "a secondary-school (high school) student. Be skeptical of scam/spam pages, expired "
            "link-farms, or pages that are just news mentioning an award in passing.",
            f"Title: {page.title}\n\nPage text:\n{self._page_excerpt(page)}",
            RelevanceClassification,
        )
        if isinstance(result, RelevanceClassification):
            return result
        return RelevanceClassification(
            is_legitimate_opportunity=False,
            is_relevant_to_secondary_school=False,
            reason="json_object-mode classification failed or returned invalid JSON",
        )

    def extract(self, page: FetchedPage) -> OpportunityExtraction:
        result = self._call(
            f"You extract structured facts about a student competition/program from a web page. {NULL_RULE}",
            f"URL: {page.final_url}\nTitle: {page.title}\n\nPage text:\n{self._page_excerpt(page)}",
            OpportunityExtraction,
        )
        return result if isinstance(result, OpportunityExtraction) else OpportunityExtraction()

    def extract_mentioned_competitions(self, page: FetchedPage) -> MentionedCompetitions:
        result = self._call(
            "This page mentions a student who won or participated in one or more "
            "competitions/programs. List the distinct competition/program NAMES mentioned "
            "(not the student's name, not the school) as unverified leads to independently "
            "verify — only list names that are explicit proper nouns on the page.",
            self._page_excerpt(page),
            MentionedCompetitions,
        )
        return result if isinstance(result, MentionedCompetitions) else MentionedCompetitions(names=[])
