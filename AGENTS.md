# Agent notes for plan-it

## Commands

Run from the repo root (npm workspaces):

- `npm run dev:backend` — Express + Socket.io API (needs `docker-compose up` for Postgres/Redis first)
- `npm run dev:frontend` — Vite dev server for `apps/frontend`
- `npm run build:shared` — build `packages/shared` (frontend/backend both import its `dist/`, rebuild after editing it)
- `npm run build:backend` / `npm run build:frontend` — typecheck + build

## Frontend (`apps/frontend`)

- React 19 + Vite + TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), React Router, TanStack Query, Radix UI primitives, `@clerk/react` (current-gen Clerk package — not `@clerk/clerk-react`), `socket.io-client`.
- Path alias `@/*` → `src/*`.
- Env vars (`.env.local`, gitignored): `VITE_API_URL`, `VITE_CLERK_PUBLISHABLE_KEY` (same publishable key already configured for the backend — get it from the Clerk Dashboard).
- Structure: `src/features/<domain>` (chats, plans, activity, profile, auth) hold pages + domain-specific components + React Query hooks (`hooks.ts`); `src/components/ui` are generic primitives; `src/components/layout` is the tab-bar/FAB app shell; `src/lib` has the API client, socket provider, and query client.
- PWA: `vite-plugin-pwa` (`injectManifest` with custom worker `src/sw.ts`, `registerType: 'prompt'`) configured in `vite.config.ts`; only the app shell is precached (API/Clerk/socket never cached). `sw.ts` is typechecked by `tsconfig.sw.json` (WebWorker lib), not `tsconfig.app.json`. `src/components/PwaStatus.tsx` shows the offline banner and update prompt. Icons are generated from `public/favicon.svg` via `npm run generate-pwa-assets --workspace=@plan-it/frontend`. The service worker is only active in production builds (`npm run build:frontend`, then `npm run preview --workspace=@plan-it/frontend`).
- Web Push: backend `services/push.ts` (`sendPushToUsers`, best-effort, prunes 404/410 subscriptions) + `routes/push.ts` (`/push/public-key|subscribe|unsubscribe`), `push_subscriptions` table (migration `0003`). Needs `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` in `apps/backend/.env.local` (push is silently disabled without them; generate via `node -e "console.log(require('web-push').generateVAPIDKeys())"`). Triggers: new message, plan invite, friend request/accepted. The SW skips showing a notification when an app window is visible+focused and sets the app badge from the payload. Toggle lives in Profile (`usePushNotifications`).
- Calendar view is implemented as a day-grouped agenda list (not a month-grid calendar) — simplification over `docs/06-roadmap.md` Phase 4/5 scope; revisit if a real calendar grid is wanted.

## Backend additions made while building the frontend

The original backend (per `docs/04-api-design.md`) had no way to resolve a user's display name/avatar outside of `/activity` (which joins `users`), and no way to discover other users to chat with or invite. Added:

- `GET /users?ids=a,b,c` — batched public-profile lookup (id, displayName, avatarUrl), used to hydrate chat participants/plan participants/comment authors.
- Friends: people are found only via shareable friend codes (`users.friend_code`) and friend requests — there is no name search. Chats and plans can only be created with accepted friends (`assertFriends` in `services/friends.ts`). See `docs/07-friends.md`; run `npm run db:migrate --workspace=@plan-it/backend` for the `0001_friends` migration.
- `GET /users/:id` — single lookup (matches `docs/04-api-design.md`, previously undocumented-but-unimplemented).
- `listConversations` now returns `participantIds` and a `lastMessage` preview per conversation (batched, no N+1) so the chat list can render without extra round trips.

These are additive and don't change any existing contract.
