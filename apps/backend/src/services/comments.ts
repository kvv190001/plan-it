import type { createCommentSchema } from "@plan-it/shared";
import { and, asc, eq, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { z } from "zod";
import { db } from "../db/client.js";
import { comments, planParticipants, plans } from "../db/schema.js";
import { HttpError } from "../lib/httpError.js";
import { recordActivityEvent } from "./activityEvents.js";

type Executor = PgDatabase<PgQueryResultHKT, any, any>;

// Owner + accepted viewers only (see docs/05-plan-lifecycles.md — a pending
// viewer can't see the goal or comment until they accept the invite).
async function requireGoalAccess(planId: string, currentUserId: string, tx: Executor) {
  const [plan] = await tx.select().from(plans).where(eq(plans.id, planId));
  if (!plan) throw new HttpError(404, "Plan not found");
  if (plan.type !== "goal") throw new HttpError(400, "Comments are only supported on goal plans");

  const [membership] = await tx
    .select()
    .from(planParticipants)
    .where(and(eq(planParticipants.planId, planId), eq(planParticipants.userId, currentUserId)));
  const hasAccess =
    membership && (membership.role === "owner" || membership.rsvpStatus === "accepted");
  if (!hasAccess) throw new HttpError(403, "Accept the invite to access this goal's comments");

  return plan;
}

export async function listComments(currentUserId: string, planId: string) {
  await requireGoalAccess(planId, currentUserId, db);

  return db
    .select()
    .from(comments)
    .where(and(eq(comments.commentableType, "goal"), eq(comments.commentableId, planId)))
    .orderBy(asc(comments.createdAt));
}

export async function addComment(
  currentUserId: string,
  planId: string,
  input: z.infer<typeof createCommentSchema>,
) {
  return db.transaction(async (tx) => {
    const plan = await requireGoalAccess(planId, currentUserId, tx);

    const [comment] = await tx
      .insert(comments)
      .values({
        commentableType: "goal",
        commentableId: planId,
        authorId: currentUserId,
        content: input.content,
      })
      .returning();

    const supportCrew = await tx
      .select({ userId: planParticipants.userId })
      .from(planParticipants)
      .where(
        and(
          eq(planParticipants.planId, planId),
          sql`(${planParticipants.role} = 'owner' or ${planParticipants.rsvpStatus} = 'accepted')`,
        ),
      );
    const recipientIds = supportCrew.map((p) => p.userId);

    await recordActivityEvent(tx, {
      recipientIds,
      actorId: currentUserId,
      type: "comment_posted",
      planId,
      payload: { planTitle: plan.title, commentPreview: input.content.slice(0, 140) },
    });

    return { comment, recipientIds };
  });
}
