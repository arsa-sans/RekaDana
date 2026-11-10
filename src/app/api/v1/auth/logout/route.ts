import { NextRequest } from "next/server";
import { getSession, deleteSession, clearSessionCookie } from "@/server/auth/session";
import { apiSuccess, apiError } from "@/server/http/response";
import { validateOrigin } from "@/server/http/csrf";

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return apiError({ code: "FORBIDDEN", message: "Origin tidak diizinkan.", status: 403 });
  }

  const session = await getSession();
  if (session) {
    await deleteSession(session.sessionToken);
  }

  await clearSessionCookie();

  return apiSuccess({
    data: { success: true },
    message: "Berhasil keluar.",
  });
}
