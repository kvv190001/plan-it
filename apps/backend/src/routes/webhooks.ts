import { verifyWebhook } from "@clerk/express/webhooks";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";

export const webhooksRouter = Router();

webhooksRouter.post("/", async (req, res) => {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("Clerk webhook verification failed:", err);
    res.status(400).send("Verification failed");
    return;
  }

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const { id, first_name, last_name, image_url } = evt.data;
    const displayName = `${first_name ?? ""} ${last_name ?? ""}`.trim() || "Unnamed";

    await db
      .insert(users)
      .values({ clerkUserId: id, displayName, avatarUrl: image_url ?? null })
      .onConflictDoUpdate({
        target: users.clerkUserId,
        set: { displayName, avatarUrl: image_url ?? null },
      });
  }

  if (evt.type === "user.deleted" && evt.data.id) {
    await db.delete(users).where(eq(users.clerkUserId, evt.data.id));
  }

  res.status(200).send("OK");
});
