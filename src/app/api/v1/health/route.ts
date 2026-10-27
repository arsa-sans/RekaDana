import { db } from "@/server/db";
import { sql } from "drizzle-orm";
import { apiSuccess, apiError } from "@/server/http/response";

export async function GET() {
  try {
    const result = await db.execute(sql`SELECT 1 as healthy`);
    return apiSuccess({
      data: {
        status: "ok",
        timestamp: new Date().toISOString(),
        services: {
          database: result ? "connected" : "error",
        },
      },
      message: "Layanan sistem beroperasi normal.",
    });
  } catch {
    return apiError({
      code: "DATABASE_CONNECTION_ERROR",
      message: "Koneksi ke database gagal.",
      status: 500,
    });
  }
}
