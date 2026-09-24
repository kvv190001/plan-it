import type { createConversationSchema, listMessagesQuerySchema, sendMessageSchema } from "@plan-it/shared";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../db/client.js";
import { conversationParticipants, conversations, messages } from "../db/schema.js";
import { HttpError } from "../lib/httpError.js";

export async function createConversation(
  currentUserId: string,
  input: z.infer<typeof createConversationSchema>,
) {
  const participantIds = [...new Set([currentUserId, ...input.participantIds])];
  if (input.type === "direct" && participantIds.length !== 2) {
    throw new HttpError(400, "A direct conversation needs exactly one other participant");
  }

  return db.transaction(async (tx) => {
    if (input.type === "direct") {
      // Reuse an existing direct conversation between the same two users, if any.
      const otherUserId = participantIds.find((id) => id !== currentUserId)!;
      const mine = await tx
        .select({ conversationId: conversationParticipants.conversationId })
        .from(conversationParticipants)
        .where(eq(conversationParticipants.userId, currentUserId));
      const candidateIds = mine.map((m) => m.conversationId);
      if (candidateIds.length > 0) {
        const theirs = await tx
          .select({ conversationId: conversationParticipants.conversationId })
          .from(conversationParticipants)
          .where(
            and(
              eq(conversationParticipants.userId, otherUserId),
              inArray(conversationParticipants.conversationId, candidateIds),
            ),
          );
        for (const row of theirs) {
          const [existing] = await tx.select().from(conversations).where(eq(conversations.id, row.conversationId));
          if (existing?.type === "direct") return existing;
        }
      }
    }

    const [conversation] = await tx
      .insert(conversations)
      .values({ type: input.type, title: input.title ?? null })
      .returning();

    await tx.insert(conversationParticipants).values(
      participantIds.map((userId) => ({ conversationId: conversation.id, userId })),
    );

    return conversation;
  });
}

export async function getUserConversationIds(userId: string): Promise<string[]> {
  const memberships = await db
    .select({ conversationId: conversationParticipants.conversationId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.userId, userId));
  return memberships.map((m) => m.conversationId);
}

// Enriches each conversation with its participant ids (so the client can
// resolve the "other person"/group members via GET /users?ids=) and a
// preview of the most recent message, batched to avoid N+1 queries.
export async function listConversations(currentUserId: string) {
  const conversationIds = await getUserConversationIds(currentUserId);
  if (conversationIds.length === 0) return [];

  const [rows, participantRows, lastMessageRows] = await Promise.all([
    db.select().from(conversations).where(inArray(conversations.id, conversationIds)),
    db
      .select({ conversationId: conversationParticipants.conversationId, userId: conversationParticipants.userId })
      .from(conversationParticipants)
      .where(inArray(conversationParticipants.conversationId, conversationIds)),
    db
      .selectDistinctOn([messages.conversationId], {
        conversationId: messages.conversationId,
        content: messages.content,
        senderId: messages.senderId,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(inArray(messages.conversationId, conversationIds))
      .orderBy(messages.conversationId, desc(messages.createdAt)),
  ]);

  const participantsByConversation = new Map<string, string[]>();
  for (const row of participantRows) {
    const list = participantsByConversation.get(row.conversationId) ?? [];
    list.push(row.userId);
    participantsByConversation.set(row.conversationId, list);
  }
  const lastMessageByConversation = new Map(lastMessageRows.map((row) => [row.conversationId, row]));

  return rows
    .map((conversation) => ({
      ...conversation,
      participantIds: participantsByConversation.get(conversation.id) ?? [],
      lastMessage: lastMessageByConversation.get(conversation.id) ?? null,
    }))
    .sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ?? a.createdAt;
      const bTime = b.lastMessage?.createdAt ?? b.createdAt;
      return bTime.getTime() - aTime.getTime();
    });
}

async function requireMembership(conversationId: string, userId: string) {
  const [membership] = await db
    .select()
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ),
    );
  if (!membership) throw new HttpError(403, "Not a participant in this conversation");
}

export async function listMessages(
  currentUserId: string,
  conversationId: string,
  filters: z.infer<typeof listMessagesQuerySchema>,
) {
  await requireMembership(conversationId, currentUserId);

  const conditions = [eq(messages.conversationId, conversationId)];
  if (filters.before) conditions.push(lt(messages.createdAt, filters.before));

  const rows = await db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(filters.limit);

  return rows.reverse(); // chronological order for the client
}

export async function sendMessage(
  currentUserId: string,
  conversationId: string,
  input: z.infer<typeof sendMessageSchema>,
) {
  await requireMembership(conversationId, currentUserId);

  const [message] = await db
    .insert(messages)
    .values({
      conversationId,
      senderId: currentUserId,
      content: input.content,
      planId: input.planId ?? null,
    })
    .returning();

  return message;
}
