import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { requireBudgetVersionAccess, requireRole } from "@/server/authorization";
import { parseJsonBody, validateUuidParam } from "@/server/http/request";
import { handleBudgetVersionError } from "@/server/http/budget-error";
import { apiError, apiSuccess, formatZodErrors } from "@/server/http/response";
import { rejectBudgetVersionSchema } from "@/server/validation/budgets";
import { rejectBudgetVersion } from "@/server/modules/budgets.service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ versionId: string }> }
): Promise<Response> {
  const requestId = randomUUID();

  const authResult = await requireAuth(req, requestId);
  if (!authResult.ok) return authResult.response;

  const { versionId } = await context.params;
  const paramResult = validateUuidParam(versionId, "versi anggaran", requestId);
  if (!paramResult.ok) return paramResult.response;

  const accessResult = await requireBudgetVersionAccess(
    authResult.user.id,
    paramResult.value,
    requestId
  );
  if (!accessResult.ok) return accessResult.response;

  const roleResult = requireRole(accessResult.membership, ["bendahara"], requestId);
  if (!roleResult.ok) return roleResult.response;

  const bodyResult = await parseJsonBody(req, requestId);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = rejectBudgetVersionSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Data permintaan tidak valid.",
      422,
      formatZodErrors(parsed.error),
      requestId
    );
  }

  try {
    const updated = await rejectBudgetVersion({
      version: accessResult.version,
      event: accessResult.event,
      userId: authResult.user.id,
      reason: parsed.data.reason,
      requestId,
    });
    return apiSuccess(updated, 200, requestId);
  } catch (error) {
    return handleBudgetVersionError(error, requestId);
  }
}
