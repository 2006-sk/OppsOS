from unittest.mock import patch

from app.discovery import queries as q

FAKE_GROUPS = {
    "research": ["query r1", "query r2"],
    "olympiads": ["query o1"],
    "undergraduate_usa": ["query u1", "query u2", "query u3"],
    "winner_mining": ["query w1"],
}


def test_default_rotation_excludes_winner_mining_and_undergraduate(tmp_path):
    # Adding the undergraduate_usa lane must not change what the existing
    # (high-school-oriented) default rotation returns.
    with (
        patch.object(q, "load_query_groups", return_value=FAKE_GROUPS),
        patch.object(q, "STATE_PATH", tmp_path / "state.json"),
    ):
        picked = q.pick_rotating_queries(10)
        groups_seen = {g for g, _ in picked}
        assert "winner_mining" not in groups_seen
        assert "undergraduate_usa" not in groups_seen
        assert groups_seen <= {"research", "olympiads"}


def test_explicit_group_only_returns_that_groups_queries(tmp_path):
    with (
        patch.object(q, "load_query_groups", return_value=FAKE_GROUPS),
        patch.object(q, "STATE_PATH", tmp_path / "state.json"),
    ):
        picked = q.pick_rotating_queries(2, group="undergraduate_usa")
        assert len(picked) == 2
        assert all(g == "undergraduate_usa" for g, _ in picked)


def test_group_rotation_cursor_is_independent_of_default_cursor(tmp_path):
    with (
        patch.object(q, "load_query_groups", return_value=FAKE_GROUPS),
        patch.object(q, "STATE_PATH", tmp_path / "state.json"),
    ):
        q.pick_rotating_queries(10)  # advances the default "cursor" key
        first_undergrad = q.pick_rotating_queries(1, group="undergraduate_usa")
        assert first_undergrad == [("undergraduate_usa", "query u1")]


def test_unknown_group_returns_empty():
    with patch.object(q, "load_query_groups", return_value=FAKE_GROUPS):
        assert q.pick_rotating_queries(5, group="nonexistent_group") == []
