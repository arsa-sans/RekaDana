import { NextRequest } from "next/server";
import { getSession } from "@/server/auth/session";
import { rejectBudgetVersion } from "@/server/modules/budgets.service";
import { rejectReasonSchema } from "@/server/validation";
import { apiSuccess, apiError } from "@/server/http/response";
import { AuthorizationError } from "@/server/authorization/tenant";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return apiError({
      code: "UNAUTHORIZED",
      message: "Sesi tidak ditemukan atau telah kedaluwarsa. Silakan masuk kembali.",
      status: 401,
    });
  }

  const { versionId } = await params;

  try {
    const body = await req.json();
    const parsed = rejectReasonSchema.safeParse(body);

    if (!parsed.success) {
      return apiError({
        code: "VALIDATION_ERROR",
        message: "Alasan penolakan tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
        status: 422,
      });
    }

    const rejected = await rejectBudgetVersion(session.user.id, versionId, parsed.data.reason);
    return apiSuccess({
      data: rejected,
      message: "Versi anggaran berhasil ditolak.",
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
