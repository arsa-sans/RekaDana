import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load .env.local for drizzle-kit CLI
dotenv.config({ path: ".env.local" });

export default {
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Neon best practice: Use unpooled direct connection for migrations/schema push
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!,
  },
} satisfies Config;
