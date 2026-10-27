import { cookies, headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/server/db";
import { sessions, users } from "@/server/db/schema";

export const SESSION_COOKIE_NAME = "rekadana_session";

// Session lifetime: default 7 days, configurable via SESSION_TTL_DAYS env.
const SESSION_TTL_MS =
  parseInt(process.env.SESSION_TTL_DAYS ?? "7", 10) * 24 * 60 * 60 * 1000;

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
}

export async function createSession(userId: string, userAgent?: string, ipAddress?: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const [session] = await db
    .insert(sessions)
    .values({
      userId,
      token,
      expiresAt,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
    })
    .returning();

  return session;
}

export async function getSession(): Promise<{ user: AuthenticatedUser; sessionToken: string } | null> {
  let token: string | null = null;

  const headerList = await headers();
  const authHeader = headerList.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (cookie) {
      token = cookie.value;
    }
  }

  if (!token) {
    return null;
  }

  const [record] = await db
    .select({
      sessionToken: sessions.token,
      expiresAt: sessions.expiresAt,
      user: {
        id: users.id,
        email: users.email,
        name: users.name,
        isActive: users.isActive,
      },
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!record || !record.user.isActive) {
    return null;
  }

  return {
    user: record.user,
    sessionToken: record.sessionToken,
  };
}

export async function deleteSession(token: string) {
  await db.delete(sessions).where(eq(sessions.token, token));
}
