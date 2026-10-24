import { db } from "@/server/db";
import { auditLogs } from "@/server/db/schema";

interface LogAuditParams {
  actorId?: string;
  organizationId?: string;
  action: string;
  objectType: string;
  objectId: string;
  requestId?: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
}

export async function logAuditEvent({
  actorId,
  organizationId,
  action,
  objectType,
  objectId,
  requestId,
  beforeState,
  afterState,
}: LogAuditParams) {
  try {
    await db.insert(auditLogs).values({
      actorId: actorId || null,
      organizationId: organizationId || null,
      action,
      objectType,
      objectId,
      requestId: requestId || null,
      beforeState: beforeState ? JSON.stringify(beforeState) : null,
      afterState: afterState ? JSON.stringify(afterState) : null,
    });
  } catch (error) {
    // Audit logging should not crash the primary financial transaction
    console.error("Failed to write audit log:", error);
  }
}
