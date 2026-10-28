import { NextRequest } from "next/server";
import { getSession } from "@/server/auth/session";
import { archiveScenario } from "@/server/modules/scenarios.service";
import { apiSuccess, apiError } from "@/server/http/response";
import { AuthorizationError } from "@/server/authorization/tenant";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ scenarioId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return apiError({
      code: "UNAUTHORIZED",
      message: "Sesi tidak ditemukan atau telah kedaluwarsa. Silakan masuk kembali.",
      status: 401,
    });
  }

  const { scenarioId } = await params;

  try {
    const body = await req.json();

    if (body.action === "archive") {
      const scenario = await archiveScenario(session.user.id, scenarioId);
      return apiSuccess({
        data: scenario,
        message: "Skenario anggaran berhasil diarsipkan.",
      });
    }

    return apiError({
      code: "INVALID_ACTION",
      message: "Aksi yang diminta tidak valid atau tidak didukung.",
      status: 400,
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
