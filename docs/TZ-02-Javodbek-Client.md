# Zehn AI — ТЗ: Javodbek (Student React)

**Роль:** отдельное React-приложение для ученика  
**Стек:** React, Vite (уже в `client/`)  
**Цель UX:** игровой learning product — открыть → выбрать challenge за 1–2 клика → result → Challenge a Friend

---

## Summary

Javodbek делает **student-facing React app**: auth, onboarding, dashboard, subjects/topics, прохождение challenge, result screen, duels, leaderboard, profile. Все расчёты (score, XP, streak, winner) приходят **с backend** — клиент отправляет только `selectedOptionId`.

---

## Routes

| Route | Экран |
|-------|-------|
| `/login` | Login |
| `/verify` | OTP 6-digit |
| `/onboarding` | displayName, avatar, optional invite |
| `/join` | Join class by invite code |
| `/dashboard` | Главный экран |
| `/subjects` | Список предметов |
| `/subjects/:subjectId` | Topics предмета |
| `/topics/:topicId` | Topic details + Generate/Practice |
| `/challenge/:challengeId` | Challenge intro |
| `/attempt/:attemptId` | Question flow |
| `/attempt/:attemptId/result` | Result + Challenge Friend |
| `/duel/:shareCode` | Duel invite |
| `/duels` | Мои duels |
| `/leaderboard` | Weekly / All time |
| `/profile` | Stats, streak, duel record |

---

## Экраны и API (метод + путь)

### Auth flow
| Экран / действие | API |
|------------------|-----|
| Login — запрос OTP | `POST /auth/otp/request` `{ identifier }` |
| Verify OTP | `POST /auth/otp/verify` `{ identifier, code }` → tokens + user |
| После login | `GET /auth/me` |
| Refresh при 401 | `POST /auth/refresh` |
| Logout | `POST /auth/logout` |
| Onboarding save | `PATCH /auth/me` `{ displayName, avatarUrl?, onboardingCompleted }` |

**Ошибки UI:** OTP_INVALID, OTP_EXPIRED, OTP_RATE_LIMITED, USER_BLOCKED

### Onboarding / Join class
| Действие | API |
|----------|-----|
| Join class | `POST /classes/join` `{ inviteCode }` |
| Список классов (если нужен) | `GET /classes` |

**Ошибки:** INVITE_CODE_INVALID, CLASS_ARCHIVED, ALREADY_CLASS_MEMBER

### Dashboard (`/dashboard`)
| Блок | API |
|------|-----|
| Весь первый экран (агрегат) | `GET /me/dashboard` |

Response должен включать: profile, class, XP, level, streak, subjects, recommended topic, leaderboard preview, active duels, recent activity.

*Не делать 10 отдельных запросов для dashboard.*

### Subjects & Topics
| Экран | API |
|-------|-----|
| Subjects list | из `/me/dashboard` или `GET /classes/:classId/subjects` |
| Subject → topics | `GET /subjects/:subjectId/topics` |
| Topic details + mastery | `GET /topics/:topicId` |
| Topic progress list | `GET /me/topics/progress?subjectId=` |

### Challenge generation & start
| Действие | API |
|----------|-----|
| Generate AI challenge | `POST /topics/:topicId/challenges/generate` `{ difficulty, questionCount: 5 }` |
| Poll status | `GET /challenges/:challengeId/status` |
| Challenge intro (metadata) | `GET /challenges/:challengeId` |
| Start attempt | `POST /challenges/:challengeId/attempts` |

**UI states:** generating (skeleton), FAILED (retry), READY

**Ошибки:** AI_GENERATION_LIMIT, AI_PROVIDER_UNAVAILABLE, CHALLENGE_NOT_READY

### Attempt flow (`/attempt/:attemptId`)
| Действие | API |
|----------|-----|
| Load attempt + questions | `GET /attempts/:attemptId` |
| Submit answer (per question) | `PUT /attempts/:attemptId/answers/:questionId` `{ selectedOptionId }` |
| Finish | `POST /attempts/:attemptId/finish` |

**Критично UI:**
- disable double-submit на Finish
- loading state на finish
- **не показывать** correct answers до finish

**Finish response:** score, accuracy, xpAwarded, totalXp, level, streak, questionResults[] (с correctOptionId, explanation)

### Result (`/attempt/:attemptId/result`)
Данные из finish response (сохранить в state/cache).

| CTA | API |
|-----|-----|
| Challenge a Friend | `POST /attempts/:attemptId/duels` → shareCode, sharePath, expiresAt |
| Try again | новый `POST .../attempts` |
| Back to dashboard | navigate |

**100% accuracy** — celebration state (только UI)

### Duel flow
| Экран / действие | API |
|------------------|-----|
| Preview по ссылке `/duel/:shareCode` | `GET /duels/code/:shareCode` |
| Accept | `POST /duels/code/:shareCode/accept` → opponentAttemptId + questions |
| Прохождение | тот же attempt flow |
| Duel result | `GET /duels/:duelId` |
| Список duels | `GET /me/duels?status=&cursor=&limit=` |

**Ошибки UI:** DUEL_EXPIRED, DUEL_ALREADY_ACCEPTED, CANNOT_DUEL_SELF

**Share:** Copy link + Web Share API (без Telegram API)

### Leaderboard (`/leaderboard`)
| Tab | API |
|-----|-----|
| This week / All time | `GET /classes/:classId/leaderboard?period=week\|all&limit=` |

Показать top 3, sticky current user rank.

### Profile (`/profile`)
| Данные | API |
|--------|-----|
| Extended stats | `GET /me/stats` |
| Profile header | `GET /auth/me` + stats |

### History (optional in nav)
| Данные | API |
|--------|-----|
| Recent attempts | `GET /me/attempts?limit=&cursor=&subjectId=&topicId=` |

---

## Задачи (checklist)

### Core
- [ ] API client (base URL, auth header, refresh interceptor, error by `error.code`)
- [ ] Auth store (tokens, user)
- [ ] Protected routes
- [ ] Login + OTP screens
- [ ] Onboarding + optional join
- [ ] Dashboard (hero card, stats strip, leaderboard preview, active duel)
- [ ] Subjects → Topics → Topic detail
- [ ] Challenge generation polling UI
- [ ] Challenge intro
- [ ] Attempt screen (progress, next/finish, exit confirm)
- [ ] Result screen (strong visual for demo)
- [ ] Create duel + share modal
- [ ] Duel invite + accept
- [ ] Duel result (two sides, winner, bonus XP)
- [ ] Leaderboard tabs
- [ ] Profile

### Empty / error states (обязательно)
- [ ] no class
- [ ] no subjects / no topics
- [ ] AI generation failed
- [ ] challenge unavailable
- [ ] duel expired / already accepted
- [ ] leaderboard empty
- [ ] network error

### UX requirements
- [ ] Mobile-friendly
- [ ] Premium gamified look (не LMS, не generic AI gradient)
- [ ] Max 1–2 taps to start challenge from dashboard
- [ ] disable double-click Finish

---

## Зависимости

| Блокирует | Что нужно от Zero |
|-----------|-------------------|
| Старт на mock | **JSON contracts** (не ждать реализации) |
| Интеграция auth | `POST /auth/otp/*`, `/auth/me`, refresh |
| Dashboard | `GET /me/dashboard` |
| Golden path | join, topics, generate, attempt, finish, duel, leaderboard |
| classId для leaderboard | join class или dashboard.currentClass |

**Можно параллельно с Zero:** все экраны на mock JSON после фиксации контрактов.

**Только после backend:** реальная интеграция finish/duel (гонки проверяются на backend, UI — disable double submit).

**Согласовать с Aziz/Muhammad Ali:** не нужно (разные apps). Общее только backend API.

---

## API contract — минимум до старта (раздел 27)

Zero фиксирует первым:
1. Auth + `/auth/me`
2. `GET /me/dashboard`
3. `POST /classes/join`
4. Subjects/topics GET
5. Challenge generate/status/GET
6. Attempt start/answer/finish
7. Duel create/preview/accept/details
8. Leaderboard
9. `/me/stats`

---

## Acceptance criteria (раздел 44)

Без DevTools пользователь может:
login → join class → dashboard → topic → challenge → answer → finish → see result → create duel → second account accept → complete → see winner → leaderboard.

Loading/error/empty states не ломают layout.

---

## Demo script (участие Student A & B, раздел 40)

1. Student A: dashboard → Math → Quadratic Equations → 5 questions → result 4/5, +XP, streak
2. Challenge Friend → copy link
3. Student B: open link → accept → same questions → result
4. Duel winner screen → leaderboard updated

---

## Что НЕ делать

- Считать score/XP/streak на клиенте
- Показывать correct answers до finish
- Free-text answers
- AI chat UI
