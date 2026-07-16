# Team Task Tracker system

A REST API and React frontend for managing tasks within a team organisation. Built with **Go (Gin)**, **PostgreSQL**, **Redis**, and **React (TypeScript)**.

---

## Quick Start

```bash
git clone <repo-url>
cd nxtWave
docker compose up --build
```

That's it. Docker Compose automatically:
- Initialises PostgreSQL with both migrations
- Starts Redis
- Builds and starts the Go API on **port 8080**
- Builds and serves the React frontend on **port 3000**

Open **http://localhost:3000** in your browser.

> **API health check:** `curl http://localhost:8080/health`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Go 1.26 |
| Framework | Gin |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Frontend | React 18 + TypeScript + Vite |
| Auth | JWT (access + refresh token rotation) |
| Real-time | WebSocket (gorilla/websocket) |
| Container | Docker + Docker Compose |

---

## Architecture

```
frontend/          React SPA (Vite, MUI Icons, react-datepicker)
backend/
  cmd/server/      Entry point — wires all dependencies
  internal/
    config/        Environment variable loading
    database/      pgxpool connection
    cache/         Redis wrapper
    middleware/     JWT auth + RBAC enforcement
    models/        Domain types (Task, User, Project, TaskComment)
    repository/    Pure DB layer — no business logic
    services/      Business logic, permission checks, cache control
    handlers/      Thin HTTP layer — bind → service → respond
    router/        Route registration with RBAC middleware
    ws/            WebSocket hub + client + overdue checker
  migrations/
    001_init.sql   Base schema
    002_multi_assignee_comments.sql  Multi-assignee, comments, project dates
```

---

## Authentication

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/auth/register` | POST | ❌ | Create account + organisation |
| `/api/v1/auth/login` | POST | ❌ | Get access + refresh tokens |
| `/api/v1/auth/refresh` | POST | ❌ | Rotate tokens |

**Token flow:**
- Access token: 15-minute TTL, sent as `Authorization: Bearer <token>`
- Refresh token: 7-day TTL, used to get a new access token without re-login
- Registration creates a new organisation; first user is **ADMIN**
- Subsequent users join via `org_id` and are assigned **MEMBER** role

---

## Role-Based Access Control

RBAC is enforced **at the middleware level** — zero role logic inside controller/handler code.

| Role | Permissions |
|---|---|
| **ADMIN** | Full access: manage users, projects, tasks |
| **MANAGER** | Manage projects and tasks, assign members; cannot manage users |
| **MEMBER** | View and update only tasks assigned to them |

```go
// Middleware usage in router.go
tasks.POST("", middleware.Require(models.RoleAdmin, models.RoleManager), taskH.Create)
tasks.DELETE("/:id", middleware.Require(models.RoleAdmin), taskH.Delete)
```

---

## API Endpoints

### Users
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/me` | GET | JWT | Get current user |
| `/api/v1/members` | GET | JWT | List org members (for assignee picker) |
| `/api/v1/users` | GET | ADMIN | List all org users |
| `/api/v1/users/:id/role` | PATCH | ADMIN | Update user role |

### Projects
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/projects` | GET | JWT | List org projects |
| `/api/v1/projects` | POST | ADMIN/MANAGER | Create project |
| `/api/v1/projects/:id` | DELETE | ADMIN | Delete project (cascades tasks) |

### Tasks
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/tasks` | GET | JWT | List tasks (paginated + filtered) |
| `/api/v1/tasks` | POST | ADMIN/MANAGER | Create task |
| `/api/v1/tasks/:id` | GET | JWT | Get task detail |
| `/api/v1/tasks/:id` | PUT | ADMIN/MANAGER | Update task fields |
| `/api/v1/tasks/:id/status` | PATCH | Assignee/MANAGER/ADMIN | Advance task status |
| `/api/v1/tasks/:id` | DELETE | ADMIN | Delete task |

**List tasks query params:** `?page=1&limit=20&status=IN_PROGRESS&priority=HIGH&assignee_id=<uuid>`

**Status transitions (server-enforced):**
```
TODO → IN_PROGRESS → IN_REVIEW → DONE
          ↘ BLOCKED (from any active state)
  BLOCKED → IN_PROGRESS
```

### Comments
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/tasks/:id/comments` | GET | JWT | List task comments |
| `/api/v1/tasks/:id/comments` | POST | Assignee/MANAGER/ADMIN | Add comment |

### WebSocket
| Endpoint | Protocol | Description |
|---|---|---|
| `/api/v1/ws?token=<jwt>` | WebSocket | Real-time overdue alerts |

---

## Database Design

### Schema

```
organizations
  └── users (organization_id FK)
       └── task_assignees (user_id FK)
       └── task_comments  (user_id FK)

projects (organization_id FK)
  └── tasks (project_id FK, organization_id FK)
       ├── task_assignees (task_id FK)
       └── task_comments  (task_id FK)
```

### Design Decision — Junction Table for Multi-Assignee

The spec calls for a single assignee per task. We implemented a `task_assignees` junction table instead:

**Why:** A single `assignee_id` column creates a one-to-one relationship that forces re-assignment when a task needs collaboration. The junction table supports realistic team workflows where multiple people work on one task, allows precise cache invalidation (invalidate per user, not per task), and better models the permission model (any assignee can update status).

**Trade-off:** Slightly more complex queries (batch load with `ANY($1::text[])`) vs simpler single-column lookup. Worth it for correctness.

### Indexes

```sql
-- Migration 001
CREATE INDEX idx_tasks_status        ON tasks(status);
CREATE INDEX idx_tasks_due_date      ON tasks(due_date);
CREATE INDEX idx_tasks_project       ON tasks(project_id);
CREATE INDEX idx_tasks_org           ON tasks(organization_id);
CREATE INDEX idx_users_email         ON users(email);


-- Migration 002
CREATE INDEX idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_user ON task_assignees(user_id);  -- primary filter for MEMBER list
CREATE INDEX idx_task_comments_task  ON task_comments(task_id);
```

The `idx_task_assignees_user` index is the most impactful: every `GET /tasks` request for a MEMBER user filters via `WHERE task_id IN (SELECT task_id FROM task_assignees WHERE user_id = $1)` — this index makes that subquery a fast index scan.

---

## Caching Strategy

### What is cached
Task lists per assignee, keyed by:
```
tasks:assignee:{userID}:s:{status}:p:{priority}:pg:{page}:l:{limit}
```
TTL: **5 minutes**

### Invalidation
Pattern-based deletion using Redis `SCAN` + `DEL`:
```
tasks:assignee:{userID}:*   → deletes ALL cached pages/filters for that user
```

**When invalidation fires:**
| Event | Invalidates |
|---|---|
| Task created | All assignees added to the task |
| Task updated | Old assignees + new assignees |
| Task status changed | All current assignees |
| Task deleted | All current assignees |

This means a cache entry is never stale for more than the duration of one write operation. Trade-off: slightly over-invalidates (deletes all filter combinations) but guarantees consistency and avoids complex per-filter tracking.

---

## Real-Time Notifications (WebSocket)

Connect via:
```
ws://localhost:8080/api/v1/ws?token=<access_token>
```

**Overdue alert message:**
```json
{
  "type": "OVERDUE_ALERT",
  "task_id": "uuid",
  "task_title": "Fix login bug",
  "due_date": "2026-05-30T00:00:00Z"
}
```
 
**Who is notified:** All assignees of the task + every ADMIN and MANAGER in the organisation.

**Frequency:** Checked every 60 seconds. Each (task, user) pair is notified at most once per hour to prevent spam.

---

## What I Would Improve Given More Time

1. **Analytics endpoint** — overdue task count per user + average completion time using PostgreSQL window functions (`AVG(completed_at - created_at) OVER (PARTITION BY assignee)`)
2. **Integration tests** — at minimum: auth flow and status transition enforcement
3. **Swagger/OpenAPI auto-generation** — via `swaggo/swag` annotations, serving `GET /docs`
4. **Refresh token rotation storage** — currently refresh tokens are stateless JWTs; storing issued tokens in a `refresh_tokens` table would allow revocation
5. **Invite system** — currently members join via shared Org ID; a proper invite-by-email flow with time-limited tokens would be more secure
6. **Pagination on comments** — large tasks could accumulate many comments; cursor-based pagination would scale better
7. **Code splitting** — the frontend bundle is ~360KB gzipped; lazy-loading page components would improve initial load time

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | API server port |
| `DATABASE_URL` | `postgres://postgres:password@localhost:5432/tasktracker?sslmode=disable` | PostgreSQL DSN |
| `REDIS_URL` | `redis://localhost:6379` | Redis URL |
| `JWT_SECRET` | *(set in .env)* | Access token signing key |
| `JWT_REFRESH_SECRET` | *(set in .env)* | Refresh token signing key |
| `ACCESS_TOKEN_TTL_MINUTES` | `15` | Access token lifetime |
| `REFRESH_TOKEN_TTL_DAYS` | `7` | Refresh token lifetime |

For local development, copy values from `backend/.env`.
