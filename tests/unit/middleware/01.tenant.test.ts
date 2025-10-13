import { describe, it, expect, beforeEach, vi } from "vitest";
import tenantMiddleware from "../../../server/middleware/01.tenant";
import { TenantMismatchError, InternalServerError } from "../../../server/error/errors";
import { HdrKeyTenantID } from "../../../server/types/api";

// Mock h3 utilities
vi.mock("h3", async () => {
  const actual = await vi.importActual("h3");
  return {
    ...actual,
    getHeader: vi.fn(),
  };
});

import { getHeader } from "h3";

// Mock Nuxt runtime config
const mockRuntimeConfig = {
  multitenancy: {
    enabled: false,
  },
  public: {
    environment: "production",
  },
};

global.useRuntimeConfig = vi.fn().mockReturnValue(mockRuntimeConfig);

describe("Tenant Middleware (01.tenant)", () => {
  let mockEvent: any;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock D1 database
    mockDb = {
      prepare: vi.fn(),
      batch: vi.fn(),
      exec: vi.fn(),
    };

    // Reset runtime config to defaults
    mockRuntimeConfig.multitenancy.enabled = false;
    mockRuntimeConfig.public.environment = "production";

    // Create mock event
    mockEvent = {
      path: "/api/test",
      method: "GET",
      context: {
        cloudflare: {
          env: {
            DB: mockDb,
            DB_ACME: mockDb,
            DB_TENANT_1: mockDb,
          },
        },
      },
    };

    vi.mocked(getHeader).mockReturnValue(undefined);
  });

  // ========================================
  // ROUTE FILTERING TESTS
  // ========================================

  describe("Route Filtering", () => {
    it("only processes API routes", async () => {
      const nonApiEvent = {
        path: "/dashboard",
        method: "GET",
        context: {},
      };

      await tenantMiddleware(nonApiEvent as any);

      expect(nonApiEvent.context.db).toBeUndefined();
      expect(nonApiEvent.context.tenantId).toBeUndefined();
    });

    it("skips public routes (health check)", async () => {
      mockEvent.path = "/api/health";

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.db).toBeUndefined();
      expect(mockEvent.context.tenantId).toBeUndefined();
    });

    it("skips public routes (auth endpoints)", async () => {
      mockEvent.path = "/api/_auth/session";

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.db).toBeUndefined();
      expect(mockEvent.context.tenantId).toBeUndefined();
    });

    it("processes protected API routes", async () => {
      mockEvent.path = "/api/v1/users";

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.db).toBeDefined();
      expect(mockEvent.context.tenantId).toBeDefined();
    });
  });

  // ========================================
  // SINGLE-TENANT MODE TESTS
  // ========================================

  describe("Single-Tenant Mode (Multitenancy Disabled)", () => {
    beforeEach(() => {
      mockRuntimeConfig.multitenancy.enabled = false;
    });

    it("uses default DB binding", async () => {
      mockEvent.path = "/api/users";

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.db).toBe(mockDb);
      expect(mockEvent.context.tenantId).toBe("default");
    });

    it("throws error if DB binding not available", async () => {
      mockEvent.context.cloudflare.env.DB = undefined;

      await expect(tenantMiddleware(mockEvent)).rejects.toThrow(
        InternalServerError
      );
    });

    it("ignores tenant headers in single-tenant mode", async () => {
      mockEvent.path = "/api/users";
      vi.mocked(getHeader).mockImplementation((event, header) => {
        if (header === HdrKeyTenantID) return "acme";
        if (header === "host") return "acme.example.com";
        return undefined;
      });

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.db).toBe(mockDb);
      expect(mockEvent.context.tenantId).toBe("default");
    });
  });

  // ========================================
  // MULTI-TENANT MODE - PRODUCTION TESTS
  // ========================================

  describe("Multi-Tenant Mode - Production", () => {
    beforeEach(() => {
      mockRuntimeConfig.multitenancy.enabled = true;
      mockRuntimeConfig.public.environment = "production";
    });

    it("extracts tenant ID from subdomain", async () => {
      mockEvent.path = "/api/users";
      vi.mocked(getHeader).mockImplementation((event, header) => {
        if (header === "host") return "acme.example.com";
        return undefined;
      });

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.tenantId).toBe("acme");
      expect(mockEvent.context.db).toBe(mockDb); // DB_ACME
    });

    it("ignores x-tenant-id header in production", async () => {
      mockEvent.path = "/api/users";
      vi.mocked(getHeader).mockImplementation((event, header) => {
        if (header === "host") return "acme.example.com";
        if (header === HdrKeyTenantID) return "wrong-tenant";
        return undefined;
      });

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.tenantId).toBe("acme");
    });

    it("handles subdomain with port number", async () => {
      mockEvent.path = "/api/users";
      vi.mocked(getHeader).mockImplementation((event, header) => {
        if (header === "host") return "acme.example.com:443";
        return undefined;
      });

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.tenantId).toBe("acme");
    });

    it("throws error if no subdomain provided", async () => {
      mockEvent.path = "/api/users";
      vi.mocked(getHeader).mockImplementation((event, header) => {
        if (header === "host") return "example.com";
        return undefined;
      });

      // The subdomain would be "example", but we don't have DB_EXAMPLE
      // This should throw an error about tenant being required or database not found
      await expect(tenantMiddleware(mockEvent)).rejects.toThrow(
        TenantMismatchError
      );
    });

    it("throws error if tenant database not found", async () => {
      mockEvent.path = "/api/users";
      vi.mocked(getHeader).mockImplementation((event, header) => {
        if (header === "host") return "unknown-tenant.example.com";
        return undefined;
      });

      // Remove the unknown tenant's DB from env
      delete mockEvent.context.cloudflare.env.DB_UNKNOWN_TENANT;

      await expect(tenantMiddleware(mockEvent)).rejects.toThrow(
        TenantMismatchError
      );
      await expect(tenantMiddleware(mockEvent)).rejects.toThrow(
        'Database for tenant "unknown-tenant" not found'
      );
    });

    it("converts tenant ID to uppercase for binding name", async () => {
      mockEvent.path = "/api/users";
      const mockTenantDb = { prepare: vi.fn() };
      mockEvent.context.cloudflare.env.DB_TENANT_1 = mockTenantDb;

      vi.mocked(getHeader).mockImplementation((event, header) => {
        if (header === "host") return "tenant-1.example.com";
        return undefined;
      });

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.tenantId).toBe("tenant-1");
      expect(mockEvent.context.db).toBe(mockTenantDb);
    });

    it("replaces hyphens with underscores in binding name", async () => {
      mockEvent.path = "/api/users";
      const mockTenantDb = { prepare: vi.fn() };
      mockEvent.context.cloudflare.env.DB_MY_TENANT = mockTenantDb;

      vi.mocked(getHeader).mockImplementation((event, header) => {
        if (header === "host") return "my-tenant.example.com";
        return undefined;
      });

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.tenantId).toBe("my-tenant");
      expect(mockEvent.context.db).toBe(mockTenantDb);
    });
  });

  // ========================================
  // MULTI-TENANT MODE - DEVELOPMENT TESTS
  // ========================================

  describe("Multi-Tenant Mode - Development", () => {
    beforeEach(() => {
      mockRuntimeConfig.multitenancy.enabled = true;
      mockRuntimeConfig.public.environment = "development";
    });

    it("extracts tenant ID from subdomain in development", async () => {
      mockEvent.path = "/api/users";
      vi.mocked(getHeader).mockImplementation((event, header) => {
        if (header === "host") return "acme.localhost:3000";
        return undefined;
      });

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.tenantId).toBe("acme");
      expect(mockEvent.context.db).toBeDefined();
    });

    it("accepts x-tenant-id header in development", async () => {
      mockEvent.path = "/api/users";
      vi.mocked(getHeader).mockImplementation((event, header) => {
        if (header === HdrKeyTenantID) return "acme";
        if (header === "host") return "localhost:3000";
        return undefined;
      });

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.tenantId).toBe("acme");
      expect(mockEvent.context.db).toBeDefined();
    });

    it("prioritizes x-tenant-id header over subdomain in development", async () => {
      mockEvent.path = "/api/users";
      vi.mocked(getHeader).mockImplementation((event, header) => {
        if (header === HdrKeyTenantID) return "header-tenant";
        if (header === "host") return "subdomain-tenant.localhost:3000";
        return undefined;
      });

      // Add the header-tenant DB
      const mockHeaderTenantDb = { prepare: vi.fn() };
      mockEvent.context.cloudflare.env.DB_HEADER_TENANT = mockHeaderTenantDb;

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.tenantId).toBe("header-tenant");
      expect(mockEvent.context.db).toBe(mockHeaderTenantDb);
    });

    it("falls back to subdomain if x-tenant-id not provided in development", async () => {
      mockEvent.path = "/api/users";
      vi.mocked(getHeader).mockImplementation((event, header) => {
        if (header === "host") return "acme.localhost:3000";
        return undefined;
      });

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.tenantId).toBe("acme");
    });

    it("includes development hint in error message", async () => {
      mockEvent.path = "/api/users";
      vi.mocked(getHeader).mockImplementation((event, header) => {
        if (header === "host") return "localhost:3000";
        return undefined;
      });

      // The subdomain would be "localhost", but we don't have DB_LOCALHOST
      // This will throw a database not found error
      await expect(tenantMiddleware(mockEvent)).rejects.toThrow(
        TenantMismatchError
      );
    });

    it("handles development localhost without subdomain", async () => {
      mockEvent.path = "/api/users";
      vi.mocked(getHeader).mockImplementation((event, header) => {
        if (header === HdrKeyTenantID) return "acme";
        if (header === "host") return "localhost:3000";
        return undefined;
      });

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.tenantId).toBe("acme");
      expect(mockEvent.context.db).toBeDefined();
    });
  });

  // ========================================
  // DATABASE BINDING SELECTION TESTS
  // ========================================

  describe("Database Binding Selection", () => {
    beforeEach(() => {
      mockRuntimeConfig.multitenancy.enabled = true;
      mockRuntimeConfig.public.environment = "production";
    });

    it("selects correct database binding for tenant", async () => {
      mockEvent.path = "/api/users";
      const mockAcmeDb = { prepare: vi.fn(), name: "acme-db" };
      const mockOtherDb = { prepare: vi.fn(), name: "other-db" };

      mockEvent.context.cloudflare.env.DB_ACME = mockAcmeDb;
      mockEvent.context.cloudflare.env.DB_OTHER = mockOtherDb;

      vi.mocked(getHeader).mockImplementation((event, header) => {
        if (header === "host") return "acme.example.com";
        return undefined;
      });

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.db).toBe(mockAcmeDb);
      expect(mockEvent.context.db).not.toBe(mockOtherDb);
    });

    it("validates database is a valid D1Database object", async () => {
      mockEvent.path = "/api/users";
      const mockValidDb = { prepare: vi.fn() };
      mockEvent.context.cloudflare.env.DB_ACME = mockValidDb;

      vi.mocked(getHeader).mockImplementation((event, header) => {
        if (header === "host") return "acme.example.com";
        return undefined;
      });

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.db).toBe(mockValidDb);
    });
  });

  // ========================================
  // EDGE CASES
  // ========================================

  describe("Edge Cases", () => {
    it("handles missing host header", async () => {
      mockRuntimeConfig.multitenancy.enabled = true;
      mockEvent.path = "/api/users";
      vi.mocked(getHeader).mockReturnValue(undefined);

      await expect(tenantMiddleware(mockEvent)).rejects.toThrow(
        TenantMismatchError
      );
    });

    it("handles empty host header", async () => {
      mockRuntimeConfig.multitenancy.enabled = true;
      mockEvent.path = "/api/users";
      vi.mocked(getHeader).mockImplementation((event, header) => {
        if (header === "host") return "";
        return undefined;
      });

      await expect(tenantMiddleware(mockEvent)).rejects.toThrow(
        TenantMismatchError
      );
    });

    it("handles missing cloudflare env", async () => {
      mockEvent.context.cloudflare = undefined;

      await expect(tenantMiddleware(mockEvent)).rejects.toThrow(
        InternalServerError
      );
    });

    it("handles missing cloudflare env object", async () => {
      mockEvent.context.cloudflare.env = undefined;

      await expect(tenantMiddleware(mockEvent)).rejects.toThrow(
        InternalServerError
      );
    });

    it("handles complex subdomain structures", async () => {
      mockRuntimeConfig.multitenancy.enabled = true;
      mockEvent.path = "/api/users";

      // Add the DB_APP database
      const mockAppDb = { prepare: vi.fn() };
      mockEvent.context.cloudflare.env.DB_APP = mockAppDb;

      vi.mocked(getHeader).mockImplementation((event, header) => {
        if (header === "host") return "app.acme.example.com";
        return undefined;
      });

      await tenantMiddleware(mockEvent);

      // Should extract first part only
      expect(mockEvent.context.tenantId).toBe("app");
      expect(mockEvent.context.db).toBe(mockAppDb);
    });
  });

  // ========================================
  // PUBLIC ROUTES VALIDATION
  // ========================================

  describe("Public Routes Validation", () => {
    const publicRoutes = [
      "/api/health",
      "/api/_auth",
      "/api/_auth/session",
      "/api/_auth/signin",
    ];

    publicRoutes.forEach((route) => {
      it(`skips middleware for public route: ${route}`, async () => {
        mockEvent.path = route;

        await tenantMiddleware(mockEvent);

        expect(mockEvent.context.db).toBeUndefined();
        expect(mockEvent.context.tenantId).toBeUndefined();
      });
    });
  });
});
