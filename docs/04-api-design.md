# API Design

## Auth

All REST requests and the Socket.io handshake carry a Clerk session token.
Backend middleware verifies the token (Clerk's Node SDK) and attaches the
resolved local `users.id` (via `clerk_user_id` lookup) to `req.user` /
`socket.data.user`.

```
Authorization: Bearer <clerk session token>
```

Clerk webhooks (`user.created`, `user.updated`, `user.deleted`) hit a
dedicated endpoint (`POST /webhooks/clerk`) to keep the local `users` table
in sync.

## REST endpoints

### Users
```
GET  /me                        current user profile
GET  /users/:id                 public profile
```

### Conversations & messages
```
GET  /conversations                       list current user's conversations
POST /conversations                       create (direct or group)
GET  /conversations/:id/messages          paginated history (?before=&limit=)
POST /conversations/:id/messages          send a message (also emits via socket)
```

### Plans (generic)
```
GET    /plans?start=&end=&type=&status=   list/filter (powers calendar view)
GET    /plans/:id                         full detail (joins the relevant *_details table)
POST   /plans                             create (body shape depends on `type`, validated via shared Zod schema)
PATCH  /plans/:id                         update (owner only)
DELETE /plans/:id                         cancel/delete (owner only)
```

### Plan participants / invites
```
POST   /plans/:id/participants            invite a user (owner only)
DELETE /plans/:id/participants/:userId    remove a participant (owner only)
POST   /plans/:id/rsvp                    accept/decline (invitee only) — body: { status: 'accepted' | 'declined' }
```

### Goal-specific
```
POST   /plans/:id/milestones              add a milestone (owner only)
PATCH  /plans/:id/milestones/:milestoneId toggle done/undone, edit title, reorder (owner only)
DELETE /plans/:id/milestones/:milestoneId remove (owner only)
GET    /plans/:id/comments                list support-crew comments (owner + viewers)
POST   /plans/:id/comments                post a comment (owner + viewers)
```

### Activity feed
```
GET /activity?before=&limit=     paginated feed for current user
```

## Socket.io events

Event names and payload shapes should be defined once in
`packages/shared` (e.g. `shared/src/socketEvents.ts`) and imported by both
apps, so they can never drift.

### Connection
- Handshake carries the Clerk token (same as REST); server rejects the
  connection if it doesn't verify.
- On connect, server joins the socket to a room per conversation the user
  is a participant of, and a personal room (`user:<id>`) for direct
  notifications (invites, plan updates) that aren't tied to a specific
  conversation room.

### Messaging
```
client -> server:  message:send      { conversationId, content, planId? }
server -> clients: message:new       { message }           (broadcast to conversation room)
client -> server:  typing:start      { conversationId }
client -> server:  typing:stop       { conversationId }
server -> clients: typing:update     { conversationId, userId, isTyping }
```

### Presence
```
server -> clients: presence:online   { userId }
server -> clients: presence:offline  { userId }
```
Backed by Redis (e.g. a `presence:<userId>` key with TTL, refreshed on
heartbeat) so presence works correctly across multiple backend instances.

### Plans
```
server -> clients: plan:invited      { plan }              (sent to user:<invitedUserId> room)
server -> clients: plan:rsvp_updated { planId, userId, status }
server -> clients: plan:status_changed { planId, status }  (proposed -> confirmed -> completed/cancelled)
server -> clients: plan:milestone_completed { planId, milestoneId }   (goal support crew)
server -> clients: plan:comment_posted { planId, comment } (goal support crew)
```

These are all server-initiated (no client-emitted equivalent) — plan
mutations happen over REST, and the server pushes the resulting state
change to relevant sockets afterward. This keeps a single source of truth
for validation (REST handlers) instead of duplicating logic in socket
handlers.
