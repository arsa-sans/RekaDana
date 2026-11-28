import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { memberships, organizations } from "@/server/db/schema";
import { requireAuth } from "@/server/auth/session";
import { apiError, apiSuccess } from "@/server/http/response";

export async function GET(req: NextRequest) {
  const requestId = randomUUID();

  const auth = await requireAuth(req, requestId);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const userMemberships = await db
      .select({
        orgId: organizations.id,
        orgName: organizations.name,
        role: memberships.role,
      })
      .from(memberships)
      .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
      .where(
        and(
          eq(memberships.userId, auth.user.id),
          eq(memberships.isActive, true),
          eq(organizations.isActive, true)
        )
      );

    return apiSuccess(
      {
        user: auth.user,
        memberships: userMemberships,
      },
      200,
      requestId
    );
  } catch {
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Terjadi kesalahan internal pada server.",
      500,
      {},
      requestId
    );
  }
}
