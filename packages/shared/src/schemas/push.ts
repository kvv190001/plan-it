import { z } from "zod";

// Shape of PushSubscription.toJSON() from the browser.
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export const pushUnsubscribeSchema = z.object({ endpoint: z.string().url() });

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
  badge?: number;
}
