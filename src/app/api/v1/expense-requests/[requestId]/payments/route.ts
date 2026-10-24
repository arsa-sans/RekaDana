import { NextRequest } from "next/server";
import { getSession } from "@/server/auth/session";
import { postPayment } from "@/server/modules/expenses.service";
import { postPaymentSchema } from "@/server/validation";
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
    const body = await req.json();
    const parsed = postPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return apiError({
        code: "VALIDATION_ERROR",
        message: "Data pembayaran tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
        status: 422,
      });
    }

    const result = await postPayment(session.user.id, requestId, parsed.data);
    return apiSuccess({
      data: result.payment,
      message: result.isDuplicateReplay
        ? "Pembayaran telah dicatat sebelumnya (transaksi idempotensi terdeteksi)."
        : "Pembayaran berhasil dibukukan.",
      status: result.isDuplicateReplay ? 200 : 201,
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
