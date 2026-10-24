import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/server/db";
import { memberships, users } from "@/server/db/schema";
import { getSession } from "@/server/auth/session";
import { requireMembership, AuthorizationError } from "@/server/authorization/tenant";
import { addMemberSchema } from "@/server/validation";
import { apiSuccess, apiError } from "@/server/http/response";
import { logAuditEvent } from "@/server/audit/audit.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return apiError({
      code: "UNAUTHORIZED",
      message: "Sesi tidak ditemukan atau telah kedaluwarsa. Silakan masuk kembali.",
      status: 401,
    });
  }

  const { orgId } = await params;

  try {
    await requireMembership(session.user.id, orgId);

    const list = await db
      .select({
        membershipId: memberships.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        role: memberships.role,
        joinedAt: memberships.joinedAt,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(and(eq(memberships.organizationId, orgId), eq(memberships.isActive, true)));

    return apiSuccess({ data: list });
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      return apiError({
        code: err.code,
        message: err.message,
        status: err.statusCode,
      });
    }
    return apiError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Terjadi kesalahan internal pada server.",
      status: 500,
    });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return apiError({
      code: "UNAUTHORIZED",
      message: "Sesi tidak ditemukan atau telah kedaluwarsa. Silakan masuk kembali.",
      status: 401,
    });
  }

  const { orgId } = await params;

  try {
    // Only Ketua can add/assign new members
    await requireMembership(session.user.id, orgId, ["ketua_kegiatan"]);

    const body = await req.json();
    const parsed = addMemberSchema.safeParse(body);

    if (!parsed.success) {
      return apiError({
        code: "VALIDATION_ERROR",
        message: "Data anggota tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
        status: 422,
      });
    }

    const { email, role } = parsed.data;

    const [targetUser] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!targetUser) {
      return apiError({
        code: "USER_NOT_FOUND",
        message: "Pengguna dengan email tersebut belum terdaftar di RekaDana.",
        status: 404,
      });
    }

    const [existingMembership] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.organizationId, orgId), eq(memberships.userId, targetUser.id)))
      .limit(1);

    if (existingMembership) {
      if (existingMembership.isActive) {
        return apiError({
          code: "ALREADY_MEMBER",
          message: "Pengguna sudah menjadi anggota aktif organisasi ini.",
          status: 409,
        });
      }

      const [reactivated] = await db
        .update(memberships)
        .set({ isActive: true, role })
        .where(eq(memberships.id, existingMembership.id))
        .returning();

      return apiSuccess({
        data: reactivated,
        message: "Keanggotaan pengguna berhasil diaktifkan kembali.",
      });
    }

    const [newMember] = await db
      .insert(memberships)
      .values({
        organizationId: orgId,
        userId: targetUser.id,
        role,
      })
      .returning();

    await logAuditEvent({
      actorId: session.user.id,
      organizationId: orgId,
      action: "membership.created",
      objectType: "membership",
      objectId: newMember.id,
      afterState: newMember as unknown as Record<string, unknown>,
    });

    return apiSuccess({
      data: newMember,
      message: "Anggota berhasil ditambahkan ke organisasi.",
      status: 201,
    });
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      return apiError({
        code: err.code,
        message: err.message,
        status: err.statusCode,
      });
    }
    return apiError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Terjadi kesalahan internal pada server.",
      status: 500,
    });
  }
}
