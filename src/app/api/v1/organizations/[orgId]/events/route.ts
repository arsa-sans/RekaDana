import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { requireMembership, requireRole } from "@/server/authorization";
import {
  internalServerError,
  parseJsonBody,
  validateUuidParam,
} from "@/server/http/request";
import { apiError, apiSuccess, formatZodErrors } from "@/server/http/response";
import {
  createOrganizationEvent,
  listOrganizationEvents,
} from "@/server/modules/events.service";
import { createEventSchema } from "@/server/validation/organizations";

type RouteContextParams = {
  params: Promise<{ orgId: string }>;
};

export async function GET(req: NextRequest, context: RouteContextParams) {
  const requestId = randomUUID();

  const auth = await requireAuth(req, requestId);
  if (!auth.ok) {
    return auth.response;
  }

  const { orgId } = await context.params;
  const orgIdValidation = validateUuidParam(orgId, "organisasi", requestId);
  if (!orgIdValidation.ok) {
    return orgIdValidation.response;
  }

  try {
    const membershipResult = await requireMembership(
      auth.user.id,
      orgIdValidation.value,
      requestId
    );
    if (!membershipResult.ok) {
      return membershipResult.response;
    }

    const events = await listOrganizationEvents(orgIdValidation.value);
    return apiSuccess(events, 200, requestId);
  } catch {
    return internalServerError(requestId);
  }
}

export async function POST(req: NextRequest, context: RouteContextParams) {
  const requestId = randomUUID();

  const auth = await requireAuth(req, requestId);
  if (!auth.ok) {
    return auth.response;
  }

  const { orgId } = await context.params;
  const orgIdValidation = validateUuidParam(orgId, "organisasi", requestId);
  if (!orgIdValidation.ok) {
    return orgIdValidation.response;
  }

  try {
    const membershipResult = await requireMembership(
      auth.user.id,
      orgIdValidation.value,
      requestId
    );
    if (!membershipResult.ok) {
      return membershipResult.response;
    }

    const roleResult = requireRole(
      membershipResult.membership,
      ["ketua_kegiatan"],
      requestId
    );
    if (!roleResult.ok) {
      return roleResult.response;
    }

    const bodyResult = await parseJsonBody(req, requestId);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const parsed = createEventSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Data kegiatan tidak valid.",
        422,
        formatZodErrors(parsed.error),
        requestId
      );
    }

    const created = await createOrganizationEvent({
      organizationId: orgIdValidation.value,
      userId: auth.user.id,
      input: parsed.data,
      requestId,
    });

    return apiSuccess(created, 201, requestId);
  } catch {
    return internalServerError(requestId);
  }
}
