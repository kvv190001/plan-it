import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { requireCurrentUser } from "../middleware/currentUser.js";
import * as notificationsService from "../services/notifications.js";

export const notificationsRouter = Router();

notificationsRouter.use(requireCurrentUser);

notificationsRouter.get(
  "/notifications/summary",
  asyncHandler(async (req, res) => {
    res.json({ summary: await notificationsService.getNotificationSummary(req.currentUser!.id) });
  }),
);

notificationsRouter.post(
  "/activity/seen",
  asyncHandler(async (req, res) => {
    await notificationsService.markActivitySeen(req.currentUser!.id);
    res.status(204).end();
  }),
);
