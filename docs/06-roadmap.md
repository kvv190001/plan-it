# Roadmap

Backend-first build order: schema → core API → Socket.io → frontend
against a working API. Rationale: schema/API drives frontend design;
avoids building UI against guesses.

## Phase 0 — Project setup
- Scaffold monorepo: `apps/backend`, `apps/frontend`, `packages/shared`.
- `docker-compose.yml` for local Postgres + Redis.
- Choose ORM/query layer (Prisma or Drizzle — see `02-architecture.md`).
- Clerk project setup (dev instance), backend middleware to verify
  session tokens, webhook handler to sync `users` table.

## Phase 1 — Schema & auth
- Implement all MVP tables from `03-data-model.md`: `users`,
  `conversations`, `conversation_participants`, `messages`, `plans`,
  `plan_participants`, `date_details`, `hangout_details`, `goal_details`,
  `goal_milestones`, `comments`, `activity_events`.
- `GET /me` working end-to-end against Clerk auth.

## Phase 2 — Plan CRUD (date, hangout, goal)
- REST endpoints from `04-api-design.md` for plans, participants/RSVP,
  milestones, comments.
- Implement lifecycle rules from `05-plan-lifecycles.md`, including the
  scheduled job for flipping `confirmed` → `completed`.
- Shared Zod schemas in `packages/shared` for all plan create/update
  payloads, used by both backend validation and (later) frontend forms.

## Phase 3 — Messaging (Socket.io)
- Conversations + messages REST endpoints.
- Socket.io server with Redis adapter; auth on handshake.
- `message:send`/`message:new`, typing indicators, presence.
- Plan-related socket events (`plan:invited`, `plan:rsvp_updated`,
  `plan:status_changed`, `plan:milestone_completed`,
  `plan:comment_posted`).

## Phase 4 — Calendar & activity feed
- `GET /plans?start=&end=` calendar query.
- `GET /activity` paginated feed, fed by `activity_events` writes from
  Phases 2–3.

## Phase 5 — Frontend (React + Vite PWA)
- Build against the now-working API: auth (Clerk), chat view with
  embedded plan cards, plan creation flows per type, calendar view,
  activity feed, goal support-crew view (progress ring, milestone list,
  comment feed — matching the reference screenshot's layout).

## Phase 6 — Polish
- Web Push notifications (PWA).
- Server-side daily/summary rollups (non-AI) over `activity_events`.

## Phase 7 — AI plan-suggestion (future)
- LLM pass over `messages` to detect plan intent, draft a `plans` row +
  `activity_events` entry. Enabled by the clean `messages` / `plans` /
  `activity_events` schema from Phase 1 onward.

## Phase 8 — Native (future)
- React Native (reusing `packages/shared` types/schemas and API), or
  fully native iOS/Android.

## Deferred plan types (post-MVP)
- `trip`: likely reuses the date/hangout shape but with an itinerary
  (multi-day, multiple sub-events) — needs its own design pass when
  picked up.
- `study`, `savings`: not designed yet.
