# Data Model (MVP)

All tables live in a single PostgreSQL database. Types below are written as
Postgres-flavored pseudo-DDL; adjust exact syntax to whichever
ORM/migration tool is chosen (see `02-architecture.md`).

## Identity

### `users`
Managed primarily by Clerk; this table mirrors the subset of user data the
app needs to join against locally (so `plans.created_by`, etc. can be a
normal foreign key instead of an external API call on every query).

```
id              uuid PK
clerk_user_id   text UNIQUE NOT NULL   -- Clerk's user id
display_name    text NOT NULL
avatar_url      text
created_at      timestamptz NOT NULL DEFAULT now()
```

Populate/update this table via a Clerk webhook (`user.created`,
`user.updated`) rather than trusting the frontend to sync it.

## Messaging

### `conversations`
```
id              uuid PK
type            text NOT NULL   -- 'direct' | 'group'
title           text            -- nullable, used for group chats
created_at      timestamptz NOT NULL DEFAULT now()
```

### `conversation_participants`
```
conversation_id uuid FK -> conversations.id
user_id         uuid FK -> users.id
joined_at       timestamptz NOT NULL DEFAULT now()
PRIMARY KEY (conversation_id, user_id)
```

### `messages`
```
id               uuid PK
conversation_id  uuid FK -> conversations.id NOT NULL
sender_id        uuid FK -> users.id NOT NULL
content          text NOT NULL
plan_id          uuid FK -> plans.id NULL   -- set when a message embeds a plan card
created_at       timestamptz NOT NULL DEFAULT now()
```

Index: `(conversation_id, created_at)` for paginated history queries.

## Plans (shared core)

### `plans`
```
id              uuid PK
type            text NOT NULL CHECK (type IN ('date', 'hangout', 'goal'))
title           text NOT NULL
status          text NOT NULL   -- date/hangout: 'proposed' | 'confirmed' | 'cancelled' (no stored 'completed' — see 05-plan-lifecycles.md); unused for goal (goal_details.status is authoritative there)
created_by      uuid FK -> users.id NOT NULL
start_date      timestamptz     -- date/hangout: scheduled_at; goal: when the goal started
end_date        timestamptz     -- date/hangout: usually null (single point in time); goal: optional target date
created_at      timestamptz NOT NULL DEFAULT now()
updated_at      timestamptz NOT NULL DEFAULT now()
```

Index: `(created_by)`, and `(start_date)` for calendar range queries.

### `plan_participants`
Shared across all plan types; meaning of `role` and `rsvp_status` differs
slightly by type (see `05-plan-lifecycles.md`).

```
id              uuid PK
plan_id         uuid FK -> plans.id NOT NULL
user_id         uuid FK -> users.id NOT NULL
role            text NOT NULL   -- 'owner' | 'participant' (date/hangout) | 'viewer' (goal)
rsvp_status     text NOT NULL DEFAULT 'pending'  -- 'pending' | 'accepted' | 'declined'
created_at      timestamptz NOT NULL DEFAULT now()
UNIQUE (plan_id, user_id)
```

Row-count rules enforced at the application layer, not via DB constraint:
- `date`: exactly one `owner` + one `participant`.
- `hangout`: one `owner` + any number of `participant` rows.
- `goal`: one `owner` + any number of `viewer` rows.

## Date / Hangout details

### `date_details`
```
plan_id         uuid PK FK -> plans.id
location        text
scheduled_at    timestamptz NOT NULL
notes           text
```

### `hangout_details`
```
plan_id         uuid PK FK -> plans.id
location        text
scheduled_at    timestamptz NOT NULL
notes           text
```

Kept as separate tables (rather than one shared `event_details` table)
even though the columns are currently identical, so date-only or
hangout-only fields can be added later (e.g. a max headcount on hangouts)
without one table accumulating type-specific nullable columns.

No multi-option voting tables for MVP — the owner sets `scheduled_at` and
`location` directly. If multi-option voting is added later, it would be
additive: new `plan_time_options` / `plan_time_votes` tables, no changes
to the tables above.

## Goal details

### `goal_details`
```
plan_id         uuid PK FK -> plans.id
description     text
status          text NOT NULL DEFAULT 'active'  -- 'active' | 'achieved' | 'abandoned'
```

### `goal_milestones`
```
id              uuid PK
plan_id         uuid FK -> plans.id NOT NULL
title           text NOT NULL
is_done         boolean NOT NULL DEFAULT false
position        integer NOT NULL   -- display order
completed_at    timestamptz
```

Index: `(plan_id, position)`.

Overall "% complete" is **computed**, not stored:
`COUNT(is_done = true) / COUNT(*)` over a goal's milestones. No column
needed for this.

## Comments (generic, reused across features)

### `comments`
```
id                 uuid PK
commentable_type   text NOT NULL   -- 'goal' for MVP; extensible later (e.g. 'plan', 'milestone')
commentable_id      uuid NOT NULL  -- polymorphic reference, e.g. plans.id when commentable_type='goal'
author_id          uuid FK -> users.id NOT NULL
content            text NOT NULL
created_at         timestamptz NOT NULL DEFAULT now()
```

Index: `(commentable_type, commentable_id, created_at)` for feed queries.

Modeled generically instead of a `goal_comments` table because goals are
the first use case but not the only likely one (e.g. commenting directly
on a plan card in chat later) — retrofitting a dedicated table into a
polymorphic one later is more disruptive than starting generic.

## Activity feed

### `activity_events`
```
id              uuid PK
user_id         uuid FK -> users.id NOT NULL   -- whose feed this shows up in
actor_id        uuid FK -> users.id NOT NULL   -- who performed the action
type            text NOT NULL   -- 'plan_created' | 'plan_confirmed' | 'plan_cancelled' | 'milestone_completed' | 'comment_posted' | ...
plan_id         uuid FK -> plans.id
payload         jsonb           -- small denormalized snapshot for rendering without extra joins (e.g. plan title, milestone title)
created_at      timestamptz NOT NULL DEFAULT now()
```

Index: `(user_id, created_at)` for feed pagination.

This table is the single event stream powering:
- The Activity tab (fan out an event to every participant's feed on
  creation)
- Future daily/summary rollups (batch-read this table)
- Future AI plan-suggestion pass (reads `messages`, writes here indirectly
  by creating a `plans` row + an event)

`goal_milestones` completions and `comments` on a goal both also produce
an `activity_events` row (fanned out to the owner + all viewers) so the
support crew sees progress without the owner manually posting an update.

## Calendar view

No new tables. `GET /plans?start=&end=` queries `plans` filtered by
`start_date`/`end_date` overlapping the requested range, joined with the
relevant `*_details` table based on `type`.
