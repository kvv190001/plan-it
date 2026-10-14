import { SOCKET_EVENTS, sendFriendRequestSchema } from "@plan-it/shared";
import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../lib/httpError.js";
import { requireCurrentUser } from "../middleware/currentUser.js";
import * as friendsService from "../services/friends.js";
import { getIO } from "../socket/io.js";
import { emitToUsers } from "../socket/planEvents.js";

export const friendsRouter = Router();

friendsRouter.use(requireCurrentUser);

friendsRouter.get(
  "/friends",
  asyncHandler(async (req, res) => {
    res.json({ friends: await friendsService.listFriends(req.currentUser!.id) });
  }),
);

friendsRouter.get(
  "/friends/code",
  asyncHandler(async (req, res) => {
    res.json({ friendCode: await friendsService.getFriendCode(req.currentUser!.id) });
  }),
);

friendsRouter.post(
  "/friends/code/regenerate",
  asyncHandler(async (req, res) => {
    res.json({ friendCode: await friendsService.regenerateFriendCode(req.currentUser!.id) });
  }),
);

friendsRouter.get(
  "/friends/requests",
  asyncHandler(async (req, res) => {
    res.json(await friendsService.listRequests(req.currentUser!.id));
  }),
);

friendsRouter.post(
  "/friends/requests",
  asyncHandler(async (req, res) => {
    const parsed = sendFriendRequestSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.message);

    const me = req.currentUser!.id;
    const result = await friendsService.sendRequest(me, parsed.data.friendCode);
    emitToUsers(
      getIO(),
      [result.otherUserId],
      result.status === "accepted" ? SOCKET_EVENTS.FRIEND_REQUEST_ACCEPTED : SOCKET_EVENTS.FRIEND_REQUEST_RECEIVED,
      { userId: me },
    );
    res.status(201).json({ status: result.status });
  }),
);

friendsRouter.post(
  "/friends/requests/:id/accept",
  asyncHandler(async (req, res) => {
    const me = req.currentUser!.id;
    const requesterId = await friendsService.acceptRequest(me, req.params.id);
    emitToUsers(getIO(), [requesterId], SOCKET_EVENTS.FRIEND_REQUEST_ACCEPTED, { userId: me });
    res.json({ status: "accepted" });
  }),
);

friendsRouter.post(
  "/friends/requests/:id/decline",
  asyncHandler(async (req, res) => {
    const me = req.currentUser!.id;
    const otherId = await friendsService.removeRequest(me, req.params.id);
    emitToUsers(getIO(), [otherId], SOCKET_EVENTS.FRIEND_REMOVED, { userId: me });
    res.json({ status: "removed" });
  }),
);

friendsRouter.delete(
  "/friends/:userId",
  asyncHandler(async (req, res) => {
    const me = req.currentUser!.id;
    await friendsService.unfriend(me, req.params.userId);
    emitToUsers(getIO(), [req.params.userId], SOCKET_EVENTS.FRIEND_REMOVED, { userId: me });
    res.status(204).end();
  }),
);
