import { eq, and } from "drizzle-orm";
import { db } from "@/server/db";
import { memberships, organizations } from "@/server/db/schema";
import { getSession } from "@/server/auth/session";
import { apiSuccess, apiError } from "@/server/http/response";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return apiError({
      code: "UNAUTHORIZED",
      message: "Sesi tidak ditemukan atau telah kedaluwarsa. Silakan masuk kembali.",
      status: 401,
    });
  }

  const userMemberships = await db
    .select({
      membershipId: memberships.id,
      role: memberships.role,
      joinedAt: memberships.joinedAt,
      organization: {
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
      },
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(and(eq(memberships.userId, session.user.id), eq(memberships.isActive, true), eq(organizations.isActive, true)));

  return apiSuccess({
    data: {
      user: session.user,
      memberships: userMemberships,
    },
  });
}
