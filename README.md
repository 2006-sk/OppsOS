# Opportunity OS

Opportunity OS answers one question for a Grade 10 student in India: **"What are the best opportunities available to me right now, how hard are they, and which ones are worth pursuing?"**

It's not a database someone maintains by hand. A Python service actively **discovers** competitions, olympiads, fellowships, summer programs, and similar opportunities from the open web, extracts structured facts from them, and re-checks known opportunities for changes over time. A Next.js app ranks and presents only the opportunities worth a student's attention — with every important fact traceable to a source URL.

## Scope decision: SQLite instead of Supabase/Postgres

The original design brief called for Supabase (Postgres + Auth). This build uses a **single shared SQLite file** (`data/app.db`) instead, with a small custom credentials-based auth layer (bcrypt + signed JWT session cookie), so the whole thing runs locally with zero external accounts. Concretely:

- **Auth**: email/password, hashed with bcrypt, session as an httpOnly JWT cookie. No Supabase Auth.
- **RLS substitute**: SQLite has no Row Level Security. Every query touching a user-scoped table (`user_opportunity_state`, `opportunity_scores`, `profiles`) filters by the authenticated user's id in application code — see `apps/web/src/lib/db/*.ts` and `apps/web/src/lib/session.ts`.
- **Schema types**: SQLite has no native enum or array/jsonb type. Enum-like fields are `String` columns with the allowed values documented in a comment above each field in `apps/web/prisma/schema.prisma`. Arrays/objects use Prisma's `Json` scalar.
- **Both apps share one DB file**: the Next.js app (via Prisma) and the Python scraper (via the stdlib `sqlite3` module) read and write the same `data/app.db`, with `PRAGMA journal_mode=WAL` and a `busy_timeout` set on both sides so they don't collide.
- **Prisma stores `DateTime` as epoch milliseconds and `Boolean` as 0/1 on SQLite** — this was verified empirically against real rows the Prisma seed script wrote (not assumed). The Python side matches this exactly; see `apps/scraper/app/utils/dt.py`.

The architecture is still built to swap this out — Postgres/Supabase (per the original spec) or a hosted SQLite-compatible service like Turso/libSQL — by changing `DATABASE_URL` on the Prisma side and the connection string on the Python side. See **Known limitations** below for why you'd want to.

## Architecture

```
opportunity-os/
  apps/
    web/        Next.js 16, TypeScript, Tailwind, shadcn/ui (Base UI), Prisma+SQLite
    scraper/    Python 3.12, FastAPI, discovery/monitoring/extraction/ranking pipelines
  data/
    app.db      shared SQLite database (gitignored — created by `prisma migrate`)
  .github/workflows/
    discovery.yml   scheduled discovery runs
    monitor.yml     scheduled monitoring runs
```

### Discovery vs. monitoring — two separate pipelines

- **Discovery** (`apps/scraper/app/discovery/`) finds opportunities the system doesn't know about yet: it runs search queries (rotating through a configured list, not all of them every run), fetches candidate pages, classifies whether each is a legitimate opportunity relevant to a secondary-school student, extracts structured facts, checks for duplicates against what's already known, and stores new opportunities **unpublished**, pending human review. A dedicated `winner_mining` strategy searches for articles about successful students, extracts *mentioned* competition names, and independently re-verifies each one by searching for and processing its own official page — a mention is never trusted on its own.
- **Monitoring** (`apps/scraper/app/monitoring/`) re-checks opportunities the system already knows about: it re-fetches each official source, compares a content hash, and only re-extracts and diffs fields if the page actually changed — recording what changed in `opportunity_change_history`.

Both pipelines share the same fetching, extraction, validation, dedup, and storage code — they differ only in *what* they process and *why*.

### The "never invent facts" rule

Every extractor's system prompt explicitly instructs it to return `null` rather than guess, for every field. There are three extraction tiers, tried in order (`apps/scraper/app/extraction/__init__.py`):

1. **`OPENAI_API_KEY` set** → `extraction/llm.py`, using OpenAI's provider-enforced strict `json_schema` structured outputs (`chat.completions.parse`). Highest confidence.
2. **`LLM_COMPAT_API_KEY` set** (and no OpenAI key) → `extraction/json_mode_llm.py`, for any OpenAI-compatible endpoint that only supports `response_format: {"type": "json_object"}` rather than a provider-enforced schema — verified against Novita's `deepseek/deepseek-v4-flash` endpoint, which returns a 400 on `json_schema` but works well in `json_object` mode (correctly extracted grade/age ranges, fee, deadline with a supporting quote, and prize amount from a test page, while correctly leaving `organization`/`description` null when they weren't stated). Because the schema isn't provider-enforced here, extractions from this path are capped at the same lower confidence as heuristic extraction.
3. **Neither set** → `extraction/heuristic.py`, a conservative regex/rule-based extractor that pulls deadlines, fees, and grade/age ranges only when they're unambiguously stated near an expected keyword, and otherwise leaves fields `null`.

All three flow through the same validation step (implausible dates get dropped, scam language gets flagged, source confidence gets scored) before anything is stored.

### Human review gate

Every opportunity the scraper discovers is inserted with `published = false`. It does **not** appear in the student-facing feed until an admin accepts the matching row on `/admin/review` (see `apps/web/src/app/admin/review/`). This is the most effective lever for reliability in a system that turns web pages into structured facts automatically — a discovered "opportunity" that's actually a listicle blog post gets caught here, not shown to the student. The first account ever registered is auto-promoted to admin (see `apps/web/src/app/api/auth/register/route.ts`); promote additional admins by setting `isAdmin = true` directly in the database until a real admin-management UI exists.

### Scoring

- `difficultyScore`, `valueScore`, `legitimacyScore` are opportunity-level (not per-student) and are computed by the scraper's ranking heuristics (`apps/scraper/app/ranking/score.py`) at extraction/monitoring time.
- `fitScore` and the `do_it` / `consider` / `skip` recommendation are per-student — they depend on a specific profile, so they're computed by the Next.js app at read time (`apps/web/src/lib/fit.ts`, `apps/web/src/lib/recommendation.ts`), joining the logged-in student's profile against each opportunity.
- All four map from an internal 0–100 number to a label (`EASY`/`MEDIUM`/`HARD`/`EXTREME`, `POOR`/`OKAY`/`GOOD`/`GREAT`, `LOW`/`MEDIUM`/`HIGH`/`EXCEPTIONAL`) via `apps/web/src/lib/scoring.ts` — the UI never renders a raw score.

## Local setup

### Prerequisites

- Node.js 20+
- Python 3.12+
- `openssl` (for generating a session secret; any equivalent works)

### 1. Clone and configure environment variables

```bash
cp .env.example apps/web/.env.local   # then fill in AUTH_SECRET, SCRAPER_API_SECRET
cp .env.example apps/scraper/.env     # then fill in TAVILY_API_KEY, SERPAPI_API_KEY, OPENAI_API_KEY
```

Generate a session secret:

```bash
openssl rand -base64 32
```

`apps/web/.env` (committed, contains no secrets) already points `DATABASE_URL` at the shared file:

```
DATABASE_URL="file:../../../data/app.db"
```

### 2. Set up the database (Next.js side)

```bash
cd apps/web
npm install
npx prisma migrate dev   # creates data/app.db and applies the schema
npm run db:seed          # seeds 5 real, source-cited opportunities
```

### 3. Run the web app

```bash
npm run dev
```

Visit `http://localhost:3000`, create an account (the first account is auto-promoted to admin), complete onboarding, and you'll land on `/opportunities`.

### 4. Set up the scraper service (Python side)

```bash
cd apps/scraper
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
```

### 5. Trigger discovery/monitoring manually

Directly via the CLI (writes to `data/app.db`):

```bash
cd apps/scraper
source .venv/bin/activate
python -m app.discovery.run
python -m app.monitoring.run
```

Or via the FastAPI service:

```bash
uvicorn app.main:app --reload --port 8000
curl -X POST http://localhost:8000/discovery/run  -H "X-API-Key: $SCRAPER_API_SECRET"
curl -X POST http://localhost:8000/monitoring/run -H "X-API-Key: $SCRAPER_API_SECRET"
curl -X POST http://localhost:8000/scrape/url -H "X-API-Key: $SCRAPER_API_SECRET" -H "Content-Type: application/json" -d '{"url":"https://example.com"}'
```

Newly discovered opportunities land on `/admin/review` (unpublished, `state = pending`) — accept, reject, or mark them as a duplicate of an existing opportunity from there.

## Environment variables

See `.env.example` for the full documented list. Summary:

| Variable | Used by | Required for |
|---|---|---|
| `DATABASE_URL` (web) / `DATABASE_PATH` (scraper) | both | everything — points at the shared SQLite file |
| `AUTH_SECRET` | web | signing session JWTs |
| `SCRAPER_API_SECRET` | scraper only | authenticating calls to the scraper's own FastAPI endpoints (the web app's admin actions talk to Prisma/SQLite directly, not to this service, so it doesn't need this var) |
| `TAVILY_API_KEY` | scraper | discovery search (primary provider) |
| `SERPAPI_API_KEY` | scraper | discovery search (automatic backup if Tavily is unset or fails) |
| `OPENAI_API_KEY` | scraper | **LLM extraction**, strict schema (highest confidence) |
| `LLM_COMPAT_API_KEY` / `_BASE_URL` / `_MODEL` | scraper | **LLM extraction** via any OpenAI-compatible `json_object`-mode endpoint, used only if `OPENAI_API_KEY` is unset. Without either key, extraction runs in a lower-confidence heuristic (regex-based) mode |

## Testing

Web app (Vitest — pure scoring/fit/recommendation logic):

```bash
cd apps/web
npm test
```

Scraper (pytest — ranking, dedup, validation, heuristic extraction, fetch fallback, SSRF guard; all against local fixtures, no live network calls):

```bash
cd apps/scraper
source .venv/bin/activate
python -m pytest
```

## Deployment

- **Next.js app**: deployable to Vercel as usual (`vercel deploy`), but see the SQLite caveat below first.
- **Scraper service**: deployable to Railway/Render/Fly.io as a FastAPI app (`uvicorn app.main:app`), or run purely as scheduled scripts via GitHub Actions / cron — no long-running server is strictly required unless you want the `/scrape/url` ad-hoc endpoint.
- **Database**: hosted SQLite (see below) or swap `DATABASE_URL`/the Python connection string to Postgres/Supabase per the original spec.

## Known limitations

- **Local SQLite does not survive a Vercel + GitHub-hosted-runner deployment.** Vercel serverless functions have an ephemeral, effectively read-only filesystem, and GitHub-hosted Actions runners are fresh VMs with no shared disk. A local `data/app.db` file only works when every process that touches it shares the same persistent disk — true for local development, and true for a single self-hosted machine (e.g. a small always-on VPS or home server running both `next start` and the scraper's cron jobs via `systemd`/`cron` or a **self-hosted** GitHub Actions runner on that same machine — this is what `.github/workflows/*.yml` default to `runs-on: self-hosted` for). To deploy the web app to Vercel with GitHub-hosted runners doing discovery/monitoring against the *same* live data, swap the database for a network-reachable SQLite-compatible service (e.g. Turso/libSQL — same SQL, minimal code changes) or migrate to Postgres/Supabase as originally specified.
- **No `OPENAI_API_KEY` was configured in this build.** `LLM_COMPAT_API_KEY` (Novita/DeepSeek) is configured instead and verified working — see "The never invent facts rule" above — so extraction is not running in bare heuristic mode by default here, but it also isn't running with a provider-enforced schema, so confidence is capped the same as heuristic mode. Add a real `OPENAI_API_KEY` to `apps/scraper/.env` for strict-schema extraction — no code changes needed, the extractor factory picks it up automatically and it takes priority over `LLM_COMPAT_API_KEY`.
- **Fit/difficulty/value scoring is a documented v1 heuristic, not a calibrated model.** The rules are deliberately simple and explainable (see `apps/web/src/lib/fit.ts` and `apps/scraper/app/ranking/score.py`) so they can be inspected and adjusted, not treated as ground truth — this matches the product principle that these are not objective truths.
- **LLM/heuristic classification can still misfire either way.** With bare heuristic keyword-matching, a live test run surfaced a few listicle/aggregator articles as "opportunities" alongside real ones. With the `LLM_COMPAT_API_KEY` extractor, a live test run correctly rejected 2 of 3 candidates and extracted a real, accurately-described program (Research Science Initiative India) for the third — a real improvement, but still not infallible. This is exactly what the admin review gate at `/admin/review` is for; nothing reaches the student feed unreviewed regardless of which extractor found it.
- **In-process rate limiting/throttling only holds within a single run** — `apps/scraper/app/utils/throttle.py`'s per-domain delay and the FastAPI rate limiter both reset when the process restarts. It also only throttles the *original* request URL; a cross-domain redirect chain isn't re-throttled per hop (it is still SSRF-checked per hop, which is the security-relevant part). Fine for scheduled, short-lived jobs; would need a persistent store (Redis, etc.) for a long-running multi-tenant deployment.
- **Single-admin-by-default.** The "first user is admin" rule is a pragmatic MVP default for what is currently a single-student tool, not a real permissions system — see the note in `prisma/schema.prisma` on `User.isAdmin`.
- **`opportunity_scores` is schema-only, not populated.** `fitScore`/`recommendation` are computed per-request in the web app (see Scoring above) rather than cached in this table. The table is reserved for a future caching layer if per-request computation ever becomes a real cost — right now, with a handful of opportunities, it isn't.
- **Detail page sections C–F are mostly empty in this build.** "What they judge," "what to submit," "competition stages," and "previous winners" only render if `opportunity_requirements`/`past_winners` rows exist. Neither the seed data (deliberately — those facts weren't confirmed for the 5 seeded opportunities) nor the heuristic extractor (deliberately conservative) populate them, so in heuristic mode these sections show "not documented yet" for every opportunity. An LLM extractor with a real `OPENAI_API_KEY` populates these fields when the source page states them.
- **The Playwright JS-rendering fallback is real and was verified live inside the actual async discovery pipeline** — not just unit-tested against mocks, and not just run as a standalone sync script (an earlier version of this note only verified the latter, which is a materially weaker claim: see the incident below). `fetch_page()` correctly detects a sparse `requests` fetch and falls back to a real headless Chromium render.
- **Incident, root-caused and fixed during development**: a live discovery run once hung for over an hour with the process sitting at ~0% CPU. Root causes were two real bugs, both now fixed with regression tests: (1) `socket.getaddrinfo()` in the SSRF guard (`apps/scraper/app/utils/ssrf.py`) has no built-in timeout and blocked forever on a domain with non-responding DNS — now resolved on a timed-out daemon thread; (2) Playwright's *sync* API cannot run on a thread with an active asyncio event loop, which `discovery/run.py` and `winner_mining.py` both have — every Playwright fallback attempt during a real discovery run was silently failing with a "Sync API inside the asyncio loop" error (it only "worked" in the earlier, non-representative standalone-script test above). Fixed by moving the synchronous per-URL pipeline work onto a worker thread via `asyncio.to_thread` in both files. Re-verified live after the fix: a run completed cleanly, correctly handling a connect-timeout domain and a domain with an actually-expired SSL certificate along the way, with Playwright observed genuinely attempting (and appropriately timing out on) real browser navigation rather than failing instantly.

## Success criteria checklist (spec section 37)

- [x] Create an account, complete a profile, see a ranked feed, filter/search, save opportunities, see difficulty/fit/value bars — all implemented and manually verified against a running instance.
- [x] Open an opportunity and see verified facts with source URLs and a last-verified date.
- [x] Run a discovery job (`python -m app.discovery.run`) — verified live against Tavily; it found real candidate opportunities, scraped and classified them, and stored valid ones unpublished.
- [x] Duplicate opportunities are filtered — verified live: a second listicle article about the same "Top Research Competitions for Indian High School Students" roundup, found via a different search query, was correctly matched against the first (same domain + high name similarity) and recorded as `state = duplicate` rather than inserted as a new opportunity.
- [x] Known opportunities can be re-checked (`python -m app.monitoring.run`) — verified live; it re-fetched official sources, compared content hashes, and updated `lastVerifiedAt`.
- [x] Newly discovered, eligible, high-fit/high-value opportunities appear under "Newly Found For You" once accepted via admin review — verified live: a real Tavily-discovered candidate was accepted through `/admin/review` and immediately appeared in `/api/opportunities` with a computed fit/value/recommendation.
