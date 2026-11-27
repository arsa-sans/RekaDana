import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { requireScenarioAccess } from "@/server/authorization";
import { parseJsonBody, validateUuidParam } from "@/server/http/request";
import { apiError, apiSuccess, formatZodErrors } from "@/server/http/response";
import { handleScenarioError } from "@/server/http/scenario-error";
import {
  addScenarioItem,
  listScenarioItems,
} from "@/server/modules/scenarios.service";
import { createScenarioItemSchema } from "@/server/validation/scenarios";

type RouteContextParams = {
  params: Promise<{ scenarioId: string }>;
};

export async function GET(req: NextRequest, context: RouteContextParams) {
  const requestId = randomUUID();

  const auth = await requireAuth(req, requestId);
  if (!auth.ok) {
    return auth.response;
  }

  const { scenarioId } = await context.params;
  const scenarioIdValidation = validateUuidParam(scenarioId, "skenario", requestId);
  if (!scenarioIdValidation.ok) {
    return scenarioIdValidation.response;
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

    const items = await listScenarioItems(access.scenario.id);
    return apiSuccess(items, 200, requestId);
  } catch (error: unknown) {
    return handleScenarioError(error, requestId);
  }
}

export async function POST(req: NextRequest, context: RouteContextParams) {
  const requestId = randomUUID();

  const auth = await requireAuth(req, requestId);
  if (!auth.ok) {
    return auth.response;
  }

  const { scenarioId } = await context.params;
  const scenarioIdValidation = validateUuidParam(scenarioId, "skenario", requestId);
  if (!scenarioIdValidation.ok) {
    return scenarioIdValidation.response;
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

    const parsed = createScenarioItemSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Data item kebutuhan skenario tidak valid.",
        422,
        formatZodErrors(parsed.error),
        requestId
      );
    }

    const created = await addScenarioItem({
      scenario: access.scenario,
      organizationId: access.event.organizationId,
      userId: auth.user.id,
      input: parsed.data,
      requestId,
    });

    return apiSuccess(created, 201, requestId);
  } catch (error: unknown) {
    return handleScenarioError(error, requestId);
  }
}
