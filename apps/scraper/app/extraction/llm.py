from __future__ import annotations

from openai import OpenAI

from app.config import OPENAI_API_KEY, OPENAI_MODEL
from app.extraction.base import Extractor
from app.extraction.schema import (
    MentionedCompetitions,
    OpportunityExtraction,
    RelevanceClassification,
)
from app.utils.fetch import FetchedPage
from app.utils.logs import get_logger, log_event

logger = get_logger("extraction.llm")

MAX_PAGE_CHARS = 12000

NULL_RULE = (
    "Only report a fact if it is explicitly stated on the page text below. "
    "If a field is not clearly stated, return null for it — do not infer, "
    "estimate, or guess. Returning null is always preferable to a guess."
)


class LLMExtractor(Extractor):
    name = "llm"

    def __init__(self):
        if not OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY not set")
        self.client = OpenAI(api_key=OPENAI_API_KEY)

    def _page_excerpt(self, page: FetchedPage) -> str:
        return page.cleaned_text[:MAX_PAGE_CHARS]

    def classify(self, page: FetchedPage) -> RelevanceClassification:
        try:
            completion = self.client.chat.completions.parse(
                model=OPENAI_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You classify whether a web page describes a legitimate competition, "
                            "olympiad, research program, fellowship, summer program, or similar "
                            "opportunity relevant to a secondary-school (high school) student. "
                            "Be skeptical of scam/spam pages, expired link-farms, or pages that are "
                            "just news mentioning an award in passing without describing how to apply."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"Title: {page.title}\n\nPage text:\n{self._page_excerpt(page)}",
                    },
                ],
                response_format=RelevanceClassification,
            )
            parsed = completion.choices[0].message.parsed
            if parsed is None:
                raise ValueError("Model returned no parsed classification")
            return parsed
        except Exception as e:
            log_event(logger, "classify_failed", url=page.url, error=str(e))
            return RelevanceClassification(
                is_legitimate_opportunity=False,
                is_relevant_to_secondary_school=False,
                reason=f"LLM classification failed: {e}",
            )

    def extract(self, page: FetchedPage) -> OpportunityExtraction:
        try:
            completion = self.client.chat.completions.parse(
                model=OPENAI_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You extract structured facts about a student competition/program from "
                            f"a web page. {NULL_RULE} For deadline_evidence, eligibility_evidence, and "
                            "prize_evidence, quote or closely paraphrase the exact sentence that "
                            "supports the corresponding field."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"URL: {page.final_url}\nTitle: {page.title}\n\nPage text:\n{self._page_excerpt(page)}",
                    },
                ],
                response_format=OpportunityExtraction,
            )
            parsed = completion.choices[0].message.parsed
            if parsed is None:
                raise ValueError("Model returned no parsed extraction")
            return parsed
        except Exception as e:
            log_event(logger, "extract_failed", url=page.url, error=str(e))
            return OpportunityExtraction()

    def extract_mentioned_competitions(self, page: FetchedPage) -> MentionedCompetitions:
        try:
            completion = self.client.chat.completions.parse(
                model=OPENAI_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "This page mentions a student who won or participated in one or more "
                            "competitions/programs. List the distinct competition/program NAMES "
                            "mentioned (not the student's name, not the school). These are leads to "
                            "independently verify, not confirmed facts — only list names that are "
                            "explicit proper nouns on the page."
                        ),
                    },
                    {"role": "user", "content": self._page_excerpt(page)},
                ],
                response_format=MentionedCompetitions,
            )
            parsed = completion.choices[0].message.parsed
            return parsed or MentionedCompetitions(names=[])
        except Exception as e:
            log_event(logger, "mention_extraction_failed", url=page.url, error=str(e))
            return MentionedCompetitions(names=[])
