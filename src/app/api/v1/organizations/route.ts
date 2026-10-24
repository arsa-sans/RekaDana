import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/server/db";
import { organizations, memberships } from "@/server/db/schema";
import { getSession } from "@/server/auth/session";
import { createOrganizationSchema } from "@/server/validation";
import { apiSuccess, apiError } from "@/server/http/response";
import { logAuditEvent } from "@/server/audit/audit.service";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return apiError({
      code: "UNAUTHORIZED",
      message: "Sesi tidak ditemukan atau telah kedaluwarsa. Silakan masuk kembali.",
      status: 401,
    });
  }

  const list = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      role: memberships.role,
      joinedAt: memberships.joinedAt,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(and(eq(memberships.userId, session.user.id), eq(memberships.isActive, true), eq(organizations.isActive, true)));

  return apiSuccess({ data: list });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return apiError({
      code: "UNAUTHORIZED",
      message: "Sesi tidak ditemukan atau telah kedaluwarsa. Silakan masuk kembali.",
      status: 401,
    });
  }

  try {
    const body = await req.json();
    const parsed = createOrganizationSchema.safeParse(body);

    if (!parsed.success) {
      return apiError({
        code: "VALIDATION_ERROR",
        message: "Data organisasi tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
        status: 422,
      });
    }

    const { name, slug } = parsed.data;

    const [existing] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, slug)).limit(1);
    if (existing) {
      return apiError({
        code: "SLUG_ALREADY_EXISTS",
        message: "Slug organisasi sudah digunakan. Silakan pilih slug lain.",
        status: 409,
      });
    }

    const result = await db.transaction(async (tx) => {
      const [newOrg] = await tx
        .insert(organizations)
        .values({
          name,
          slug,
        })
        .returning();

      // Creator automatically becomes ketua_kegiatan of the organization
      const [membership] = await tx
        .insert(memberships)
        .values({
          userId: session.user.id,
          organizationId: newOrg.id,
          role: "ketua_kegiatan",
        })
        .returning();

      await logAuditEvent({
        actorId: session.user.id,
        organizationId: newOrg.id,
        action: "organization.created",
        objectType: "organization",
        objectId: newOrg.id,
        afterState: newOrg as unknown as Record<string, unknown>,
      });

      return {
        organization: newOrg,
        membership,
      };
    });

    return apiSuccess({
      data: result,
      message: "Organisasi berhasil dibuat.",
      status: 201,
    });
  } catch (error: any) {
    return apiError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Gagal membuat organisasi.",
      status: 500,
    });
  }
}
