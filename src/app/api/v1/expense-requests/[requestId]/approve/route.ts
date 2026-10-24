import { NextRequest } from "next/server";
import { getSession } from "@/server/auth/session";
import { approveExpenseRequest } from "@/server/modules/expenses.service";
import { approveExpenseRequestSchema } from "@/server/validation";
import { apiSuccess, apiError } from "@/server/http/response";
import { AuthorizationError } from "@/server/authorization/tenant";

export async function POST(
  req: NextRequest,
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
    let approvedAmount: string | undefined;
    const rawText = await req.text();
    if (rawText && rawText.trim().length > 0) {
      const body = JSON.parse(rawText);
      const parsed = approveExpenseRequestSchema.safeParse(body);
      if (!parsed.success) {
        return apiError({
          code: "VALIDATION_ERROR",
          message: "Data persetujuan pengeluaran tidak valid.",
          errors: parsed.error.flatten().fieldErrors,
          status: 422,
        });
      }
      approvedAmount = parsed.data.approvedAmount;
    }

    const approved = await approveExpenseRequest(session.user.id, requestId, approvedAmount);
    return apiSuccess({
      data: approved,
      message: "Permintaan pengeluaran berhasil disetujui oleh Bendahara.",
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
