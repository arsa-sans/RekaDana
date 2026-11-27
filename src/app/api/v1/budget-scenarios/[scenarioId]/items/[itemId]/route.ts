import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { requireScenarioAccess } from "@/server/authorization";
import { parseJsonBody, validateUuidParam } from "@/server/http/request";
import { apiError, apiSuccess, formatZodErrors } from "@/server/http/response";
import { handleScenarioError } from "@/server/http/scenario-error";
import {
  deleteScenarioItem,
  updateScenarioItem,
} from "@/server/modules/scenarios.service";
import { updateScenarioItemSchema } from "@/server/validation/scenarios";

type RouteContextParams = {
  params: Promise<{ scenarioId: string; itemId: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContextParams) {
  const requestId = randomUUID();

  const auth = await requireAuth(req, requestId);
  if (!auth.ok) {
    return auth.response;
  }

  const { scenarioId, itemId } = await context.params;
  const scenarioIdValidation = validateUuidParam(scenarioId, "skenario", requestId);
  if (!scenarioIdValidation.ok) {
    return scenarioIdValidation.response;
  }

  const itemIdValidation = validateUuidParam(itemId, "item skenario", requestId);
  if (!itemIdValidation.ok) {
    return itemIdValidation.response;
  }

  try {
    const access = await requireScenarioAccess(
      auth.user.id,
      scenarioIdValidation.value,
      requestId
    );
    if (!access.ok) {
      return access.response;
    }

    const bodyResult = await parseJsonBody(req, requestId);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const parsed = updateScenarioItemSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Data pembaruan item skenario tidak valid.",
        422,
        formatZodErrors(parsed.error),
        requestId
      );
    }

    const updated = await updateScenarioItem({
      scenario: access.scenario,
      organizationId: access.event.organizationId,
      itemId: itemIdValidation.value,
      userId: auth.user.id,
      input: parsed.data,
      requestId,
    });

    return apiSuccess(updated, 200, requestId);
  } catch (error: unknown) {
    return handleScenarioError(error, requestId);
  }
}

export async function DELETE(req: NextRequest, context: RouteContextParams) {
  const requestId = randomUUID();

  const auth = await requireAuth(req, requestId);
  if (!auth.ok) {
    return auth.response;
  }

  const { scenarioId, itemId } = await context.params;
  const scenarioIdValidation = validateUuidParam(scenarioId, "skenario", requestId);
  if (!scenarioIdValidation.ok) {
    return scenarioIdValidation.response;
  }

  const itemIdValidation = validateUuidParam(itemId, "item skenario", requestId);
  if (!itemIdValidation.ok) {
    return itemIdValidation.response;
  }

  try {
    const access = await requireScenarioAccess(
      auth.user.id,
      scenarioIdValidation.value,
      requestId
    );
    if (!access.ok) {
      return access.response;
    }

    const deleted = await deleteScenarioItem({
      scenario: access.scenario,
      organizationId: access.event.organizationId,
      itemId: itemIdValidation.value,
      userId: auth.user.id,
      requestId,
    });

    return apiSuccess(deleted, 200, requestId);
  } catch (error: unknown) {
    return handleScenarioError(error, requestId);
  }
}
