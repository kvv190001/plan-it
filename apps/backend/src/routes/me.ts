import { Router } from "express";
import { requireCurrentUser } from "../middleware/currentUser.js";

export const meRouter = Router();

meRouter.get("/me", requireCurrentUser, (req, res) => {
  res.json({ user: req.currentUser });
});
