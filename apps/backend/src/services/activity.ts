import type { listActivityQuerySchema } from "@plan-it/shared";
import { and, desc, eq, lt } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../db/client.js";
import { activityEvents, users } from "../db/schema.js";

// Paginated feed for the current user — see docs/03-data-model.md
// (`activity_events` is the single event stream powering the Activity tab).
export async function listActivity(currentUserId: string, filters: z.infer<typeof listActivityQuerySchema>) {
  const conditions = [eq(activityEvents.userId, currentUserId)];
  if (filters.before) conditions.push(lt(activityEvents.createdAt, filters.before));

  return db
    .select({
      id: activityEvents.id,
      type: activityEvents.type,
      planId: activityEvents.planId,
      payload: activityEvents.payload,
      createdAt: activityEvents.createdAt,
      actorId: activityEvents.actorId,
      actorDisplayName: users.displayName,
      actorAvatarUrl: users.avatarUrl,
    })
    .from(activityEvents)
    .leftJoin(users, eq(users.id, activityEvents.actorId))
    .where(and(...conditions))
    .orderBy(desc(activityEvents.createdAt))
    .limit(filters.limit);
}
