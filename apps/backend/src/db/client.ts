import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://planit:planit@localhost:5432/planit";

const queryClient = postgres(connectionString);

export const db = drizzle(queryClient, { schema });
