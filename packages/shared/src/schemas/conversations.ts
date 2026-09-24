import { z } from "zod";

export const conversationTypeSchema = z.enum(["direct", "group"]);

export const createConversationSchema = z.object({
  type: conversationTypeSchema,
  participantIds: z.array(z.string().uuid()).min(1),
  title: z.string().min(1).max(200).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  planId: z.string().uuid().optional(),
});

export const listMessagesQuerySchema = z.object({
  before: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
