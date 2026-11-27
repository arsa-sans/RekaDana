import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { burnDummyPasswordVerify, verifyPassword } from "@/server/auth/password";
import { createSession, deleteExpiredSessions } from "@/server/auth/session";
import { checkRateLimit, getClientIp } from "@/server/http/ratelimit";
import { apiError, apiSuccess, formatZodErrors } from "@/server/http/response";
import { loginSchema } from "@/server/validation/auth";

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  const ip = getClientIp(req.headers);

  if (!checkRateLimit("auth:login", ip, 10, 60_000)) {
    return apiError(
      "RATE_LIMIT_EXCEEDED",
      "Terlalu banyak percobaan login. Coba lagi dalam satu menit.",
      429,
      {},
      requestId
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(
      "BAD_REQUEST",
      "Format data permintaan tidak valid.",
      400,
      {},
      requestId
    );
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Format email atau kata sandi tidak valid.",
      422,
      formatZodErrors(parsed.error),
      requestId
    );
  }

  const { email, password } = parsed.data;

  try {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        passwordHash: users.passwordHash,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Run dummy scrypt verification when no hash exists to prevent email enumeration via timing.
    if (!user || !user.passwordHash) {
      burnDummyPasswordVerify(password);
      return apiError(
        "INVALID_CREDENTIALS",
        "Email atau kata sandi salah.",
        401,
        {},
        requestId
      );
    }

    const passwordMatches = verifyPassword(password, user.passwordHash);
    if (!passwordMatches || !user.isActive) {
      return apiError(
        "INVALID_CREDENTIALS",
        "Email atau kata sandi salah.",
        401,
        {},
        requestId
      );
    }

    await deleteExpiredSessions(user.id);

    const session = await createSession(user.id, {
      ipAddress: ip !== "unknown" ? ip : null,
      userAgent: req.headers.get("user-agent"),
    });

    return apiSuccess(
      {
        token: session.token,
        user: { id: user.id, name: user.name, email: user.email },
      },
      200,
      requestId
    );
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
