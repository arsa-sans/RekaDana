import { db, type DB } from "@/server/db";
import { auditLogs } from "@/server/db/schema";

type DbExecutor = Pick<DB, "insert">;

export type AuditLogInput = {
  actorId: string | null;
  organizationId: string | null;
  action: string;
  objectType: string;
  objectId: string;
  requestId: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
};

export async function recordAuditLog(
  input: AuditLogInput,
  executor: DbExecutor = db
): Promise<void> {
  await executor.insert(auditLogs).values({
    actorId: input.actorId,
    organizationId: input.organizationId,
    action: input.action,
    objectType: input.objectType,
    objectId: input.objectId,
    requestId: input.requestId,
    beforeState: input.beforeState ? JSON.stringify(input.beforeState) : null,
    afterState: input.afterState ? JSON.stringify(input.afterState) : null,
  });
}
