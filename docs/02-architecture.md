# Architecture

## Repo structure (monorepo)

```
plan-it/
  apps/
    backend/    Express API + Socket.io server
    frontend/   React (Vite) PWA
  packages/
    shared/     Shared TS types + Zod schemas used by both apps
  docker-compose.yml   Postgres + Redis for local dev
  docs/                Planning docs (this folder)
```

`packages/shared` holds:
- Zod schemas for request/response bodies (plans, participants, messages,
  comments) so both backend validation and frontend forms use the same
  source of truth.
- Shared TypeScript types (enums for plan type/status, socket event names
  and payload shapes) so the frontend and backend never drift out of sync
  on a socket contract.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Backend framework | Express | Plain Express + a router-per-resource structure (`routes/plans.ts`, `routes/messages.ts`, etc.) rather than a framework-imposed module system |
| Database | PostgreSQL | Single source of truth for users, messages, plans, everything |
| ORM / query layer | Drizzle | Lighter, closer to SQL, type-safe; fits well with the explicit schema in `03-data-model.md` |
| Real-time | Socket.io + Redis adapter | Redis used for the Socket.io pub/sub adapter (multi-instance) and presence/typing state |
| Auth | Clerk | Handles sign-up/sign-in/session; backend verifies Clerk session tokens on each request and on socket handshake |
| Frontend | React + Vite | PWA, mobile-first responsive layout, no SSR needed |
| Push notifications | Web Push API (PWA) | APNs/FCM deferred to native phase |

## Deployment

**Decided (MVP, free/cheap tier):**

| Component | Choice | Why |
|---|---|---|
| Backend (REST + Socket.io) | **Render** (Free Web Service) | Runs as a persistent container process, not serverless — full native WebSocket support, no artificial per-connection duration cap. Free tier spins down after 15 min of no inbound traffic and cold-starts (~30-60s) on the next request/connection; acceptable for an MVP/portfolio project with low, sporadic traffic. Client-side Socket.io reconnect logic (default behavior) handles this fine |
| Postgres | **Neon** | Free tier, scales to zero. Render's own free Postgres was ruled out — it **expires 30 days after creation**, not viable even for an MVP that runs longer than a month |
| Redis | **Upstash** | Free tier, serverless pub/sub, used for the Socket.io adapter + presence/typing state |
| Frontend | **Vercel** | Free, and this is exactly the workload Vercel is built for (static/SSR frontend hosting) |

Both Neon and Upstash are reachable from any host over the internet, so
this stack isn't locked into Render specifically — if you ever outgrow
the free tier or want more control, swapping the backend host (e.g. to
AWS ECS Fargate or Azure Container Apps, per the original plan) doesn't
require touching Postgres/Redis.

**Why not Vercel for the backend:** Vercel added WebSocket support in
public beta, but connections are force-closed at a hard **800-second
(~13 min) max duration** even on paid plans, and the underlying API
(`experimental_upgradeWebSocket`) is explicitly unstable. That's a much
harder failure mode to build around than Render's "sleeps after 15 min
idle" — Render's Socket.io server behaves like a normal always-on
process while it's awake, with no forced disconnects during active use.

**Ruled out for the backend, generally:** any pure serverless/FaaS option
(Lambda, Azure Functions, Vercel's traditional model) — Socket.io needs
long-lived connections, which serverless request/response execution
doesn't support.

Revisit free/cheap tier terms periodically — they change often, and
Render/Neon/Upstash's free tiers in particular are worth re-checking if
this project grows beyond a portfolio/demo scale.

## Local development

`docker-compose.yml` at the repo root runs Postgres + Redis locally so
`apps/backend` can run against a real Postgres instance without depending
on a cloud service during development.
