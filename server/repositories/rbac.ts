import { eq, and, desc, inArray } from "drizzle-orm";
import * as schema from "../database/schema";
import type { PermissionCode } from "../database/schema/identity";
import { BaseRepository } from "./base";

// ========================================
// RBAC REPOSITORIES
// ========================================
// Repository layer for Role-Based Access Control operations
// Handles roles, permissions, and user-role assignments
// ========================================

/**
 * Role Repository
 * Manages role CRUD operations and role-permission relationships
 */
export class RoleRepository extends BaseRepository {
  /**
   * Create a new role
   */
  async createRole(data: {
    name: string;
    description?: string;
    permissions: PermissionCode[];
    isSystem?: boolean;
  }) {
    const now = new Date();
    const [role] = await this.drizzle
      .insert(schema.roles)
      .values({
        id: crypto.randomUUID(),
        name: data.name,
        description: data.description,
        permissions: data.permissions,
        isSystem: data.isSystem ?? false,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      .returning();

    return role;
  }

  /**
   * Get role by ID
   */
  async getRoleById(roleId: string) {
    const [role] = await this.drizzle
      .select()
      .from(schema.roles)
      .where(and(eq(schema.roles.id, roleId), this.notDeleted(schema.roles)));

    return role || null;
  }

  /**
   * Get role by name
   */
  async getRoleByName(name: string) {
    const [role] = await this.drizzle
      .select()
      .from(schema.roles)
      .where(and(eq(schema.roles.name, name), this.notDeleted(schema.roles)));

    return role || null;
  }

  /**
   * List all roles
   */
  async listRoles(options?: { includeSystem?: boolean }) {
    const conditions = [this.notDeleted(schema.roles)];

    // Optionally exclude system roles
    if (options?.includeSystem === false) {
      conditions.push(eq(schema.roles.isSystem, false));
    }

    return this.drizzle
      .select()
      .from(schema.roles)
      .where(and(...conditions))
      .orderBy(desc(schema.roles.createdAt));
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
    const [role] = await this.drizzle
      .update(schema.roles)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.roles.id, roleId), this.notDeleted(schema.roles)))
      .returning();

    return role || null;
  }

  /**
   * Soft delete role (cannot delete system roles)
   */
  async deleteRole(roleId: string) {
    // Check if role is a system role
    const role = await this.getRoleById(roleId);
    if (!role) {
      return false;
    }

    if (role.isSystem) {
      throw new Error("Cannot delete system role");
    }

    const [deleted] = await this.drizzle
      .update(schema.roles)
      .set({
        deletedAt: new Date(),
      })
      .where(and(eq(schema.roles.id, roleId), this.notDeleted(schema.roles)))
      .returning();

    return !!deleted;
  }

  /**
   * Get all permissions for a role (resolves wildcards)
   */
  async getRolePermissions(roleId: string): Promise<PermissionCode[]> {
    const role = await this.getRoleById(roleId);
    if (!role) {
      return [];
    }

    return role.permissions;
  }

  /**
   * Check if role has specific permission (handles wildcards)
   */
  hasPermission(rolePermissions: PermissionCode[], permission: PermissionCode): boolean {
    // Check for super admin wildcard
    if (rolePermissions.includes("*")) {
      return true;
    }

    // Check for exact permission
    if (rolePermissions.includes(permission)) {
      return true;
    }

    // Check for category wildcard (e.g., "users:*" matches "users:view")
    const [category] = permission.split(":");
    const categoryWildcard = `${category}:*` as PermissionCode;
    if (rolePermissions.includes(categoryWildcard)) {
      return true;
    }

    return false;
  }
}

/**
 * User-Role Repository
 * Manages user-role assignments and user permission resolution
 */
export class UserRoleRepository extends BaseRepository {
  private roleRepo: RoleRepository;

  constructor(database: D1Database) {
    super(database);
    this.roleRepo = new RoleRepository(database);
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(userId: string, roleId: string) {
    const now = new Date();

    // Check if assignment already exists
    const existing = await this.drizzle
      .select()
      .from(schema.userRoles)
      .where(
        and(
          eq(schema.userRoles.userId, userId),
          eq(schema.userRoles.roleId, roleId),
          this.notDeleted(schema.userRoles)
        )
      );

    if (existing.length > 0) {
      return existing[0];
    }

    const [assignment] = await this.drizzle
      .insert(schema.userRoles)
      .values({
        id: crypto.randomUUID(),
        userId,
        roleId,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      .returning();

    return assignment;
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(userId: string, roleId: string) {
    const [removed] = await this.drizzle
      .update(schema.userRoles)
      .set({
        deletedAt: new Date(),
      })
      .where(
        and(
          eq(schema.userRoles.userId, userId),
          eq(schema.userRoles.roleId, roleId),
          this.notDeleted(schema.userRoles)
        )
      )
      .returning();

    return !!removed;
  }

  /**
   * Get all roles for a user
   */
  async getUserRoles(userId: string) {
    const userRoleAssignments = await this.drizzle
      .select({
        role: schema.roles,
      })
      .from(schema.userRoles)
      .innerJoin(
        schema.roles,
        and(
          eq(schema.userRoles.roleId, schema.roles.id),
          this.notDeleted(schema.roles)
        )
      )
      .where(and(eq(schema.userRoles.userId, userId), this.notDeleted(schema.userRoles)));

    return userRoleAssignments.map((ur) => ur.role);
  }

  /**
   * Get all permissions for a user (aggregated from all roles)
   */
  async getUserPermissions(userId: string): Promise<PermissionCode[]> {
    const roles = await this.getUserRoles(userId);

    // Aggregate all permissions from all roles
    const allPermissions = new Set<PermissionCode>();
    for (const role of roles) {
      for (const permission of role.permissions) {
        allPermissions.add(permission);
      }
    }

    return Array.from(allPermissions);
  }

  /**
   * Check if user has specific permission
   */
  async userHasPermission(userId: string, permission: PermissionCode): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return this.roleRepo.hasPermission(permissions, permission);
  }

  /**
   * Get all users with a specific role
   */
  async getUsersByRole(roleId: string) {
    const userRoleAssignments = await this.drizzle
      .select({
        user: schema.users,
      })
      .from(schema.userRoles)
      .innerJoin(
        schema.users,
        and(
          eq(schema.userRoles.userId, schema.users.id),
          this.notDeleted(schema.users)
        )
      )
      .where(and(eq(schema.userRoles.roleId, roleId), this.notDeleted(schema.userRoles)));

    return userRoleAssignments.map((ur) => ur.user);
  }

  /**
   * Replace all roles for a user (removes all existing, assigns new ones)
   */
  async replaceUserRoles(userId: string, roleIds: string[]) {
    // Get existing role assignments
    const existing = await this.drizzle
      .select()
      .from(schema.userRoles)
      .where(and(eq(schema.userRoles.userId, userId), this.notDeleted(schema.userRoles)));

    // Soft delete all existing assignments
    for (const assignment of existing) {
      await this.drizzle
        .update(schema.userRoles)
        .set({ deletedAt: new Date() })
        .where(eq(schema.userRoles.id, assignment.id));
    }

    // Assign new roles
    const assignments = [];
    for (const roleId of roleIds) {
      const assignment = await this.assignRoleToUser(userId, roleId);
      assignments.push(assignment);
    }

    return assignments;
  }
}

/**
 * Permission Repository
 * Manages permission registry (validation/documentation only)
 */
export class PermissionRepository extends BaseRepository {
  /**
   * Get permission by code
   */
  async getPermissionByCode(code: PermissionCode) {
    const [permission] = await this.drizzle
      .select()
      .from(schema.permissions)
      .where(and(eq(schema.permissions.code, code), this.notDeleted(schema.permissions)));

    return permission || null;
  }

  /**
   * List all permissions (grouped by category)
   */
  async listPermissions() {
    return this.drizzle
      .select()
      .from(schema.permissions)
      .where(this.notDeleted(schema.permissions))
      .orderBy(schema.permissions.category, schema.permissions.code);
  }

  /**
   * List permissions by category
   */
  async listPermissionsByCategory(category: string) {
    return this.drizzle
      .select()
      .from(schema.permissions)
      .where(
        and(eq(schema.permissions.category, category), this.notDeleted(schema.permissions))
      )
      .orderBy(schema.permissions.code);
  }

  /**
   * Validate permission codes (check if they exist in registry)
   * Uses batch query to avoid N+1 problem
   */
  async validatePermissions(codes: PermissionCode[]): Promise<boolean> {
    if (codes.length === 0) return true

    // Batch query: check all permissions at once
    const found = await this.drizzle
      .select()
      .from(schema.permissions)
      .where(
        and(
          inArray(schema.permissions.code, codes),
          this.notDeleted(schema.permissions)
        )
      )

    // All codes must exist in registry
    return found.length === codes.length
  }
}
