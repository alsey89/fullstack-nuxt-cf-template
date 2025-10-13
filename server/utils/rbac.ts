import type { H3Event } from "h3";
import type { PermissionCode } from "#server/database/schema/identity";
import { isDevelopment } from "#server/utils/environment";

// ========================================
// RBAC UTILITY HELPERS
// ========================================
// Convenience functions for permission checking and RBAC operations
// These wrap the RBACService for common use cases
// ========================================

/**
 * Permission matching utilities
 * Handles wildcard permission matching (e.g., "users:*", "*")
 */
export class PermissionMatcher {
  /**
   * Check if a permission code matches a pattern (supports wildcards)
   */
  static matches(permission: PermissionCode, pattern: PermissionCode): boolean {
    // Exact match
    if (permission === pattern) {
      return true;
    }

    // Super admin wildcard
    if (pattern === "*") {
      return true;
    }

    // Category wildcard (e.g., "users:*" matches "users:view")
    if (pattern.endsWith(":*")) {
      const category = pattern.slice(0, -2);
      return permission.startsWith(`${category}:`);
    }

    return false;
  }

  /**
   * Check if user has permission based on their permission list
   */
  static hasPermission(
    userPermissions: PermissionCode[],
    requiredPermission: PermissionCode
  ): boolean {
    for (const permission of userPermissions) {
      if (this.matches(requiredPermission, permission)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has ANY of the required permissions
   */
  static hasAnyPermission(
    userPermissions: PermissionCode[],
    requiredPermissions: PermissionCode[]
  ): boolean {
    for (const required of requiredPermissions) {
      if (this.hasPermission(userPermissions, required)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has ALL of the required permissions
   */
  static hasAllPermissions(
    userPermissions: PermissionCode[],
    requiredPermissions: PermissionCode[]
  ): boolean {
    for (const required of requiredPermissions) {
      if (!this.hasPermission(userPermissions, required)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Filter permissions by category
   */
  static filterByCategory(
    permissions: PermissionCode[],
    category: string
  ): PermissionCode[] {
    return permissions.filter((p) => p.startsWith(`${category}:`));
  }

  /**
   * Get all categories from permission list
   */
  static getCategories(permissions: PermissionCode[]): string[] {
    const categories = new Set<string>();
    for (const permission of permissions) {
      if (permission === "*") continue;
      const [category] = permission.split(":");
      if (category) {
        categories.add(category);
      }
    }
    return Array.from(categories);
  }
}

/**
 * Permission validation utilities
 */
export class PermissionValidator {
  /**
   * Validate permission code format
   */
  static isValidFormat(code: string): boolean {
    // Must be "*" or "category:action" or "category:*"
    if (code === "*") return true;

    const parts = code.split(":");
    if (parts.length !== 2) return false;

    const [category, action] = parts;
    if (!category || !action) return false;

    // Category and action must be alphanumeric with underscores
    const validPattern = /^[a-z0-9_]+$/;
    return (
      validPattern.test(category) &&
      (action === "*" || validPattern.test(action))
    );
  }

  /**
   * Validate multiple permission codes
   */
  static areValidFormats(codes: string[]): boolean {
    return codes.every((code) => this.isValidFormat(code));
  }

  /**
   * Extract category from permission code
   */
  static getCategory(code: PermissionCode): string | null {
    if (code === "*") return null;
    const [category] = code.split(":");
    return category || null;
  }

  /**
   * Extract action from permission code
   */
  static getAction(code: PermissionCode): string | null {
    if (code === "*") return null;
    const parts = code.split(":");
    return parts[1] || null;
  }
}

/**
 * Role utilities
 */
export class RoleUtils {
  /**
   * Check if role name is a system role
   */
  static isSystemRole(name: string): boolean {
    const systemRoles = ["admin", "manager", "user"];
    return systemRoles.includes(name.toLowerCase());
  }

  /**
   * Get role display name
   */
  static getDisplayName(name: string): string {
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Sanitize role name for storage
   */
  static sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_{2,}/g, "_")
      .replace(/^_|_$/g, "");
  }
}

/**
 * RBAC debugging utilities
 */
export class RBACDebugger {
  /**
   * Log permission check (useful for debugging)
   */
  static logPermissionCheck(
    userId: string,
    permission: PermissionCode,
    granted: boolean,
    userPermissions: PermissionCode[]
  ): void {
    if (isDevelopment()) {
      console.log("[RBAC] Permission Check:", {
        userId,
        requiredPermission: permission,
        granted,
        userPermissions,
      });
    }
  }

  /**
   * Get permission mismatch details
   */
  static getPermissionMismatch(
    required: PermissionCode,
    available: PermissionCode[]
  ): {
    missing: PermissionCode;
    available: PermissionCode[];
    suggestions: string[];
  } {
    const suggestions: string[] = [];

    const requiredCategory = PermissionValidator.getCategory(required);
    if (requiredCategory) {
      // Check if user has category wildcard
      const categoryWildcard = `${requiredCategory}:*` as PermissionCode;
      if (!available.includes(categoryWildcard)) {
        suggestions.push(
          `Grant ${categoryWildcard} for full ${requiredCategory} access`
        );
      }

      // Check if user has any permissions in this category
      const categoryPermissions = PermissionMatcher.filterByCategory(
        available,
        requiredCategory
      );
      if (categoryPermissions.length === 0) {
        suggestions.push(`No permissions in ${requiredCategory} category`);
      }
    }

    // Check if user has super admin
    if (!available.includes("*")) {
      suggestions.push("Grant * for super admin access");
    }

    return {
      missing: required,
      available,
      suggestions,
    };
  }
}

/**
 * Type guard utilities
 */
export function isPermissionCode(value: string): value is PermissionCode {
  return PermissionValidator.isValidFormat(value);
}

export function assertPermissionCode(
  value: string
): asserts value is PermissionCode {
  if (!PermissionValidator.isValidFormat(value)) {
    throw new Error(`Invalid permission code: ${value}`);
  }
}

/**
 * Convenience functions for common permission checks
 */
export const PermissionChecks = {
  // Users
  canViewUsers: (permissions: PermissionCode[]) =>
    PermissionMatcher.hasPermission(permissions, "users:view"),
  canCreateUsers: (permissions: PermissionCode[]) =>
    PermissionMatcher.hasPermission(permissions, "users:create"),
  canUpdateUsers: (permissions: PermissionCode[]) =>
    PermissionMatcher.hasPermission(permissions, "users:update"),
  canDeleteUsers: (permissions: PermissionCode[]) =>
    PermissionMatcher.hasPermission(permissions, "users:delete"),

  // Roles
  canViewRoles: (permissions: PermissionCode[]) =>
    PermissionMatcher.hasPermission(permissions, "roles:view"),
  canCreateRoles: (permissions: PermissionCode[]) =>
    PermissionMatcher.hasPermission(permissions, "roles:create"),
  canUpdateRoles: (permissions: PermissionCode[]) =>
    PermissionMatcher.hasPermission(permissions, "roles:update"),
  canDeleteRoles: (permissions: PermissionCode[]) =>
    PermissionMatcher.hasPermission(permissions, "roles:delete"),

  // Super admin
  isSuperAdmin: (permissions: PermissionCode[]) => permissions.includes("*"),
};
