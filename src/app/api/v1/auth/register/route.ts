import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { registerSchema } from "@/server/validation";
import { hashPassword } from "@/server/auth/passwords";
import { createSession, setSessionCookie } from "@/server/auth/session";
import { apiSuccess, apiError } from "@/server/http/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return apiError({
        code: "VALIDATION_ERROR",
        message: "Data pendaftaran tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
        status: 422,
      });
    }

    const { email, password, name } = parsed.data;

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      return apiError({
        code: "EMAIL_ALREADY_REGISTERED",
        message: "Alamat email ini sudah terdaftar. Silakan gunakan email lain atau masuk.",
        status: 409,
      });
    }

    const passwordHash = hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({
        email,
        name,
        passwordHash,
      })
      .returning({ id: users.id, email: users.email, name: users.name });

    const session = await createSession(
      user.id,
      req.headers.get("user-agent") || undefined,
      req.headers.get("x-forwarded-for") || undefined
    );

    await setSessionCookie(session.token, session.expiresAt);

    return apiSuccess({
      data: {
        user,
        token: session.token,
      },
      message: "Pendaftaran akun berhasil.",
      status: 201,
    });
  } catch (error: any) {
    return apiError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Terjadi kesalahan internal pada server.",
      status: 500,
    });
  }
}
