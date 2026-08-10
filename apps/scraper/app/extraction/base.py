from __future__ import annotations

from abc import ABC, abstractmethod

from app.extraction.schema import (
    MentionedCompetitions,
    OpportunityExtraction,
    RelevanceClassification,
)
from app.utils.fetch import FetchedPage


class Extractor(ABC):
    name: str

    @abstractmethod
    def classify(self, page: FetchedPage) -> RelevanceClassification: ...

    @abstractmethod
    def extract(self, page: FetchedPage) -> OpportunityExtraction: ...

    @abstractmethod
    def extract_mentioned_competitions(self, page: FetchedPage) -> MentionedCompetitions: ...
