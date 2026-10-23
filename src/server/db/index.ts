/**
 * Database connection module — SERVER ONLY
 * Do NOT import this in Client Components or expose to browser.
 *
 * Uses @neondatabase/serverless (HTTP/WebSocket transport) which is
 * compatible with Next.js App Router, Edge Runtime, and Serverless Functions.
 *
 * For Drizzle Kit migrations, use DATABASE_URL_UNPOOLED (direct connection).
 * For app queries, use DATABASE_URL (pooled via PgBouncer).
 */
import "server-only";

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Run `neon deploy` to provision services and pull env vars."
  );
}

// Use pooled connection for app queries
const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });
export type Database = typeof db;
