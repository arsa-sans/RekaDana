import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { requireExpenseRequestAccess } from "@/server/authorization";
import { handleExpenseError } from "@/server/http/expense-error";
import { validateUuidParam } from "@/server/http/request";
import { apiSuccess } from "@/server/http/response";
import { getExpenseRequestDetail } from "@/server/modules/expenses.service";

type RouteContextParams = {
  params: Promise<{ requestId: string }>;
};

export async function GET(
  req: NextRequest,
  context: RouteContextParams
): Promise<Response> {
  const correlationId = randomUUID();

  const auth = await requireAuth(req, correlationId);
  if (!auth.ok) return auth.response;

  const { requestId } = await context.params;
  const paramValidation = validateUuidParam(
    requestId,
    "permintaan pengeluaran",
    correlationId
  );
  if (!paramValidation.ok) return paramValidation.response;

  const access = await requireExpenseRequestAccess(
    auth.user.id,
    paramValidation.value,
    correlationId
  );
  if (!access.ok) return access.response;

  try {
    const detail = await getExpenseRequestDetail({
      expenseRequest: access.expenseRequest,
    });

    return apiSuccess(detail, 200, correlationId);
  } catch (error: unknown) {
    return handleExpenseError(error, correlationId);
  }
}
