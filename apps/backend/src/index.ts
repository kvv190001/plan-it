import { config } from "dotenv";
config(); // .env — non-secret local defaults (PORT, DATABASE_URL, REDIS_URL)
config({ path: ".env.local", override: true }); // .env.local — Clerk keys (gitignored)

import { createServer } from "node:http";
import { clerkMiddleware } from "@clerk/express";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { SHARED_PACKAGE_NAME } from "@plan-it/shared";
import { HttpError } from "./lib/httpError.js";
import { activityRouter } from "./routes/activity.js";
import { commentsRouter } from "./routes/comments.js";
import { conversationsRouter } from "./routes/conversations.js";
import { meRouter } from "./routes/me.js";
import { milestonesRouter } from "./routes/milestones.js";
import { plansRouter } from "./routes/plans.js";
import { usersRouter } from "./routes/users.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { createSocketServer } from "./socket/index.js";

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

// Webhook route needs the raw body for Svix signature verification, so it's
// mounted before express.json() and excluded from clerkMiddleware() (the
// webhook has its own signature-based auth, not a Clerk session token).
app.use("/webhooks/clerk", express.raw({ type: "application/json" }), webhooksRouter);

app.use(express.json());
app.use(clerkMiddleware());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", shared: SHARED_PACKAGE_NAME });
});

app.use(meRouter);
app.use(usersRouter);
app.use(plansRouter);
app.use(milestonesRouter);
app.use(commentsRouter);
app.use(conversationsRouter);
app.use(activityRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

await createSocketServer(httpServer);

httpServer.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});