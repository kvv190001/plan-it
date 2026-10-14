import { eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";

// Public profile shape only — never expose clerkUserId to other clients.
function toPublicProfile(user: typeof users.$inferSelect) {
  return { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl };
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ? toPublicProfile(user) : null;
}

// Batched lookup so screens rendering many participants/authors (chat
// participants, plan participants, comment authors) don't do it one at a time.
export async function listUsersByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await db.select().from(users).where(inArray(users.id, [...new Set(ids)]));
  return rows.map(toPublicProfile);
}
