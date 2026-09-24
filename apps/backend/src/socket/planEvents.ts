import type { Server } from "socket.io";
import { userRoom } from "./io.js";

// Fans a plan-related event out to each recipient's personal `user:<id>`
// room (see docs/04-api-design.md — these are all server-initiated, pushed
// after the REST mutation that caused them).
export function emitToUsers(io: Server | null, userIds: string[], event: string, payload: unknown) {
  if (!io || userIds.length === 0) return;
  io.to(userIds.map(userRoom)).emit(event, payload);
}
