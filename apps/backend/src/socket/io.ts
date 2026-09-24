import type { Server } from "socket.io";

let ioInstance: Server | null = null;

export function setIO(io: Server) {
  ioInstance = io;
}

// Returns null (rather than throwing) when the socket server isn't running —
// callers should treat real-time emission as best-effort, not required for
// the REST mutation itself to succeed.
export function getIO(): Server | null {
  return ioInstance;
}

export function conversationRoom(conversationId: string) {
  return `conversation:${conversationId}`;
}

export function userRoom(userId: string) {
  return `user:${userId}`;
}
