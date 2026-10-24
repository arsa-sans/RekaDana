import { NextRequest } from "next/server";
import { getSession } from "@/server/auth/session";
import { approveBudgetVersion } from "@/server/modules/budgets.service";
import { apiSuccess, apiError } from "@/server/http/response";
import { AuthorizationError } from "@/server/authorization/tenant";

export async function POST(
  _req: NextRequest,
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
    const approved = await approveBudgetVersion(session.user.id, versionId);
    return apiSuccess({
      data: approved,
      message: "Versi anggaran berhasil disetujui dan diaktifkan sebagai anggaran resmi.",
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
