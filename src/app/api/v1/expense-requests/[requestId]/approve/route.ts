import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { requireExpenseRequestAccess, requireRole } from "@/server/authorization";
import { handleExpenseError } from "@/server/http/expense-error";
import { parseOptionalJsonBody, validateUuidParam } from "@/server/http/request";
import { apiError, apiSuccess, formatZodErrors } from "@/server/http/response";
import { approveExpenseRequest } from "@/server/modules/expenses.service";
import {
  approveExpenseRequestSchema,
  rejectInvalidAmountField,
} from "@/server/validation/expenses";

type RouteContextParams = {
  params: Promise<{ requestId: string }>;
};

export async function POST(
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

  const roleResult = requireRole(access.membership, ["bendahara"], correlationId);
  if (!roleResult.ok) return roleResult.response;

  const bodyResult = await parseOptionalJsonBody(req, correlationId);
  if (!bodyResult.ok) return bodyResult.response;

  const amountError = rejectInvalidAmountField(
    bodyResult.data,
    "approvedAmount",
    correlationId
  );
  if (amountError) return amountError;

  const parsed = approveExpenseRequestSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Data persetujuan pengeluaran tidak valid.",
      422,
      formatZodErrors(parsed.error),
      correlationId
    );
  }

  try {
    const updated = await approveExpenseRequest({
      expenseRequest: access.expenseRequest,
      event: access.event,
      userId: auth.user.id,
      approvedAmount: parsed.data.approvedAmount,
      requestId: correlationId,
    });

    return apiSuccess(updated, 200, correlationId);
  } catch (error: unknown) {
    return handleExpenseError(error, correlationId);
  }
}
