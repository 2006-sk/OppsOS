from app.extraction.dedup import ExistingOpportunityRef, find_duplicate, normalize_name


def test_normalize_name_strips_common_suffix_words():
    assert normalize_name("The Diamond Challenge") == "diamond challenge"
    assert normalize_name("Diamond Challenge Foundation") == "diamond challenge"


def test_finds_duplicate_by_fuzzy_name_and_domain():
    existing = [
        ExistingOpportunityRef(id="1", name="Diamond Challenge", official_url="https://diamondchallenge.org/x"),
    ]
    match = find_duplicate(
        "University of Delaware Diamond Challenge",
        "https://diamondchallenge.org/competition/",
        existing,
    )
    assert match is not None
    assert match.id == "1"


def test_does_not_flag_unrelated_opportunities_as_duplicates():
    existing = [
        ExistingOpportunityRef(id="1", name="Diamond Challenge", official_url="https://diamondchallenge.org"),
    ]
    match = find_duplicate("The Earth Prize", "https://theearthprize.org", existing)
    assert match is None


def test_same_name_different_domain_still_flagged_via_high_name_similarity():
    existing = [
        ExistingOpportunityRef(id="1", name="IRIS National Fair", official_url="https://iris.exstemplar.com"),
    ]
    match = find_duplicate("IRIS National Fair", "https://www.irisnationalfair.org", existing)
    assert match is not None
