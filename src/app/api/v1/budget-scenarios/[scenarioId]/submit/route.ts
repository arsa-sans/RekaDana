import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { requireScenarioAccess } from "@/server/authorization";
import { parseOptionalJsonBody, validateUuidParam } from "@/server/http/request";
import { apiError, apiSuccess, formatZodErrors } from "@/server/http/response";
import { handleScenarioError } from "@/server/http/scenario-error";
import { submitBudgetScenario } from "@/server/modules/scenarios.service";
import { submitScenarioSchema } from "@/server/validation/scenarios";

type RouteContextParams = {
  params: Promise<{ scenarioId: string }>;
};

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

    const bodyResult = await parseOptionalJsonBody(req, requestId);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const parsed = submitScenarioSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Data pengajuan skenario tidak valid.",
        422,
        formatZodErrors(parsed.error),
        requestId
      );
    }

    if (
      parsed.data.eventId !== undefined &&
      parsed.data.eventId !== access.scenario.eventId
    ) {
      return apiError(
        "SCENARIO_EVENT_MISMATCH",
        "Skenario tidak berasal dari kegiatan yang diminta.",
        403,
        {},
        requestId
      );
    }

    const submitted = await submitBudgetScenario({
      scenario: access.scenario,
      event: access.event,
      userId: auth.user.id,
      requestId,
    });

    return apiSuccess(submitted, 201, requestId);
  } catch (error: unknown) {
    return handleScenarioError(error, requestId);
  }
}
