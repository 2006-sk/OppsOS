from unittest.mock import MagicMock, patch

from app.storage import db


def test_close_client_calls_close_and_clears_cache():
    # Regression test: libsql_client.ClientSync bridges to an async client
    # via a non-daemon background thread that only stops when .close() is
    # called (see db.close_client's docstring) — observed live as a GitHub
    # Actions discovery run that logged its final result and returned, but
    # whose job did not exit until the workflow timeout killed it 18
    # minutes later. Every CLI entry point must call close_client().
    fake_client = MagicMock()
    db._client = fake_client
    try:
        db.close_client()
        fake_client.close.assert_called_once()
        assert db._client is None
    finally:
        db._client = None


def test_close_client_is_a_no_op_when_no_client_was_created():
    db._client = None
    db.close_client()  # must not raise
    assert db._client is None


def test_get_client_reuses_cached_instance():
    with (
        patch("app.storage.db.libsql_client.create_client_sync") as create,
        patch("app.storage.db.TURSO_HTTP_URL", "https://fake.turso.io"),
    ):
        create.return_value = MagicMock()
        db._client = None
        try:
            first = db.get_client()
            second = db.get_client()
            assert first is second
            create.assert_called_once()
        finally:
            db._client = None
