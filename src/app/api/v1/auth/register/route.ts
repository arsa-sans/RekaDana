import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { checkRateLimit, getClientIp } from "@/server/http/ratelimit";
import { apiError, apiSuccess, formatZodErrors } from "@/server/http/response";
import { registerSchema } from "@/server/validation/auth";

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  const ip = getClientIp(req.headers);

  if (!checkRateLimit("auth:register", ip, 20, 60_000)) {
    return apiError(
      "RATE_LIMIT_EXCEEDED",
      "Terlalu banyak percobaan pendaftaran. Coba lagi dalam satu menit.",
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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Data pendaftaran tidak valid.",
      422,
      formatZodErrors(parsed.error),
      requestId
    );
  }

  const { name, email, password } = parsed.data;

  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return apiError(
        "EMAIL_ALREADY_REGISTERED",
        "Email sudah terdaftar. Gunakan email lain atau masuk.",
        409,
        {},
        requestId
      );
    }

    const passwordHash = hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash })
      .returning({ id: users.id, name: users.name, email: users.email });

    if (!user) {
      return apiError(
        "INTERNAL_SERVER_ERROR",
        "Gagal membuat akun. Silakan coba lagi.",
        500,
        {},
        requestId
      );
    }

    const session = await createSession(user.id, {
      ipAddress: ip !== "unknown" ? ip : null,
      userAgent: req.headers.get("user-agent"),
    });

    return apiSuccess({ token: session.token, user }, 201, requestId);
  } catch (error: unknown) {
    const pgCode =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: string }).code
        : undefined;

    if (pgCode === "23505") {
      return apiError(
        "EMAIL_ALREADY_REGISTERED",
        "Email sudah terdaftar. Gunakan email lain atau masuk.",
        409,
        {},
        requestId
      );
    }

    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Terjadi kesalahan internal pada server.",
      500,
      {},
      requestId
    );
  }
}
