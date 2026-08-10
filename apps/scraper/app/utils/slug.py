import re


def slugify(text: str) -> str:
    text = re.sub(r"[^a-z0-9]+", "-", text.lower().strip())
    return text.strip("-") or "opportunity"
