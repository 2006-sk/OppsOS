import re

from bs4 import BeautifulSoup

SPARSE_TEXT_THRESHOLD = 300


def html_to_text(html: str) -> tuple[str, str | None]:
    """Returns (cleaned_text, title)."""
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript", "svg", "nav", "footer"]):
        tag.decompose()
    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else None
    text = soup.get_text(separator="\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip(), title


def is_sparse_text(text: str) -> bool:
    return len(text) < SPARSE_TEXT_THRESHOLD


def meta_description(html: str) -> str | None:
    soup = BeautifulSoup(html, "lxml")
    tag = soup.find("meta", attrs={"name": "description"}) or soup.find(
        "meta", attrs={"property": "og:description"}
    )
    if tag and tag.get("content"):
        return tag["content"].strip()
    return None
