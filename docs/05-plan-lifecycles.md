# Plan Lifecycles: Date, Hangout, Goal

## Date

**Shape:** `plans` (type=`date`) + `date_details` (location, scheduled_at,
notes) + exactly 2 `plan_participants` rows (1 owner, 1 participant).

**Stored status values:** `proposed` → `confirmed` | `cancelled`.
`completed` is **not** a stored value — see "Completing plans" below.

**Flow:**
1. Owner creates the plan with a proposed `scheduled_at` + `location`,
   picks one invitee. Plan is created with `status = 'proposed'`, the
   invitee's `plan_participants.rsvp_status = 'pending'`.
2. Invitee is notified (`plan:invited` socket event + a message in the
   relevant conversation, if invited from a chat).
3. Invitee responds via `POST /plans/:id/rsvp`:
   - `accepted` → plan `status` flips to `confirmed`.
   - `declined` → plan `status` flips to `cancelled`. Owner can create a
     new plan to re-propose; there's no "re-propose the same plan" flow
     for MVP.
4. Owner can edit `scheduled_at`/`location` while `status` is `proposed`
   or `confirmed`. Editing after confirmation **stays `confirmed`** (does
   not reset to `proposed`) — the invitee is just re-notified of the
   change.
5. Owner can cancel at any time (`status → cancelled`). The row is kept
   (not deleted) so it still shows up in chat/activity history as a
   cancelled plan, rather than leaving dangling references from any
   message or `activity_events` row that pointed at it.

**Permissions:**
| Action | Owner | Invitee |
|---|---|---|
| Edit date/time/location | Yes | No |
| Cancel | Yes | No |
| Accept/decline | No | Yes |
| View | Yes | Yes |

## Hangout

**Shape:** `plans` (type=`hangout`) + `hangout_details` (location,
scheduled_at, notes) + 1 owner + N `plan_participants` rows.

**Stored status values:** `proposed` → `confirmed` | `cancelled`.
`completed` is **not** a stored value — see "Completing plans" below.

**Flow:** Same shape as date, but with multiple invitees. Confirmation
rule: a hangout moves to `confirmed` only once **every** invitee has
accepted (unanimous) — same strictness as a date, just generalized to N
invitees. If any invitee declines, the plan moves to `cancelled`
immediately (the owner can remove the decliner and re-invite someone else
by editing participants while still `proposed`, or just create a new
plan).

Same edit-after-confirmation and cancellation behavior as date: editing
stays `confirmed` (just re-notifies everyone); cancelling keeps the row
with `status = 'cancelled'` rather than deleting it.

**Permissions:**
| Action | Owner | Participant |
|---|---|---|
| Edit date/time/location | Yes | No |
| Add/remove participants | Yes | No |
| Cancel | Yes | No |
| Accept/decline | No | Yes |
| View | Yes | Yes |

## Completing plans (date & hangout)

`completed` is **never stored** in the database and there is no
background job for it. It's purely a derived/display value, computed
wherever a plan is read:

```
displayStatus = (status === 'confirmed' && scheduled_at < now())
  ? 'completed'
  : status
```

This keeps the stored `plans.status` enum to just 3 values
(`proposed` | `confirmed` | `cancelled`) and avoids running any periodic
job for MVP. Nothing in the current feature set needs to *react* to the
completion moment as an event (no post-date rating/review feature, etc.)
— if that's added later, a scheduled job (or a lazy check-on-read that
writes the transition once) can be introduced at that point without
changing this table shape.

## Goal

**Shape:** `plans` (type=`goal`) + `goal_details` (description, status) +
`goal_milestones` (ordered checklist) + 1 owner + N `plan_participants`
rows with `role='viewer'` ("support crew") + `comments`
(`commentable_type='goal'`).

**Status values (`goal_details.status`):** `active` → `achieved` |
`abandoned`

This is intentionally a *different* status vocabulary from date/hangout.
`goal_details.status` is the sole authoritative status field for goals —
`plans.status` is left unused/ignored for `type='goal'` rows, avoiding
the need to keep two status columns in sync.

**Flow:**
1. Owner creates the goal + writes out all milestones up front
   (`goal_milestones`, ordered by `position`). `goal_details.status =
   'active'`.
2. Owner invites friends to be support crew. This uses the same
   accept-first pattern as date/hangout invites: a `plan_participants`
   row is created with `role='viewer'`, `rsvp_status='pending'`; the
   invitee is notified and must `POST /plans/:id/rsvp` with `accepted`
   before they can see the goal/milestones or post comments. A declined
   invite leaves `rsvp_status='declined'` and the person never appears as
   active crew.
3. Owner works on the goal. To mark progress, the owner simply toggles a
   milestone: `PATCH /plans/:id/milestones/:milestoneId { isDone: true }`.
   No manual "progress update" post is required.
4. On milestone completion, the backend:
   - Sets `is_done = true`, `completed_at = now()`.
   - Writes an `activity_events` row (`type='milestone_completed'`) fanned
     out to the owner + all viewers.
   - Emits `plan:milestone_completed` over the socket to the support crew
     so the UI updates live (e.g. the screenshot's checklist + progress
     ring re-render without a refresh).
5. Support crew (viewers) can post comments any time via `POST
   /plans/:id/comments` — this is the "Support Crew" feed in the UI.
   Comments also fan out via `activity_events` (`type='comment_posted'`)
   and `plan:comment_posted` so everyone sees encouragement live.
6. Owner marks the goal `achieved` or `abandoned` manually
   (`PATCH /plans/:id`) — no automatic transition, since "done" for a
   goal isn't as clock-driven as a date/hangout's `scheduled_at`.

**Permissions:**
| Action | Owner | Viewer (support crew) |
|---|---|---|
| Edit goal details | Yes | No |
| Add/edit/toggle milestones | Yes | No |
| Invite/remove viewers | Yes | No |
| Post comments | Yes | Yes |
| View goal + milestones + comments | Yes | Yes |
| Mark goal achieved/abandoned | Yes | No |

**Derived data (not stored):**
- `% complete` = `COUNT(milestones done) / COUNT(milestones)`.
- No weekly numeric metrics or streak tracking in MVP — deferred (see
  `01-overview.md`); the reference screenshot's weekly mileage bar and
  streak counter were UI inspiration only, not a data requirement.
