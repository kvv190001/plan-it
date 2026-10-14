import { and, count, eq, gt, ne } from "drizzle-orm";
import { db } from "../db/client.js";
import { activityEvents, friendships, planParticipants, plans, users } from "../db/schema.js";
import { getUnreadCounts } from "./conversations.js";

export async function markActivitySeen(currentUserId: string) {
  await db.update(users).set({ activitySeenAt: new Date() }).where(eq(users.id, currentUserId));
}

// Single query-set powering the dots on the bottom tab bar. Values are counts
// so the UI can switch from dots to numbers without an API change.
export async function getNotificationSummary(currentUserId: string) {
  const [unreadByConversation, [friendRow], [planRow], [activityRow]] = await Promise.all([
    getUnreadCounts(currentUserId),
    db
      .select({ n: count() })
      .from(friendships)
      .where(and(eq(friendships.addresseeId, currentUserId), eq(friendships.status, "pending"))),
    db
      .select({ n: count() })
      .from(planParticipants)
      .innerJoin(plans, eq(plans.id, planParticipants.planId))
      .where(
        and(
          eq(planParticipants.userId, currentUserId),
          eq(planParticipants.rsvpStatus, "pending"),
          ne(planParticipants.role, "owner"),
          ne(plans.status, "cancelled"),
        ),
      ),
    db
      .select({ n: count() })
      .from(activityEvents)
      .innerJoin(users, eq(users.id, activityEvents.userId))
      .where(
        and(
          eq(activityEvents.userId, currentUserId),
          ne(activityEvents.actorId, currentUserId),
          gt(activityEvents.createdAt, users.activitySeenAt),
        ),
      ),
  ]);

  let chats = 0;
  for (const n of unreadByConversation.values()) chats += n;
  return { chats, friends: friendRow.n, plans: planRow.n, activity: activityRow.n };
}
