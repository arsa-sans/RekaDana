import type { Config } from "drizzle-kit";

export default {
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Use DIRECT (unpooled) connection for migrations — pooled connections
    // can cause issues with Drizzle Kit migrations on Neon
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
} satisfies Config;
