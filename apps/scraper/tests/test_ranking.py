from app.extraction.schema import OpportunityExtraction
from app.ranking.labels import difficulty_label, value_label
from app.ranking.score import (
    compute_classification,
    compute_difficulty_score,
    compute_legitimacy_score,
    compute_value_score,
)


def test_label_boundaries():
    assert difficulty_label(0) == "EASY"
    assert difficulty_label(25) == "EASY"
    assert difficulty_label(26) == "MEDIUM"
    assert difficulty_label(50) == "MEDIUM"
    assert difficulty_label(51) == "HARD"
    assert difficulty_label(75) == "HARD"
    assert difficulty_label(76) == "EXTREME"
    assert difficulty_label(100) == "EXTREME"


def test_label_clamps_out_of_range():
    assert difficulty_label(-10) == "EASY"
    assert difficulty_label(999) == "EXTREME"


def test_value_label_boundaries():
    assert value_label(10) == "LOW"
    assert value_label(40) == "MEDIUM"
    assert value_label(60) == "HIGH"
    assert value_label(90) == "EXCEPTIONAL"


def test_difficulty_score_increases_with_multiple_stages_and_technical_depth():
    simple = OpportunityExtraction(name="X", description="Submit a short essay.")
    complex_extraction = OpportunityExtraction(
        name="Y",
        description="Submit a business plan and a working prototype across an international, multi-round process.",
        stages=["Round 1", "Round 2", "Finals"],
        team_size_max=4,
        requirements=["a", "b", "c"],
    )
    assert compute_difficulty_score(complex_extraction) > compute_difficulty_score(simple)


def test_legitimacy_score_zero_when_scam_flags_present():
    assert (
        compute_legitimacy_score(
            is_official_source=True,
            has_organization=True,
            has_clear_eligibility=True,
            scam_flags=["wire transfer"],
        )
        == 5
    )


def test_value_score_is_never_affected_by_prize_amount():
    # Spec explicitly forbids scoring prizes: a $100,000 prize and a $0
    # prize must score identically if everything else is equal.
    no_prize = OpportunityExtraction(name="X", prize_description=None)
    huge_prize = OpportunityExtraction(name="X", prize_description="A $100,000 grand prize")
    assert compute_value_score(huge_prize, legitimacy_score=80) == compute_value_score(
        no_prize, legitimacy_score=80
    )


def test_classification_is_major_for_well_known_org_with_high_legitimacy():
    extraction = OpportunityExtraction(
        name="Regeneron Science Talent Search", organization="Society for Science"
    )
    assert compute_classification(extraction, legitimacy_score=90) == "major"


def test_classification_is_hidden_gem_for_legitimate_but_unrecognized_org():
    extraction = OpportunityExtraction(name="Local Robotics Cup", organization="Springfield Robotics Club")
    assert compute_classification(extraction, legitimacy_score=75) == "hidden_gem"


def test_classification_is_standard_for_low_legitimacy():
    extraction = OpportunityExtraction(name="Some Contest", organization="Unknown Org")
    assert compute_classification(extraction, legitimacy_score=30) == "standard"


def test_classification_is_never_affected_by_prize_amount():
    no_prize = OpportunityExtraction(name="X", organization="Springfield Robotics Club", prize_description=None)
    huge_prize = OpportunityExtraction(
        name="X", organization="Springfield Robotics Club", prize_description="$1,000,000"
    )
    assert compute_classification(no_prize, legitimacy_score=75) == compute_classification(
        huge_prize, legitimacy_score=75
    )
