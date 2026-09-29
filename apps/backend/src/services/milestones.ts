import type { createMilestoneSchema, updateMilestoneSchema } from "@plan-it/shared";
import { and, eq, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { z } from "zod";
import { db } from "../db/client.js";
import { goalDetails, goalMilestones, planParticipants, plans } from "../db/schema.js";
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

    // A new, unfinished milestone means the goal is no longer 100% done —
    // reopen it if it had auto-achieved (see updateMilestone).
    await tx
      .update(goalDetails)
      .set({ status: "active" })
      .where(and(eq(goalDetails.planId, planId), eq(goalDetails.status, "achieved")));

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
    const loadSupportCrew = async () => {
      if (recipientIds.length > 0) return recipientIds;
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
      return recipientIds;
    };

    if (justCompleted) {
      await recordActivityEvent(tx, {
        recipientIds: await loadSupportCrew(),
        actorId: currentUserId,
        type: "milestone_completed",
        planId,
        payload: { planTitle: plan.title, milestoneTitle: input.title ?? milestone.title },
      });
    }

    // Auto-advance the goal's own status alongside its milestones, so a goal
    // that's 100% complete stops showing up as "active" (e.g. in the Active
    // Plans rail) without the owner having to remember a separate manual
    // "mark achieved" step. Un-checking a milestone on an already-achieved
    // goal reverts it back to active for the same reason — the milestones
    // are the source of truth for progress.
    if (input.isDone !== undefined) {
      const [goal] = await tx.select().from(goalDetails).where(eq(goalDetails.planId, planId));
      const allMilestones = await tx
        .select()
        .from(goalMilestones)
        .where(eq(goalMilestones.planId, planId));
      const allDone = allMilestones.length > 0 && allMilestones.every((m) => m.isDone);

      if (allDone && goal?.status === "active") {
        await tx.update(goalDetails).set({ status: "achieved" }).where(eq(goalDetails.planId, planId));
        await recordActivityEvent(tx, {
          recipientIds: await loadSupportCrew(),
          actorId: currentUserId,
          type: "goal_achieved",
          planId,
          payload: { planTitle: plan.title },
        });
      } else if (input.isDone === false && goal?.status === "achieved") {
        await tx.update(goalDetails).set({ status: "active" }).where(eq(goalDetails.planId, planId));
      }
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
