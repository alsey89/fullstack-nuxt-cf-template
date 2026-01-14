import { describe, it, expect } from "vitest";
import {
  DEFAULT_ROLES,
  PERMISSION_DEFINITIONS,
  permissionMatches,
  hasPermission,
  getRolePermissions,
  getCombinedPermissions,
  type RoleName,
} from "#server/config/rbac";

describe("DEFAULT_ROLES", () => {
  it("has admin role with superadmin wildcard", () => {
    expect(DEFAULT_ROLES.admin).toBeDefined();
    expect(DEFAULT_ROLES.admin.permissions).toContain("*");
  });

  it("has manager role with specific permissions", () => {
    expect(DEFAULT_ROLES.manager).toBeDefined();
    expect(DEFAULT_ROLES.manager.permissions).toContain("users:read");
    expect(DEFAULT_ROLES.manager.permissions).toContain("users:create");
    expect(DEFAULT_ROLES.manager.permissions).toContain("users:update");
    expect(DEFAULT_ROLES.manager.permissions).toContain("roles:read");
    expect(DEFAULT_ROLES.manager.permissions).toContain("audit:read");
  });

  it("has user role with profile permissions only", () => {
    expect(DEFAULT_ROLES.user).toBeDefined();
    expect(DEFAULT_ROLES.user.permissions).toContain("profile:read");
    expect(DEFAULT_ROLES.user.permissions).toContain("profile:update");
    expect(DEFAULT_ROLES.user.permissions).not.toContain("users:read");
  });

  it("all roles have name and description", () => {
    for (const [key, role] of Object.entries(DEFAULT_ROLES)) {
      expect(role.name).toBeDefined();
      expect(role.name.length).toBeGreaterThan(0);
      expect(role.description).toBeDefined();
      expect(role.description.length).toBeGreaterThan(0);
    }
  });
});

describe("PERMISSION_DEFINITIONS", () => {
  it("has superadmin wildcard definition", () => {
    expect(PERMISSION_DEFINITIONS["*"]).toBeDefined();
  });

  it("has category wildcard definitions", () => {
    expect(PERMISSION_DEFINITIONS["users:*"]).toBeDefined();
    expect(PERMISSION_DEFINITIONS["roles:*"]).toBeDefined();
  });

  it("has user permission definitions", () => {
    expect(PERMISSION_DEFINITIONS["users:read"]).toBeDefined();
    expect(PERMISSION_DEFINITIONS["users:create"]).toBeDefined();
    expect(PERMISSION_DEFINITIONS["users:update"]).toBeDefined();
    expect(PERMISSION_DEFINITIONS["users:delete"]).toBeDefined();
  });

  it("has role permission definitions", () => {
    expect(PERMISSION_DEFINITIONS["roles:read"]).toBeDefined();
    expect(PERMISSION_DEFINITIONS["roles:create"]).toBeDefined();
    expect(PERMISSION_DEFINITIONS["roles:update"]).toBeDefined();
    expect(PERMISSION_DEFINITIONS["roles:delete"]).toBeDefined();
  });

  it("has profile permission definitions", () => {
    expect(PERMISSION_DEFINITIONS["profile:read"]).toBeDefined();
    expect(PERMISSION_DEFINITIONS["profile:update"]).toBeDefined();
  });

  it("has audit permission definition", () => {
    expect(PERMISSION_DEFINITIONS["audit:read"]).toBeDefined();
  });
});

describe("permissionMatches", () => {
  it("matches exact permission", () => {
    expect(permissionMatches("users:read", "users:read")).toBe(true);
  });

  it("does not match different permissions", () => {
    expect(permissionMatches("users:read", "users:write")).toBe(false);
  });

  it("superadmin wildcard matches everything", () => {
    expect(permissionMatches("*", "users:read")).toBe(true);
    expect(permissionMatches("*", "roles:delete")).toBe(true);
    expect(permissionMatches("*", "anything:here")).toBe(true);
  });

  it("category wildcard matches permissions in category", () => {
    expect(permissionMatches("users:*", "users:read")).toBe(true);
    expect(permissionMatches("users:*", "users:create")).toBe(true);
    expect(permissionMatches("users:*", "users:delete")).toBe(true);
  });

  it("category wildcard does not match other categories", () => {
    expect(permissionMatches("users:*", "roles:read")).toBe(false);
    expect(permissionMatches("users:*", "audit:read")).toBe(false);
  });

  it("specific permission does not match wildcard requirement", () => {
    expect(permissionMatches("users:read", "*")).toBe(false);
    expect(permissionMatches("users:read", "users:*")).toBe(false);
  });
});

describe("hasPermission", () => {
  it("returns true when permission exists in array", () => {
    expect(hasPermission(["users:read", "users:create"], "users:read")).toBe(
      true
    );
  });

  it("returns false when permission not in array", () => {
    expect(hasPermission(["users:read"], "users:create")).toBe(false);
  });

  it("returns true when array contains superadmin wildcard", () => {
    expect(hasPermission(["*"], "anything:here")).toBe(true);
  });

  it("returns true when array contains matching category wildcard", () => {
    expect(hasPermission(["users:*", "roles:read"], "users:delete")).toBe(true);
  });

  it("returns false for empty permissions array", () => {
    expect(hasPermission([], "users:read")).toBe(false);
  });
});

describe("getRolePermissions", () => {
  it("returns permissions for valid role", () => {
    const permissions = getRolePermissions("admin");
    expect(permissions).toContain("*");
  });

  it("returns user role permissions", () => {
    const permissions = getRolePermissions("user");
    expect(permissions).toContain("profile:read");
    expect(permissions).toContain("profile:update");
  });

  it("returns manager role permissions", () => {
    const permissions = getRolePermissions("manager");
    expect(permissions).toContain("users:read");
  });

  it("returns empty array for invalid role", () => {
    const permissions = getRolePermissions("nonexistent");
    expect(permissions).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    const permissions = getRolePermissions("");
    expect(permissions).toEqual([]);
  });
});

describe("getCombinedPermissions", () => {
  it("combines permissions from multiple roles", () => {
    const permissions = getCombinedPermissions(["user", "manager"]);
    expect(permissions).toContain("profile:read");
    expect(permissions).toContain("users:read");
  });

  it("deduplicates permissions", () => {
    // Both roles would have profile:read if we had overlap
    const permissions = getCombinedPermissions(["user", "user"]);
    const profileReadCount = permissions.filter(
      (p) => p === "profile:read"
    ).length;
    expect(profileReadCount).toBe(1);
  });

  it("returns empty array for empty role list", () => {
    const permissions = getCombinedPermissions([]);
    expect(permissions).toEqual([]);
  });

  it("handles invalid roles gracefully", () => {
    const permissions = getCombinedPermissions(["invalid", "user"]);
    expect(permissions).toContain("profile:read");
  });

  it("returns array for single role", () => {
    const permissions = getCombinedPermissions(["admin"]);
    expect(permissions).toContain("*");
  });
});
