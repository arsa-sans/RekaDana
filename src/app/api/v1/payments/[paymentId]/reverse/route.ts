import { NextRequest } from "next/server";
import { getSession } from "@/server/auth/session";
import { reversePayment } from "@/server/modules/expenses.service";
import { reversePaymentSchema } from "@/server/validation";
import { apiSuccess, apiError } from "@/server/http/response";
import { AuthorizationError } from "@/server/authorization/tenant";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return apiError({
      code: "UNAUTHORIZED",
      message: "Sesi tidak ditemukan atau telah kedaluwarsa. Silakan masuk kembali.",
      status: 401,
    });
  }

  const { paymentId } = await params;

  try {
    const body = await req.json();
    const parsed = reversePaymentSchema.safeParse(body);

    if (!parsed.success) {
      return apiError({
        code: "VALIDATION_ERROR",
        message: "Data pembatalan pembayaran tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
        status: 422,
      });
    }

    const reversal = await reversePayment(session.user.id, paymentId, parsed.data);
    return apiSuccess({
      data: reversal,
      message: "Pembatalan pembayaran berhasil dibukukan dan komitmen anggaran dipulihkan.",
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
