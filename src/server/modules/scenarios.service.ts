import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  budgetScenarios,
  budgetScenarioItems,
  budgetVersions,
  budgetItems,
} from "@/server/db/schema";
import { requireEventAccess, AuthorizationError } from "@/server/authorization/tenant";
import { logAuditEvent } from "@/server/audit/audit.service";

export interface ScenarioCalculation {
  id: string;
  name: string;
  description: string | null;
  participantCount: number;
  availableFunds: string;
  scenarioTotal: string;
  costPerParticipant: string | null;
  fundGap: string;
  isDeficit: boolean;
  unfundedItemsCount: number;
  items: Array<{
    id: string;
    name: string;
    category: string | null;
    priority: string | null;
    quantity: string;
    estimatedUnitCost: string;
    itemTotal: string;
    isIncluded: boolean;
    notes: string | null;
  }>;
}

export async function listScenariosWithCalculations(
  userId: string,
  eventId: string
): Promise<ScenarioCalculation[]> {
  const { event } = await requireEventAccess(userId, eventId);

  const scenarios = await db
    .select()
    .from(budgetScenarios)
    .where(and(eq(budgetScenarios.eventId, eventId), eq(budgetScenarios.isArchived, false)))
    .orderBy(desc(budgetScenarios.createdAt));

  const results: ScenarioCalculation[] = [];
  const eventAvailableFunds = parseFloat(event.availableFunds || "0");

  for (const scenario of scenarios) {
    const items = await db
      .select()
      .from(budgetScenarioItems)
      .where(eq(budgetScenarioItems.scenarioId, scenario.id))
      .orderBy(budgetScenarioItems.createdAt);

    let total = 0;
    let unfundedCount = 0;

    const calculatedItems = items.map((item) => {
      const q = parseFloat(item.quantity);
      const c = parseFloat(item.estimatedUnitCost);
      const itemTotal = (q * c).toFixed(2);

      if (item.isIncluded) {
        total += parseFloat(itemTotal);
      } else if (item.priority === "required") {
        unfundedCount++;
      }

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        priority: item.priority,
        quantity: item.quantity,
        estimatedUnitCost: item.estimatedUnitCost,
        itemTotal,
        isIncluded: item.isIncluded,
        notes: item.notes,
      };
    });

    const scenarioTotal = total.toFixed(2);
    const participantCount = scenario.participantCount || event.participantCount || 0;
    const costPerParticipant =
      participantCount > 0 ? (total / participantCount).toFixed(2) : null;
    const gap = eventAvailableFunds - total;
    const fundGap = gap.toFixed(2);
    const isDeficit = gap < 0;

    results.push({
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      participantCount,
      availableFunds: event.availableFunds,
      scenarioTotal,
      costPerParticipant,
      fundGap,
      isDeficit,
      unfundedItemsCount: unfundedCount,
      items: calculatedItems,
    });
  }

  return results;
}

export async function createScenario(
  userId: string,
  eventId: string,
  name: string,
  description?: string,
  participantCount?: number
) {
  const { event } = await requireEventAccess(userId, eventId, ["ketua_kegiatan", "bendahara", "panitia_anggota"]);

  // Limit active scenarios to 3 for comparison clarity
  const existingCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(budgetScenarios)
    .where(and(eq(budgetScenarios.eventId, eventId), eq(budgetScenarios.isArchived, false)));

  if (Number(existingCount[0]?.count || 0) >= 3) {
    throw new AuthorizationError(
      "Maksimal 3 skenario aktif yang dapat dibandingkan secara bersamaan. Arsipkan salah satu skenario terlebih dahulu.",
      "SCENARIO_LIMIT_EXCEEDED",
      400
    );
  }

  const [scenario] = await db
    .insert(budgetScenarios)
    .values({
      eventId,
      name,
      description: description || null,
      participantCount: participantCount ?? event.participantCount ?? 0,
      createdBy: userId,
    })
    .returning();

  return scenario;
}

export async function addScenarioItem(
  userId: string,
  scenarioId: string,
  itemInput: {
    name: string;
    category?: string;
    priority?: "required" | "normal" | "optional";
    quantity: string;
    estimatedUnitCost: string;
    isIncluded?: boolean;
    notes?: string;
  }
) {
  const [scenario] = await db
    .select()
    .from(budgetScenarios)
    .where(eq(budgetScenarios.id, scenarioId))
    .limit(1);

  if (!scenario) {
    throw new AuthorizationError("Skenario tidak ditemukan.", "SCENARIO_NOT_FOUND", 404);
  }

  await requireEventAccess(userId, scenario.eventId, ["ketua_kegiatan", "bendahara", "panitia_anggota"]);

  const [item] = await db
    .insert(budgetScenarioItems)
    .values({
      scenarioId,
      name: itemInput.name,
      category: itemInput.category || null,
      priority: itemInput.priority || "normal",
      quantity: itemInput.quantity,
      estimatedUnitCost: itemInput.estimatedUnitCost,
      isIncluded: itemInput.isIncluded ?? true,
      notes: itemInput.notes || null,
    })
    .returning();

  return item;
}

export async function submitScenarioAsBudget(userId: string, scenarioId: string) {
  const [scenario] = await db
    .select()
    .from(budgetScenarios)
    .where(eq(budgetScenarios.id, scenarioId))
    .limit(1);

  if (!scenario) {
    throw new AuthorizationError("Skenario tidak ditemukan.", "SCENARIO_NOT_FOUND", 404);
  }

  // Only Ketua or authorized panitia can submit
  const { event } = await requireEventAccess(userId, scenario.eventId, ["ketua_kegiatan", "panitia_anggota"]);

  const items = await db
    .select()
    .from(budgetScenarioItems)
    .where(and(eq(budgetScenarioItems.scenarioId, scenarioId), eq(budgetScenarioItems.isIncluded, true)));

  if (items.length === 0) {
    throw new AuthorizationError(
      "Skenario tidak memiliki item kebutuhan aktif untuk diajukan.",
      "EMPTY_SCENARIO",
      400
    );
  }

  let totalNum = 0;
  for (const item of items) {
    totalNum += parseFloat(item.quantity) * parseFloat(item.estimatedUnitCost);
  }
  const totalStr = totalNum.toFixed(2);
  const availableFundsNum = parseFloat(event.availableFunds || "0");

  if (totalNum > availableFundsNum) {
    throw new AuthorizationError(
      `Pengajuan ditolak. Total estimasi anggaran (Rp${totalNum.toLocaleString("id-ID")}) melebihi pagu dana yang tersedia (Rp${availableFundsNum.toLocaleString("id-ID")}). Perbaiki skenario atau ajukan penambahan pagu dana terlebih dahulu.`,
      "BUDGET_DEFICIT",
      422
    );
  }

  // Count existing versions for versioning sequence
  const versionCountRecord = await db
    .select({ count: sql<number>`count(*)` })
    .from(budgetVersions)
    .where(eq(budgetVersions.eventId, scenario.eventId));
  const nextVersionNumber = Number(versionCountRecord[0]?.count || 0) + 1;

  // Transactional creation of immutable snapshot
  return await db.transaction(async (tx) => {
    const [version] = await tx
      .insert(budgetVersions)
      .values({
        eventId: scenario.eventId,
        sourceScenarioId: scenario.id,
        versionNumber: nextVersionNumber,
        status: "submitted",
        snapshotTotal: totalStr,
        snapshotParticipantCount: scenario.participantCount || event.participantCount || 0,
        snapshotAvailableFunds: event.availableFunds,
        submittedBy: userId,
        submittedAt: new Date(),
      })
      .returning();

    for (const item of items) {
      const itemTotal = (parseFloat(item.quantity) * parseFloat(item.estimatedUnitCost)).toFixed(2);
      await tx.insert(budgetItems).values({
        budgetVersionId: version.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unitCost: item.estimatedUnitCost,
        total: itemTotal,
      });
    }

    await logAuditEvent({
      actorId: userId,
      organizationId: event.organizationId,
      action: "budget_version.submitted",
      objectType: "budget_version",
      objectId: version.id,
      afterState: version as unknown as Record<string, unknown>,
    });

    return version;
  });
}
