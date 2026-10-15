import type { PushPayload } from "@plan-it/shared";
import { eq, inArray } from "drizzle-orm";
import webpush from "web-push";
import { db } from "../db/client.js";
import { pushSubscriptions } from "../db/schema.js";
import { getNotificationSummary } from "./notifications.js";

// Read lazily: .env.local is loaded in index.ts *after* static imports are
// evaluated, so module-level reads of process.env would miss VAPID keys.
let configured: boolean | null = null;
function ensureConfigured() {
  if (configured !== null) return configured;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  configured = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
  if (configured) webpush.setVapidDetails(VAPID_SUBJECT ?? "mailto:admin@example.com", VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
  return configured;
}

export const getVapidPublicKey = () => (ensureConfigured() ? process.env.VAPID_PUBLIC_KEY! : null);

export async function saveSubscription(
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
) {
  await db
    .insert(pushSubscriptions)
    .values({ userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
}

export async function removeSubscription(endpoint: string) {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

// Best-effort fan-out: never throws, so callers can fire-and-forget it after
// the mutation succeeded. The service worker decides whether to actually
// display the notification (it skips it when the app is focused).
export async function sendPushToUsers(userIds: string[], payload: Omit<PushPayload, "badge">) {
  if (!ensureConfigured()) return;
  const recipients = [...new Set(userIds)];
  if (recipients.length === 0) return;

  try {
    const subs = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, recipients));
    if (subs.length === 0) return;

    const badgeByUser = new Map<string, number>();
    await Promise.all(
      [...new Set(subs.map((s) => s.userId))].map(async (userId) => {
        const summary = await getNotificationSummary(userId);
        badgeByUser.set(userId, summary.chats + summary.friends + summary.plans + summary.activity);
      }),
    );

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ ...payload, badge: badgeByUser.get(sub.userId) ?? 0 }),
            { TTL: 60 * 60 * 24 },
          );
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await removeSubscription(sub.endpoint);
          else console.error("Push send failed", status ?? err);
        }
      }),
    );
  } catch (err) {
    console.error("Push fan-out failed", err);
  }
}
