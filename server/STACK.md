# Maktab AI Arena — Backend Stack

**Product:** Maktab AI Arena (school AI challenge platform)  
**API base path:** `/api/v1`  
**Response envelope:** `{ "data": ... }` / `{ "error": { "code", "message", "details" } }`  
**Timezone:** `Asia/Tashkent`  
**Demo question count:** `5`  
**Duel expiry:** `24h`

## Runtime

| Layer | Choice |
|-------|--------|
| Language | Python 3.11+ |
| Framework | FastAPI + uvicorn |
| Validation | Pydantic v2 + pydantic-settings |
| HTTP client | httpx (async, pooled) |
| Logging | structlog |
| DB (Agent 2+) | PostgreSQL + SQLAlchemy/asyncpg (per TZ entities) |
| Cache/queue (Agent 2+) | Redis, background jobs for `AI_GENERATE_CHALLENGE` |

## AI provider

OpenAI-compatible **AgentRouter**:

- Base URL: `AGENTROUTER_BASE_URL` (default `https://agentrouter.org/v1`)
- Model: `AGENTROUTER_MODEL` (default `claude-opus-5`)
- Client: `server.ai.client.AgentRouterClient`

## Agent ownership

| Path | Owner |
|------|-------|
| `server/core/`, `server/ai/`, `pyproject.toml`, `.env.example` | Agent 1 (bootstrap) |
| `server/db/`, `server/models/` | Agent 2 |
| `server/api/`, auth middleware | Agent 3 |
| `server/services/`, calculations | Agent 4 |
| `server/agents/`, workers, seed | Agent 5 |
| `tests/` | shared |

## Notes vs original TZ

Original docs (`docs/TZ-01-Zero-Backend.md`, `docs/fulltz.txt`) specify TypeScript/Express/Prisma. This repo implements the **same product contract** on **Python/FastAPI** for the hackathon backend.
