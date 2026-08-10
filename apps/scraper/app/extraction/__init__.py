from __future__ import annotations

from app.config import LLM_COMPAT_API_KEY, OPENAI_API_KEY
from app.extraction.base import Extractor
from app.extraction.heuristic import HeuristicExtractor
from app.utils.logs import get_logger, log_event

logger = get_logger("extraction")

_extractor: Extractor | None = None


def get_extractor() -> Extractor:
    global _extractor
    if _extractor is not None:
        return _extractor

    if OPENAI_API_KEY:
        from app.extraction.llm import LLMExtractor

        _extractor = LLMExtractor()
        log_event(logger, "extractor_selected", extractor="llm")
    elif LLM_COMPAT_API_KEY:
        from app.extraction.json_mode_llm import JsonModeLLMExtractor

        _extractor = JsonModeLLMExtractor()
        log_event(
            logger,
            "extractor_selected",
            extractor="llm_json_mode",
            reason="OPENAI_API_KEY not set — using LLM_COMPAT_API_KEY provider (json_object mode, no provider-enforced schema)",
        )
    else:
        _extractor = HeuristicExtractor()
        log_event(
            logger,
            "extractor_selected",
            extractor="heuristic",
            reason="no LLM API key set — falling back to lower-confidence heuristic extraction",
        )
    return _extractor


def reset_extractor_cache() -> None:
    """Test-only: clears the memoized extractor so tests can select a
    different one after monkeypatching config."""
    global _extractor
    _extractor = None
