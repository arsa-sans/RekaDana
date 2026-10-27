import { eq, and } from "drizzle-orm";
import { db } from "@/server/db";
import { memberships, events, type membershipRoleEnum } from "@/server/db/schema";

export type Role = (typeof membershipRoleEnum.enumValues)[number];

export class AuthorizationError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code = "FORBIDDEN", statusCode = 403) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export async function requireMembership(
  userId: string,
  organizationId: string,
  allowedRoles?: Role[]
) {
  const [membership] = await db
    .select({
      id: memberships.id,
      role: memberships.role,
      isActive: memberships.isActive,
      organizationId: memberships.organizationId,
    })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!membership) {
    throw new AuthorizationError(
      "Akses ditolak. Anda bukan anggota organisasi ini.",
      "ORGANIZATION_ACCESS_DENIED",
      403
    );
  }

  if (!membership.isActive) {
    throw new AuthorizationError(
      "Keanggotaan Anda di organisasi ini telah dinonaktifkan. Hubungi Ketua Kegiatan atau Bendahara untuk mengaktifkan kembali akun Anda.",
      "MEMBERSHIP_INACTIVE",
      403
    );
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
    throw new AuthorizationError(
      `Akses ditolak. Tindakan ini memerlukan peran: ${allowedRoles.join(", ")}.`,
      "INSUFFICIENT_ROLE_PERMISSIONS",
      403
    );
  }

  return membership;
}

export async function requireEventAccess(
  userId: string,
  eventId: string,
  allowedRoles?: Role[]
) {
  const [event] = await db
    .select({
      id: events.id,
      organizationId: events.organizationId,
      name: events.name,
      availableFunds: events.availableFunds,
      participantCount: events.participantCount,
      isActive: events.isActive,
    })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.isActive, true)))
    .limit(1);

  if (!event) {
    throw new AuthorizationError("Kegiatan tidak ditemukan atau sudah tidak aktif.", "EVENT_NOT_FOUND", 404);
  }

  const membership = await requireMembership(userId, event.organizationId, allowedRoles);

  return {
    event,
    membership,
  };
}
