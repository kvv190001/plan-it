import {
  createConversationSchema,
  listMessagesQuerySchema,
  sendMessageSchema,
  SOCKET_EVENTS,
} from "@plan-it/shared";
import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../lib/httpError.js";
import { requireCurrentUser } from "../middleware/currentUser.js";
import * as conversationsService from "../services/conversations.js";
import { conversationRoom, getIO } from "../socket/io.js";

export const conversationsRouter = Router();

conversationsRouter.use(requireCurrentUser);

conversationsRouter.get(
  "/conversations",
  asyncHandler(async (req, res) => {
    const conversations = await conversationsService.listConversations(req.currentUser!.id);
    res.json({ conversations });
  }),
);

conversationsRouter.post(
  "/conversations",
  asyncHandler(async (req, res) => {
    const parsed = createConversationSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.message);

    const conversation = await conversationsService.createConversation(req.currentUser!.id, parsed.data);
    res.status(201).json({ conversation });
  }),
);

conversationsRouter.get(
  "/conversations/:id/messages",
  asyncHandler(async (req, res) => {
    const parsed = listMessagesQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new HttpError(400, parsed.error.message);

    const messages = await conversationsService.listMessages(req.currentUser!.id, req.params.id, parsed.data);
    res.json({ messages });
  }),
);

conversationsRouter.post(
  "/conversations/:id/messages",
  asyncHandler(async (req, res) => {
    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.message);

    const message = await conversationsService.sendMessage(req.currentUser!.id, req.params.id, parsed.data);
    getIO()?.to(conversationRoom(req.params.id)).emit(SOCKET_EVENTS.MESSAGE_NEW, { message });
    res.status(201).json({ message });
  }),
);
