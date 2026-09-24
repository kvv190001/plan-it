import { createAdapter } from "@socket.io/redis-adapter";
import type { Server as HttpServer } from "node:http";
import { createClient } from "redis";
import { Server } from "socket.io";
import { socketAuthMiddleware } from "./auth.js";
import { registerSocketHandlers } from "./handlers.js";
import { setIO } from "./io.js";

export async function createSocketServer(httpServer: HttpServer) {
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  const pubClient = createClient({ url: redisUrl });
  const subClient = pubClient.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]);

  const io = new Server(httpServer, {
    // TODO: restrict to the deployed frontend origin once it exists (see docs/02-architecture.md).
    cors: { origin: "*" },
  });
  io.adapter(createAdapter(pubClient, subClient));

  io.use(socketAuthMiddleware);
  io.on("connection", (socket) => {
    registerSocketHandlers(io, socket, pubClient);
  });

  setIO(io);
  return { io, pubClient, subClient };
}
