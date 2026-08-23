# Maktab AI Arena — ТЗ: Zero (Backend)

**Роль:** единственный backend, source of truth для всего проекта  
**Стек:** TypeScript, Express 5, Prisma, PostgreSQL, Redis, BullMQ, Zod, JWT + opaque refresh (rotation), OTP, Vitest  
**Base path:** `/api/v1`

---

## Summary

Zero строит **полный backend** для student app (Javodbek), teacher/admin app (Aziz + Muhammad Ali) и demo seed. Backend — единственный источник истины для пользователей, классов, challenges, attempts, duels, XP, streak, leaderboard и analytics. Frontend **не** считает score, XP, streak, winner дуэли или статистику.

Критичные зоны: **транзакционная защита** (finish attempt, accept duel, join class, duel completion) и **единый расчётный модуль** (score, XP, level, streak, mastery, duel winner, analytics).

---

## Задачи

### 1. Инфраструктура и каркас
- [ ] Express 5 app, `/api/v1`, envelope `{ data }` / `{ error: { code, message, details } }`
- [ ] Prisma schema — **все** сущности из ТЗ (раздел 7)
- [ ] AppError + ERROR_CODES (раздел 22)
- [ ] Zod validation на всех входах
- [ ] JWT access + opaque refresh с rotation
- [ ] OTP auth (demo mode: лог/console/fixed code)
- [ ] Middleware: auth, role, class membership
- [ ] Redis: OTP rate limit, AI generation limit, leaderboard cache
- [ ] BullMQ: `AI_GENERATE_CHALLENGE` job
- [ ] Demo seed (раздел 41)
- [ ] Vitest: unit (calculations) + critical integration tests (раздел 52)

### 2. Модель данных (полная)

| Сущность | Ключевые ограничения |
|----------|---------------------|
| User | role: STUDENT \| TEACHER \| ADMIN |
| OtpChallenge | codeHash, expiresAt |
| RefreshSession | tokenHash, familyId, rotation |
| SchoolClass | unique inviteCode |
| ClassMembership | **unique (classId, userId)** |
| Subject, Topic | soft archive |
| Challenge | status lifecycle, origin, type |
| Question, QuestionOption | isCorrect не в student DTO |
| Attempt | IN_PROGRESS → COMPLETED (immutable) |
| AttemptAnswer | **unique (attemptId, questionId)** |
| Duel | shareCode, terminal COMPLETED |
| StudentStats | **unique (userId, classId)** |
| TopicProgress | **unique (userId, topicId)** |
| XpLedger | **unique (userId, sourceType, sourceId)** — anti double-award |
| AiGenerationJob | PENDING → PROCESSING → COMPLETED/FAILED |
| ActivityEvent | teacher activity feed |

### 3. Единый расчётный модуль (`calculations/`)

Чистые детерминированные функции:
- `calculateAttemptScore` — `round((earned/total)*1000)`, 0..1000
- `calculateAccuracy`
- `calculateAttemptXp` — base 20 + accuracy*0.6 + perfect 20; max 100 без duel
- `calculateLevel` — `floor(totalXp/500)+1`
- `calculateStreak` — calendar day, timezone **Asia/Tashkent** (зафиксировать)
- `calculateTopicMastery` — last N=5 attempts, categories WEAK/LEARNING/GOOD/MASTERED
- `resolveDuelWinner` — score → correct → duration → DRAW
- `calculateDuelBonus` — +30 XP winner
- `calculateLeaderboardRankData`
- `calculateClassAnalytics`

### 4. Конкурентный доступ (обязательно)

| Операция | Защита | Риск без неё |
|----------|--------|--------------|
| `POST /attempts/:id/finish` | advisory lock + Serializable tx, идемпотентность | double XP, double streak |
| `POST /duels/code/:code/accept` | Serializable tx | два opponent |
| Duel completion | terminal state + unique XpLedger source | double winner bonus |
| `POST /classes/join` | unique (classId,userId) + safe retry | duplicate membership |
| Invite code generation | unique constraint | collision |

### 5. API — полный контракт

#### Auth
| Method | Path | Доступ |
|--------|------|--------|
| POST | `/auth/otp/request` | public |
| POST | `/auth/otp/verify` | public |
| POST | `/auth/refresh` | refresh token |
| POST | `/auth/logout` | authenticated |
| GET | `/auth/me` | authenticated |
| PATCH | `/auth/me` | authenticated |

#### Classes
| Method | Path | Доступ |
|--------|------|--------|
| GET | `/classes` | STUDENT, TEACHER |
| POST | `/classes` | TEACHER |
| GET | `/classes/:classId` | member |
| POST | `/classes/join` | STUDENT |
| GET | `/classes/:classId/members` | TEACHER, ADMIN |
| DELETE | `/classes/:classId/members/:userId` | TEACHER, ADMIN |

#### Subjects
| Method | Path | Доступ |
|--------|------|--------|
| GET | `/classes/:classId/subjects` | member |
| POST | `/classes/:classId/subjects` | TEACHER |
| PATCH | `/subjects/:subjectId` | TEACHER |
| DELETE | `/subjects/:subjectId` | TEACHER (archive) |

#### Topics
| Method | Path | Доступ |
|--------|------|--------|
| GET | `/subjects/:subjectId/topics` | member |
| POST | `/subjects/:subjectId/topics` | TEACHER |
| GET | `/topics/:topicId` | member (+ mastery для STUDENT) |
| PATCH | `/topics/:topicId` | TEACHER |
| DELETE | `/topics/:topicId` | TEACHER (archive) |

#### Challenges
| Method | Path | Доступ |
|--------|------|--------|
| GET | `/topics/:topicId/challenges` | member |
| POST | `/topics/:topicId/challenges/generate` | STUDENT, TEACHER |
| GET | `/challenges/:challengeId/status` | member |
| GET | `/challenges/:challengeId` | member (student без isCorrect) |
| POST | `/topics/:topicId/challenges` | TEACHER (manual) |
| PATCH | `/challenges/:challengeId/status` | TEACHER |

#### Attempts
| Method | Path | Доступ |
|--------|------|--------|
| POST | `/challenges/:challengeId/attempts` | STUDENT |
| GET | `/attempts/:attemptId` | owner, teacher |
| PUT | `/attempts/:attemptId/answers/:questionId` | owner |
| POST | `/attempts/:attemptId/finish` | owner (**critical tx**) |
| GET | `/me/attempts` | STUDENT |

#### Duels
| Method | Path | Доступ |
|--------|------|--------|
| POST | `/attempts/:attemptId/duels` | STUDENT (completed attempt) |
| GET | `/duels/code/:shareCode` | authenticated |
| POST | `/duels/code/:shareCode/accept` | STUDENT (**critical tx**) |
| GET | `/duels/:duelId` | participants, teacher |
| GET | `/me/duels` | STUDENT |

#### Student dashboard
| Method | Path | Доступ |
|--------|------|--------|
| GET | `/me/dashboard` | STUDENT |
| GET | `/me/stats` | STUDENT |
| GET | `/me/topics/progress` | STUDENT |

#### Leaderboard
| Method | Path | Доступ |
|--------|------|--------|
| GET | `/classes/:classId/leaderboard` | member (`period=week\|all`) |

#### Teacher (для Aziz + Muhammad Ali)
| Method | Path | Использует |
|--------|------|------------|
| GET | `/teacher/classes/:classId/dashboard` | Muhammad Ali |
| GET | `/teacher/classes/:classId/students` | Muhammad Ali |
| GET | `/teacher/classes/:classId/students/:userId` | Muhammad Ali |
| GET | `/teacher/classes/:classId/topics/analytics` | Muhammad Ali |
| GET | `/teacher/topics/:topicId/analytics` | Muhammad Ali |
| GET | `/teacher/classes/:classId/activity` | Muhammad Ali |
| GET | `/teacher/classes/:classId/reports/overview` | Muhammad Ali |
| GET | `/teacher/classes/:classId/reports/leaderboard` | Muhammad Ali |

#### Admin (optional MVP)
| Method | Path |
|--------|------|
| GET | `/admin/overview` |
| GET | `/admin/users` |
| PATCH | `/admin/users/:userId/status` |
| GET | `/admin/challenges` |
| PATCH | `/admin/challenges/:challengeId/status` |
| GET | `/admin/ai-jobs` |
| POST | `/admin/ai-jobs/:jobId/retry` |

### 6. AI generation
- Input: topic context, difficulty, questionCount (5–10, demo: **5**)
- Output validation: SINGLE_CHOICE, TRUE_FALSE only; exactly one correct option
- Status: PENDING → PROCESSING → READY | FAILED
- **Fallback fixture** для demo если provider недоступен
- BullMQ worker + polling endpoint `/challenges/:id/status`

### 7. Security rules
- Проверять ownership + class membership, не только JWT
- Student DTO **никогда** не содержит `isCorrect`, `correctOptionId` до finish
- Не принимать от клиента: score, XP, correctCount, winnerId, streak, rank, mastery

### 8. Demo seed (раздел 41)
- 1 teacher, 5–8 students, class 9A
- Subjects: Math, English, Physics + topics
- Pre-filled: attempts, XP, leaderboard, weak topic, activity events

---

## Приоритет реализации (critical path)

1. Auth (OTP, refresh, `/auth/me`)
2. Classes + join + membership
3. Subjects + topics
4. Challenge generate + status + GET (student-safe DTO)
5. Attempt start → answer → **finish** (tx + calculations)
6. XP ledger + streak + topic progress
7. Duel create → accept → complete
8. Leaderboard
9. `/me/dashboard`
10. Teacher dashboard + analytics + activity
11. Seed + fallback AI

---

## Зависимости

| От кого | Что нужно Zero |
|---------|----------------|
| Команда (5 мин) | product name, UI language, OTP channel (phone/email), AI provider key, timezone, question count=5, duel expiry=24h |
| Никого для старта | Может начинать сразу: schema, enums, DTO contracts, mock responses |

| Кому Zero блокирует | Что отдать первым |
|---------------------|-------------------|
| Javodbek | JSON contracts: auth, dashboard, join, topics, challenge, attempt, duel, leaderboard |
| Aziz | classes CRUD, members, subjects, topics, challenges |
| Muhammad Ali | teacher dashboard, students analytics, topic analytics, activity, reports |

---

## Параллельная работа

**Можно сразу (Zero):**
- Prisma schema, enums, error codes
- Calculation module + unit tests
- Auth endpoints
- OpenAPI/JSON contract files для frontend

**После auth contract (разблокирует frontend):**
- Javodbek/Aziz/Muhammad Ali работают на mock по контракту

**Только Zero (не делегировать):**
- finish attempt tx
- accept duel tx
- XP ledger
- AI validation
- Student vs teacher DTO mapping

---

## Acceptance criteria (раздел 43)

Через API-only сценарий:
OTP → verify → teacher create class → invite → student join → subject → topic → generate challenge → READY → start attempt → answers → finish (XP/streak) → create duel → second student accept → finish → winner → leaderboard → teacher dashboard → topic analytics.

---

## Что НЕ делать (раздел 39)

LMS, RAG, free-text grading, real SMS (если тормозит), сложные permissions, десятки question types.

---

## Технические решения (зафиксировать Day 0)

- Timezone: `Asia/Tashkent`
- Question count demo: `5`
- Duel expiry: `24h`
- Weekly leaderboard: starts Monday
- OTP: один канал (phone **или** email)
- AI provider: один + fallback fixtures для 2–3 topics
