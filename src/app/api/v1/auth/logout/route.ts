import { getSession, deleteSession, clearSessionCookie } from "@/server/auth/session";
import { apiSuccess } from "@/server/http/response";

export async function POST() {
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
