import { NextRequest } from "next/server";
import { getSession } from "@/server/auth/session";
import { uploadEvidenceFile } from "@/server/storage/evidence.service";
import { apiSuccess, apiError } from "@/server/http/response";
import { AuthorizationError } from "@/server/authorization/tenant";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return apiError({
      code: "UNAUTHORIZED",
      message: "Sesi tidak ditemukan atau telah kedaluwarsa. Silakan masuk kembali.",
      status: 401,
    });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const organizationId = formData.get("organizationId") as string | null;
    const paymentId = formData.get("paymentId") as string | null;
    const expenseRequestId = formData.get("expenseRequestId") as string | null;

    if (!file) {
      return apiError({
        code: "FILE_REQUIRED",
        message: "File bukti transaksi wajib dilampirkan.",
        status: 422,
      });
    }

    if (!organizationId) {
      return apiError({
        code: "ORGANIZATION_ID_REQUIRED",
        message: "ID organisasi (organizationId) wajib disertakan.",
        status: 422,
      });
    }

    const evidence = await uploadEvidenceFile(session.user.id, organizationId, file, {
      paymentId: paymentId || undefined,
      expenseRequestId: expenseRequestId || undefined,
    });

    return apiSuccess({
      data: evidence,
      message: "File bukti transaksi berhasil diunggah dan diverifikasi keasliannya.",
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
      message: "Terjadi kesalahan internal saat mengunggah bukti.",
      status: 500,
    });
  }
}
