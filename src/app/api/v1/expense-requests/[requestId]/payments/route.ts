import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { requireExpenseRequestAccess, requireRole } from "@/server/authorization";
import { handleExpenseError } from "@/server/http/expense-error";
import { parseJsonBody, validateUuidParam } from "@/server/http/request";
import { apiError, apiSuccess, formatZodErrors } from "@/server/http/response";
import { postExpensePayment } from "@/server/modules/expenses.service";
import {
  postPaymentSchema,
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

  const bodyResult = await parseJsonBody(req, correlationId);
  if (!bodyResult.ok) return bodyResult.response;

  const headerKey = req.headers.get("idempotency-key")?.trim();
  let candidateBody: unknown = bodyResult.data;

  if (
    typeof candidateBody === "object" &&
    candidateBody !== null &&
    !Array.isArray(candidateBody)
  ) {
    const record = candidateBody as Record<string, unknown>;
    const bodyKey =
      typeof record.idempotencyKey === "string" ? record.idempotencyKey.trim() : undefined;

    if (bodyKey && headerKey && bodyKey !== headerKey) {
      return apiError(
        "VALIDATION_ERROR",
        "Kunci idempotensi pada header dan body tidak cocok.",
        422,
        { idempotencyKey: ["Nilai header Idempotency-Key dan body harus sama."] },
        correlationId
      );
    }

    if (record.idempotencyKey === undefined && headerKey) {
      candidateBody = { ...record, idempotencyKey: headerKey };
    }
  }

  const amountError = rejectInvalidAmountField(candidateBody, "amount", correlationId);
  if (amountError) return amountError;

  const parsed = postPaymentSchema.safeParse(candidateBody);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Data pencatatan pembayaran tidak valid.",
      422,
      formatZodErrors(parsed.error),
      correlationId
    );
  }

  try {
    const result = await postExpensePayment({
      expenseRequest: access.expenseRequest,
      event: access.event,
      userId: auth.user.id,
      input: parsed.data,
      requestId: correlationId,
    });

    return apiSuccess(result.data, result.statusCode, correlationId);
  } catch (error: unknown) {
    return handleExpenseError(error, correlationId);
  }
}
