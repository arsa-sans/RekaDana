import { NextRequest } from "next/server";
import { getSession } from "@/server/auth/session";
import {
  listExpenseRequests,
  createExpenseRequest,
} from "@/server/modules/expenses.service";
import { createExpenseRequestSchema } from "@/server/validation";
import { apiSuccess, apiError } from "@/server/http/response";
import { AuthorizationError } from "@/server/authorization/tenant";
import { validateOrigin } from "@/server/http/csrf";

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
  const url = req.nextUrl;
  const rawLimit = url.searchParams.get("limit");
  const rawPage = url.searchParams.get("page");

  let limit: number | undefined;
  let offset: number | undefined;

  if (rawLimit) {
    const parsedLimit = parseInt(rawLimit, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, 100);
      const page = rawPage ? Math.max(parseInt(rawPage, 10) || 1, 1) : 1;
      offset = (page - 1) * limit;
    }
  }

  try {
    const list = await listExpenseRequests(session.user.id, eventId, { limit, offset });
    return apiSuccess({ data: list });
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      return apiError({
        code: err.code,
        message: err.message,
        status: err.statusCode,
      });
    }
    return apiError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Terjadi kesalahan internal pada server.",
      status: 500,
    });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  if (!validateOrigin(req)) {
    return apiError({ code: "FORBIDDEN", message: "Origin tidak diizinkan.", status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return apiError({
      code: "UNAUTHORIZED",
      message: "Sesi tidak ditemukan atau telah kedaluwarsa. Silakan masuk kembali.",
      status: 401,
    });
  }

  const { eventId } = await params;

  try {
    const body = await req.json();
    const parsed = createExpenseRequestSchema.safeParse(body);

    if (!parsed.success) {
      return apiError({
        code: "VALIDATION_ERROR",
        message: "Data permintaan pengeluaran tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
        status: 422,
      });
    }

    const created = await createExpenseRequest(session.user.id, eventId, parsed.data);
    return apiSuccess({
      data: created,
      message: "Permintaan pengeluaran berhasil diajukan ke Bendahara.",
      status: 201,
    });
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      return apiError({
        code: err.code,
        message: err.message,
        status: err.statusCode,
      });
    }
    return apiError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Terjadi kesalahan internal pada server.",
      status: 500,
    });
  }
}
