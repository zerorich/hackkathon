# Zehn AI — ТЗ: Aziz (Teacher/Admin — Часть A)

**Роль:** operational/management зона teacher/admin React app  
**Стек:** React, Vite (уже в `admin/`)  
**Партнёр:** Muhammad Ali — analytics зона в **том же** приложении

---

## Summary

Aziz отвечает за **CRUD и операционное управление**: shell приложения, классы, ученики, предметы, темы, challenges. Это «управление данными», не аналитика.

**Aziz делает базовый каркас первым** — layout, sidebar, routing skeleton, API client, auth store, design tokens. Muhammad Ali подключает свои routes после согласования shell.

---

## Владение routes (раздел 48)

| Route | Страница |
|-------|----------|
| `/` или `/classes` | Classes list (default landing) |
| `/classes/:id` | Class details (tabs) |
| `/classes/:id/students` | Students management |
| `/classes/:id/subjects` | Subjects list |
| `/subjects/:id/topics` | Topics list |
| `/challenges` | Global challenges list (optional) |
| `/challenges/:id` | Challenge detail / manual editor |

**Muhammad Ali владеет:** `/dashboard`, `/analytics/*`, `/leaderboard`, `/activity` — не трогать эти routes.

---

## Общий каркас (Aziz делает ПЕРВЫМ)

Согласовать один раз с Muhammad Ali, потом не переписывать:

- [ ] `AppShell` — sidebar + topbar + outlet
- [ ] `Sidebar` — nav items (Aziz sections + placeholders для Ali)
- [ ] `Topbar` — class selector, account menu
- [ ] `API client` — base `/api/v1`, auth, error handling by code
- [ ] `authStore` — tokens, user, TEACHER role check
- [ ] Design tokens — typography, radius, spacing, colors (SaaS calm, desktop-first)
- [ ] Shared UI: Button, Card, Table, Modal, Input, Badge, EmptyState, LoadingSkeleton
- [ ] Router setup — Aziz routes + lazy placeholders для Ali routes

**Пометка для Muhammad Ali:** подключаться к готовому shell, добавлять только свои page components и sidebar links.

---

## Экраны и API

### Auth (общий с Ali)
| Действие | API |
|----------|-----|
| Login OTP | `POST /auth/otp/request`, `POST /auth/otp/verify` |
| Session | `GET /auth/me`, `POST /auth/refresh`, `POST /auth/logout` |

Teacher использует тот же auth flow что student, role=TEACHER.

### Classes
| Экран / действие | API |
|------------------|-----|
| Classes list | `GET /classes` |
| Create class | `POST /classes` `{ name, grade, description? }` → inviteCode |
| Class details | `GET /classes/:classId` |
| Archive (optional) | через PATCH status если есть |

**Create Class UI:** после создания — показать invite code + Copy.

### Class details — Students tab
| Действие | API |
|----------|-----|
| Members list | `GET /classes/:classId/members` |
| Remove student | `DELETE /classes/:classId/members/:userId` |

Таблица: student name, level, XP, streak, joined, status.  
Actions: view (может вести на Ali's `/analytics/students/:id`), remove.

### Class details — Subjects tab
| Действие | API |
|----------|-----|
| List subjects | `GET /classes/:classId/subjects` |
| Create subject | `POST /classes/:classId/subjects` `{ name, description?, iconKey? }` |
| Edit | `PATCH /subjects/:subjectId` |
| Archive | `DELETE /subjects/:subjectId` |

### Topics (`/subjects/:id/topics`)
| Действие | API |
|----------|-----|
| List topics | `GET /subjects/:subjectId/topics` |
| Create topic | `POST /subjects/:subjectId/topics` `{ title, description?, sourceContext?, difficulty }` |
| Edit | `PATCH /topics/:topicId` |
| Archive | `DELETE /topics/:topicId` |
| Topic detail | `GET /topics/:topicId` |

### Challenges
| Действие | API |
|----------|-----|
| List by topic | `GET /topics/:topicId/challenges` (teacher видит все статусы) |
| Generate AI | `POST /topics/:topicId/challenges/generate` `{ difficulty, questionCount }` |
| Poll status | `GET /challenges/:challengeId/status` |
| View challenge | `GET /challenges/:challengeId` (teacher может видеть isCorrect) |
| Publish/archive | `PATCH /challenges/:challengeId/status` `{ status: READY \| ARCHIVED }` |
| Manual create (if time) | `POST /topics/:topicId/challenges` `{ title, difficulty, questions[] }` |

**Challenges table columns:** title, topic, origin, difficulty, questionCount, status, createdAt.

### Manual challenge editor (optional, раздел 25.9)
| Действие | API |
|----------|-----|
| Create with questions | `POST /topics/:topicId/challenges` |

UI: prompt, type (SINGLE_CHOICE/TRUE_FALSE), options, mark correct, explanation, points.

---

## Sidebar structure (Aziz sections)

```
Overview          → redirect to /dashboard (Ali's page) или /classes
Classes           → /classes
Students          → /classes/:selected/students (context from class selector)
Subjects & Topics → /classes/:selected/subjects
Challenges        → /challenges или tab в class
---
Analytics         → Ali
Activity          → Ali
Leaderboard       → Ali
Settings          → optional shared
```

Class selector в topbar — **общий state** (context/store), чтобы Ali's analytics фильтровал по тому же классу.

---

## Задачи (checklist)

### Shell (priority 1)
- [ ] AppShell, Sidebar, Topbar
- [ ] Class selector (shared context)
- [ ] API client + auth
- [ ] Teacher login flow
- [ ] Router + layout

### Management (priority 2)
- [ ] Classes list + create + invite copy
- [ ] Class details with tabs
- [ ] Students table + remove
- [ ] Subjects CRUD
- [ ] Topics CRUD
- [ ] Generate challenge + status polling
- [ ] Challenges list + publish/archive

### Optional
- [ ] Manual challenge editor
- [ ] Archive class UI

---

## Зависимости

| От Zero | Что нужно |
|---------|-----------|
| Day 0 | JSON contracts для classes, subjects, topics, challenges |
| Auth | OTP + TEACHER role |
| CRUD | все endpoints раздела 11–14 |
| Generate | challenge generate + status |

| От Muhammad Ali | Что нужно |
|-----------------|-----------|
| Согласование | design tokens, sidebar nav structure, class selector API |
| Не блокирует | Aziz может делать shell solo первые часы |

| Кому Aziz разблокирует | Что |
|------------------------|-----|
| Muhammad Ali | готовый AppShell, shared components, class context |
| Demo | teacher создаёт class, subject, topic, generates challenge |

---

## Параллельная работа

**Aziz первым (блокирует Ali только shell):**
- AppShell, API client, auth, class selector, shared UI kit

**Aziz параллельно с Ali (после shell):**
- Classes, subjects, topics, challenges — **не пересекается** с analytics routes

**Aziz параллельно с Javodbek:**
- разные apps, общий только backend

**После Zero contracts:**
- mock data для всех CRUD экранов

---

## Acceptance criteria (раздел 45)

Teacher может:
- login
- see classes
- create class + copy invite
- see members/students
- create subject
- create topic
- trigger generation
- see challenge READY
- open challenges list

---

## Admin role (optional)

Если реализуется ADMIN в MVP — базовые блокировки можно добавить в Part A:
- `GET /admin/users`, `PATCH /admin/users/:userId/status`
- `GET /admin/challenges`, `PATCH /admin/challenges/:challengeId/status`

Или отложить — teacher scope важнее для demo.

---

## UX notes (teacher panel)

- Desktop-first
- Clean tables, high data density
- Calm SaaS analytics aesthetic (не gamified как student app)
- KPI cards — зона Muhammad Ali, не дублировать тяжёлые charts здесь

---

## Файловая структура (рекомендация, чтобы не конфликтовать с Ali)

```
admin/src/
  components/       ← shared (Aziz создаёт, Ali использует)
  features/
    shell/          ← Aziz
    classes/        ← Aziz
    subjects/       ← Aziz
    topics/         ← Aziz
    challenges/     ← Aziz
    analytics/      ← Muhammad Ali ONLY
  lib/api.ts        ← shared
  stores/           ← auth + classContext shared
```

**Правило:** Aziz не редактирует `features/analytics/`, Ali не редактирует `features/classes/` и т.д.
