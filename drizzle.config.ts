import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  // libSQL / SQLite. Works with a local file: URL and with a hosted Turso URL.
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./famealy.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
