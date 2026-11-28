import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { requireEventAccess } from "@/server/authorization";
import { handleExpenseError } from "@/server/http/expense-error";
import { parseJsonBody, validateUuidParam } from "@/server/http/request";
import {
  apiError,
  apiPaginated,
  apiSuccess,
  formatZodErrors,
} from "@/server/http/response";
import {
  createExpenseRequest,
  listEventExpenseRequests,
} from "@/server/modules/expenses.service";
import {
  createExpenseRequestSchema,
  listExpenseRequestsQuerySchema,
  rejectInvalidAmountField,
} from "@/server/validation/expenses";

type RouteContextParams = {
  params: Promise<{ eventId: string }>;
};

export async function GET(
  req: NextRequest,
  context: RouteContextParams
): Promise<Response> {
  const requestId = randomUUID();

  const auth = await requireAuth(req, requestId);
  if (!auth.ok) return auth.response;

  const { eventId } = await context.params;
  const eventIdValidation = validateUuidParam(eventId, "kegiatan", requestId);
  if (!eventIdValidation.ok) return eventIdValidation.response;

  const access = await requireEventAccess(
    auth.user.id,
    eventIdValidation.value,
    requestId
  );
  if (!access.ok) return access.response;

  const sp = req.nextUrl.searchParams;
  const parsedQuery = listExpenseRequestsQuerySchema.safeParse({
    page: sp.get("page") ?? undefined,
    limit: sp.get("limit") ?? undefined,
    offset: sp.get("offset") ?? undefined,
    status: sp.get("status") ?? undefined,
  });

  if (!parsedQuery.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Parameter kueri daftar pengeluaran tidak valid.",
      422,
      formatZodErrors(parsedQuery.error),
      requestId
    );
  }

  try {
    const result = await listEventExpenseRequests({
      event: access.event,
      page: parsedQuery.data.page ?? 1,
      limit: parsedQuery.data.limit,
      offset: parsedQuery.data.offset,
      status: parsedQuery.data.status,
    });

    return apiPaginated(result.items, result.pagination, 200, requestId);
  } catch (error: unknown) {
    return handleExpenseError(error, requestId);
  }
}

export async function POST(
  req: NextRequest,
  context: RouteContextParams
): Promise<Response> {
  const requestId = randomUUID();

  const auth = await requireAuth(req, requestId);
  if (!auth.ok) return auth.response;

  const { eventId } = await context.params;
  const eventIdValidation = validateUuidParam(eventId, "kegiatan", requestId);
  if (!eventIdValidation.ok) return eventIdValidation.response;

  const access = await requireEventAccess(
    auth.user.id,
    eventIdValidation.value,
    requestId
  );
  if (!access.ok) return access.response;

  const bodyResult = await parseJsonBody(req, requestId);
  if (!bodyResult.ok) return bodyResult.response;

  const amountError = rejectInvalidAmountField(
    bodyResult.data,
    "requestedAmount",
    requestId
  );
  if (amountError) return amountError;

  const parsed = createExpenseRequestSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Data pengajuan pengeluaran tidak valid.",
      422,
      formatZodErrors(parsed.error),
      requestId
    );
  }

  try {
    const created = await createExpenseRequest({
      event: access.event,
      userId: auth.user.id,
      input: parsed.data,
      requestId,
    });

    return apiSuccess(created, 201, requestId);
  } catch (error: unknown) {
    return handleExpenseError(error, requestId);
  }
}
