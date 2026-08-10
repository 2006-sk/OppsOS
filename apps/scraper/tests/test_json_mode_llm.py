from app.extraction.json_mode_llm import parse_json_response
from app.extraction.schema import MentionedCompetitions, RelevanceClassification


def test_parses_clean_json():
    result = parse_json_response(
        '{"is_legitimate_opportunity": true, "is_relevant_to_secondary_school": true, "reason": "ok"}',
        RelevanceClassification,
    )
    assert isinstance(result, RelevanceClassification)
    assert result.is_legitimate_opportunity is True


def test_strips_markdown_code_fences():
    raw = '```json\n{"is_legitimate_opportunity": false, "is_relevant_to_secondary_school": false, "reason": "spam"}\n```'
    result = parse_json_response(raw, RelevanceClassification)
    assert isinstance(result, RelevanceClassification)
    assert result.is_legitimate_opportunity is False


def test_returns_none_on_invalid_json():
    assert parse_json_response("not json at all", RelevanceClassification) is None


def test_returns_none_on_schema_mismatch():
    # Valid JSON, but missing required fields for RelevanceClassification.
    assert parse_json_response('{"unrelated_field": 1}', RelevanceClassification) is None


def test_parses_list_field_model():
    result = parse_json_response('{"names": ["Diamond Challenge", "Blue Ocean"]}', MentionedCompetitions)
    assert isinstance(result, MentionedCompetitions)
    assert result.names == ["Diamond Challenge", "Blue Ocean"]
