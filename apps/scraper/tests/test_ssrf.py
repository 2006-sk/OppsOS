import time
from unittest.mock import patch

import pytest

from app.utils.ssrf import UnsafeUrlError, assert_safe_url, is_safe_url


def test_rejects_localhost():
    assert is_safe_url("http://localhost:8000/") is False


def test_rejects_loopback_ip():
    assert is_safe_url("http://127.0.0.1/") is False


def test_rejects_link_local_metadata_ip():
    assert is_safe_url("http://169.254.169.254/latest/meta-data/") is False


def test_rejects_private_network_ip():
    assert is_safe_url("http://10.0.0.5/") is False
    assert is_safe_url("http://192.168.1.1/") is False


def test_rejects_non_http_scheme():
    assert is_safe_url("file:///etc/passwd") is False


def test_accepts_public_url():
    assert is_safe_url("https://example.com/page") is True


def test_assert_safe_url_raises_with_message():
    with pytest.raises(UnsafeUrlError):
        assert_safe_url("http://127.0.0.1/")


def test_dns_resolution_timeout_does_not_hang_forever():
    # Regression test: socket.getaddrinfo has no built-in timeout and hung a
    # live discovery run for over an hour on a flaky domain. This simulates
    # that by making getaddrinfo block indefinitely and asserting we still
    # get a prompt UnsafeUrlError instead of hanging the test.
    from app.utils.ssrf import _resolve_with_timeout

    def hangs_forever(*args, **kwargs):
        time.sleep(3600)

    with patch("socket.getaddrinfo", side_effect=hangs_forever):
        start = time.monotonic()
        with pytest.raises(UnsafeUrlError, match="timed out"):
            _resolve_with_timeout("slow-dns-example.test", timeout=0.2)
        elapsed = time.monotonic() - start
        assert elapsed < 2, "DNS timeout should be bounded, not wait on the real hang"
