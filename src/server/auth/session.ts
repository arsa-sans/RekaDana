import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/server/db";
import { sessions, users } from "@/server/db/schema";
import { apiError } from "@/server/http/response";

export const SESSION_COOKIE_NAME = "rekadana_session";

function getSessionTtlMs(): number {
  const days = Number.parseInt(process.env.SESSION_TTL_DAYS ?? "7", 10);
  const validDays = Number.isFinite(days) && days > 0 ? days : 7;
  return validDays * 24 * 60 * 60 * 1000;
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  userId: string,
  meta?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + getSessionTtlMs());

  await db.insert(sessions).values({
    userId,
    token: tokenHash,
    expiresAt,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  });

  return { token, expiresAt };
}

export async function deleteExpiredSessions(userId?: string): Promise<void> {
  const now = new Date();
  const condition = userId
    ? and(eq(sessions.userId, userId), lt(sessions.expiresAt, now))
    : lt(sessions.expiresAt, now);

  await db.delete(sessions).where(condition);
}

export async function revokeSessionByToken(token: string): Promise<boolean> {
  const tokenHash = hashToken(token);
  const deleted = await db
    .delete(sessions)
    .where(eq(sessions.token, tokenHash))
    .returning({ id: sessions.id });

  return deleted.length > 0;
}

export type VerifyTokenResult =
  | { status: "valid"; sessionId: string; user: SessionUser }
  | { status: "expired" }
  | { status: "invalid" };

export async function verifyToken(token: string): Promise<VerifyTokenResult> {
  const tokenHash = hashToken(token);

  const [record] = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        isActive: users.isActive,
      },
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, tokenHash))
    .limit(1);

  if (!record) {
    return { status: "invalid" };
  }

  if (record.expiresAt <= new Date()) {
    await db.delete(sessions).where(eq(sessions.id, record.sessionId));
    return { status: "expired" };
  }

  if (!record.user.isActive) {
    return { status: "invalid" };
  }

  return {
    status: "valid",
    sessionId: record.sessionId,
    user: {
      id: record.user.id,
      name: record.user.name,
      email: record.user.email,
    },
  };
}

export function extractRequestToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    return token.length > 0 ? token : null;
  }

  const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value?.trim();
  return cookieToken && cookieToken.length > 0 ? cookieToken : null;
}

export type RequireAuthResult =
  | { ok: true; user: SessionUser; sessionId: string; token: string; requestId: string }
  | { ok: false; response: NextResponse };

export async function requireAuth(
  req: NextRequest,
  requestId: string
): Promise<RequireAuthResult> {
  const token = extractRequestToken(req);
  if (!token) {
    return {
      ok: false,
      response: apiError(
        "UNAUTHORIZED",
        "Anda belum masuk. Silakan login terlebih dahulu.",
        401,
        {},
        requestId
      ),
    };
  }

  const verified = await verifyToken(token);
  if (verified.status !== "valid") {
    return {
      ok: false,
      response: apiError(
        "UNAUTHORIZED",
        "Sesi Anda telah kedaluwarsa. Silakan masuk kembali.",
        401,
        {},
        requestId
      ),
    };
  }

  return {
    ok: true,
    user: verified.user,
    sessionId: verified.sessionId,
    token,
    requestId,
  };
}
