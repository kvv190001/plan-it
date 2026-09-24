import { createMilestoneSchema, SOCKET_EVENTS, updateMilestoneSchema } from "@plan-it/shared";
import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../lib/httpError.js";
import { requireCurrentUser } from "../middleware/currentUser.js";
import * as milestonesService from "../services/milestones.js";
import { getIO } from "../socket/io.js";
import { emitToUsers } from "../socket/planEvents.js";

export const milestonesRouter = Router();

milestonesRouter.use(requireCurrentUser);

milestonesRouter.post(
  "/plans/:id/milestones",
  asyncHandler(async (req, res) => {
    const parsed = createMilestoneSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.message);

    const plan = await milestonesService.addMilestone(req.currentUser!.id, req.params.id, parsed.data);
    res.status(201).json({ plan });
  }),
);

milestonesRouter.patch(
  "/plans/:id/milestones/:milestoneId",
  asyncHandler(async (req, res) => {
    const parsed = updateMilestoneSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.message);

    const { plan, justCompleted, recipientIds } = await milestonesService.updateMilestone(
      req.currentUser!.id,
      req.params.id,
      req.params.milestoneId,
      parsed.data,
    );

    if (justCompleted) {
      emitToUsers(getIO(), recipientIds, SOCKET_EVENTS.PLAN_MILESTONE_COMPLETED, {
        planId: req.params.id,
        milestoneId: req.params.milestoneId,
      });
    }

    res.json({ plan });
  }),
);

milestonesRouter.delete(
  "/plans/:id/milestones/:milestoneId",
  asyncHandler(async (req, res) => {
    const plan = await milestonesService.removeMilestone(
      req.currentUser!.id,
      req.params.id,
      req.params.milestoneId,
    );
    res.json({ plan });
  }),
);
