import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const result = await db.execute(sql`SELECT 1 as healthy`);
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        database: result ? "connected" : "error",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        message: "Database connection failed",
      },
      { status: 500 }
    );
  }
}
