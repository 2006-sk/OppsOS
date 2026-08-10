from app.extraction.heuristic import HeuristicExtractor
from app.validation.validators import detect_scam_language


def test_classify_recognizes_legitimate_opportunity(legit_page):
    extractor = HeuristicExtractor()
    result = extractor.classify(legit_page)
    assert result.is_legitimate_opportunity is True


def test_classify_rejects_sparse_page(sparse_page):
    extractor = HeuristicExtractor()
    result = extractor.classify(sparse_page)
    assert result.is_legitimate_opportunity is False


def test_extract_pulls_deadline_and_fee_without_guessing_missing_fields(legit_page):
    extractor = HeuristicExtractor()
    result = extractor.extract(legit_page)

    assert result.deadline == "2026-10-03"
    assert result.deadline_evidence is not None
    assert result.application_fee == 0.0
    # Never guessed — heuristic extractor doesn't attempt organization parsing.
    assert result.organization is None


def test_extract_grade_and_team_size(legit_page):
    extractor = HeuristicExtractor()
    result = extractor.extract(legit_page)
    assert result.min_grade == 9
    assert result.max_grade == 12
    assert result.team_allowed is True
    assert result.team_size_max == 4


def test_scam_page_flagged_by_scam_language_detector(scam_page):
    flags = detect_scam_language(scam_page.cleaned_text)
    assert len(flags) > 0
