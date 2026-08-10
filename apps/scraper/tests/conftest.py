from datetime import datetime, timezone
from pathlib import Path

import pytest

from app.utils.fetch import FetchedPage
from app.utils.textclean import html_to_text

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def load_fixture_page(filename: str, url: str = "https://example.com/opportunity") -> FetchedPage:
    html = (FIXTURES_DIR / filename).read_text()
    cleaned_text, title = html_to_text(html)
    return FetchedPage(
        url=url,
        final_url=url,
        title=title,
        html=html,
        cleaned_text=cleaned_text,
        fetch_method="requests",
        status_code=200,
        retrieved_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def legit_page() -> FetchedPage:
    return load_fixture_page("legit_competition.html")


@pytest.fixture
def sparse_page() -> FetchedPage:
    return load_fixture_page("sparse_js_app.html")


@pytest.fixture
def scam_page() -> FetchedPage:
    return load_fixture_page("scam_page.html")
