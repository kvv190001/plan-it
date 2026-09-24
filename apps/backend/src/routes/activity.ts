import { listActivityQuerySchema } from "@plan-it/shared";
import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../lib/httpError.js";
import { requireCurrentUser } from "../middleware/currentUser.js";
import * as activityService from "../services/activity.js";

export const activityRouter = Router();

activityRouter.use(requireCurrentUser);

activityRouter.get(
  "/activity",
  asyncHandler(async (req, res) => {
    const parsed = listActivityQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new HttpError(400, parsed.error.message);

    const events = await activityService.listActivity(req.currentUser!.id, parsed.data);
    res.json({ events });
  }),
);
