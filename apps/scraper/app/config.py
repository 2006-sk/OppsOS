from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# apps/scraper/app/config.py -> parents[0]=app, [1]=scraper, [2]=apps, [3]=repo root
REPO_ROOT = Path(__file__).resolve().parents[3]
SCRAPER_ROOT = Path(__file__).resolve().parents[1]

load_dotenv(SCRAPER_ROOT / ".env")

DB_PATH = Path(os.environ.get("DATABASE_PATH", REPO_ROOT / "data" / "app.db")).resolve()

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "").strip() or None
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

# Alternative OpenAI-compatible provider (e.g. Novita hosting DeepSeek).
# Used only when OPENAI_API_KEY is unset — see extraction/__init__.py. Unlike
# OpenAI, most OpenAI-compatible providers don't support strict json_schema
# structured outputs, only best-effort `json_object` mode — see
# extraction/json_mode_llm.py for how that's handled.
LLM_COMPAT_API_KEY = os.environ.get("LLM_COMPAT_API_KEY", "").strip() or None
LLM_COMPAT_BASE_URL = os.environ.get("LLM_COMPAT_BASE_URL", "https://api.novita.ai/openai")
LLM_COMPAT_MODEL = os.environ.get("LLM_COMPAT_MODEL", "deepseek/deepseek-v4-flash")

TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY", "").strip() or None
SERPAPI_API_KEY = os.environ.get("SERPAPI_API_KEY", "").strip() or None

SCRAPER_API_SECRET = os.environ.get("SCRAPER_API_SECRET", "").strip() or None

USER_AGENT = os.environ.get(
    "SCRAPER_USER_AGENT",
    "OpportunityOS-Bot/0.1 (+https://github.com/; educational research crawler for a single student's discovery tool)",
)

REQUEST_TIMEOUT_SECONDS = float(os.environ.get("SCRAPER_TIMEOUT_SECONDS", "15"))
MAX_FETCH_RETRIES = int(os.environ.get("SCRAPER_MAX_RETRIES", "3"))
DOMAIN_THROTTLE_SECONDS = float(os.environ.get("SCRAPER_DOMAIN_THROTTLE_SECONDS", "3"))
MAX_REDIRECTS = int(os.environ.get("SCRAPER_MAX_REDIRECTS", "5"))

QUERIES_CONFIG_PATH = SCRAPER_ROOT / "config" / "queries.yaml"
