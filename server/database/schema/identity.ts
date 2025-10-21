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
    passwordHash: text("password_hash").notNull(),
    isEmailVerified: integer("is_email_verified", { mode: "boolean" })
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
    // Critical: email used for login
    emailIdx: index("users_email_idx").on(table.email),
    // Common query indexes
    roleIdx: index("users_role_idx").on(table.role),
    activeIdx: index("users_active_idx").on(table.isActive),
    deletedIdx: index("users_deleted_idx").on(table.deletedAt),
  })
);

/**
 * Permission definitions (registry/validation table)
 * Defines all available permissions in the system
 * NOT joined at runtime - used for validation and admin UI metadata
 */
export const permissions = sqliteTable(
  "permissions",
  {
    code: text("code").primaryKey(), // e.g., "users:create", "posts:read"
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull(), // e.g., "users", "content", "admin"
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
  },
  (table) => ({
    categoryIdx: index("permissions_category_idx").on(table.category),
    deletedIdx: index("permissions_deleted_idx").on(table.deletedAt),
  })
);

/**
 * Roles table
 * Defines reusable permission sets with JSON array storage for fast queries
 */
export const roles = sqliteTable(
  "roles",
  {
    ...baseFields,

    name: text("name").notNull(),
    description: text("description"),
    // JSON array of permission codes for fast runtime access
    permissions: text("permissions", { mode: "json" })
      .$type<PermissionCode[]>()
      .notNull()
      .default([]),
    // System roles cannot be deleted (admin, manager, user)
    isSystem: integer("is_system", { mode: "boolean" })
      .default(false)
      .notNull(),
  },
  (table) => ({
    nameUnique: unique("roles_name_unique").on(table.name),
    systemIdx: index("roles_system_idx").on(table.isSystem),
    deletedIdx: index("roles_deleted_idx").on(table.deletedAt),
  })
);

/**
 * User-Role junction table (many-to-many)
 * Users can have multiple roles, roles can be assigned to multiple users
 */
export const userRoles = sqliteTable(
  "user_roles",
  {
    ...baseFields,

    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
  },
  (table) => ({
    // Unique: one role assignment per user-role pair
    userRoleUnique: unique("user_roles_unique").on(table.userId, table.roleId),
    userIdx: index("user_roles_user_idx").on(table.userId),
    roleIdx: index("user_roles_role_idx").on(table.roleId),
  })
);

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
 */
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    ...baseFields,

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
  roles: many(userRoles),
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  auditLogs: many(auditLogs),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

// ============================================================================
// TypeScript TYPES (inferred from schema)
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// ============================================================================
// Permission Codes (extend with your app-specific permissions)
// ============================================================================

export type PermissionCode =
  // Users
  | "users:view"
  | "users:create"
  | "users:update"
  | "users:delete"
  | "users:*" // All user permissions
  // Roles
  | "roles:view"
  | "roles:create"
  | "roles:update"
  | "roles:delete"
  | "roles:*" // All role permissions
  // System
  | "*"; // Super admin - all permissions
