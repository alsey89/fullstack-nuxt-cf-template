import {
  sqliteTable,
  text,
  integer,
  index,
  unique,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { baseFields } from "./base";

// ============================================================================
// IDENTITY DOMAIN - Simplified User Management
// ============================================================================

/**
 * Users table
 * Core user entity with basic profile information
 */
export const users = sqliteTable(
  "users",
  {
    ...baseFields,

    // Authentication
    email: text("email").notNull(),
    // Nullable for OAuth-only accounts (users who sign in with Google without password)
    // OAuth users will have empty string '' as passwordHash
    // Code checks for null or empty string to determine OAuth-only accounts
    passwordHash: text("password_hash"),
    isEmailVerified: integer("is_email_verified", { mode: "boolean" })
      .default(false)
      .notNull(),
    // Email verification timestamp (keeps isEmailVerified for backward compatibility)
    emailVerifiedAt: integer("email_verified_at", { mode: "timestamp" }),

    // OAuth (for Google, GitHub, etc.)
    oauthProvider: text("oauth_provider"), // 'google', 'github', etc.
    oauthProviderId: text("oauth_provider_id"), // Unique ID from OAuth provider
    picture: text("picture"), // Profile picture URL from OAuth or user upload

    // Login tracking
    lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
    lastLoginMethod: text("last_login_method"), // 'email' | 'google' | null

    // Onboarding - tracks if user has created or joined a workspace
    hasCompletedOnboarding: integer("has_completed_onboarding", {
      mode: "boolean",
    })
      .default(false)
      .notNull(),

    // Personal Info
    firstName: text("first_name"),
    lastName: text("last_name"),
    dateOfBirth: integer("date_of_birth", { mode: "timestamp" }),

    // Contact Info
    phone: text("phone"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    country: text("country"),
    postalCode: text("postal_code"),

    // Basic role for simple RBAC (extend as needed)
    role: text("role").default("user").notNull(), // admin, manager, user, etc.

    // Status
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  },
  (table) => ({
    // Unique: email per database (each database = one tenant)
    emailUnique: unique("users_email_unique").on(table.email),
    // Unique: OAuth provider + provider ID (prevents duplicate OAuth accounts)
    oauthUnique: unique("users_oauth_unique").on(table.oauthProvider, table.oauthProviderId),
    // Critical: email used for login
    emailIdx: index("users_email_idx").on(table.email),
    // OAuth lookup
    oauthIdx: index("users_oauth_idx").on(table.oauthProvider, table.oauthProviderId),
    // Common query indexes
    roleIdx: index("users_role_idx").on(table.role),
    activeIdx: index("users_active_idx").on(table.isActive),
    deletedIdx: index("users_deleted_idx").on(table.deletedAt),
  })
);

// ============================================================================
// WORKSPACE DOMAIN - Multi-Workspace Support (Single Database)
// ============================================================================

/**
 * Workspaces table
 * Represents an organization/workspace in the system
 * Users can belong to multiple workspaces
 */
export const workspaces = sqliteTable(
  "workspaces",
  {
    ...baseFields,

    name: text("name").notNull(),
    slug: text("slug").notNull(), // URL-friendly identifier
    description: text("description"),

    // Settings stored as JSON
    settings: text("settings", { mode: "json" })
      .$type<Record<string, any>>()
      .default({}),

    // Owner (creator) of the workspace
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  },
  (table) => ({
    slugUnique: unique("workspaces_slug_unique").on(table.slug),
    ownerIdx: index("workspaces_owner_idx").on(table.ownerId),
    activeIdx: index("workspaces_active_idx").on(table.isActive),
    deletedIdx: index("workspaces_deleted_idx").on(table.deletedAt),
  })
);

/**
 * Workspace Members (many-to-many: users <-> workspaces)
 * Tracks which users belong to which workspaces and their role
 */
export const workspaceMembers = sqliteTable(
  "workspace_members",
  {
    ...baseFields,

    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Role within this workspace (uses RoleName from config/rbac.ts)
    role: text("role").default("user").notNull(),

    // When they joined
    joinedAt: integer("joined_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    memberUnique: unique("workspace_members_unique").on(
      table.workspaceId,
      table.userId
    ),
    workspaceIdx: index("workspace_members_workspace_idx").on(table.workspaceId),
    userIdx: index("workspace_members_user_idx").on(table.userId),
    roleIdx: index("workspace_members_role_idx").on(table.role),
  })
);

/**
 * Workspace Invites
 * Pending invitations to join a workspace
 */
export const workspaceInvites = sqliteTable(
  "workspace_invites",
  {
    ...baseFields,

    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    // Email of the invitee (may not be a user yet)
    email: text("email").notNull(),

    // Role they'll have when they accept
    role: text("role").default("user").notNull(),

    // Who sent the invite
    invitedById: text("invited_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Token for accepting the invite
    token: text("token").notNull(),

    // Expiration
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),

    // Status
    acceptedAt: integer("accepted_at", { mode: "timestamp" }),
    acceptedByUserId: text("accepted_by_user_id").references(() => users.id),
  },
  (table) => ({
    tokenUnique: unique("workspace_invites_token_unique").on(table.token),
    workspaceIdx: index("workspace_invites_workspace_idx").on(table.workspaceId),
    emailIdx: index("workspace_invites_email_idx").on(table.email),
    expiresIdx: index("workspace_invites_expires_idx").on(table.expiresAt),
  })
);

// ============================================================================
// RBAC - Config-Based Role System
// ============================================================================
// Roles are defined in server/config/rbac.ts (no database tables needed)
// User's global role: users.role field
// Workspace role: workspace_members.role field
// Both use the same role names from config (admin, manager, user, etc.)
// ============================================================================

/**
 * User settings (JSON storage)
 * User preferences and configuration
 */
export const userSettings = sqliteTable(
  "user_settings",
  {
    ...baseFields,

    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    // Store as JSON text
    settings: text("settings", { mode: "json" })
      .$type<Record<string, any>>()
      .default({}),
  },
  (table) => ({
    userIdx: index("user_settings_user_idx").on(table.userId),
  })
);

/**
 * Audit log
 * Track all significant actions for compliance
 * Workspace-scoped for multi-workspace isolation
 */
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    ...baseFields,

    // Workspace isolation - which workspace this log belongs to
    // Nullable for system-level actions that aren't workspace-specific
    workspaceId: text("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),

    // User who performed action (nullable - system actions have no user)
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    action: text("action").notNull(), // e.g., "USER_SIGNED_UP", "POST_PUBLISHED"

    // Entity affected
    entityType: text("entity_type"), // e.g., "User", "Post"
    entityId: text("entity_id"),

    // Request context (for tracking and debugging)
    requestId: text("request_id"),
    endpoint: text("endpoint"),
    method: text("method"),
    statusCode: integer("status_code"),

    // State tracking (before/after)
    stateBefore: text("state_before", { mode: "json" }).$type<
      Record<string, any>
    >(),
    stateAfter: text("state_after", { mode: "json" }).$type<
      Record<string, any>
    >(),

    // Additional metadata
    metadata: text("metadata", { mode: "json" }).$type<Record<string, any>>(),

    // Network info
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (table) => ({
    workspaceIdx: index("audit_logs_workspace_idx").on(table.workspaceId),
    userIdx: index("audit_logs_user_idx").on(table.userId),
    actionIdx: index("audit_logs_action_idx").on(table.action),
    entityIdx: index("audit_logs_entity_idx").on(
      table.entityType,
      table.entityId
    ),
    requestIdx: index("audit_logs_request_idx").on(table.requestId),
    endpointIdx: index("audit_logs_endpoint_idx").on(table.endpoint),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  })
);

// ============================================================================
// RELATIONS (Drizzle ORM)
// ============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  auditLogs: many(auditLogs),
  workspaceMemberships: many(workspaceMembers),
  ownedWorkspaces: many(workspaces),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  members: many(workspaceMembers),
  invites: many(workspaceInvites),
  auditLogs: many(auditLogs),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
}));

export const workspaceInvitesRelations = relations(workspaceInvites, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceInvites.workspaceId],
    references: [workspaces.id],
  }),
  invitedBy: one(users, {
    fields: [workspaceInvites.invitedById],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [auditLogs.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// TypeScript TYPES (inferred from schema)
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;

export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;

export type WorkspaceInvite = typeof workspaceInvites.$inferSelect;
export type NewWorkspaceInvite = typeof workspaceInvites.$inferInsert;

// ============================================================================
// Permission Codes (extend with your app-specific permissions)
// ============================================================================
// Uses CRUD naming: read/create/update/delete (matches config/rbac.ts)
// ============================================================================

export type PermissionCode =
  // Users
  | "users:read"
  | "users:create"
  | "users:update"
  | "users:delete"
  | "users:*" // All user permissions
  // Roles
  | "roles:read"
  | "roles:create"
  | "roles:update"
  | "roles:delete"
  | "roles:*" // All role permissions
  // Profile (self)
  | "profile:read"
  | "profile:update"
  // Audit
  | "audit:read"
  // System
  | "*"; // Super admin - all permissions
