import { cookies } from "next/headers";
import { getSession, deleteSession, SESSION_COOKIE_NAME } from "@/server/auth/session";
import { apiSuccess } from "@/server/http/response";

export async function POST() {
  const session = await getSession();
  if (session) {
    await deleteSession(session.sessionToken);
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);

  return apiSuccess({
    data: { success: true },
    message: "Berhasil keluar.",
  });
}
