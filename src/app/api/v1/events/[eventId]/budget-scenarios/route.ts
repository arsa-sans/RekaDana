import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { requireEventAccess } from "@/server/authorization";
import {
  internalServerError,
  parseJsonBody,
  validateUuidParam,
} from "@/server/http/request";
import { apiError, apiSuccess, formatZodErrors } from "@/server/http/response";
import { handleScenarioError } from "@/server/http/scenario-error";
import {
  createBudgetScenario,
  listEventBudgetScenarios,
} from "@/server/modules/scenarios.service";
import { createScenarioSchema } from "@/server/validation/scenarios";

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

    const includeArchived = req.nextUrl.searchParams.get("includeArchived") === "true";
    const scenarios = await listEventBudgetScenarios({
      event: access.event,
      includeArchived,
    });

    return apiSuccess(scenarios, 200, requestId);
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

    const bodyResult = await parseJsonBody(req, requestId);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const parsed = createScenarioSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Data skenario anggaran tidak valid.",
        422,
        formatZodErrors(parsed.error),
        requestId
      );
    }

    const created = await createBudgetScenario({
      event: access.event,
      userId: auth.user.id,
      input: parsed.data,
      requestId,
    });

    return apiSuccess(created, 201, requestId);
  } catch (error: unknown) {
    return handleScenarioError(error, requestId);
  }
}
