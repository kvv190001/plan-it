import { messageSendSchema, SOCKET_EVENTS, typingPayloadSchema } from "@plan-it/shared";
import type { Server, Socket } from "socket.io";
import * as conversationsService from "../services/conversations.js";
import { conversationRoom, userRoom } from "./io.js";

type PresenceClient = {
  set: (key: string, value: string, opts?: { EX?: number }) => Promise<unknown>;
  del: (key: string) => Promise<unknown>;
} | null;

// Assumes `socket.data.user` is already populated (by socketAuthMiddleware in
// production, or directly by a test harness) — kept separate from auth so
// the message/typing/presence logic can be exercised without real Clerk
// tokens.
export async function registerSocketHandlers(io: Server, socket: Socket, presenceClient: PresenceClient = null) {
  const user = socket.data.user;
  const conversationIds = await conversationsService.getUserConversationIds(user.id);

  socket.join(userRoom(user.id));
  for (const id of conversationIds) socket.join(conversationRoom(id));

  await presenceClient?.set(`presence:${user.id}`, "1", { EX: 60 });
  for (const id of conversationIds) {
    io.to(conversationRoom(id)).emit(SOCKET_EVENTS.PRESENCE_ONLINE, { userId: user.id });
  }

  socket.on(SOCKET_EVENTS.MESSAGE_SEND, async (payload: unknown) => {
    const parsed = messageSendSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit("error", { message: parsed.error.message });
      return;
    }
    try {
      const message = await conversationsService.sendMessage(user.id, parsed.data.conversationId, {
        content: parsed.data.content,
        planId: parsed.data.planId,
      });
      io.to(conversationRoom(parsed.data.conversationId)).emit(SOCKET_EVENTS.MESSAGE_NEW, { message });
    } catch (err) {
      socket.emit("error", { message: err instanceof Error ? err.message : "Failed to send message" });
    }
  });

  socket.on(SOCKET_EVENTS.TYPING_START, (payload: unknown) => {
    const parsed = typingPayloadSchema.safeParse(payload);
    if (!parsed.success) return;
    io.to(conversationRoom(parsed.data.conversationId)).emit(SOCKET_EVENTS.TYPING_UPDATE, {
      conversationId: parsed.data.conversationId,
      userId: user.id,
      isTyping: true,
    });
  });

  socket.on(SOCKET_EVENTS.TYPING_STOP, (payload: unknown) => {
    const parsed = typingPayloadSchema.safeParse(payload);
    if (!parsed.success) return;
    io.to(conversationRoom(parsed.data.conversationId)).emit(SOCKET_EVENTS.TYPING_UPDATE, {
      conversationId: parsed.data.conversationId,
      userId: user.id,
      isTyping: false,
    });
  });

  socket.on("disconnect", async () => {
    await presenceClient?.del(`presence:${user.id}`);
    for (const id of conversationIds) {
      io.to(conversationRoom(id)).emit(SOCKET_EVENTS.PRESENCE_OFFLINE, { userId: user.id });
    }
  });
}
