# Maktab AI Arena — ТЗ: Muhammad Ali (Teacher/Admin — Часть B)

**Роль:** analytics, reporting, monitoring зона teacher/admin React app  
**Стек:** React, Vite (то же приложение `admin/`, что у Aziz)  
**Партнёр:** Aziz — CRUD/management + **базовый shell**

---

## Summary

Muhammad Ali отвечает за **визуализацию и агрегацию данных**: teacher dashboard, analytics по темам и ученикам, leaderboard, activity feed, reports. Не CRUD классов/тем/challenges — только чтение и отображение.

**Стартует после** согласования shell от Aziz (layout, sidebar, API client, class selector). Свои routes и page components — в изолированной папке `features/analytics/`.

---

## Владение routes (раздел 48)

| Route | Страница |
|-------|----------|
| `/dashboard` | Teacher dashboard (KPI + charts + weak topics + top students + activity) |
| `/analytics` | Analytics overview |
| `/analytics/topics` | Topic analytics table |
| `/analytics/topics/:topicId` | Topic analytics detail |
| `/analytics/students` | Students analytics table |
| `/analytics/students/:userId` | Student detail |
| `/leaderboard` | Teacher leaderboard (extended) |
| `/activity` | Activity feed |

**Не трогать routes Aziz:** `/classes/*`, `/subjects/*`, `/challenges/*`

---

## Экраны и API

### Teacher Dashboard (`/dashboard`)
| Блок | API |
|------|-----|
| Весь dashboard агрегат | `GET /teacher/classes/:classId/dashboard` |

**Response fields:**
- totalStudents, activeStudents
- completedAttempts, averageAccuracy
- totalChallenges, totalDuels
- weakTopics[]
- topStudents[]
- recentActivity[]

**UI:**
- KPI cards (6 metrics)
- Charts: activity over time, accuracy by topic (если данные есть в response или derived)
- Weak Topics section (highlight)
- Top Students table
- Recent Activity list

### Analytics overview (`/analytics`)
| Данные | API |
|--------|-----|
| Class reports | `GET /teacher/classes/:classId/reports/overview?from=&to=` |

**Metrics:** activeStudents, attempts, completedChallenges, avgAccuracy, XP earned, duelsCreated, duelsCompleted, topTopics, weakTopics

**Filters UI:** class (from selector), date range optional, subject optional

### Topic analytics (`/analytics/topics`)
| Данные | API |
|--------|-----|
| All topics stats | `GET /teacher/classes/:classId/topics/analytics` |

**Table columns:** topic, subject, participants, attempts, avg accuracy, mastery avg, weak flag

Weak topics — visual highlight (badge/red row).

### Topic detail (`/analytics/topics/:topicId`)
| Данные | API |
|--------|-----|
| Deep dive | `GET /teacher/topics/:topicId/analytics` |

**Shows:** participants, attempts, averageAccuracy, averageScore, mastery distribution, recent attempts, strongest students, students needing attention

### Students analytics (`/analytics/students`)
| Данные | API |
|--------|-----|
| Students table | `GET /teacher/classes/:classId/students` |

**Columns:** student, XP, level, streak, accuracy, completed, lastActivityAt

### Student detail (`/analytics/students/:userId`)
| Данные | API |
|--------|-----|
| Full profile | `GET /teacher/classes/:classId/students/:userId` |

**Shows:** profile, stats, topicProgress, recentAttempts, duel stats (W/L/D)

Link сюда из Aziz's students table ("view").

### Teacher Leaderboard (`/leaderboard`)
| Данные | API |
|--------|-----|
| Extended table | `GET /teacher/classes/:classId/reports/leaderboard` |

**Columns:** rank, student, XP, completed challenges, accuracy, streak, duel wins

### Activity feed (`/activity`)
| Данные | API |
|--------|-----|
| Events | `GET /teacher/classes/:classId/activity?cursor=&limit=&type=` |

**Event types:** JOINED_CLASS, COMPLETED_CHALLENGE, WON_DUEL, CREATED_CHALLENGE

**Filters:** event type, student optional

### AI Jobs monitoring (optional, if time)
| Данные | API |
|--------|-----|
| Jobs list | `GET /admin/ai-jobs?status=` |
| Retry | `POST /admin/ai-jobs/:jobId/retry` |
| Platform overview | `GET /admin/overview` |

---

## Auth (использует shared store от Aziz)

| Действие | API |
|----------|-----|
| Login | `POST /auth/otp/request`, `POST /auth/otp/verify` |
| Session | `GET /auth/me`, refresh, logout |

Role: TEACHER (ADMIN optional для AI jobs).

---

## Задачи (checklist)

### После shell от Aziz
- [ ] Подключить sidebar links: Dashboard, Analytics, Leaderboard, Activity
- [ ] Использовать shared `classId` из class selector context

### Dashboard (priority 1 — demo critical)
- [ ] KPI cards
- [ ] Weak topics widget
- [ ] Top students
- [ ] Recent activity preview
- [ ] Charts (simple — bar/line, не over-engineer)

### Analytics (priority 2)
- [ ] Analytics overview + date filters
- [ ] Topics analytics table
- [ ] Topic detail page
- [ ] Students table
- [ ] Student detail page

### Leaderboard & Activity (priority 3)
- [ ] Extended leaderboard table
- [ ] Activity feed with filters

### Optional
- [ ] AI jobs monitoring page
- [ ] Admin platform overview
- [ ] Export/report download UI

---

## Зависимости

| Блокирует | Что нужно |
|-----------|-----------|
| Aziz shell | AppShell, Sidebar, API client, authStore, classContext, shared UI components |
| Zero — contracts | teacher dashboard + analytics JSON shapes |
| Zero — data | seed с attempts, weak topic, activity events (раздел 41) |
| Demo flow | students проходят challenges **до** показа analytics (или seed pre-fills) |

| От Aziz не нужно ждать | Что |
|------------------------|-----|
| CRUD pages done | можно mock classId и работать на fixture |

---

## Параллельная работа

**До shell Aziz:**
- Изучить API contracts
- Прототип charts/tables на mock data в изолированной папке
- Согласовать design tokens

**После shell Aziz (полностью параллельно):**
- Все analytics pages — **zero file overlap** с Aziz CRUD features

**Параллельно с Javodbek:**
- разные apps

**Интеграция demo (раздел 40, Step 6):**
- После student duel → teacher dashboard показывает новую activity + updated topic analytics

---

## Acceptance criteria (раздел 46)

Teacher может:
- open dashboard → see KPIs
- see weak topics
- see top students
- open analytics overview
- open topic analytics + detail
- open student analytics + detail
- see leaderboard
- see recent activity

Dashboard **не пустой** благодаря seed data.

---

## UX notes

- Desktop-first, calm SaaS
- High information density — tables > empty space
- Charts только где дают смысл (activity over time, accuracy by topic)
- Weak topics — always visible on dashboard (key teacher value prop)
- Не gamified styling (в отличие от student app)

---

## Файловая структура (только Ali)

```
admin/src/features/analytics/
  pages/
    DashboardPage.tsx
    AnalyticsOverviewPage.tsx
    TopicsAnalyticsPage.tsx
    TopicDetailPage.tsx
    StudentsAnalyticsPage.tsx
    StudentDetailPage.tsx
    LeaderboardPage.tsx
    ActivityPage.tsx
    AiJobsPage.tsx          ← optional
  components/
    KpiCards.tsx
    WeakTopicsList.tsx
    TopStudentsTable.tsx
    ActivityFeed.tsx
    MasteryDistribution.tsx
    ...
```

**Не редактировать:** `features/classes/`, `features/subjects/`, `features/topics/`, `features/challenges/`, `components/` (кроме PR с согласованием).

---

## Shared components usage (от Aziz)

Использовать без изменения:
- AppShell, Sidebar, Topbar
- Button, Card, Table, Modal, Badge, EmptyState
- `lib/api.ts`
- `stores/authStore`, `stores/classContext`

Добавлять новые shared components — через согласование с Aziz (один PR в `components/`).

---

## Demo script role (раздел 40, Step 6)

После duel и leaderboard:
1. Switch to teacher panel tab
2. Dashboard shows new activity (COMPLETED_CHALLENGE, WON_DUEL)
3. Topic analytics for "Quadratic Equations" updated
4. Show weak/strong students, participation

**Pitch point:** teacher value — real-time class insight on same data students generate.
