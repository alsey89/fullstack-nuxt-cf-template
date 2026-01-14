import { describe, it, expect, beforeEach, vi } from "vitest";
import workspaceMiddleware from "../../../server/middleware/01.workspace";
import { InternalServerError } from "../../../server/error/errors";

// ========================================
// DATABASE CONTEXT MIDDLEWARE TESTS
// ========================================
// This middleware sets up D1 database binding for API requests.
// Uses single-database architecture (one DB for all tenants).
// Tenant context is handled by auth middleware from session.
// ========================================

describe("Database Context Middleware (01.workspace)", () => {
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

    // Create mock event
    mockEvent = {
      path: "/api/test",
      method: "GET",
      context: {
        cloudflare: {
          env: {
            DB: mockDb,
          },
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

      await workspaceMiddleware(nonApiEvent as any);

      expect(nonApiEvent.context.db).toBeUndefined();
    });

    it("processes /api routes", async () => {
      mockEvent.path = "/api/v1/users";

      await workspaceMiddleware(mockEvent);

      expect(mockEvent.context.db).toBe(mockDb);
    });

    it("processes /api/health route", async () => {
      mockEvent.path = "/api/health";

      await workspaceMiddleware(mockEvent);

      expect(mockEvent.context.db).toBe(mockDb);
    });

    it("skips non-API paths", async () => {
      const paths = ["/", "/login", "/dashboard/settings", "/_nuxt/file.js"];

      for (const path of paths) {
        mockEvent.path = path;
        mockEvent.context.db = undefined;

        await workspaceMiddleware(mockEvent);

        expect(mockEvent.context.db).toBeUndefined();
      }
    });
  });

  // ========================================
  // DATABASE BINDING TESTS
  // ========================================

  describe("Database Binding", () => {
    it("sets db context from cloudflare env", async () => {
      mockEvent.path = "/api/v1/users";

      await workspaceMiddleware(mockEvent);

      expect(mockEvent.context.db).toBe(mockDb);
    });

    it("throws InternalServerError when DB binding not available", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.context.cloudflare.env.DB = undefined;

      await expect(workspaceMiddleware(mockEvent)).rejects.toThrow(
        InternalServerError
      );
    });

    it("throws error with helpful message about wrangler.toml", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.context.cloudflare.env.DB = undefined;

      await expect(workspaceMiddleware(mockEvent)).rejects.toThrow(
        /wrangler\.toml/i
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

      await expect(workspaceMiddleware(mockEvent)).rejects.toThrow(
        InternalServerError
      );
    });

    it("handles missing env in cloudflare context", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.context.cloudflare.env = undefined;

      await expect(workspaceMiddleware(mockEvent)).rejects.toThrow(
        InternalServerError
      );
    });

    it("handles null DB binding", async () => {
      mockEvent.path = "/api/v1/users";
      mockEvent.context.cloudflare.env.DB = null;

      await expect(workspaceMiddleware(mockEvent)).rejects.toThrow(
        InternalServerError
      );
    });

    it("processes multiple requests independently", async () => {
      const event1 = {
        path: "/api/v1/users",
        context: {
          cloudflare: { env: { DB: mockDb } },
        },
      };
      const event2 = {
        path: "/api/v1/posts",
        context: {
          cloudflare: { env: { DB: mockDb } },
        },
      };

      await workspaceMiddleware(event1 as any);
      await workspaceMiddleware(event2 as any);

      expect(event1.context.db).toBe(mockDb);
      expect(event2.context.db).toBe(mockDb);
    });
  });
});
