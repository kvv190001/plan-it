import { and, eq, inArray, ilike, ne } from "drizzle-orm";
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

// Name search so the client can find people to start a chat with or invite
// to a plan — there's no "contacts" concept in the MVP data model, so this
// is the only discovery mechanism. Excludes the requester and caps results.
export async function searchUsers(query: string, excludeUserId: string, limit = 20) {
  const rows = await db
    .select()
    .from(users)
    .where(and(ilike(users.displayName, `%${query}%`), ne(users.id, excludeUserId)))
    .limit(limit);
  return rows.map(toPublicProfile);
}
