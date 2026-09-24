import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";

type CurrentUser = typeof users.$inferSelect;

declare global {
  namespace Express {
    interface Request {
      currentUser?: CurrentUser;
    }
  }
}

// Requires clerkMiddleware() earlier in the chain. Resolves the Clerk
// session to a local `users` row (populated by the /webhooks/clerk sync) and
// attaches it as req.currentUser. 401 if there's no session; 404 if the
// session is valid but the user.created webhook hasn't synced yet.
export async function requireCurrentUser(req: Request, res: Response, next: NextFunction) {
  const { userId: clerkUserId } = getAuth(req);
  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId));
  if (!user) {
    res.status(404).json({ error: "User not found locally yet" });
    return;
  }

  req.currentUser = user;
  next();
}
