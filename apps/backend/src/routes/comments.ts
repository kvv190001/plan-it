import { createCommentSchema, SOCKET_EVENTS } from "@plan-it/shared";
import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../lib/httpError.js";
import { requireCurrentUser } from "../middleware/currentUser.js";
import * as commentsService from "../services/comments.js";
import { getIO } from "../socket/io.js";
import { emitToUsers } from "../socket/planEvents.js";

export const commentsRouter = Router();

commentsRouter.use(requireCurrentUser);

commentsRouter.get(
  "/plans/:id/comments",
  asyncHandler(async (req, res) => {
    const comments = await commentsService.listComments(req.currentUser!.id, req.params.id);
    res.json({ comments });
  }),
);

commentsRouter.post(
  "/plans/:id/comments",
  asyncHandler(async (req, res) => {
    const parsed = createCommentSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.message);

    const { comment, recipientIds } = await commentsService.addComment(
      req.currentUser!.id,
      req.params.id,
      parsed.data,
    );

    emitToUsers(getIO(), recipientIds, SOCKET_EVENTS.PLAN_COMMENT_POSTED, {
      planId: req.params.id,
      comment,
    });

    res.status(201).json({ comment });
  }),
);
