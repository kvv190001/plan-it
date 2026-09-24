import { z } from "zod";

// Event names + payload contracts shared by both apps (see docs/04-api-design.md).
// Client -> server payloads are validated with the zod schemas below; server ->
// client payloads are produced by the backend and typed but not re-validated.

export const SOCKET_EVENTS = {
  MESSAGE_SEND: "message:send",
  MESSAGE_NEW: "message:new",
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",
  TYPING_UPDATE: "typing:update",
  PRESENCE_ONLINE: "presence:online",
  PRESENCE_OFFLINE: "presence:offline",
  PLAN_INVITED: "plan:invited",
  PLAN_RSVP_UPDATED: "plan:rsvp_updated",
  PLAN_STATUS_CHANGED: "plan:status_changed",
  PLAN_MILESTONE_COMPLETED: "plan:milestone_completed",
  PLAN_COMMENT_POSTED: "plan:comment_posted",
} as const;

// client -> server
export const messageSendSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(4000),
  planId: z.string().uuid().optional(),
});
export type MessageSendPayload = z.infer<typeof messageSendSchema>;

export const typingPayloadSchema = z.object({
  conversationId: z.string().uuid(),
});
export type TypingPayload = z.infer<typeof typingPayloadSchema>;

// server -> client
export interface MessageNewPayload {
  message: unknown;
}

export interface TypingUpdatePayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface PresencePayload {
  userId: string;
}

export interface PlanInvitedPayload {
  plan: unknown;
}

export interface PlanRsvpUpdatedPayload {
  planId: string;
  userId: string;
  status: string;
}

export interface PlanStatusChangedPayload {
  planId: string;
  status: string;
}

export interface PlanMilestoneCompletedPayload {
  planId: string;
  milestoneId: string;
}

export interface PlanCommentPostedPayload {
  planId: string;
  comment: unknown;
}
