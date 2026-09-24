import type { createMilestoneSchema, updateMilestoneSchema } from "@plan-it/shared";
import { and, eq, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { z } from "zod";
import { db } from "../db/client.js";
import { goalMilestones, planParticipants, plans } from "../db/schema.js";
import { HttpError } from "../lib/httpError.js";
import { recordActivityEvent } from "./activityEvents.js";
import { getPlanById } from "./plans.js";

type Executor = PgDatabase<PgQueryResultHKT, any, any>;

async function loadOwnedGoalPlan(planId: string, currentUserId: string, tx: Executor) {
  const [plan] = await tx.select().from(plans).where(eq(plans.id, planId));
  if (!plan) throw new HttpError(404, "Plan not found");
  if (plan.type !== "goal") throw new HttpError(400, "Not a goal plan");
  if (plan.createdBy !== currentUserId) throw new HttpError(403, "Only the owner can do this");
  return plan;
}

export async function addMilestone(
  currentUserId: string,
  planId: string,
  input: z.infer<typeof createMilestoneSchema>,
) {
  return db.transaction(async (tx) => {
    await loadOwnedGoalPlan(planId, currentUserId, tx);

    let position = input.position;
    if (position === undefined) {
      const [{ maxPosition }] = await tx
        .select({ maxPosition: sql<number>`coalesce(max(${goalMilestones.position}), -1)` })
        .from(goalMilestones)
        .where(eq(goalMilestones.planId, planId));
      position = maxPosition + 1;
    }

    await tx.insert(goalMilestones).values({ planId, title: input.title, position });

    return getPlanById(planId, currentUserId, tx);
  });
}

export async function updateMilestone(
  currentUserId: string,
  planId: string,
  milestoneId: string,
  input: z.infer<typeof updateMilestoneSchema>,
) {
  return db.transaction(async (tx) => {
    const plan = await loadOwnedGoalPlan(planId, currentUserId, tx);

    const [milestone] = await tx
      .select()
      .from(goalMilestones)
      .where(and(eq(goalMilestones.id, milestoneId), eq(goalMilestones.planId, planId)));
    if (!milestone) throw new HttpError(404, "Milestone not found");

    const justCompleted = input.isDone === true && !milestone.isDone;

    await tx
      .update(goalMilestones)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
        ...(input.isDone !== undefined
          ? { isDone: input.isDone, completedAt: input.isDone ? new Date() : null }
          : {}),
      })
      .where(eq(goalMilestones.id, milestoneId));

    let recipientIds: string[] = [];
    if (justCompleted) {
      const supportCrew = await tx
        .select({ userId: planParticipants.userId })
        .from(planParticipants)
        .where(
          and(
            eq(planParticipants.planId, planId),
            sql`(${planParticipants.role} = 'owner' or ${planParticipants.rsvpStatus} = 'accepted')`,
          ),
        );
      recipientIds = supportCrew.map((p) => p.userId);
      await recordActivityEvent(tx, {
        recipientIds,
        actorId: currentUserId,
        type: "milestone_completed",
        planId,
        payload: { planTitle: plan.title, milestoneTitle: input.title ?? milestone.title },
      });
    }

    const updatedPlan = await getPlanById(planId, currentUserId, tx);
    return { plan: updatedPlan, justCompleted, recipientIds };
  });
}

export async function removeMilestone(currentUserId: string, planId: string, milestoneId: string) {
  return db.transaction(async (tx) => {
    await loadOwnedGoalPlan(planId, currentUserId, tx);

    const result = await tx
      .delete(goalMilestones)
      .where(and(eq(goalMilestones.id, milestoneId), eq(goalMilestones.planId, planId)))
      .returning();
    if (result.length === 0) throw new HttpError(404, "Milestone not found");

    return getPlanById(planId, currentUserId, tx);
  });
}
