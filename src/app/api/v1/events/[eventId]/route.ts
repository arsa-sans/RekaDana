import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { requireEventAccess, requireRole } from "@/server/authorization";
import {
  internalServerError,
  parseJsonBody,
  validateUuidParam,
} from "@/server/http/request";
import { apiError, apiSuccess, formatZodErrors } from "@/server/http/response";
import { serializeEvent, updateEvent } from "@/server/modules/events.service";
import { updateEventSchema } from "@/server/validation/organizations";

type RouteContextParams = {
  params: Promise<{ eventId: string }>;
};

export async function GET(req: NextRequest, context: RouteContextParams) {
  const requestId = randomUUID();

  const auth = await requireAuth(req, requestId);
  if (!auth.ok) {
    return auth.response;
  }

  const { eventId } = await context.params;
  const eventIdValidation = validateUuidParam(eventId, "kegiatan", requestId);
  if (!eventIdValidation.ok) {
    return eventIdValidation.response;
  }

  try {
    const access = await requireEventAccess(
      auth.user.id,
      eventIdValidation.value,
      requestId
    );
    if (!access.ok) {
      return access.response;
    }

    return apiSuccess(
      serializeEvent(access.event, access.membership.role),
      200,
      requestId
    );
  } catch {
    return internalServerError(requestId);
  }
}

export async function PATCH(req: NextRequest, context: RouteContextParams) {
  const requestId = randomUUID();

  const auth = await requireAuth(req, requestId);
  if (!auth.ok) {
    return auth.response;
  }

  const { eventId } = await context.params;
  const eventIdValidation = validateUuidParam(eventId, "kegiatan", requestId);
  if (!eventIdValidation.ok) {
    return eventIdValidation.response;
  }

  try {
    const access = await requireEventAccess(
      auth.user.id,
      eventIdValidation.value,
      requestId
    );
    if (!access.ok) {
      return access.response;
    }

    const roleResult = requireRole(
      access.membership,
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

    const parsed = updateEventSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Data pembaruan kegiatan tidak valid.",
        422,
        formatZodErrors(parsed.error),
        requestId
      );
    }

    const updated = await updateEvent({
      event: access.event,
      userId: auth.user.id,
      input: parsed.data,
      requestId,
    });

    if (!updated) {
      return apiError(
        "EVENT_NOT_FOUND",
        "Kegiatan tidak ditemukan.",
        404,
        {},
        requestId
      );
    }

    return apiSuccess(
      { ...updated, userRole: access.membership.role },
      200,
      requestId
    );
  } catch {
    return internalServerError(requestId);
  }
}
