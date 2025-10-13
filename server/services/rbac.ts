import type { H3Event } from "h3";
import {
  RoleRepository,
  UserRoleRepository,
  PermissionRepository,
} from "#server/repositories/rbac";
import { UserRepository } from "#server/repositories/identity";
import type { PermissionCode } from "#server/database/schema/identity";
import { getDatabase } from "#server/database/utils";
import { AuthorizationError, PermissionDeniedError } from "#server/error/errors";

// ========================================
// RBAC SERVICE
// ========================================
// Service layer for Role-Based Access Control
// Provides graceful degradation when RBAC is disabled
// Handles permission checks, role management, and user authorization
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
 * Main service for managing roles, permissions, and authorization
 */
export class RBACService {
  private roleRepo: RoleRepository;
  private userRoleRepo: UserRoleRepository;
  private permissionRepo: PermissionRepository;
  private userRepo: UserRepository;
  private config: RBACConfig;

  constructor(database: D1Database, config?: Partial<RBACConfig>) {
    this.roleRepo = new RoleRepository(database);
    this.userRoleRepo = new UserRoleRepository(database);
    this.permissionRepo = new PermissionRepository(database);
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

    // RBAC enabled: Check actual permissions
    return this.userRoleRepo.userHasPermission(userId, permission);
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

    return this.userRoleRepo.getUserPermissions(userId);
  }

  // ========================================
  // ROLE MANAGEMENT
  // ========================================

  /**
   * Create a new role
   */
  async createRole(data: {
    name: string;
    description?: string;
    permissions: PermissionCode[];
    isSystem?: boolean;
  }) {
    // Validate permissions exist in registry
    const isValid = await this.permissionRepo.validatePermissions(data.permissions);
    if (!isValid) {
      throw new Error("Invalid permission codes provided");
    }

    return this.roleRepo.createRole(data);
  }

  /**
   * Get role by ID
   */
  async getRoleById(roleId: string) {
    return this.roleRepo.getRoleById(roleId);
  }

  /**
   * Get role by name
   */
  async getRoleByName(name: string) {
    return this.roleRepo.getRoleByName(name);
  }

  /**
   * List all roles with pagination, filtering, and sorting
   */
  async listRoles(
    limit?: number,
    offset?: number,
    filters?: import("#server/types/api").Filter[],
    sortBy?: string,
    sortOrder?: import("#server/types/api").SortOrder,
    options?: { includeSystem?: boolean }
  ) {
    return this.roleRepo.listRoles(limit, offset, filters, sortBy, sortOrder, options);
  }

  /**
   * Count roles with optional filters
   */
  async countRoles(
    filters?: import("#server/types/api").Filter[],
    options?: { includeSystem?: boolean }
  ): Promise<number> {
    return this.roleRepo.countRoles(filters, options);
  }

  /**
   * Update role
   */
  async updateRole(
    roleId: string,
    data: {
      name?: string;
      description?: string;
      permissions?: PermissionCode[];
    }
  ) {
    // Validate permissions if provided
    if (data.permissions) {
      const isValid = await this.permissionRepo.validatePermissions(data.permissions);
      if (!isValid) {
        throw new Error("Invalid permission codes provided");
      }
    }

    return this.roleRepo.updateRole(roleId, data);
  }

  /**
   * Delete role (soft delete)
   */
  async deleteRole(roleId: string) {
    return this.roleRepo.deleteRole(roleId);
  }

  // ========================================
  // USER-ROLE MANAGEMENT
  // ========================================

  /**
   * Assign role to user
   */
  async assignRoleToUser(userId: string, roleId: string) {
    // Verify user exists
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify role exists
    const role = await this.roleRepo.getRoleById(roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    return this.userRoleRepo.assignRoleToUser(userId, roleId);
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(userId: string, roleId: string) {
    return this.userRoleRepo.removeRoleFromUser(userId, roleId);
  }

  /**
   * Get all roles for a user
   */
  async getUserRoles(userId: string) {
    return this.userRoleRepo.getUserRoles(userId);
  }

  /**
   * Get all users with a specific role
   */
  async getUsersByRole(roleId: string) {
    return this.userRoleRepo.getUsersByRole(roleId);
  }

  /**
   * Replace all roles for a user
   */
  async replaceUserRoles(userId: string, roleIds: string[]) {
    // Verify all roles exist
    for (const roleId of roleIds) {
      const role = await this.roleRepo.getRoleById(roleId);
      if (!role) {
        throw new Error(`Role not found: ${roleId}`);
      }
    }

    return this.userRoleRepo.replaceUserRoles(userId, roleIds);
  }

  // ========================================
  // PERMISSION REGISTRY
  // ========================================

  /**
   * List all available permissions with pagination, filtering, and sorting
   */
  async listPermissions(
    limit?: number,
    offset?: number,
    filters?: import("#server/types/api").Filter[],
    sortBy?: string,
    sortOrder?: import("#server/types/api").SortOrder
  ) {
    return this.permissionRepo.listPermissions(limit, offset, filters, sortBy, sortOrder);
  }

  /**
   * Count permissions with optional filters
   */
  async countPermissions(filters?: import("#server/types/api").Filter[]): Promise<number> {
    return this.permissionRepo.countPermissions(filters);
  }

  /**
   * List permissions by category
   */
  async listPermissionsByCategory(category: string) {
    return this.permissionRepo.listPermissionsByCategory(category);
  }

  /**
   * Get permission by code
   */
  async getPermissionByCode(code: PermissionCode) {
    return this.permissionRepo.getPermissionByCode(code);
  }

  /**
   * Validate permission codes
   */
  async validatePermissions(codes: PermissionCode[]): Promise<boolean> {
    return this.permissionRepo.validatePermissions(codes);
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Get RBAC service for current request
 * Uses tenant-specific database from context
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
 * Get all roles for current user
 */
export async function getCurrentUserRoles(event: H3Event) {
  const userId = event.context.userId;
  if (!userId) {
    return [];
  }

  const rbacService = getRBACService(event);
  return rbacService.getUserRoles(userId);
}
