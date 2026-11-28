import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { requirePaymentAccess, requireRole } from "@/server/authorization";
import { handleExpenseError } from "@/server/http/expense-error";
import { parseJsonBody, validateUuidParam } from "@/server/http/request";
import { apiError, apiSuccess, formatZodErrors } from "@/server/http/response";
import { reverseExpensePayment } from "@/server/modules/expenses.service";
import {
  rejectInvalidAmountField,
  reversePaymentSchema,
} from "@/server/validation/expenses";

type RouteContextParams = {
  params: Promise<{ paymentId: string }>;
};

export async function POST(
  req: NextRequest,
  context: RouteContextParams
): Promise<Response> {
  const correlationId = randomUUID();

  const auth = await requireAuth(req, correlationId);
  if (!auth.ok) return auth.response;

  const { paymentId } = await context.params;
  const paramValidation = validateUuidParam(paymentId, "pembayaran", correlationId);
  if (!paramValidation.ok) return paramValidation.response;

  const access = await requirePaymentAccess(
    auth.user.id,
    paramValidation.value,
    correlationId
  );
  if (!access.ok) return access.response;

  const roleResult = requireRole(access.membership, ["bendahara"], correlationId);
  if (!roleResult.ok) return roleResult.response;

  const bodyResult = await parseJsonBody(req, correlationId);
  if (!bodyResult.ok) return bodyResult.response;

  const amountError = rejectInvalidAmountField(
    bodyResult.data,
    "amount",
    correlationId
  );
  if (amountError) return amountError;

  const parsed = reversePaymentSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Data pembatalan pembayaran tidak valid.",
      422,
      formatZodErrors(parsed.error),
      correlationId
    );
  }

  try {
    const result = await reverseExpensePayment({
      payment: access.payment,
      expenseRequest: access.expenseRequest,
      event: access.event,
      userId: auth.user.id,
      amount: parsed.data.amount,
      reason: parsed.data.reason,
      requestId: correlationId,
    });

    return apiSuccess(result, 200, correlationId);
  } catch (error: unknown) {
    return handleExpenseError(error, correlationId);
  }
}
