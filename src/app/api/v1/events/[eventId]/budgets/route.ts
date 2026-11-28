import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { requireEventAccess } from "@/server/authorization";
import { validateUuidParam } from "@/server/http/request";
import { handleBudgetVersionError } from "@/server/http/budget-error";
import { apiSuccess } from "@/server/http/response";
import { listEventBudgetVersions } from "@/server/modules/budgets.service";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
): Promise<Response> {
  const requestId = randomUUID();

  const authResult = await requireAuth(req, requestId);
  if (!authResult.ok) return authResult.response;

  const { eventId } = await context.params;
  const paramResult = validateUuidParam(eventId, "kegiatan", requestId);
  if (!paramResult.ok) return paramResult.response;

  const accessResult = await requireEventAccess(authResult.user.id, paramResult.value, requestId);
  if (!accessResult.ok) return accessResult.response;

  try {
    const versions = await listEventBudgetVersions({ event: accessResult.event });
    return apiSuccess(versions, 200, requestId);
  } catch (error) {
    return handleBudgetVersionError(error, requestId);
  }
}
