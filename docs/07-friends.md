# 07 - Friends

Status: **implemented** (backend + frontend). Not implemented from this plan: a "New plan" shortcut on friend rows (plans are created via the + button, picking from friends), and automated tests (the repo has no test setup yet).

## Goal

Add a Friends system. Users connect through shareable **friend codes** and friend requests. Chats and plans can only be created with friends.

## Rules

- Every user has a unique, shareable friend code.
- To add someone, you enter their code and send a request. The other user accepts or declines.
- Only accepted friends can be:
  - added to a new conversation (direct or group)
  - invited to a plan (on creation or later)
- There is no name search. The global `GET /users?q=` endpoint is removed, so users cannot be discovered without a code.
- Unfriending removes the friendship. Existing chats and plans are kept, but no new ones can be created with that person, and sending messages in an existing direct chat with them is blocked.
- Existing conversations and plans from before this feature are untouched.

## 1. Data model

### `users` (altered)
- Add `friend_code text not null unique`.
- Format: 8 characters from an unambiguous alphabet (no `0/O/1/I/L`), uppercase, e.g. `K7QX2MRD`.
- Generated on user creation, with retry on collision.
- Backfill existing users in the migration.
- Users can regenerate their code. The old code stops working immediately.

### `friendships` (new)
| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `requester_id` | uuid fk users | who sent the request |
| `addressee_id` | uuid fk users | who received it |
| `status` | text | `pending` or `accepted` |
| `created_at` | timestamptz | |
| `responded_at` | timestamptz null | set when accepted |

Constraints:
- A check that `requester_id <> addressee_id`.
- A unique index on `(least(requester_id, addressee_id), greatest(requester_id, addressee_id))`, so there is only one row per pair of users.
- Indexes on `addressee_id` and `requester_id`.

Declining, cancelling and unfriending **delete** the row. There is no `declined` state, so a user can send a new request later.

## 2. Shared package (`packages/shared`)

- Schemas:
  - `sendFriendRequestSchema`: `{ friendCode: string }`, trimmed and uppercased.
  - `friendshipSchema` and `friendProfileSchema` response types.
- `SOCKET_EVENTS`: `FRIEND_REQUEST_RECEIVED`, `FRIEND_REQUEST_ACCEPTED`, `FRIEND_REMOVED`.
- Rebuild with `npm run build:shared`.

## 3. Backend API

New `routes/friends.ts` and `services/friends.ts`, following the style of the existing routers (`requireCurrentUser`, `asyncHandler`, `HttpError`).

| Method | Path | Description |
|---|---|---|
| GET | `/friends` | Accepted friends as public profiles (id, displayName, avatarUrl) |
| GET | `/friends/code` | Current user's friend code |
| POST | `/friends/code/regenerate` | Generate a new code, invalidating the old one |
| GET | `/friends/requests` | `{ incoming, outgoing }` pending requests, with profiles |
| POST | `/friends/requests` | Send a request by `friendCode` |
| POST | `/friends/requests/:id/accept` | Accept an incoming request (addressee only) |
| POST | `/friends/requests/:id/decline` | Decline an incoming request, or cancel an outgoing one |
| DELETE | `/friends/:userId` | Unfriend |

Send-request behavior:
- Unknown code returns 404.
- Your own code returns 400.
- Already friends, or a request already pending from you, returns 409.
- If the other user already sent *you* a request, the two requests collapse into an automatic accept.

Side effects:
- Socket events go to the other user: `FRIEND_REQUEST_RECEIVED`, `FRIEND_REQUEST_ACCEPTED` and `FRIEND_REMOVED`. These use the existing `emitToUsers` helper.
- `recordActivityEvent` entries are written for request received and request accepted.

### Enforcement
Add `assertFriends(currentUserId, otherUserIds[])` in `services/friends.ts`. It does a single query and throws `HttpError(403, "You can only do this with friends")`. Call it from:
- `conversations.createConversation`
- `plans.createPlan` (invitees)
- `plans.inviteParticipant`
- `conversations.sendMessage`, for direct conversations only. If the other participant is not a friend, it returns 403.

### Removals and changes to existing endpoints
- Remove `GET /users?q=` and `searchUsers`. Keep `GET /users?ids=` and `GET /users/:id`, since they are used to hydrate names and avatars.
- Update the "Backend additions" notes in `AGENTS.md` and `docs/04-api-design.md`.

## 4. Frontend (`apps/frontend`)

### Navigation
- Add a **Friends** tab to `BottomTabBar` (`/friends`, `Users` icon). There are 5 tabs afterwards.
- Show a badge with the number of pending incoming requests.

### `features/friends/`
- `FriendsPage` has these sections:
  - **My code**: shows the code with Copy and Share buttons (Web Share API with a clipboard fallback), plus a Regenerate action with a confirmation.
  - **Add friend**: a code input and a Send button. It shows inline errors (invalid, self, already friends or pending).
  - **Requests**: incoming (Accept/Decline) and outgoing (Cancel).
  - **Friends list**: each row has Message (opens or creates the direct chat), New plan (opens the create flow with the friend preselected) and Remove (with a confirmation).
- `hooks.ts` has React Query hooks: `useFriends`, `useFriendRequests`, `useMyFriendCode`, `useSendFriendRequest`, `useRespondToRequest`, `useRemoveFriend` and `useRegenerateCode`.
- Optionally support `/friends?code=XXXX` deep links, which prefill the Add friend input. This makes shared invite links work.

### Changes to existing UI
- `components/create/UserPicker.tsx` (used by `NewChatForm`, `GoalForm` and `DateHangoutForm`) lists **only friends**, from `useFriends`. It no longer uses user search (`hooks/useUsers.ts` and `api.ts` search calls are removed). Show an empty state linking to the Friends tab when the user has no friends.
- The socket provider invalidates the friends, requests and badge queries on the new events.
- The Activity page renders the new friend activity event types.
- The direct chat view shows a disabled composer with a notice when the other person is no longer a friend.

## 5. Testing

Backend:
- Send a request by code, and handle an invalid or own code.
- Accept, decline, cancel and unfriend.
- Duplicate request returns 409, and a reverse request auto-accepts.
- Regenerating a code invalidates the old one.
- Creating a chat or plan with a non-friend returns 403, and with a friend returns 2xx.
- Sending a message in a direct chat after unfriending returns 403.

Frontend:
- Typecheck and build (`npm run build:frontend`), plus a manual walkthrough with two accounts.

## 6. Implementation order

1. Schema and migration (`friend_code`, `friendships`, backfill), plus shared schemas and events.
2. Friends service, routes and tests.
3. `assertFriends` enforcement in the conversations and plans services, plus removal of user search.
4. Frontend: Friends tab and page, hooks, badge and socket wiring.
5. Frontend: `UserPicker` switched to friends, direct chat blocked state, and activity entries.
6. Docs: update `03-data-model.md`, `04-api-design.md`, `06-roadmap.md` and `AGENTS.md`.

## Open questions

- Should friend codes expire or be single-use? The current plan is permanent until regenerated.
- Should there be a block-user feature? It is out of scope for this plan.
- Is the "no new messages after unfriending" rule for existing direct chats the behavior you want? The alternative is to leave existing chats fully functional.
