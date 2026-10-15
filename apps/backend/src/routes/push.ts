import { pushSubscriptionSchema, pushUnsubscribeSchema } from "@plan-it/shared";
import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../lib/httpError.js";
import { requireCurrentUser } from "../middleware/currentUser.js";
import * as pushService from "../services/push.js";

export const pushRouter = Router();

pushRouter.use(requireCurrentUser);

pushRouter.get("/push/public-key", (_req, res) => {
  res.json({ publicKey: pushService.getVapidPublicKey() });
});

pushRouter.post(
  "/push/subscribe",
  asyncHandler(async (req, res) => {
    const parsed = pushSubscriptionSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.message);
    await pushService.saveSubscription(req.currentUser!.id, parsed.data);
    res.status(204).end();
  }),
);

pushRouter.post(
  "/push/unsubscribe",
  asyncHandler(async (req, res) => {
    const parsed = pushUnsubscribeSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.message);
    await pushService.removeSubscription(parsed.data.endpoint);
    res.status(204).end();
  }),
);
