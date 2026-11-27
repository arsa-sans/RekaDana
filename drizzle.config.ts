import { defineConfig } from "drizzle-kit";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./src/server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Unpooled connection avoids PgBouncer transaction-mode issues during migrations.
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "",
  },
  verbose: true,
  strict: true,
});
