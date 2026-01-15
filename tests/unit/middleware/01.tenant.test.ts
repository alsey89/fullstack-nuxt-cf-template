import { describe, it, expect, beforeEach, vi } from "vitest";
import tenantMiddleware from "../../../server/middleware/01.tenant";
import { InternalServerError, AuthorizationError } from "../../../server/error/errors";

// Mock useRuntimeConfig
const mockUseRuntimeConfig = vi.fn();
vi.stubGlobal("useRuntimeConfig", mockUseRuntimeConfig);

// ========================================
// TENANT DATABASE MIDDLEWARE TESTS
// ========================================
// This middleware selects the appropriate D1 database based on tenant context.
//
// Two modes:
// 1. Single-Tenant Mode: Uses default DB binding
// 2. Multi-Tenant Mode: Resolves tenant from subdomain/header
//
// Tenant Resolution (multi-tenant mode):
// - Production: Subdomain required, header must match if provided
// - Development: Subdomain preferred, falls back to header
// ========================================

describe("Tenant Database Middleware (01.tenant)", () => {
  let mockEvent: any;
  let mockDb: any;
  let mockDbAcme: any;
  let mockDbBeta: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock D1 databases
    mockDb = { prepare: vi.fn(), batch: vi.fn(), exec: vi.fn() };
    mockDbAcme = { prepare: vi.fn(), batch: vi.fn(), exec: vi.fn() };
    mockDbBeta = { prepare: vi.fn(), batch: vi.fn(), exec: vi.fn() };

    // Default to single-tenant mode, development environment
    mockUseRuntimeConfig.mockReturnValue({
      multitenancy: { enabled: false, baseDomain: "myapp.com" },
      public: { environment: "development" },
    });

    // Create mock event
    mockEvent = {
      path: "/api/test",
      method: "GET",
      context: {
        cloudflare: {
          env: {
            DB: mockDb,
            DB_ACME: mockDbAcme,
            DB_BETA: mockDbBeta,
          },
        },
      },
      node: {
        req: {
          headers: {},
        },
      },
    };
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
    });

    it("processes /api routes", async () => {
      mockEvent.path = "/api/v1/users";

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.db).toBe(mockDb);
    });

    it("skips non-API paths", async () => {
      const paths = ["/", "/login", "/dashboard/settings", "/_nuxt/file.js"];

      for (const path of paths) {
        mockEvent.path = path;
        mockEvent.context.db = undefined;

        await tenantMiddleware(mockEvent);

        expect(mockEvent.context.db).toBeUndefined();
      }
    });
  });

  // ========================================
  // SINGLE-TENANT MODE TESTS
  // ========================================

  describe("Single-Tenant Mode", () => {
    beforeEach(() => {
      mockUseRuntimeConfig.mockReturnValue({
        multitenancy: { enabled: false },
        public: { environment: "development" },
      });
    });

    it("uses default DB binding", async () => {
      mockEvent.path = "/api/v1/users";

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.db).toBe(mockDb);
      expect(mockEvent.context.tenantId).toBe("default");
    });

    it("ignores X-Tenant-ID header when multitenancy is disabled", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.node.req.headers["x-tenant-id"] = "acme";

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.db).toBe(mockDb);
      expect(mockEvent.context.tenantId).toBe("default");
    });

    it("throws InternalServerError when DB binding not available", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.context.cloudflare.env.DB = undefined;

      await expect(tenantMiddleware(mockEvent)).rejects.toThrow(
        InternalServerError
      );
    });
  });

  // ========================================
  // MULTI-TENANT MODE - DEVELOPMENT
  // ========================================

  describe("Multi-Tenant Mode (Development)", () => {
    beforeEach(() => {
      mockUseRuntimeConfig.mockReturnValue({
        multitenancy: { enabled: true, baseDomain: "myapp.com" },
        public: { environment: "development" },
      });
    });

    it("extracts tenant from subdomain", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.node.req.headers["host"] = "acme.myapp.com";

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.db).toBe(mockDbAcme);
      expect(mockEvent.context.tenantId).toBe("acme");
    });

    it("falls back to X-Tenant-ID header when no subdomain", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.node.req.headers["host"] = "localhost:3000";
      mockEvent.node.req.headers["x-tenant-id"] = "acme";

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.db).toBe(mockDbAcme);
      expect(mockEvent.context.tenantId).toBe("acme");
    });

    it("prefers subdomain over header when both present and match", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.node.req.headers["host"] = "acme.myapp.com";
      mockEvent.node.req.headers["x-tenant-id"] = "acme";

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.db).toBe(mockDbAcme);
      expect(mockEvent.context.tenantId).toBe("acme");
    });

    it("throws AuthorizationError when subdomain and header mismatch", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.node.req.headers["host"] = "acme.myapp.com";
      mockEvent.node.req.headers["x-tenant-id"] = "beta";

      await expect(tenantMiddleware(mockEvent)).rejects.toThrow(AuthorizationError);
      await expect(tenantMiddleware(mockEvent)).rejects.toThrow(/mismatch/i);
    });

    it("throws error when no tenant specified", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.node.req.headers["host"] = "localhost:3000";
      // No X-Tenant-ID header

      await expect(tenantMiddleware(mockEvent)).rejects.toThrow(
        InternalServerError
      );
    });

    it("handles case-insensitive tenant IDs", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.node.req.headers["x-tenant-id"] = "ACME";

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.db).toBe(mockDbAcme);
      expect(mockEvent.context.tenantId).toBe("acme");
    });

    it("handles subdomain with port in host", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.node.req.headers["host"] = "acme.myapp.com:3000";

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.db).toBe(mockDbAcme);
      expect(mockEvent.context.tenantId).toBe("acme");
    });
  });

  // ========================================
  // MULTI-TENANT MODE - PRODUCTION
  // ========================================

  describe("Multi-Tenant Mode (Production)", () => {
    beforeEach(() => {
      mockUseRuntimeConfig.mockReturnValue({
        multitenancy: { enabled: true, baseDomain: "myapp.com" },
        public: { environment: "production" },
      });
    });

    it("requires subdomain in production", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.node.req.headers["host"] = "myapp.com"; // No subdomain
      mockEvent.node.req.headers["x-tenant-id"] = "acme"; // Header alone not enough

      await expect(tenantMiddleware(mockEvent)).rejects.toThrow(AuthorizationError);
      await expect(tenantMiddleware(mockEvent)).rejects.toThrow(/subdomain/i);
    });

    it("accepts valid subdomain in production", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.node.req.headers["host"] = "acme.myapp.com";

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.db).toBe(mockDbAcme);
      expect(mockEvent.context.tenantId).toBe("acme");
    });

    it("validates header matches subdomain if provided", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.node.req.headers["host"] = "acme.myapp.com";
      mockEvent.node.req.headers["x-tenant-id"] = "acme";

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.db).toBe(mockDbAcme);
    });

    it("rejects when header does not match subdomain", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.node.req.headers["host"] = "acme.myapp.com";
      mockEvent.node.req.headers["x-tenant-id"] = "beta"; // Mismatch!

      await expect(tenantMiddleware(mockEvent)).rejects.toThrow(AuthorizationError);
      await expect(tenantMiddleware(mockEvent)).rejects.toThrow(/mismatch/i);
    });

    it("ignores header if not provided (subdomain is authoritative)", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.node.req.headers["host"] = "beta.myapp.com";
      // No X-Tenant-ID header

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.db).toBe(mockDbBeta);
      expect(mockEvent.context.tenantId).toBe("beta");
    });
  });

  // ========================================
  // SUBDOMAIN EXTRACTION TESTS
  // ========================================

  describe("Subdomain Extraction", () => {
    beforeEach(() => {
      mockUseRuntimeConfig.mockReturnValue({
        multitenancy: { enabled: true, baseDomain: "myapp.com" },
        public: { environment: "development" },
      });
    });

    it("extracts single-level subdomain", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.node.req.headers["host"] = "acme.myapp.com";

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.tenantId).toBe("acme");
    });

    it("returns null for multi-level subdomains", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.node.req.headers["host"] = "foo.acme.myapp.com";
      mockEvent.node.req.headers["x-tenant-id"] = "acme"; // Falls back to header

      await tenantMiddleware(mockEvent);

      // Multi-level subdomain not extracted, uses header
      expect(mockEvent.context.tenantId).toBe("acme");
    });

    it("returns null when host does not match base domain", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.node.req.headers["host"] = "acme.otherdomain.com";
      mockEvent.node.req.headers["x-tenant-id"] = "acme";

      await tenantMiddleware(mockEvent);

      // Falls back to header since subdomain extraction failed
      expect(mockEvent.context.tenantId).toBe("acme");
    });

    it("handles missing baseDomain config", async () => {
      mockUseRuntimeConfig.mockReturnValue({
        multitenancy: { enabled: true, baseDomain: undefined },
        public: { environment: "development" },
      });

      mockEvent.path = "/api/v1/users";
      mockEvent.node.req.headers["x-tenant-id"] = "acme";

      await tenantMiddleware(mockEvent);

      expect(mockEvent.context.tenantId).toBe("acme");
    });
  });

  // ========================================
  // DATABASE BINDING TESTS
  // ========================================

  describe("Database Binding", () => {
    beforeEach(() => {
      mockUseRuntimeConfig.mockReturnValue({
        multitenancy: { enabled: true, baseDomain: "myapp.com" },
        public: { environment: "development" },
      });
    });

    it("converts tenant ID to uppercase for binding lookup", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.node.req.headers["x-tenant-id"] = "acme";

      await tenantMiddleware(mockEvent);

      // DB_ACME should be selected (uppercase)
      expect(mockEvent.context.db).toBe(mockDbAcme);
    });

    it("throws error when tenant database binding not found", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.node.req.headers["x-tenant-id"] = "unknown";

      await expect(tenantMiddleware(mockEvent)).rejects.toThrow(
        InternalServerError
      );
      await expect(tenantMiddleware(mockEvent)).rejects.toThrow(
        /DB_UNKNOWN.*not found/i
      );
    });
  });

  // ========================================
  // EDGE CASES
  // ========================================

  describe("Edge Cases", () => {
    it("handles missing cloudflare context", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.context.cloudflare = undefined;

      await expect(tenantMiddleware(mockEvent)).rejects.toThrow(
        InternalServerError
      );
    });

    it("handles null DB binding", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.context.cloudflare.env.DB = null;

      await expect(tenantMiddleware(mockEvent)).rejects.toThrow(
        InternalServerError
      );
    });

    it("processes multiple requests independently", async () => {
      mockUseRuntimeConfig.mockReturnValue({
        multitenancy: { enabled: true, baseDomain: "myapp.com" },
        public: { environment: "development" },
      });

      const event1 = {
        path: "/api/v1/users",
        context: {
          cloudflare: { env: { DB_ACME: mockDbAcme, DB_BETA: mockDbBeta } },
        },
        node: { req: { headers: { "x-tenant-id": "acme" } } },
      };
      const event2 = {
        path: "/api/v1/posts",
        context: {
          cloudflare: { env: { DB_ACME: mockDbAcme, DB_BETA: mockDbBeta } },
        },
        node: { req: { headers: { "x-tenant-id": "beta" } } },
      };

      await tenantMiddleware(event1 as any);
      await tenantMiddleware(event2 as any);

      expect(event1.context.db).toBe(mockDbAcme);
      expect(event1.context.tenantId).toBe("acme");
      expect(event2.context.db).toBe(mockDbBeta);
      expect(event2.context.tenantId).toBe("beta");
    });
  });
});
