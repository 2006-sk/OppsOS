# Mirrors apps/web/src/lib/scoring.ts — keep thresholds in sync. The web app
# is the only place these labels are rendered; this module exists so scraper
# logs/tests can reason about the same buckets without hardcoding numbers.


def _bucket(score: int, labels: tuple[str, str, str, str]) -> str:
    clamped = max(0, min(100, score))
    if clamped <= 25:
        return labels[0]
    if clamped <= 50:
        return labels[1]
    if clamped <= 75:
        return labels[2]
    return labels[3]


def difficulty_label(score: int) -> str:
    return _bucket(score, ("EASY", "MEDIUM", "HARD", "EXTREME"))


def value_label(score: int) -> str:
    return _bucket(score, ("LOW", "MEDIUM", "HIGH", "EXCEPTIONAL"))
