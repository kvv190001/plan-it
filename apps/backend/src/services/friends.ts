import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "../db/client.js";
import { friendships, generateFriendCode, users } from "../db/schema.js";
import { HttpError } from "../lib/httpError.js";
import { recordActivityEvent } from "./activityEvents.js";

function toPublicProfile(user: typeof users.$inferSelect) {
  return { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl };
}

function pairCondition(a: string, b: string) {
  return or(
    and(eq(friendships.requesterId, a), eq(friendships.addresseeId, b)),
    and(eq(friendships.requesterId, b), eq(friendships.addresseeId, a)),
  )!;
}

export async function listFriendIds(userId: string): Promise<string[]> {
  const rows = await db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId)),
      ),
    );
  return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
}

export async function listFriends(userId: string) {
  const ids = await listFriendIds(userId);
  if (ids.length === 0) return [];
  const rows = await db.select().from(users).where(inArray(users.id, ids));
  return rows.map(toPublicProfile).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function areFriends(a: string, b: string) {
  const [row] = await db
    .select({ id: friendships.id })
    .from(friendships)
    .where(and(eq(friendships.status, "accepted"), pairCondition(a, b)));
  return !!row;
}

// Throws 403 unless every id in `otherUserIds` (ignoring the current user) is
// an accepted friend of the current user.
export async function assertFriends(currentUserId: string, otherUserIds: string[]) {
  const targets = [...new Set(otherUserIds)].filter((id) => id !== currentUserId);
  if (targets.length === 0) return;
  const friendIds = new Set(await listFriendIds(currentUserId));
  if (targets.some((id) => !friendIds.has(id))) {
    throw new HttpError(403, "You can only do this with friends");
  }
}

export async function getFriendCode(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user!.friendCode;
}

export async function regenerateFriendCode(userId: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateFriendCode();
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.friendCode, code));
    if (taken) continue;
    await db.update(users).set({ friendCode: code }).where(eq(users.id, userId));
    return code;
  }
  throw new HttpError(500, "Could not generate a friend code, try again");
}

export async function listRequests(userId: string) {
  const rows = await db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "pending"),
        or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId)),
      ),
    );
  const otherIds = rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
  const profiles = new Map<string, ReturnType<typeof toPublicProfile>>();
  if (otherIds.length > 0) {
    for (const u of await db.select().from(users).where(inArray(users.id, otherIds))) {
      profiles.set(u.id, toPublicProfile(u));
    }
  }

  const incoming: unknown[] = [];
  const outgoing: unknown[] = [];
  for (const r of rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())) {
    const isIncoming = r.addresseeId === userId;
    const user = profiles.get(isIncoming ? r.requesterId : r.addresseeId);
    if (!user) continue;
    (isIncoming ? incoming : outgoing).push({ id: r.id, createdAt: r.createdAt, user });
  }
  return { incoming, outgoing };
}

export type SendRequestResult = { status: "pending" | "accepted"; otherUserId: string };

export async function sendRequest(currentUserId: string, friendCode: string): Promise<SendRequestResult> {
  const [target] = await db.select().from(users).where(eq(users.friendCode, friendCode));
  if (!target) throw new HttpError(404, "No user found with that friend code");
  if (target.id === currentUserId) throw new HttpError(400, "You can't add yourself");

  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(friendships).where(pairCondition(currentUserId, target.id));
    if (existing) {
      if (existing.status === "accepted") throw new HttpError(409, "You're already friends");
      if (existing.requesterId === currentUserId) throw new HttpError(409, "Friend request already sent");
      // They already asked us — treat this as accepting.
      await tx
        .update(friendships)
        .set({ status: "accepted", respondedAt: new Date() })
        .where(eq(friendships.id, existing.id));
      await recordActivityEvent(tx, {
        recipientIds: [target.id],
        actorId: currentUserId,
        type: "friend_request_accepted",
      });
      return { status: "accepted" as const, otherUserId: target.id };
    }

    await tx.insert(friendships).values({ requesterId: currentUserId, addresseeId: target.id, status: "pending" });
    await recordActivityEvent(tx, {
      recipientIds: [target.id],
      actorId: currentUserId,
      type: "friend_request_received",
    });
    return { status: "pending" as const, otherUserId: target.id };
  });
}

export async function acceptRequest(currentUserId: string, requestId: string) {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(friendships).where(eq(friendships.id, requestId));
    if (!row || row.status !== "pending" || row.addresseeId !== currentUserId) {
      throw new HttpError(404, "Friend request not found");
    }
    await tx
      .update(friendships)
      .set({ status: "accepted", respondedAt: new Date() })
      .where(eq(friendships.id, requestId));
    await recordActivityEvent(tx, {
      recipientIds: [row.requesterId],
      actorId: currentUserId,
      type: "friend_request_accepted",
    });
    return row.requesterId;
  });
}

// Declines an incoming request or cancels an outgoing one; returns the other user.
export async function removeRequest(currentUserId: string, requestId: string) {
  const [row] = await db.select().from(friendships).where(eq(friendships.id, requestId));
  if (
    !row ||
    row.status !== "pending" ||
    (row.addresseeId !== currentUserId && row.requesterId !== currentUserId)
  ) {
    throw new HttpError(404, "Friend request not found");
  }
  await db.delete(friendships).where(eq(friendships.id, requestId));
  return row.requesterId === currentUserId ? row.addresseeId : row.requesterId;
}

export async function unfriend(currentUserId: string, otherUserId: string) {
  const deleted = await db
    .delete(friendships)
    .where(and(eq(friendships.status, "accepted"), pairCondition(currentUserId, otherUserId)))
    .returning({ id: friendships.id });
  if (deleted.length === 0) throw new HttpError(404, "Not friends with this user");
}
