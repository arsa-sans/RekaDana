import { NextRequest } from "next/server";
import { getSession } from "@/server/auth/session";
import { updateScenarioItem, deleteScenarioItem } from "@/server/modules/scenarios.service";
import { updateScenarioItemSchema } from "@/server/validation";
import { apiSuccess, apiError } from "@/server/http/response";
import { AuthorizationError } from "@/server/authorization/tenant";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ scenarioId: string; itemId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return apiError({
      code: "UNAUTHORIZED",
      message: "Sesi tidak ditemukan atau telah kedaluwarsa. Silakan masuk kembali.",
      status: 401,
    });
  }

  const { itemId } = await params;

  try {
    const body = await req.json();
    const parsed = updateScenarioItemSchema.safeParse(body);
    if (!parsed.success) {
      return apiError({
        code: "VALIDATION_ERROR",
        message: "Data pembaruan item skenario tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
        status: 422,
      });
    }

    const updated = await updateScenarioItem(session.user.id, itemId, parsed.data);
    return apiSuccess({
      data: updated,
      message: "Item skenario anggaran berhasil diperbarui.",
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ scenarioId: string; itemId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return apiError({
      code: "UNAUTHORIZED",
      message: "Sesi tidak ditemukan atau telah kedaluwarsa. Silakan masuk kembali.",
      status: 401,
    });
  }

  const { itemId } = await params;

  try {
    await deleteScenarioItem(session.user.id, itemId);
    return apiSuccess({
      data: null,
      message: "Item skenario anggaran berhasil dihapus.",
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
