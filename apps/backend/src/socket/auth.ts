import { verifyToken } from "@clerk/backend";
import { eq } from "drizzle-orm";
import type { Socket } from "socket.io";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";

export type CurrentUser = typeof users.$inferSelect;

// Handshake carries the Clerk session token the same way REST does (see
// docs/04-api-design.md), just via `socket.handshake.auth.token` instead of
// an Authorization header.
export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
) {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) throw new Error("Missing token");

    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY! });
    const [user] = await db.select().from(users).where(eq(users.clerkUserId, payload.sub));
    if (!user) throw new Error("User not found locally yet");

    socket.data.user = user;
    next();
  } catch (err) {
    next(new Error("Unauthorized"));
  }
}
