import type {
  CreatePlanInput,
  rsvpSchema,
  updateDateHangoutPlanSchema,
  updateGoalPlanSchema,
} from "@plan-it/shared";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { z } from "zod";
import { db } from "../db/client.js";
import {
  dateDetails,
  goalDetails,
  goalMilestones,
  hangoutDetails,
  planParticipants,
  plans,
} from "../db/schema.js";
import { HttpError } from "../lib/httpError.js";
import { recordActivityEvent } from "./activityEvents.js";

// Loose enough to accept both the top-level `db` and a `db.transaction()` callback's `tx`.
type Executor = PgDatabase<PgQueryResultHKT, any, any>;

// `completed` is never stored — derived at read time (see 05-plan-lifecycles.md).
function displayStatusFor(
  plan: { type: string; status: string; startDate: Date | null },
  goalStatus?: string,
): string {
  if (plan.type === "goal") return goalStatus ?? "active";
  if (plan.status === "confirmed" && plan.startDate && plan.startDate < new Date()) {
    return "completed";
  }
  return plan.status;
}

export async function getPlanById(planId: string, currentUserId: string, executor: Executor = db) {
  const [plan] = await executor.select().from(plans).where(eq(plans.id, planId));
  if (!plan) throw new HttpError(404, "Plan not found");

  const participants = await executor
    .select()
    .from(planParticipants)
    .where(eq(planParticipants.planId, planId));

  const membership = participants.find((p) => p.userId === currentUserId);
  if (!membership) throw new HttpError(403, "Forbidden");

  // A support-crew member (viewer role) who hasn't accepted their invite yet
  // can't see the goal's actual content — but they still need *some* payload
  // (title + their own pending membership) to render the accept/decline UI.
  // Previously this threw a 403, which meant the invitee could never load the
  // page that lets them accept in the first place.
  const isPendingViewer =
    plan.type === "goal" && membership.role === "viewer" && membership.rsvpStatus !== "accepted";

  let details: unknown;
  let goalStatus: string | undefined;
  if (isPendingViewer) {
    details = { description: null, status: null, milestones: [] };
  } else if (plan.type === "date") {
    [details] = await executor.select().from(dateDetails).where(eq(dateDetails.planId, planId));
  } else if (plan.type === "hangout") {
    [details] = await executor.select().from(hangoutDetails).where(eq(hangoutDetails.planId, planId));
  } else {
    const [goal] = await executor.select().from(goalDetails).where(eq(goalDetails.planId, planId));
    const milestones = await executor
      .select()
      .from(goalMilestones)
      .where(eq(goalMilestones.planId, planId))
      .orderBy(goalMilestones.position);
    goalStatus = goal?.status;
    details = { ...goal, milestones };
  }

  return {
    ...plan,
    displayStatus: displayStatusFor(plan, goalStatus),
    details,
    participants,
  };
}

export async function listPlans(
  currentUserId: string,
  filters: { start?: Date; end?: Date; type?: string; status?: string },
) {
  const memberships = await db
    .select({ planId: planParticipants.planId })
    .from(planParticipants)
    .where(eq(planParticipants.userId, currentUserId));
  const planIds = memberships.map((m) => m.planId);
  if (planIds.length === 0) return [];

  const conditions = [inArray(plans.id, planIds)];
  if (filters.type) conditions.push(eq(plans.type, filters.type));
  if (filters.status) conditions.push(eq(plans.status, filters.status));
  // Range overlap: plan.start_date..(end_date ?? start_date) intersects [start, end]
  // (dates are passed as ISO strings — the postgres-js driver doesn't
  // serialize raw Date objects interpolated into a `sql` template).
  if (filters.end) conditions.push(sql`${plans.startDate} <= ${filters.end.toISOString()}`);
  if (filters.start) {
    conditions.push(sql`coalesce(${plans.endDate}, ${plans.startDate}) >= ${filters.start.toISOString()}`);
  }

  const rows = await db
    .select()
    .from(plans)
    .where(and(...conditions))
    .orderBy(plans.startDate);

  // Calendar view joins in the relevant *_details table per plan type (see
  // docs/03-data-model.md) — batched per type rather than N+1 per plan.
  const dateIds = rows.filter((r) => r.type === "date").map((r) => r.id);
  const hangoutIds = rows.filter((r) => r.type === "hangout").map((r) => r.id);
  const goalIds = rows.filter((r) => r.type === "goal").map((r) => r.id);

  const [dateRows, hangoutRows, goalRows, milestoneRows] = await Promise.all([
    dateIds.length > 0 ? db.select().from(dateDetails).where(inArray(dateDetails.planId, dateIds)) : [],
    hangoutIds.length > 0
      ? db.select().from(hangoutDetails).where(inArray(hangoutDetails.planId, hangoutIds))
      : [],
    goalIds.length > 0 ? db.select().from(goalDetails).where(inArray(goalDetails.planId, goalIds)) : [],
    goalIds.length > 0
      ? db.select().from(goalMilestones).where(inArray(goalMilestones.planId, goalIds)).orderBy(goalMilestones.position)
      : [],
  ]);

  const dateDetailsByPlanId = new Map(dateRows.map((r) => [r.planId, r]));
  const hangoutDetailsByPlanId = new Map(hangoutRows.map((r) => [r.planId, r]));
  const goalDetailsByPlanId = new Map(goalRows.map((r) => [r.planId, r]));
  const milestonesByPlanId = new Map<string, typeof milestoneRows>();
  for (const m of milestoneRows) {
    const list = milestonesByPlanId.get(m.planId) ?? [];
    list.push(m);
    milestonesByPlanId.set(m.planId, list);
  }

  return rows.map((plan) => {
    let details: unknown;
    let goalStatus: string | undefined;
    if (plan.type === "date") {
      details = dateDetailsByPlanId.get(plan.id);
    } else if (plan.type === "hangout") {
      details = hangoutDetailsByPlanId.get(plan.id);
    } else {
      const goal = goalDetailsByPlanId.get(plan.id);
      goalStatus = goal?.status;
      details = { ...goal, milestones: milestonesByPlanId.get(plan.id) ?? [] };
    }
    return { ...plan, displayStatus: displayStatusFor(plan, goalStatus), details };
  });
}

export async function createPlan(currentUserId: string, input: CreatePlanInput) {
  return db.transaction(async (tx) => {
    const [plan] = await tx
      .insert(plans)
      .values({
        type: input.type,
        title: input.title,
        // date/hangout: real lifecycle status. goal: plans.status is unused/ignored
        // (goal_details.status is authoritative) — 'active' is just a placeholder.
        status: input.type === "goal" ? "active" : "proposed",
        createdBy: currentUserId,
        startDate: input.type === "goal" ? input.startDate ?? new Date() : input.scheduledAt,
        endDate: input.type === "goal" ? input.endDate ?? null : null,
      })
      .returning();

    await tx.insert(planParticipants).values({
      planId: plan.id,
      userId: currentUserId,
      role: "owner",
      rsvpStatus: "accepted",
    });

    const recipientIds = [currentUserId];

    if (input.type === "date") {
      recipientIds.push(input.inviteeId);
      await tx.insert(planParticipants).values({
        planId: plan.id,
        userId: input.inviteeId,
        role: "participant",
        rsvpStatus: "pending",
      });
      await tx.insert(dateDetails).values({
        planId: plan.id,
        location: input.location ?? null,
        scheduledAt: input.scheduledAt,
        notes: input.notes ?? null,
      });
    } else if (input.type === "hangout") {
      const inviteeIds = [...new Set(input.inviteeIds)];
      recipientIds.push(...inviteeIds);
      await tx.insert(planParticipants).values(
        inviteeIds.map((userId) => ({
          planId: plan.id,
          userId,
          role: "participant" as const,
          rsvpStatus: "pending" as const,
        })),
      );
      await tx.insert(hangoutDetails).values({
        planId: plan.id,
        location: input.location ?? null,
        scheduledAt: input.scheduledAt,
        notes: input.notes ?? null,
      });
    } else {
      const viewerIds = [...new Set(input.viewerIds)];
      recipientIds.push(...viewerIds);
      if (viewerIds.length > 0) {
        await tx.insert(planParticipants).values(
          viewerIds.map((userId) => ({
            planId: plan.id,
            userId,
            role: "viewer" as const,
            rsvpStatus: "pending" as const,
          })),
        );
      }
      await tx.insert(goalDetails).values({
        planId: plan.id,
        description: input.description ?? null,
        status: "active",
      });
      if (input.milestones.length > 0) {
        await tx.insert(goalMilestones).values(
          input.milestones.map((m, idx) => ({
            planId: plan.id,
            title: m.title,
            position: m.position ?? idx,
          })),
        );
      }
    }

    await recordActivityEvent(tx, {
      recipientIds,
      actorId: currentUserId,
      type: "plan_created",
      planId: plan.id,
      payload: { title: plan.title, planType: plan.type },
    });

    return getPlanById(plan.id, currentUserId, tx);
  });
}

async function loadOwnedPlan(planId: string, currentUserId: string, executor: Executor) {
  const [plan] = await executor.select().from(plans).where(eq(plans.id, planId));
  if (!plan) throw new HttpError(404, "Plan not found");
  if (plan.createdBy !== currentUserId) throw new HttpError(403, "Only the owner can do this");
  return plan;
}

export async function updateDateOrHangoutPlan(
  currentUserId: string,
  planId: string,
  input: z.infer<typeof updateDateHangoutPlanSchema>,
) {
  return db.transaction(async (tx) => {
    const plan = await loadOwnedPlan(planId, currentUserId, tx);
    if (plan.type !== "date" && plan.type !== "hangout") {
      throw new HttpError(400, "Not a date/hangout plan");
    }
    if (plan.status === "cancelled") throw new HttpError(400, "Plan is cancelled");

    // Editing after confirmation stays 'confirmed' (no reset to 'proposed').
    await tx
      .update(plans)
      .set({
        title: input.title ?? plan.title,
        startDate: input.scheduledAt ?? plan.startDate,
        updatedAt: new Date(),
      })
      .where(eq(plans.id, planId));

    const detailsTable = plan.type === "date" ? dateDetails : hangoutDetails;
    await tx
      .update(detailsTable)
      .set({
        ...(input.location !== undefined ? { location: input.location } : {}),
        ...(input.scheduledAt !== undefined ? { scheduledAt: input.scheduledAt } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      })
      .where(eq(detailsTable.planId, planId));

    return getPlanById(planId, currentUserId, tx);
  });
}

export async function updateGoalPlan(
  currentUserId: string,
  planId: string,
  input: z.infer<typeof updateGoalPlanSchema>,
) {
  return db.transaction(async (tx) => {
    const plan = await loadOwnedPlan(planId, currentUserId, tx);
    if (plan.type !== "goal") throw new HttpError(400, "Not a goal plan");

    if (input.title !== undefined) {
      await tx.update(plans).set({ title: input.title, updatedAt: new Date() }).where(eq(plans.id, planId));
    }

    if (input.description !== undefined || input.status !== undefined) {
      await tx
        .update(goalDetails)
        .set({
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        })
        .where(eq(goalDetails.planId, planId));
    }

    return getPlanById(planId, currentUserId, tx);
  });
}

export async function cancelPlan(currentUserId: string, planId: string) {
  return db.transaction(async (tx) => {
    const plan = await loadOwnedPlan(planId, currentUserId, tx);
    if (plan.type === "goal") {
      throw new HttpError(400, "Use PATCH /plans/:id to mark a goal achieved or abandoned");
    }
    if (plan.status === "cancelled") throw new HttpError(400, "Plan is already cancelled");

    await tx
      .update(plans)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(plans.id, planId));

    const allParticipants = await tx
      .select({ userId: planParticipants.userId })
      .from(planParticipants)
      .where(eq(planParticipants.planId, planId));
    await recordActivityEvent(tx, {
      recipientIds: allParticipants.map((p) => p.userId),
      actorId: currentUserId,
      type: "plan_cancelled",
      planId,
      payload: { title: plan.title },
    });

    return getPlanById(planId, currentUserId, tx);
  });
}

export async function inviteParticipant(currentUserId: string, planId: string, targetUserId: string) {
  return db.transaction(async (tx) => {
    const plan = await loadOwnedPlan(planId, currentUserId, tx);
    if (plan.type === "date") {
      throw new HttpError(400, "Date plans have a single fixed invitee — create a new plan instead");
    }
    if (plan.type === "hangout" && plan.status !== "proposed") {
      throw new HttpError(400, "Can only modify participants while the plan is proposed");
    }

    const [existing] = await tx
      .select()
      .from(planParticipants)
      .where(and(eq(planParticipants.planId, planId), eq(planParticipants.userId, targetUserId)));
    if (existing) throw new HttpError(409, "User is already a participant");

    await tx.insert(planParticipants).values({
      planId,
      userId: targetUserId,
      role: plan.type === "goal" ? "viewer" : "participant",
      rsvpStatus: "pending",
    });

    return getPlanById(planId, currentUserId, tx);
  });
}

export async function removeParticipant(currentUserId: string, planId: string, targetUserId: string) {
  return db.transaction(async (tx) => {
    const plan = await loadOwnedPlan(planId, currentUserId, tx);
    if (plan.type === "date") {
      throw new HttpError(400, "Date plans have a single fixed invitee and can't remove them");
    }
    if (plan.type === "hangout" && plan.status !== "proposed") {
      throw new HttpError(400, "Can only modify participants while the plan is proposed");
    }

    const result = await tx
      .delete(planParticipants)
      .where(
        and(
          eq(planParticipants.planId, planId),
          eq(planParticipants.userId, targetUserId),
          sql`${planParticipants.role} <> 'owner'`,
        ),
      )
      .returning();
    if (result.length === 0) throw new HttpError(404, "Participant not found");

    return getPlanById(planId, currentUserId, tx);
  });
}

export async function respondToInvite(
  currentUserId: string,
  planId: string,
  input: z.infer<typeof rsvpSchema>,
) {
  return db.transaction(async (tx) => {
    const [plan] = await tx.select().from(plans).where(eq(plans.id, planId));
    if (!plan) throw new HttpError(404, "Plan not found");

    const [membership] = await tx
      .select()
      .from(planParticipants)
      .where(and(eq(planParticipants.planId, planId), eq(planParticipants.userId, currentUserId)));
    if (!membership || membership.role === "owner") {
      throw new HttpError(403, "Only invitees can respond to this plan");
    }
    if (membership.rsvpStatus !== "pending") {
      throw new HttpError(400, "You've already responded to this invite");
    }

    await tx
      .update(planParticipants)
      .set({ rsvpStatus: input.status })
      .where(and(eq(planParticipants.planId, planId), eq(planParticipants.userId, currentUserId)));

    if (plan.type !== "goal") {
      if (input.status === "declined") {
        await tx.update(plans).set({ status: "cancelled", updatedAt: new Date() }).where(eq(plans.id, planId));

        const allParticipants = await tx
          .select({ userId: planParticipants.userId })
          .from(planParticipants)
          .where(eq(planParticipants.planId, planId));
        await recordActivityEvent(tx, {
          recipientIds: allParticipants.map((p) => p.userId),
          actorId: currentUserId,
          type: "plan_cancelled",
          planId,
          payload: { title: plan.title },
        });
      } else {
        const invitees = await tx
          .select()
          .from(planParticipants)
          .where(and(eq(planParticipants.planId, planId), sql`${planParticipants.role} <> 'owner'`));
        const allAccepted = invitees.every((p) => p.rsvpStatus === "accepted");
        if (allAccepted) {
          await tx.update(plans).set({ status: "confirmed", updatedAt: new Date() }).where(eq(plans.id, planId));

          await recordActivityEvent(tx, {
            recipientIds: [plan.createdBy, ...invitees.map((p) => p.userId)],
            actorId: currentUserId,
            type: "plan_confirmed",
            planId,
            payload: { title: plan.title },
          });
        }
      }
    }
    // goal: rsvp only gates support-crew visibility; plans.status/goal_details.status untouched.

    return getPlanById(planId, currentUserId, tx);
  });
}
