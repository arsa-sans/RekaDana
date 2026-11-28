import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { requireBudgetVersionAccess } from "@/server/authorization";
import { validateUuidParam } from "@/server/http/request";
import { handleBudgetVersionError } from "@/server/http/budget-error";
import { apiSuccess } from "@/server/http/response";
import { getBudgetVersionDetail } from "@/server/modules/budgets.service";

export async function GET(
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

  try {
    const detail = await getBudgetVersionDetail({ version: accessResult.version });
    return apiSuccess(detail, 200, requestId);
  } catch (error) {
    return handleBudgetVersionError(error, requestId);
  }
}
