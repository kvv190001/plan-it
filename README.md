# Plan It

A social app to help people plan dates, hangouts, and goals together with
friends — chat-first, with plan cards embedded in conversations, a calendar
view, and (future) AI-detected plan suggestions from chat.

## Core features (MVP)

- Messaging (1:1 and group conversations)
- Plan creation for 3 types: **date**, **hangout**, and **goal**
- Participants / invites with accept-decline flow
- Calendar view (query layer over plans, no new tables)
- Activity feed (plan updates, milestone completions, comments)

See `docs/01-overview.md` for the full concept and decisions log, and the
rest of `docs/` for architecture, data model, API design, and the plan
lifecycle state machines.

## Stack

| Layer | Tech |
|---|---|
| Backend | Express + Socket.io, PostgreSQL (Drizzle ORM), Redis (pub/sub adapter) |
| Frontend | React 19 + Vite (PWA), TypeScript, Tailwind CSS v4, TanStack Query, Radix UI |
| Auth | Clerk |
| Repo | npm workspaces monorepo: `apps/frontend`, `apps/backend`, `packages/shared` |

## Repo structure

```
apps/
  backend/    Express + Socket.io API, Drizzle schema/migrations
  frontend/   React + Vite PWA
packages/
  shared/     Types/constants shared between frontend and backend
docs/         Architecture, data model, API design, roadmap
docker-compose.yml   Local Postgres + Redis
```

## Prerequisites

- Node.js >= 20
- Docker (for local Postgres + Redis)
- A Clerk application (for auth keys)

## Getting started

1. **Install dependencies** (from the repo root):

   ```bash
   npm install
   ```

2. **Start Postgres and Redis:**

   ```bash
   docker-compose up -d
   ```

3. **Configure environment variables:**

   - `apps/backend/.env.example` → copy to `apps/backend/.env` (non-secret
     local defaults: `PORT`, `DATABASE_URL`, `REDIS_URL`) and
     `apps/backend/.env.local` (Clerk keys: `CLERK_PUBLISHABLE_KEY`,
     `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`)
   - `apps/frontend/.env.example` → copy to `apps/frontend/.env.local`
     (`VITE_API_URL`, `VITE_CLERK_PUBLISHABLE_KEY`)

4. **Build the shared package** (frontend and backend both import its
   `dist/`, so this must run first and again after any edit to
   `packages/shared`):

   ```bash
   npm run build:shared
   ```

5. **Run database migrations** (from `apps/backend`):

   ```bash
   npm run db:migrate --workspace=@plan-it/backend
   ```

6. **Start the dev servers** (in separate terminals):

   ```bash
   npm run dev:backend
   npm run dev:frontend
   ```

   Backend defaults to `http://localhost:4000`, frontend to the Vite dev
   server (see terminal output for the port).

## Scripts (from repo root)

| Script | Description |
|---|---|
| `npm run dev:backend` | Start the Express/Socket.io API in watch mode |
| `npm run dev:frontend` | Start the Vite dev server |
| `npm run build:shared` | Build `packages/shared` |
| `npm run build:backend` | Typecheck + build the backend |
| `npm run build:frontend` | Typecheck + build the frontend |

Backend-specific (run with `--workspace=@plan-it/backend`, or `cd
apps/backend`): `db:generate`, `db:migrate`, `db:studio` (Drizzle Kit).

## Documentation

- `docs/01-overview.md` — concept, MVP scope, decisions log
- `docs/02-architecture.md` — repo layout, stack, deployment plan
- `docs/03-data-model.md` — full database schema for MVP
- `docs/04-api-design.md` — REST endpoints and Socket.io events
- `docs/05-plan-lifecycles.md` — state machines for date/hangout/goal
- `docs/06-roadmap.md` — phased build order
- `AGENTS.md` — notes for AI coding agents working in this repo
