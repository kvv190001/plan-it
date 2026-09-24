# Plan It — Project Overview

## Concept

A social app to help people plan dates, hangouts, and goals together with
friends — chat-first, with plan cards embedded in conversations, a calendar
view, and (future) AI-detected plan suggestions from chat.

## Core features (MVP)

- Messaging (1:1 and group conversations)
- Plan creation for 3 types: **date**, **hangout**, **goal**
- Participants / invites with accept-decline flow
- Calendar view (query layer over plans, no new tables)
- Activity feed (plan updates, milestone completions, comments)

## Deferred (post-MVP)

- Plan types: trip, study, savings
- Multi-option voting on date/time/location
- Weekly numeric progress metrics / streaks on goals
- Web push notifications
- Daily/summary rollups
- AI plan-suggestion from chat
- React Native / native apps

## Decisions log

| Area | Decision |
|---|---|
| Backend framework | Express (not NestJS) |
| Database | PostgreSQL — single source of truth |
| Real-time | Socket.io + Redis pub/sub adapter, self-hosted |
| Auth | Clerk |
| Frontend | React + Vite (PWA, no SSR) |
| Repo structure | Monorepo: `apps/frontend`, `apps/backend`, `packages/shared` |
| Push notifications | Web Push API for PWA now; APNs/FCM later for native |
| Hosting (MVP) | Backend → Render (free tier); Postgres → Neon; Redis → Upstash; Frontend → Vercel — see `02-architecture.md` |
| Plan detail tables | Per-type tables (`date_details`, `hangout_details`, `goal_details`), not a single polymorphic table |
| MVP plan types | date, hangout, goal only |
| Date/hangout confirmation | Requires invitee to accept before a plan moves to `confirmed`; hangouts require ALL invitees to accept (unanimous), same strictness as date |
| Editing after confirmation | Status stays `confirmed`; participants are just re-notified |
| Plan completion | `completed` is never stored — derived at read time from `confirmed` + `scheduled_at` in the past. No scheduled job for MVP |
| Cancelled plans | Kept as rows with `status='cancelled'`, not deleted — preserves history/references from chat and activity feed |
| Goal support crew | Same accept-first invite pattern as date/hangout — viewer must accept before seeing the goal or commenting; only the owner edits milestones |
| Goal status | `goal_details.status` is sole authoritative field; `plans.status` unused for goals |
| ORM / query layer | Drizzle |

## Open questions (still unresolved)

None currently — see `05-plan-lifecycles.md` and `02-architecture.md` for
the resolved details behind each decision above.

## Document index

- `02-architecture.md` — repo layout, stack, deployment plan
- `03-data-model.md` — full database schema for MVP
- `04-api-design.md` — REST endpoints and Socket.io events
- `05-plan-lifecycles.md` — detailed state machines for date/hangout/goal
- `06-roadmap.md` — phased build order
