import { NextRequest } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/server/db";
import { auditLogs, users } from "@/server/db/schema";
import { getSession } from "@/server/auth/session";
import { requireEventAccess } from "@/server/authorization/tenant";
import { apiSuccess, apiError } from "@/server/http/response";
import { AuthorizationError } from "@/server/authorization/tenant";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return apiError({
      code: "UNAUTHORIZED",
      message: "Sesi tidak ditemukan atau telah kedaluwarsa. Silakan masuk kembali.",
      status: 401,
    });
  }

  const { eventId } = await params;

  let organizationId: string;
  try {
    const { event } = await requireEventAccess(session.user.id, eventId);
    organizationId = event.organizationId;
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      return apiError({ code: err.code, message: err.message, status: err.statusCode });
    }
    return apiError({ code: "INTERNAL_SERVER_ERROR", message: "Terjadi kesalahan internal.", status: 500 });
  }

  const url = req.nextUrl;
  const rawLimit = parseInt(url.searchParams.get("limit") ?? String(DEFAULT_LIMIT));
  const limit = isNaN(rawLimit) ? DEFAULT_LIMIT : Math.min(Math.max(rawLimit, 1), MAX_LIMIT);
  const objectType = url.searchParams.get("objectType") ?? undefined;

  // Collect audit logs scoped to this organization; server filters event-level objects client-side
  // because objectId is a free-form text that may hold any entity id.
  const rows = await db
    .select({
      id: auditLogs.id,
      actorId: auditLogs.actorId,
      action: auditLogs.action,
      objectType: auditLogs.objectType,
      objectId: auditLogs.objectId,
      afterState: auditLogs.afterState,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.organizationId, organizationId),
        ...(objectType ? [eq(auditLogs.objectType, objectType)] : [])
      )
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  // Resolve actor names in bulk using inArray
  const actorIds = [...new Set(rows.map((r) => r.actorId).filter(Boolean))] as string[];
  const actorMap = new Map<string, string>();
  if (actorIds.length > 0) {
    const { inArray } = await import("drizzle-orm");
    const actorRows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, actorIds));
    for (const u of actorRows) actorMap.set(u.id, u.name);
  }

  const data = rows.map((row) => ({
    id: row.id,
    actorId: row.actorId,
    actorName: row.actorId ? (actorMap.get(row.actorId) ?? "Sistem") : "Sistem",
    action: row.action,
    objectType: row.objectType,
    objectId: row.objectId,
    afterState: row.afterState ? JSON.parse(row.afterState) : null,
    createdAt: row.createdAt,
  }));

  return apiSuccess({ data });
}
