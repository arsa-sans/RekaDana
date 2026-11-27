import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { requireScenarioAccess } from "@/server/authorization";
import { parseJsonBody, validateUuidParam } from "@/server/http/request";
import { apiError, apiSuccess, formatZodErrors } from "@/server/http/response";
import { handleScenarioError } from "@/server/http/scenario-error";
import {
  deleteBudgetScenario,
  getBudgetScenarioDetail,
  updateBudgetScenario,
} from "@/server/modules/scenarios.service";
import { updateScenarioSchema } from "@/server/validation/scenarios";

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

    const detail = await getBudgetScenarioDetail({
      scenario: access.scenario,
      event: access.event,
    });

    return apiSuccess(detail, 200, requestId);
  } catch (error: unknown) {
    return handleScenarioError(error, requestId);
  }
}

export async function PATCH(req: NextRequest, context: RouteContextParams) {
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

    const parsed = updateScenarioSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Data pembaruan skenario tidak valid.",
        422,
        formatZodErrors(parsed.error),
        requestId
      );
    }

    const updated = await updateBudgetScenario({
      scenario: access.scenario,
      event: access.event,
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

    const deleted = await deleteBudgetScenario({
      scenario: access.scenario,
      event: access.event,
      userId: auth.user.id,
      requestId,
    });

    return apiSuccess(deleted, 200, requestId);
  } catch (error: unknown) {
    return handleScenarioError(error, requestId);
  }
}
