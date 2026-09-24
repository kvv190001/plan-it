import {
  createPlanSchema,
  inviteParticipantSchema,
  listPlansQuerySchema,
  rsvpSchema,
  SOCKET_EVENTS,
  updateDateHangoutPlanSchema,
  updateGoalPlanSchema,
} from "@plan-it/shared";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/client.js";
import { plans } from "../db/schema.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../lib/httpError.js";
import { requireCurrentUser } from "../middleware/currentUser.js";
import * as plansService from "../services/plans.js";
import { getIO } from "../socket/io.js";
import { emitToUsers } from "../socket/planEvents.js";

export const plansRouter = Router();

plansRouter.use(requireCurrentUser);

plansRouter.get(
  "/plans",
  asyncHandler(async (req, res) => {
    const parsed = listPlansQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new HttpError(400, parsed.error.message);

    const result = await plansService.listPlans(req.currentUser!.id, parsed.data);
    res.json({ plans: result });
  }),
);

plansRouter.post(
  "/plans",
  asyncHandler(async (req, res) => {
    const parsed = createPlanSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.message);

    const plan = await plansService.createPlan(req.currentUser!.id, parsed.data);

    const inviteeIds = plan.participants.filter((p) => p.role !== "owner").map((p) => p.userId);
    emitToUsers(getIO(), inviteeIds, SOCKET_EVENTS.PLAN_INVITED, { plan });

    res.status(201).json({ plan });
  }),
);

plansRouter.get(
  "/plans/:id",
  asyncHandler(async (req, res) => {
    const plan = await plansService.getPlanById(req.params.id, req.currentUser!.id);
    res.json({ plan });
  }),
);

plansRouter.patch(
  "/plans/:id",
  asyncHandler(async (req, res) => {
    const [existing] = await db.select({ type: plans.type }).from(plans).where(eq(plans.id, req.params.id));
    if (!existing) throw new HttpError(404, "Plan not found");

    if (existing.type === "goal") {
      const parsed = updateGoalPlanSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.message);
      const plan = await plansService.updateGoalPlan(req.currentUser!.id, req.params.id, parsed.data);
      res.json({ plan });
      return;
    }

    const parsed = updateDateHangoutPlanSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.message);
    const plan = await plansService.updateDateOrHangoutPlan(req.currentUser!.id, req.params.id, parsed.data);
    res.json({ plan });
  }),
);

plansRouter.delete(
  "/plans/:id",
  asyncHandler(async (req, res) => {
    const plan = await plansService.cancelPlan(req.currentUser!.id, req.params.id);

    const recipientIds = plan.participants.map((p) => p.userId);
    emitToUsers(getIO(), recipientIds, SOCKET_EVENTS.PLAN_STATUS_CHANGED, {
      planId: plan.id,
      status: plan.status,
    });

    res.json({ plan });
  }),
);

plansRouter.post(
  "/plans/:id/participants",
  asyncHandler(async (req, res) => {
    const parsed = inviteParticipantSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.message);

    const plan = await plansService.inviteParticipant(req.currentUser!.id, req.params.id, parsed.data.userId);

    emitToUsers(getIO(), [parsed.data.userId], SOCKET_EVENTS.PLAN_INVITED, { plan });

    res.status(201).json({ plan });
  }),
);

plansRouter.delete(
  "/plans/:id/participants/:userId",
  asyncHandler(async (req, res) => {
    const plan = await plansService.removeParticipant(req.currentUser!.id, req.params.id, req.params.userId);
    res.json({ plan });
  }),
);

plansRouter.post(
  "/plans/:id/rsvp",
  asyncHandler(async (req, res) => {
    const parsed = rsvpSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.message);

    const plan = await plansService.respondToInvite(req.currentUser!.id, req.params.id, parsed.data);

    const recipientIds = plan.participants.map((p) => p.userId);
    emitToUsers(getIO(), recipientIds, SOCKET_EVENTS.PLAN_RSVP_UPDATED, {
      planId: plan.id,
      userId: req.currentUser!.id,
      status: parsed.data.status,
    });
    if (plan.type !== "goal" && (plan.status === "confirmed" || plan.status === "cancelled")) {
      emitToUsers(getIO(), recipientIds, SOCKET_EVENTS.PLAN_STATUS_CHANGED, {
        planId: plan.id,
        status: plan.status,
      });
    }

    res.json({ plan });
  }),
);
