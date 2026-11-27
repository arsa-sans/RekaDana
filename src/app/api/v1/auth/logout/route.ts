import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { requireAuth, revokeSessionByToken } from "@/server/auth/session";
import { apiError, apiSuccess } from "@/server/http/response";

export async function POST(req: NextRequest) {
  const requestId = randomUUID();

  const auth = await requireAuth(req, requestId);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    await revokeSessionByToken(auth.token);
    return apiSuccess({ message: "Berhasil keluar." }, 200, requestId);
  } catch {
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Terjadi kesalahan internal pada server.",
      500,
      {},
      requestId
    );
  }
}
