import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { activityEvents } from "../db/schema.js";

type Executor = PgDatabase<PgQueryResultHKT, any, any>;

// Fans one event row out to every recipient's feed (see docs/03-data-model.md
// — `activity_events` is the single stream powering the Activity tab).
export async function recordActivityEvent(
  executor: Executor,
  params: {
    recipientIds: string[];
    actorId: string;
    type: string;
    planId?: string | null;
    payload?: Record<string, unknown>;
  },
) {
  const recipients = [...new Set(params.recipientIds)];
  if (recipients.length === 0) return;

  await executor.insert(activityEvents).values(
    recipients.map((userId) => ({
      userId,
      actorId: params.actorId,
      type: params.type,
      planId: params.planId ?? null,
      payload: params.payload ?? null,
    })),
  );
}
