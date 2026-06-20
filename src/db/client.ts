import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "./schema";

/**
 * Drizzle client over the Neon serverless WebSocket driver. The WebSocket
 * driver (not neon-http) preserves transactions, which plan generation (U15)
 * and shopping-list aggregation (U18) rely on.
 *
 * Lazy, module-scoped singleton: the Pool is created once and reused across
 * serverless invocations. Construction is deferred so importing the schema or
 * pure helpers never requires DATABASE_URL to be set (tests stay offline).
 */
function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  // Vercel's serverless runtime provides a global WebSocket; Node (local dev,
  // migrations) does not, so supply one.
  if (typeof WebSocket === "undefined") {
    neonConfig.webSocketConstructor = ws;
  }
  const pool = new Pool({ connectionString });
  return drizzle(pool, { schema });
}

let _db: ReturnType<typeof createDb> | undefined;

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}
