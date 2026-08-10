from datetime import datetime, timezone
from unittest.mock import patch

from app.utils.fetch import FetchedPage, fetch_page
from app.utils.textclean import html_to_text, is_sparse_text


def _page(cleaned_text: str, fetch_method: str) -> FetchedPage:
    return FetchedPage(
        url="https://example.com",
        final_url="https://example.com",
        title="Example",
        html="<html></html>",
        cleaned_text=cleaned_text,
        fetch_method=fetch_method,
        status_code=200,
        retrieved_at=datetime.now(timezone.utc),
    )


def test_is_sparse_text_threshold():
    assert is_sparse_text("short") is True
    assert is_sparse_text("word " * 200) is False


def test_html_to_text_strips_scripts_and_gets_title():
    html = "<html><head><title>Hi</title></head><body><script>evil()</script><p>Hello world</p></body></html>"
    text, title = html_to_text(html)
    assert title == "Hi"
    assert "Hello world" in text
    assert "evil()" not in text


@patch("app.utils.fetch.is_allowed", return_value=True)
@patch("app.utils.fetch._fetch_with_playwright")
@patch("app.utils.fetch._fetch_with_requests")
def test_fetch_page_falls_back_to_playwright_on_sparse_text(mock_requests, mock_playwright, mock_robots):
    mock_requests.return_value = _page("too short", "requests")
    mock_playwright.return_value = _page("word " * 200, "playwright")

    result = fetch_page("https://example.com")

    assert result.fetch_method == "playwright"
    mock_playwright.assert_called_once()


@patch("app.utils.fetch.is_allowed", return_value=True)
@patch("app.utils.fetch._fetch_with_playwright")
@patch("app.utils.fetch._fetch_with_requests")
def test_fetch_page_uses_requests_when_content_is_sufficient(mock_requests, mock_playwright, mock_robots):
    mock_requests.return_value = _page("word " * 200, "requests")

    result = fetch_page("https://example.com")

    assert result.fetch_method == "requests"
    mock_playwright.assert_not_called()


@patch("app.utils.fetch.is_allowed", return_value=False)
def test_fetch_page_respects_robots_disallow(mock_robots):
    result = fetch_page("https://example.com/disallowed")
    assert result is None
