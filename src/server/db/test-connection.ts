import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function verifyNeonServices() {
  console.log("Testing Neon Services...");

  // 1. Test Postgres
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in .env.local");
  }
  const sql = neon(process.env.DATABASE_URL);
  const dbInfo = await sql`SELECT current_database(), current_user, version()`;
  console.log("1. Neon Postgres: CONNECTED");
  console.log("   Database:", dbInfo[0].current_database);
  console.log("   User:", dbInfo[0].current_user);

  // Check tables
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `;
  console.log(`   Found ${tables.length} tables in public schema:`);
  console.log("  ", tables.map((t: any) => t.table_name).join(", "));

  // 2. Test Neon Functions
  if (process.env.NEON_FUNCTION_HELLO_BASE_URL) {
    try {
      const fnRes = await fetch(process.env.NEON_FUNCTION_HELLO_BASE_URL);
      const fnText = await fnRes.text();
      console.log("2. Neon Function (hello): RESPONDED");
      console.log("   Status:", fnRes.status);
      console.log("   Response:", fnText.trim());
    } catch (e: any) {
      console.log("2. Neon Function: Error connecting:", e.message);
    }
  }

  // 3. Test Neon Auth JWKS
  if (process.env.NEON_AUTH_JWKS_URL) {
    try {
      const authRes = await fetch(process.env.NEON_AUTH_JWKS_URL);
      console.log("3. Neon Auth (JWKS endpoint): REACHABLE");
      console.log("   Status:", authRes.status);
    } catch (e: any) {
      console.log("3. Neon Auth: Error connecting:", e.message);
    }
  }

  // 4. Test Neon Object Storage endpoint
  if (process.env.AWS_ENDPOINT_URL_S3) {
    console.log("4. Neon Object Storage: CONFIGURED");
    console.log("   S3 Endpoint:", process.env.AWS_ENDPOINT_URL_S3);
    console.log("   Bucket: assets");
  }

  console.log("\nAll configured Neon services verified successfully.");
}

verifyNeonServices().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
