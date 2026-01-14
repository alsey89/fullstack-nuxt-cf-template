/**
 * Config-Based RBAC
 *
 * Hardcoded role definitions as the default approach.
 * Simple, fast, and requires no database queries for permission checks.
 *
 * For custom roles at runtime, the database tables (roles, userRoles)
 * can be used as a fallback.
 */

export type RoleName = "admin" | "manager" | "user";

export interface RoleConfig {
  name: string;
  description: string;
  permissions: string[];
}

/**
 * Default role definitions
 *
 * Permissions use the format: "resource:action" or "resource:*" for wildcards
 * - "*" grants all permissions (superadmin)
 * - "users:*" grants all user permissions
 * - "users:read" grants specific permission
 */
export const DEFAULT_ROLES: Record<RoleName, RoleConfig> = {
  admin: {
    name: "Admin",
    description: "Full system access",
    permissions: ["*"],
  },
  manager: {
    name: "Manager",
    description: "Manage users and content",
    permissions: [
      "users:read",
      "users:create",
      "users:update",
      "roles:read",
      "audit:read",
    ],
  },
  user: {
    name: "User",
    description: "Standard user access",
    permissions: ["profile:read", "profile:update"],
  },
};

/**
 * Permission registry with descriptions
 * Used for admin UI and documentation
 */
export const PERMISSION_DEFINITIONS: Record<string, string> = {
  // Wildcards
  "*": "Full system access (superadmin)",
  "users:*": "Full user management",
  "roles:*": "Full role management",

  // Users
  "users:read": "View user list and details",
  "users:create": "Create new users",
  "users:update": "Update user information",
  "users:delete": "Delete or deactivate users",

  // Roles
  "roles:read": "View roles and permissions",
  "roles:create": "Create new roles",
  "roles:update": "Modify role permissions",
  "roles:delete": "Delete roles",

  // Profile (self)
  "profile:read": "View own profile",
  "profile:update": "Update own profile",

  // Audit
  "audit:read": "View audit logs",
};

/**
 * Check if a permission grants access to a required permission
 * Handles wildcards: "*" matches everything, "users:*" matches all user permissions
 */
export function permissionMatches(
  granted: string,
  required: string
): boolean {
  // Superadmin wildcard
  if (granted === "*") return true;

  // Exact match
  if (granted === required) return true;

  // Category wildcard (e.g., "users:*" matches "users:read")
  if (granted.endsWith(":*")) {
    const grantedCategory = granted.slice(0, -2); // "users:*" -> "users"
    const requiredCategory = required.split(":")[0]; // "users:read" -> "users"
    return grantedCategory === requiredCategory;
  }

  return false;
}

/**
 * Check if a set of permissions grants access to a required permission
 */
export function hasPermission(
  permissions: string[],
  required: string
): boolean {
  return permissions.some((p) => permissionMatches(p, required));
}

/**
 * Get all permissions for a role (from config)
 */
export function getRolePermissions(roleName: string): string[] {
  const role = DEFAULT_ROLES[roleName as RoleName];
  return role?.permissions ?? [];
}

/**
 * Get combined permissions for multiple roles
 */
export function getCombinedPermissions(roleNames: string[]): string[] {
  const permissions = new Set<string>();

  for (const roleName of roleNames) {
    const rolePermissions = getRolePermissions(roleName);
    rolePermissions.forEach((p) => permissions.add(p));
  }

  return Array.from(permissions);
}
