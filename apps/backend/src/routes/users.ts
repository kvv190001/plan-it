import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { HttpError } from "../lib/httpError.js";
import { requireCurrentUser } from "../middleware/currentUser.js";
import * as usersService from "../services/users.js";

export const usersRouter = Router();

usersRouter.use(requireCurrentUser);

// GET /users?ids=id1,id2,...  batched public-profile lookup, used to hydrate
// participant/author names+avatars in chat, plan, and comment views.
// GET /users?q=name                 search by display name, used to find
// people to start a chat with or invite to a plan (excludes the requester).
usersRouter.get(
  "/users",
  asyncHandler(async (req, res) => {
    if (typeof req.query.q === "string" && req.query.q.trim().length > 0) {
      const results = await usersService.searchUsers(req.query.q.trim(), req.currentUser!.id);
      res.json({ users: results });
      return;
    }

    const idsParam = typeof req.query.ids === "string" ? req.query.ids : "";
    const ids = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const results = await usersService.listUsersByIds(ids);
    res.json({ users: results });
  }),
);

usersRouter.get(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const user = await usersService.getUserById(req.params.id);
    if (!user) throw new HttpError(404, "User not found");
    res.json({ user });
  }),
);
