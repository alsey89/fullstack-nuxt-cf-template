import type { H3Event } from "h3";
import { UserRepository } from "#server/repositories/identity";
import type { PermissionCode } from "#server/database/schema/identity";
import { getDatabase } from "#server/database/utils";
import { AuthorizationError, PermissionDeniedError } from "#server/error/errors";
import {
  DEFAULT_ROLES,
  PERMISSION_DEFINITIONS,
  hasPermission as configHasPermission,
  getRolePermissions,
  type RoleName,
} from "#server/config/rbac";

// ========================================
// RBAC SERVICE
// ========================================
// Config-based Role-Based Access Control
// Roles are defined in server/config/rbac.ts (no database tables)
// User's role is stored in users.role field
// ========================================

/**
 * RBAC Service Configuration
 */
export interface RBACConfig {
  enabled: boolean; // Toggle RBAC enforcement
  allowAllWhenDisabled: boolean; // Allow all actions when RBAC disabled
}

/**
 * RBAC Service
 *
 * Config-based role system:
 * - Roles defined in server/config/rbac.ts
 * - User's role stored in users.role field
 * - No database queries for permission checks (fast)
 */
export class RBACService {
  private userRepo: UserRepository;
  private config: RBACConfig;

  constructor(database: D1Database, config?: Partial<RBACConfig>) {
    this.userRepo = new UserRepository(database);

    // Default configuration: RBAC enabled
    this.config = {
      enabled: config?.enabled ?? true,
      allowAllWhenDisabled: config?.allowAllWhenDisabled ?? true,
    };
  }

  // ========================================
  // CONFIGURATION
  // ========================================

  /**
   * Check if RBAC is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get RBAC configuration
   */
  getConfig(): RBACConfig {
    return { ...this.config };
  }

  // ========================================
  // AUTHORIZATION CHECKS
  // ========================================

  /**
   * Check if user has a specific permission
   * Graceful degradation: Returns true when RBAC disabled
   *
   * Reads user's role from users.role field and checks
   * permissions from config/rbac.ts based on that role.
   */
  async userHasPermission(userId: string, permission: PermissionCode): Promise<boolean> {
    // Graceful degradation: Allow all when RBAC disabled
    if (!this.config.enabled && this.config.allowAllWhenDisabled) {
      return true;
    }

    // Check if user exists and is active
    const user = await this.userRepo.findById(userId);
    if (!user || !user.isActive) {
      return false;
    }

    // Get permissions from config based on user's role
    const roleName = user.role as RoleName;
    const permissions = getRolePermissions(roleName);
    return configHasPermission(permissions, permission);
  }

  /**
   * Require permission (throws if not granted)
   * Graceful degradation: No-op when RBAC disabled
   */
  async requirePermission(userId: string, permission: PermissionCode): Promise<void> {
    const hasPermission = await this.userHasPermission(userId, permission);

    if (!hasPermission) {
      throw new PermissionDeniedError(permission, `Permission denied: ${permission} required`);
    }
  }

  /**
   * Check if user has ANY of the specified permissions
   */
  async userHasAnyPermission(
    userId: string,
    permissions: PermissionCode[]
  ): Promise<boolean> {
    // Graceful degradation
    if (!this.config.enabled && this.config.allowAllWhenDisabled) {
      return true;
    }

    for (const permission of permissions) {
      if (await this.userHasPermission(userId, permission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if user has ALL of the specified permissions
   */
  async userHasAllPermissions(
    userId: string,
    permissions: PermissionCode[]
  ): Promise<boolean> {
    // Graceful degradation
    if (!this.config.enabled && this.config.allowAllWhenDisabled) {
      return true;
    }

    for (const permission of permissions) {
      if (!(await this.userHasPermission(userId, permission))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<PermissionCode[]> {
    // Graceful degradation: Return empty array when disabled
    if (!this.config.enabled) {
      return [];
    }

    const user = await this.userRepo.findById(userId);
    if (!user) return [];

    const roleName = user.role as RoleName;
    return getRolePermissions(roleName) as PermissionCode[];
  }

  /**
   * Get user's role name
   */
  async getUserRole(userId: string): Promise<RoleName | null> {
    const user = await this.userRepo.findById(userId);
    if (!user) return null;

    return user.role as RoleName;
  }

  // ========================================
  // ROLE INFORMATION (Config-Based)
  // ========================================

  /**
   * Get all available roles (from config)
   */
  getAvailableRoles(): Array<{ name: RoleName; config: typeof DEFAULT_ROLES[RoleName] }> {
    return Object.entries(DEFAULT_ROLES).map(([name, config]) => ({
      name: name as RoleName,
      config,
    }));
  }

  /**
   * Get role config by name
   */
  getRoleConfig(roleName: RoleName): typeof DEFAULT_ROLES[RoleName] | null {
    return DEFAULT_ROLES[roleName] ?? null;
  }

  /**
   * Get all permission definitions (for admin UI)
   */
  getPermissionDefinitions(): Record<string, string> {
    return { ...PERMISSION_DEFINITIONS };
  }

  /**
   * Check if a role name is valid
   */
  isValidRole(roleName: string): roleName is RoleName {
    return roleName in DEFAULT_ROLES;
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Get RBAC service for current request
 */
export function getRBACService(event: H3Event, config?: Partial<RBACConfig>): RBACService {
  const db = getDatabase(event);
  const runtimeConfig = useRuntimeConfig(event);

  // Get RBAC configuration from runtime config
  const rbacEnabled = runtimeConfig.rbac?.enabled ?? true;

  return new RBACService(db, {
    enabled: config?.enabled ?? rbacEnabled,
    allowAllWhenDisabled: config?.allowAllWhenDisabled ?? true,
  });
}

/**
 * Check permission for current user in request
 * Convenience function for middleware/route handlers
 */
export async function requirePermission(
  event: H3Event,
  permission: PermissionCode
): Promise<void> {
  const userId = event.context.userId;
  if (!userId) {
    throw new AuthorizationError("Authentication required");
  }

  const rbacService = getRBACService(event);
  await rbacService.requirePermission(userId, permission);
}

/**
 * Check if current user has permission
 * Returns boolean instead of throwing
 */
export async function hasPermission(
  event: H3Event,
  permission: PermissionCode
): Promise<boolean> {
  const userId = event.context.userId;
  if (!userId) {
    return false;
  }

  const rbacService = getRBACService(event);
  return rbacService.userHasPermission(userId, permission);
}

/**
 * Get all permissions for current user
 */
export async function getCurrentUserPermissions(event: H3Event): Promise<PermissionCode[]> {
  const userId = event.context.userId;
  if (!userId) {
    return [];
  }

  const rbacService = getRBACService(event);
  return rbacService.getUserPermissions(userId);
}

/**
 * Get current user's role
 */
export async function getCurrentUserRole(event: H3Event): Promise<RoleName | null> {
  const userId = event.context.userId;
  if (!userId) {
    return null;
  }

  const rbacService = getRBACService(event);
  return rbacService.getUserRole(userId);
}
