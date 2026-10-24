import { eq, and, desc } from "drizzle-orm";
import { db } from "@/server/db";
import { events } from "@/server/db/schema";
import { requireMembership, requireEventAccess } from "@/server/authorization/tenant";
import { logAuditEvent } from "@/server/audit/audit.service";

export interface CreateEventInput {
  name: string;
  description?: string;
  participantCount?: number;
  availableFunds?: string;
}

export async function createEvent(userId: string, organizationId: string, input: CreateEventInput) {
  const membership = await requireMembership(userId, organizationId, ["ketua_kegiatan", "bendahara"]);

  const [newEvent] = await db
    .insert(events)
    .values({
      organizationId,
      name: input.name,
      description: input.description || null,
      participantCount: input.participantCount ?? 0,
      availableFunds: input.availableFunds || "0",
      createdBy: userId,
    })
    .returning();

  await logAuditEvent({
    actorId: userId,
    organizationId,
    action: "event.created",
    objectType: "event",
    objectId: newEvent.id,
    afterState: newEvent as unknown as Record<string, unknown>,
  });

  return newEvent;
}

export async function listEvents(userId: string, organizationId: string) {
  await requireMembership(userId, organizationId);

  return db
    .select()
    .from(events)
    .where(and(eq(events.organizationId, organizationId), eq(events.isActive, true)))
    .orderBy(desc(events.createdAt));
}

export async function getEvent(userId: string, eventId: string) {
  const { event, membership } = await requireEventAccess(userId, eventId);
  return { event, role: membership.role };
}

export async function updateEvent(
  userId: string,
  eventId: string,
  input: Partial<CreateEventInput>
) {
  const { event } = await requireEventAccess(userId, eventId, ["ketua_kegiatan", "bendahara"]);

  const [updated] = await db
    .update(events)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.participantCount !== undefined ? { participantCount: input.participantCount } : {}),
      ...(input.availableFunds !== undefined ? { availableFunds: input.availableFunds } : {}),
      updatedAt: new Date(),
    })
    .where(eq(events.id, eventId))
    .returning();

  await logAuditEvent({
    actorId: userId,
    organizationId: event.organizationId,
    action: "event.updated",
    objectType: "event",
    objectId: eventId,
    beforeState: event as unknown as Record<string, unknown>,
    afterState: updated as unknown as Record<string, unknown>,
  });

  return updated;
}
