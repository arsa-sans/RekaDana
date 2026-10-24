import { NextRequest } from "next/server";
import { getSession } from "@/server/auth/session";
import { submitScenarioAsBudget } from "@/server/modules/scenarios.service";
import { apiSuccess, apiError } from "@/server/http/response";
import { AuthorizationError } from "@/server/authorization/tenant";

export async function POST(
  _req: NextRequest,
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
    const budgetVersion = await submitScenarioAsBudget(session.user.id, scenarioId);
    return apiSuccess({
      data: budgetVersion,
      message: "Skenario berhasil dibekukan dan diajukan ke Bendahara sebagai versi anggaran resmi.",
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
