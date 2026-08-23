# Zehn AI — Backend Run Guide

Production backend for the hackathon MVP. API base path: `/api/v1`.

## Quick start (local)

```bash
cd server
uv sync --frozen --extra dev
source .venv/bin/activate

cp .env.example .env
# Edit .env — set AGENTROUTER_API_KEY (never commit real key)

make seed    # optional demo data
make dev     # uvicorn with reload on :8000
```

Liveness: `GET http://localhost:8000/api/v1/health`
Readiness (DB + Redis + queue worker): `GET http://localhost:8000/api/v1/ready`
OpenAPI: `http://localhost:8000/docs`

## Docker (PostgreSQL + Redis)

```bash
# From the repository root:
cp server/.env.production.example .env
# Replace every placeholder in .env, then:
docker compose up -d --build
```

Compose is production-safe by default. Set `POSTGRES_PASSWORD`, a unique
`JWT_SECRET` (32+ characters), `AGENTROUTER_API_KEY`, and
`OTP_DELIVERY_WEBHOOK_URL` in the repository-root `.env` before starting it. It runs
`alembic upgrade head` as a one-shot service before the API and never seeds demo data.
PostgreSQL and Redis are not exposed on host ports.

For a standalone deployment, set `DATABASE_URL` and run `alembic upgrade head`
before starting the application. Plain `postgresql://` and `postgres://` URLs are
normalized to the async driver. URL-encode special characters in credentials.
The provided Docker image runs migrations automatically; Compose uses a dedicated
one-shot migration service so API startup is gated on a successful upgrade.

## Demo auth

With `OTP_DEMO_MODE=true` (default), OTP code is `123456` for any identifier. Demo seed creates:

- `teacher@demo.local`
- `student1@demo.local` … `student5@demo.local`
- Class **9A** with Mathematics, English, and Physics
- all seven presentation topics from TZ section 41
- READY challenges, completed attempts, XP/leaderboard, topic progress, a weak
  topic, completed duel, and recent teacher activity

## Tests

```bash
make test
# or: pytest tests/ -v
```

Covers the complete API golden path from OTP through AI generation, attempts,
duel, leaderboard, teacher dashboard, and topic analytics, plus seed invariants.

## AI learning chat

Authenticated students and teachers can use `/api/v1/ai/chat`:

- `POST /conversations` creates a private conversation.
- `GET /conversations` lists the current user's conversations.
- `GET` or `DELETE /conversations/{id}` reads or soft-deletes an owned conversation.
- `POST /conversations/{id}/messages` stores a user message and assistant reply.
- `GET /conversations/{id}/messages?limit=50&before=...` returns paginated history.

The safety prompt is neither persisted nor returned. Context and response sizes are bounded,
and per-user active/daily limits use Redis atomically in production. Development may return a
deterministic educational fallback when AgentRouter is unavailable.

## Configuration highlights

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLite (dev) or PostgreSQL (prod/docker) |
| `REDIS_URL` | Optional in development; required in staging/production |
| `MAX_CONCURRENT_AI_JOBS` | AI worker concurrency limit (default 2) |
| `REDIS_AI_GENERATION_LIMIT_PER_USER` | Active generation jobs per user |
| `AI_GENERATION_DAILY_LIMIT_PER_USER` | Daily accepted generation jobs per user |
| `AGENTROUTER_*` | AI provider (agentrouter.org, model claude-opus-5) |
| `AI_USE_FALLBACK_ON_ERROR` | Use fixture challenges when provider fails |

## Architecture

- Full SQLAlchemy models, services, `/api/v1` routes
- Calculations module (score, XP, streak, duel winner, analytics)
- AgentRouter AI client + durable database-backed generation queue with worker recovery
- Redis/in-memory cache for OTP cooldown & leaderboard
- PostgreSQL advisory/row locks for concurrent attempts, duels, quotas, and refresh rotation
- Alembic migrations and migration-gated Docker startup
- Demo seed, Docker, locked dependencies, Makefile, and regression tests

## Deployment notes

- Production OTP delivery uses `OTP_DELIVERY_WEBHOOK_URL`; connect it to the chosen
  SMS/email provider. Demo OTP is rejected by production configuration.
- The backend intentionally uses Python, FastAPI, and SQLAlchemy while preserving
  the product contract and server-authoritative business rules from the TZ.
- Run `make seed` in development to populate the complete presentation dataset.
  The seed is idempotent and prints the known invite code and READY challenge ID.

## Golden path (API)

1. `POST /auth/otp/request` + `POST /auth/otp/verify`
2. Teacher: `POST /classes`, `POST /classes/{id}/subjects`, `POST /subjects/{id}/topics`
3. `POST /topics/{id}/challenges/generate` → poll `GET /challenges/{id}/status`
4. Student: `POST /challenges/{id}/attempts` → `PUT .../answers/...` → `POST .../finish`
5. `POST /attempts/{id}/duels` → opponent `POST /duels/code/{code}/accept` → finish → leaderboard

See `docs/TZ-01-Zero-Backend.md` for full contract.
