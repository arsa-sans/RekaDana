/**
 * Drizzle ORM Schema — RekaDana Database
 *
 * Financial values use NUMERIC (decimal strings in API).
 * All timestamps stored as timestamptz (UTC); displayed in Asia/Jakarta.
 */
import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
  integer,
  boolean,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ============================================================================
// ENUMS
// ============================================================================

export const membershipRoleEnum = pgEnum("membership_role", [
  "ketua_kegiatan",
  "bendahara",
  "panitia_anggota",
]);

export const budgetVersionStatusEnum = pgEnum("budget_version_status", [
  "draft",
  "submitted",
  "approved",
  "rejected",
]);

export const expenseRequestStatusEnum = pgEnum("expense_request_status", [
  "draft",
  "submitted",
  "approved",
  "partially_paid",
  "paid",
  "rejected",
  "cancelled",
]);

export const evidenceFileTypeEnum = pgEnum("evidence_file_type", [
  "pdf",
  "jpeg",
  "png",
]);

// ============================================================================
// IDENTITY
// ============================================================================

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"), // null if using OAuth
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Better Auth tables — managed by Neon Auth
// better-auth will create its own tables; we reference user.id here
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

// ============================================================================
// ORGANIZATIONS
// ============================================================================

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // One active membership per user per organization
    uniqueActiveMembership: uniqueIndex("memberships_user_org_unique").on(
      t.userId,
      t.organizationId
    ),
    orgIdx: index("memberships_org_idx").on(t.organizationId),
  })
);

// ============================================================================
// EVENTS (Kegiatan)
// ============================================================================

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  participantCount: integer("participant_count").default(0),
  // Available funds allocation for this event (NUMERIC for financial precision)
  availableFunds: numeric("available_funds", { precision: 20, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orgIdx: index("events_org_idx").on(t.organizationId),
}));

// ============================================================================
// BUDGET SCENARIOS (Scenario Lab — draft only, NOT official budgets)
// ============================================================================

export const budgetScenarios = pgTable("budget_scenarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  isArchived: boolean("is_archived").notNull().default(false),
  // Snapshot of participant count used in this scenario
  participantCount: integer("participant_count").default(0),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  eventIdx: index("budget_scenarios_event_idx").on(t.eventId),
}));

export const budgetScenarioItems = pgTable("budget_scenario_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  scenarioId: uuid("scenario_id").notNull().references(() => budgetScenarios.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category"),
  priority: text("priority").default("normal"), // 'required' | 'normal' | 'optional'
  // quantity × estimated_unit_cost = item_total (computed server-side)
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  estimatedUnitCost: numeric("estimated_unit_cost", { precision: 20, scale: 2 }).notNull(),
  isIncluded: boolean("is_included").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// BUDGET VERSIONS (Official approved budgets — immutable snapshots)
// ============================================================================

export const budgetVersions = pgTable("budget_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  // Snapshot from which scenario this was promoted
  sourceScenarioId: uuid("source_scenario_id").references(() => budgetScenarios.id),
  versionNumber: integer("version_number").notNull().default(1),
  status: budgetVersionStatusEnum("status").notNull().default("draft"),
  // Immutable snapshot values (stored at promotion time)
  snapshotTotal: numeric("snapshot_total", { precision: 20, scale: 2 }).notNull(),
  snapshotParticipantCount: integer("snapshot_participant_count").default(0),
  snapshotAvailableFunds: numeric("snapshot_available_funds", { precision: 20, scale: 2 }).notNull(),
  submittedBy: uuid("submitted_by").references(() => users.id),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  reviewedBy: uuid("reviewed_by").references(() => users.id), // Bendahara only
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"), // Required if rejected
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  eventIdx: index("budget_versions_event_idx").on(t.eventId),
  eventStatusIdx: index("budget_versions_event_status_idx").on(t.eventId, t.status),
}));

export const budgetItems = pgTable("budget_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  budgetVersionId: uuid("budget_version_id").notNull().references(() => budgetVersions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category"),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 20, scale: 2 }).notNull(),
  // total = quantity × unit_cost (computed and stored at snapshot time)
  total: numeric("total", { precision: 20, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// EXPENSE REQUESTS (Permintaan Pengeluaran)
// ============================================================================

export const expenseRequests = pgTable("expense_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  budgetVersionId: uuid("budget_version_id").notNull().references(() => budgetVersions.id),
  budgetItemId: uuid("budget_item_id").references(() => budgetItems.id),
  requestedBy: uuid("requested_by").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  requestedAmount: numeric("requested_amount", { precision: 20, scale: 2 }).notNull(),
  approvedAmount: numeric("approved_amount", { precision: 20, scale: 2 }),
  status: expenseRequestStatusEnum("status").notNull().default("draft"),
  reviewedBy: uuid("reviewed_by").references(() => users.id), // Bendahara only
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  eventIdx: index("expense_requests_event_idx").on(t.eventId),
  statusIdx: index("expense_requests_status_idx").on(t.status),
}));

// ============================================================================
// PAYMENTS
// ============================================================================

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  expenseRequestId: uuid("expense_request_id").notNull().references(() => expenseRequests.id),
  // Idempotency key to prevent duplicate payments on retry
  idempotencyKey: text("idempotency_key").notNull().unique(),
  amount: numeric("amount", { precision: 20, scale: 2 }).notNull(),
  postedBy: uuid("posted_by").notNull().references(() => users.id), // Bendahara only
  postedAt: timestamp("posted_at", { withTimezone: true }).notNull().defaultNow(),
  notes: text("notes"),
  isReversed: boolean("is_reversed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  requestIdx: index("payments_request_idx").on(t.expenseRequestId),
}));

export const paymentReversals = pgTable("payment_reversals", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("payment_id").notNull().references(() => payments.id),
  reversedBy: uuid("reversed_by").notNull().references(() => users.id), // Bendahara only
  reversedAt: timestamp("reversed_at", { withTimezone: true }).notNull().defaultNow(),
  // Amount reversed (must not exceed original payment amount)
  amount: numeric("amount", { precision: 20, scale: 2 }).notNull(),
  reason: text("reason").notNull(), // Required
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// EVIDENCE FILES (Bukti Transaksi — Private)
// ============================================================================

export const evidenceFiles = pgTable("evidence_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Private object key (never a public URL)
  objectKey: text("object_key").notNull().unique(),
  originalFileName: text("original_file_name").notNull(),
  detectedFileType: evidenceFileTypeEnum("detected_file_type").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  contentHash: text("content_hash"), // SHA-256 of file content
  uploadedBy: uuid("uploaded_by").notNull().references(() => users.id),
  // Scope — must be set before file is considered valid
  organizationId: uuid("organization_id").references(() => organizations.id),
  // Optional: linked to a specific payment or expense request
  paymentId: uuid("payment_id").references(() => payments.id),
  expenseRequestId: uuid("expense_request_id").references(() => expenseRequests.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// AUDIT LOG
// ============================================================================

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id),
  organizationId: uuid("organization_id").references(() => organizations.id),
  action: text("action").notNull(), // e.g., "budget_version.approved"
  objectType: text("object_type").notNull(), // e.g., "budget_version"
  objectId: text("object_id").notNull(),
  requestId: text("request_id"),
  // Safe summary — no passwords, tokens, or file contents
  beforeState: text("before_state"), // JSON string
  afterState: text("after_state"),   // JSON string
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orgIdx: index("audit_logs_org_idx").on(t.organizationId),
  actorIdx: index("audit_logs_actor_idx").on(t.actorId),
  createdAtIdx: index("audit_logs_created_at_idx").on(t.createdAt),
}));
