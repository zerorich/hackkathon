# Maktab AI Arena — Backend Run Guide

Production backend for the hackathon MVP. API base path: `/api/v1`.

## Quick start (local)

```bash
cd server
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

cp .env.example .env
# Edit .env — set AGENTROUTER_API_KEY (never commit real key)

make seed    # optional demo data
make dev     # uvicorn with reload on :8000
```

Health: `GET http://localhost:8000/health`  
OpenAPI: `http://localhost:8000/docs`

## Docker (PostgreSQL + Redis)

```bash
cd server
cp .env.example .env
make docker-up
# or from repo root: docker compose up -d --build
```

Compose sets `DATABASE_URL=postgresql+asyncpg://maktab:maktab@db:5432/maktab`, `REDIS_URL=redis://redis:6379/0`, and `SEED_ON_STARTUP=true`.

## Demo auth

With `OTP_DEMO_MODE=true` (default), OTP code is `123456` for any identifier. Demo seed creates:

- `teacher@demo.local`
- `student1@demo.local` … `student5@demo.local`
- Class **9A** with Math/English/Physics topics and one READY challenge

## Tests

```bash
make test
# or: pytest tests/ -v
```

Covers: calculations, AI client mocking/fallback, orchestrator concurrency, auth & class API routes.

## Configuration highlights

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLite (dev) or PostgreSQL (prod/docker) |
| `REDIS_URL` | Optional; in-memory cache fallback if unset |
| `MAX_CONCURRENT_AI_JOBS` | AI worker concurrency limit (default 2) |
| `REDIS_AI_GENERATION_LIMIT_PER_USER` | Active generation jobs per user |
| `AGENTROUTER_*` | AI provider (agentrouter.org, model claude-opus-5) |
| `AI_USE_FALLBACK_ON_ERROR` | Use fixture challenges when provider fails |

## Architecture (Agent 5 glue)

Agents 1–4 delivered bootstrap only (`server/core/settings.py`, logging). Agent 5 added:

- Full SQLAlchemy models, services, `/api/v1` routes
- Calculations module (score, XP, streak, duel winner, analytics)
- AgentRouter AI client + async orchestrator (BullMQ-equivalent background jobs)
- Redis/in-memory cache for OTP cooldown & leaderboard
- Demo seed, Docker, Makefile, tests

## Known TZ gaps (MVP)

- Admin routes (`/admin/*`) — not implemented
- Manual teacher challenge POST — stub via seed/fixtures only
- Real SMS/email OTP — demo mode only
- PostgreSQL advisory locks — app-level asyncio locks used for SQLite compatibility
- Full demo seed with pre-filled attempts/XP/leaderboard — partial (class + READY challenge)

## Golden path (API)

1. `POST /auth/otp/request` + `POST /auth/otp/verify`
2. Teacher: `POST /classes`, `POST /classes/{id}/subjects`, `POST /subjects/{id}/topics`
3. `POST /topics/{id}/challenges/generate` → poll `GET /challenges/{id}/status`
4. Student: `POST /challenges/{id}/attempts` → `PUT .../answers/...` → `POST .../finish`
5. `POST /attempts/{id}/duels` → opponent `POST /duels/code/{code}/accept` → finish → leaderboard

See `docs/TZ-01-Zero-Backend.md` for full contract.
