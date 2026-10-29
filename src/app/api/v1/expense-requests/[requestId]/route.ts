import { NextRequest } from "next/server";
import { getSession } from "@/server/auth/session";
import { getExpenseRequestDetail } from "@/server/modules/expenses.service";
import { apiSuccess, apiError } from "@/server/http/response";
import { AuthorizationError } from "@/server/authorization/tenant";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return apiError({
      code: "UNAUTHORIZED",
      message: "Sesi tidak ditemukan atau telah kedaluwarsa. Silakan masuk kembali.",
      status: 401,
    });
  }

  const { requestId } = await params;

  try {
    const detail = await getExpenseRequestDetail(session.user.id, requestId);
    return apiSuccess({ data: detail });
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
