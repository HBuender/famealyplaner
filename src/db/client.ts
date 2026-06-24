import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

/**
 * Drizzle client over libSQL. Driven by DATABASE_URL:
 *   - local dev:  file:./famealy.db  (a local SQLite file — "the beginning")
 *   - hosted:     libsql://<db>.turso.io  + DATABASE_AUTH_TOKEN  (zero code change)
 *
 * Lazy, module-scoped singleton so importing the schema or pure helpers never
 * requires DATABASE_URL to be set (tests stay offline).
 */
function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set (e.g. file:./famealy.db)");
  }
  const client = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN, // undefined for local file
  });
  return drizzle(client, { schema });
}

let _db: ReturnType<typeof createDb> | undefined;

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}
