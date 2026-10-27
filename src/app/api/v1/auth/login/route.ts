import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { loginSchema } from "@/server/validation";
import { verifyPassword } from "@/server/auth/passwords";
import { createSession, setSessionCookie } from "@/server/auth/session";
import { apiSuccess, apiError } from "@/server/http/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return apiError({
        code: "VALIDATION_ERROR",
        message: "Format email atau kata sandi tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
        status: 422,
      });
    }

    const { email, password } = parsed.data;

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        passwordHash: users.passwordHash,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.passwordHash || !user.isActive) {
      return apiError({
        code: "INVALID_CREDENTIALS",
        message: "Email atau kata sandi yang Anda masukkan salah.",
        status: 401,
      });
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return apiError({
        code: "INVALID_CREDENTIALS",
        message: "Email atau kata sandi yang Anda masukkan salah.",
        status: 401,
      });
    }

    const session = await createSession(
      user.id,
      req.headers.get("user-agent") || undefined,
      req.headers.get("x-forwarded-for") || undefined
    );

    await setSessionCookie(session.token, session.expiresAt);

    return apiSuccess({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token: session.token,
      },
      message: "Berhasil masuk.",
    });
  } catch (error) {
    return apiError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Terjadi kesalahan internal pada server.",
      status: 500,
    });
  }
}
