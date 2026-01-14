import { describe, it, expect, vi, beforeEach } from "vitest";
import { RBACService } from "#server/services/rbac";
import { PermissionDeniedError } from "#server/error/errors";

// Mock the UserRepository
const mockFindById = vi.fn();

vi.mock("#server/repositories/identity", () => ({
  UserRepository: vi.fn().mockImplementation(() => ({
    findById: mockFindById,
  })),
}));

describe("RBACService", () => {
  let rbacService: RBACService;
  const mockDb = {} as D1Database;

  beforeEach(() => {
    vi.clearAllMocks();
    rbacService = new RBACService(mockDb);
  });

  describe("configuration", () => {
    it("is enabled by default", () => {
      expect(rbacService.isEnabled()).toBe(true);
    });

    it("respects enabled config option", () => {
      const disabledService = new RBACService(mockDb, { enabled: false });
      expect(disabledService.isEnabled()).toBe(false);
    });

    it("getConfig returns config object", () => {
      const config = rbacService.getConfig();
      expect(config).toHaveProperty("enabled");
      expect(config).toHaveProperty("allowAllWhenDisabled");
    });
  });

  describe("userHasPermission", () => {
    it("returns true when RBAC disabled and allowAllWhenDisabled is true", async () => {
      const disabledService = new RBACService(mockDb, {
        enabled: false,
        allowAllWhenDisabled: true,
      });
      const result = await disabledService.userHasPermission(
        "user-1",
        "users:read"
      );
      expect(result).toBe(true);
      expect(mockFindById).not.toHaveBeenCalled();
    });

    it("returns false when user not found", async () => {
      mockFindById.mockResolvedValue(null);
      const result = await rbacService.userHasPermission("user-1", "users:read");
      expect(result).toBe(false);
    });

    it("returns false when user is inactive", async () => {
      mockFindById.mockResolvedValue({ id: "user-1", role: "admin", isActive: false });
      const result = await rbacService.userHasPermission("user-1", "users:read");
      expect(result).toBe(false);
    });

    it("returns true for admin with any permission", async () => {
      mockFindById.mockResolvedValue({ id: "user-1", role: "admin", isActive: true });
      const result = await rbacService.userHasPermission(
        "user-1",
        "anything:here"
      );
      expect(result).toBe(true);
    });

    it("returns true when user role has permission", async () => {
      mockFindById.mockResolvedValue({ id: "user-1", role: "user", isActive: true });
      const result = await rbacService.userHasPermission(
        "user-1",
        "profile:read"
      );
      expect(result).toBe(true);
    });

    it("returns false when user role lacks permission", async () => {
      mockFindById.mockResolvedValue({ id: "user-1", role: "user", isActive: true });
      const result = await rbacService.userHasPermission(
        "user-1",
        "users:delete"
      );
      expect(result).toBe(false);
    });
  });

  describe("requirePermission", () => {
    it("does not throw when user has permission", async () => {
      mockFindById.mockResolvedValue({ id: "user-1", role: "admin", isActive: true });
      await expect(
        rbacService.requirePermission("user-1", "users:read")
      ).resolves.not.toThrow();
    });

    it("throws PermissionDeniedError when user lacks permission", async () => {
      mockFindById.mockResolvedValue({ id: "user-1", role: "user", isActive: true });
      await expect(
        rbacService.requirePermission("user-1", "users:delete")
      ).rejects.toThrow(PermissionDeniedError);
    });

    it("throws when user not found", async () => {
      mockFindById.mockResolvedValue(null);
      await expect(
        rbacService.requirePermission("user-1", "users:read")
      ).rejects.toThrow(PermissionDeniedError);
    });
  });

  describe("userHasAnyPermission", () => {
    it("returns true when RBAC disabled", async () => {
      const disabledService = new RBACService(mockDb, { enabled: false });
      const result = await disabledService.userHasAnyPermission("user-1", [
        "users:read",
        "users:delete",
      ]);
      expect(result).toBe(true);
    });

    it("returns true when user has at least one permission", async () => {
      mockFindById.mockResolvedValue({ id: "user-1", role: "user", isActive: true });
      const result = await rbacService.userHasAnyPermission("user-1", [
        "users:delete", // user doesn't have
        "profile:read", // user has
      ]);
      expect(result).toBe(true);
    });

    it("returns false when user has none of the permissions", async () => {
      mockFindById.mockResolvedValue({ id: "user-1", role: "user", isActive: true });
      const result = await rbacService.userHasAnyPermission("user-1", [
        "users:delete",
        "roles:create",
      ]);
      expect(result).toBe(false);
    });
  });

  describe("userHasAllPermissions", () => {
    it("returns true when RBAC disabled", async () => {
      const disabledService = new RBACService(mockDb, { enabled: false });
      const result = await disabledService.userHasAllPermissions("user-1", [
        "users:read",
        "users:delete",
      ]);
      expect(result).toBe(true);
    });

    it("returns true when user has all permissions", async () => {
      mockFindById.mockResolvedValue({ id: "user-1", role: "user", isActive: true });
      const result = await rbacService.userHasAllPermissions("user-1", [
        "profile:read",
        "profile:update",
      ]);
      expect(result).toBe(true);
    });

    it("returns false when user lacks one permission", async () => {
      mockFindById.mockResolvedValue({ id: "user-1", role: "user", isActive: true });
      const result = await rbacService.userHasAllPermissions("user-1", [
        "profile:read",
        "users:delete",
      ]);
      expect(result).toBe(false);
    });
  });

  describe("getUserPermissions", () => {
    it("returns empty array when RBAC disabled", async () => {
      const disabledService = new RBACService(mockDb, { enabled: false });
      const permissions = await disabledService.getUserPermissions("user-1");
      expect(permissions).toEqual([]);
    });

    it("returns empty array when user not found", async () => {
      mockFindById.mockResolvedValue(null);
      const permissions = await rbacService.getUserPermissions("user-1");
      expect(permissions).toEqual([]);
    });

    it("returns permissions for valid user", async () => {
      mockFindById.mockResolvedValue({ id: "user-1", role: "user", isActive: true });
      const permissions = await rbacService.getUserPermissions("user-1");
      expect(permissions).toContain("profile:read");
      expect(permissions).toContain("profile:update");
    });
  });

  describe("getUserRole", () => {
    it("returns null when user not found", async () => {
      mockFindById.mockResolvedValue(null);
      const role = await rbacService.getUserRole("user-1");
      expect(role).toBeNull();
    });

    it("returns user role", async () => {
      mockFindById.mockResolvedValue({ id: "user-1", role: "manager", isActive: true });
      const role = await rbacService.getUserRole("user-1");
      expect(role).toBe("manager");
    });
  });

  describe("getAvailableRoles", () => {
    it("returns all configured roles", () => {
      const roles = rbacService.getAvailableRoles();
      const roleNames = roles.map((r) => r.name);
      expect(roleNames).toContain("admin");
      expect(roleNames).toContain("manager");
      expect(roleNames).toContain("user");
    });

    it("includes role config for each role", () => {
      const roles = rbacService.getAvailableRoles();
      for (const role of roles) {
        expect(role.config).toBeDefined();
        expect(role.config.name).toBeDefined();
        expect(role.config.permissions).toBeDefined();
      }
    });
  });

  describe("getRoleConfig", () => {
    it("returns config for valid role", () => {
      const config = rbacService.getRoleConfig("admin");
      expect(config).toBeDefined();
      expect(config?.name).toBe("Admin");
    });

    it("returns null for invalid role", () => {
      const config = rbacService.getRoleConfig("nonexistent" as any);
      expect(config).toBeNull();
    });
  });

  describe("isValidRole", () => {
    it("returns true for valid roles", () => {
      expect(rbacService.isValidRole("admin")).toBe(true);
      expect(rbacService.isValidRole("manager")).toBe(true);
      expect(rbacService.isValidRole("user")).toBe(true);
    });

    it("returns false for invalid roles", () => {
      expect(rbacService.isValidRole("superuser")).toBe(false);
      expect(rbacService.isValidRole("")).toBe(false);
      expect(rbacService.isValidRole("Admin")).toBe(false); // case sensitive
    });
  });

  describe("getPermissionDefinitions", () => {
    it("returns permission definitions object", () => {
      const definitions = rbacService.getPermissionDefinitions();
      expect(definitions).toHaveProperty("*");
      expect(definitions).toHaveProperty("users:read");
    });

    it("returns a copy, not the original", () => {
      const definitions1 = rbacService.getPermissionDefinitions();
      const definitions2 = rbacService.getPermissionDefinitions();
      expect(definitions1).not.toBe(definitions2);
    });
  });
});
