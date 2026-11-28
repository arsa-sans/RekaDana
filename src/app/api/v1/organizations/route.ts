import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { internalServerError, parseJsonBody } from "@/server/http/request";
import { apiError, apiSuccess, formatZodErrors } from "@/server/http/response";
import {
  createOrganization,
  listUserOrganizations,
  OrganizationSlugConflictError,
} from "@/server/modules/organizations.service";
import { createOrganizationSchema } from "@/server/validation/organizations";

export async function GET(req: NextRequest) {
  const requestId = randomUUID();

  const auth = await requireAuth(req, requestId);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const organizations = await listUserOrganizations(auth.user.id);
    return apiSuccess(organizations, 200, requestId);
  } catch {
    return internalServerError(requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = randomUUID();

  const auth = await requireAuth(req, requestId);
  if (!auth.ok) {
    return auth.response;
  }

  const bodyResult = await parseJsonBody(req, requestId);
  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const parsed = createOrganizationSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Data organisasi tidak valid.",
      422,
      formatZodErrors(parsed.error),
      requestId
    );
  }

  try {
    const organization = await createOrganization({
      userId: auth.user.id,
      name: parsed.data.name,
      slug: parsed.data.slug,
      requestId,
    });

    return apiSuccess(organization, 201, requestId);
  } catch (error: unknown) {
    if (error instanceof OrganizationSlugConflictError) {
      return apiError(
        "ORGANIZATION_SLUG_EXISTS",
        "Slug organisasi sudah digunakan. Silakan pilih slug lain.",
        409,
        { slug: ["Slug organisasi sudah terdaftar."] },
        requestId
      );
    }

    return internalServerError(requestId);
  }
}
