from __future__ import annotations

import ipaddress
import socket
import threading
from urllib.parse import urlparse

DNS_RESOLVE_TIMEOUT_SECONDS = 5.0


class UnsafeUrlError(Exception):
    pass


def _is_unsafe_ip(ip_str: str) -> bool:
    ip = ipaddress.ip_address(ip_str)
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    )


def _resolve_with_timeout(hostname: str, timeout: float = DNS_RESOLVE_TIMEOUT_SECONDS) -> list:
    """`socket.getaddrinfo` has no built-in timeout and can block forever on
    a domain with flaky/non-responding DNS — this hung a live discovery run
    for over an hour with the process sitting at ~0% CPU. Resolving on a
    daemon thread with a join timeout means a stuck lookup can never block
    the pipeline (or process exit) even though the underlying getaddrinfo
    call itself can't be cancelled."""
    result: dict = {}

    def worker() -> None:
        try:
            result["addrs"] = socket.getaddrinfo(hostname, None)
        except socket.gaierror as e:
            result["error"] = e

    thread = threading.Thread(target=worker, daemon=True)
    thread.start()
    thread.join(timeout)
    if thread.is_alive():
        raise UnsafeUrlError(f"DNS resolution for {hostname} timed out after {timeout}s")
    if "error" in result:
        raise UnsafeUrlError(f"Could not resolve host: {hostname}") from result["error"]
    return result.get("addrs", [])


def assert_safe_url(url: str) -> None:
    """Raises UnsafeUrlError if `url` resolves to a non-public address.

    Checking the hostname string alone is not enough — an attacker-controlled
    DNS name can resolve to 127.0.0.1 or a link-local metadata IP. We resolve
    the hostname and check every returned address. Call this again for every
    redirect hop, not just the original URL — the whole point of an SSRF
    guard is to stop wherever a request is *about* to go, not just where it
    started.
    """
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise UnsafeUrlError(f"Unsupported scheme: {parsed.scheme!r}")
    if not parsed.hostname:
        raise UnsafeUrlError("URL has no hostname")

    hostname = parsed.hostname
    addr_infos = _resolve_with_timeout(hostname)

    if not addr_infos:
        raise UnsafeUrlError(f"No addresses resolved for host: {hostname}")

    for family, _, _, _, sockaddr in addr_infos:
        ip_str = sockaddr[0]
        if _is_unsafe_ip(ip_str):
            raise UnsafeUrlError(f"{hostname} resolves to a non-public address ({ip_str})")


def is_safe_url(url: str) -> bool:
    try:
        assert_safe_url(url)
        return True
    except UnsafeUrlError:
        return False
