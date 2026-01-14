import { describe, it, expect, beforeEach, vi } from "vitest";
import authMiddleware from "../../../server/middleware/02.auth";
import { AuthenticationError } from "../../../server/error/errors";

// Note: getUserSession is globally mocked in tests/setup.ts

describe("Authentication Middleware (02.auth)", () => {
  let mockEvent: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock event with tenant context (from previous middleware)
    mockEvent = {
      path: "/api/test",
      method: "GET",
      context: {
        tenantId: "test-tenant",
        db: {},
      },
    };

    // Reset global getUserSession mock
    global.getUserSession.mockResolvedValue(null);
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

      await authMiddleware(nonApiEvent as any);

      expect(nonApiEvent.context.userId).toBeUndefined();
      expect(global.getUserSession).not.toHaveBeenCalled();
    });

    it("skips authentication for health check endpoint", async () => {
      mockEvent.path = "/api/health";

      await authMiddleware(mockEvent);

      expect(mockEvent.context.userId).toBeUndefined();
      expect(global.getUserSession).not.toHaveBeenCalled();
    });

    it("skips authentication for reset-and-seed endpoint", async () => {
      mockEvent.path = "/api/reset-and-seed";

      await authMiddleware(mockEvent);

      expect(mockEvent.context.userId).toBeUndefined();
      expect(global.getUserSession).not.toHaveBeenCalled();
    });

    it("skips authentication for test-db endpoint", async () => {
      mockEvent.path = "/api/test-db";

      await authMiddleware(mockEvent);

      expect(mockEvent.context.userId).toBeUndefined();
      expect(global.getUserSession).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // PUBLIC AUTH ROUTES TESTS
  // ========================================

  describe("Public Auth Routes", () => {
    const publicAuthRoutes = [
      "/api/v1/auth/signup",
      "/api/v1/auth/signin",
      "/api/v1/auth/email/confirm",
      "/api/v1/auth/password/reset/request",
      "/api/v1/auth/password/reset",
      "/api/_auth/session",
    ];

    publicAuthRoutes.forEach((route) => {
      it(`skips authentication for public route: ${route}`, async () => {
        mockEvent.path = route;

        await authMiddleware(mockEvent);

        expect(mockEvent.context.userId).toBeUndefined();
        expect(global.getUserSession).not.toHaveBeenCalled();
      });
    });

    it("skips authentication for routes starting with /api/_auth/session", async () => {
      mockEvent.path = "/api/_auth/session/verify";

      await authMiddleware(mockEvent);

      expect(mockEvent.context.userId).toBeUndefined();
      expect(global.getUserSession).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // AUTHENTICATION SUCCESS TESTS
  // ========================================

  describe("Successful Authentication", () => {
    it("sets userId in context when session is valid", async () => {
      mockEvent.path = "/api/v1/users/profile";

      global.getUserSession.mockResolvedValue({
        user: { id: "user-123" },
        tenantId: "test-tenant",
      });

      await authMiddleware(mockEvent);

      expect(mockEvent.context.userId).toBe("user-123");
      expect(global.getUserSession).toHaveBeenCalledWith(mockEvent);
    });

    it("allows access with valid session and matching tenant", async () => {
      mockEvent.path = "/api/v1/data";
      mockEvent.context.tenantId = "tenant-acme";

      global.getUserSession.mockResolvedValue({
        user: { id: "user-456" },
        tenantId: "tenant-acme",
      });

      await authMiddleware(mockEvent);

      expect(mockEvent.context.userId).toBe("user-456");
    });

    it("handles string user ID from session", async () => {
      mockEvent.path = "/api/v1/users";

      global.getUserSession.mockResolvedValue({
        user: { id: "string-user-id" },
        tenantId: "test-tenant",
      });

      await authMiddleware(mockEvent);

      expect(mockEvent.context.userId).toBe("string-user-id");
    });
  });

  // ========================================
  // AUTHENTICATION FAILURE TESTS
  // ========================================

  describe("Authentication Failures", () => {
    it("throws error when session is null", async () => {
      mockEvent.path = "/api/v1/protected";

      global.getUserSession.mockResolvedValue(null);

      await expect(authMiddleware(mockEvent)).rejects.toThrow(
        AuthenticationError
      );
    });

    it("throws error when session has no user", async () => {
      mockEvent.path = "/api/v1/protected";

      global.getUserSession.mockResolvedValue({
        tenantId: "test-tenant",
      });

      await expect(authMiddleware(mockEvent)).rejects.toThrow(
        AuthenticationError
      );
    });

    it("throws error when session user has no ID", async () => {
      mockEvent.path = "/api/v1/protected";

      global.getUserSession.mockResolvedValue({
        user: {},
        tenantId: "test-tenant",
      });

      await expect(authMiddleware(mockEvent)).rejects.toThrow(
        AuthenticationError
      );
    });

    it("throws error when user ID is empty string", async () => {
      mockEvent.path = "/api/v1/protected";

      global.getUserSession.mockResolvedValue({
        user: { id: "" },
        tenantId: "test-tenant",
      });

      await expect(authMiddleware(mockEvent)).rejects.toThrow(
        AuthenticationError
      );
    });

    it("throws error when user ID is null", async () => {
      mockEvent.path = "/api/v1/protected";

      global.getUserSession.mockResolvedValue({
        user: { id: null },
        tenantId: "test-tenant",
      });

      await expect(authMiddleware(mockEvent)).rejects.toThrow(
        AuthenticationError
      );
    });

    it("throws error when user ID is undefined", async () => {
      mockEvent.path = "/api/v1/protected";

      global.getUserSession.mockResolvedValue({
        user: { id: undefined },
        tenantId: "test-tenant",
      });

      await expect(authMiddleware(mockEvent)).rejects.toThrow(
        AuthenticationError
      );
    });
  });

  // ========================================
  // TENANT CONTEXT TESTS
  // ========================================
  // Auth middleware now sets tenantId from session (cross-tenant auth)
  // No validation - tenantId in session defines the current workspace

  describe("Tenant Context (Cross-Tenant Auth)", () => {
    it("sets tenantId from session", async () => {
      mockEvent.path = "/api/v1/users";

      global.getUserSession.mockResolvedValue({
        user: { id: "user-123" },
        tenantId: "session-tenant",
      });

      await authMiddleware(mockEvent);

      expect(mockEvent.context.userId).toBe("user-123");
      expect(mockEvent.context.tenantId).toBe("session-tenant");
    });

    it("allows undefined tenantId in session (user not in a workspace yet)", async () => {
      mockEvent.path = "/api/v1/users";

      global.getUserSession.mockResolvedValue({
        user: { id: "user-123" },
        tenantId: undefined,
      });

      await authMiddleware(mockEvent);

      expect(mockEvent.context.userId).toBe("user-123");
      expect(mockEvent.context.tenantId).toBeUndefined();
    });
  });

  // ========================================
  // EDGE CASES
  // ========================================

  describe("Edge Cases", () => {
    it("handles getUserSession throwing error", async () => {
      mockEvent.path = "/api/v1/users";

      global.getUserSession.mockRejectedValue(
        new Error("Session storage error")
      );

      await expect(authMiddleware(mockEvent)).rejects.toThrow(
        "Session storage error"
      );
    });

    it("handles session with extra properties", async () => {
      mockEvent.path = "/api/v1/users";

      global.getUserSession.mockResolvedValue({
        user: {
          id: "user-123",
          email: "test@example.com",
          role: "user",
          extraData: "should be ignored",
        },
        tenantId: "test-tenant",
        extraSessionData: "also ignored",
      });

      await authMiddleware(mockEvent);

      expect(mockEvent.context.userId).toBe("user-123");
    });

    it("handles numeric user ID", async () => {
      mockEvent.path = "/api/v1/users";

      global.getUserSession.mockResolvedValue({
        user: { id: 12345 },
        tenantId: "test-tenant",
      });

      await authMiddleware(mockEvent);

      expect(mockEvent.context.userId).toBe(12345);
    });

    it("processes multiple protected requests independently", async () => {
      const event1 = {
        path: "/api/v1/users",
        context: { tenantId: "tenant-1" },
      };
      const event2 = {
        path: "/api/v1/posts",
        context: { tenantId: "tenant-2" },
      };

      global.getUserSession
        .mockResolvedValueOnce({
          user: { id: "user-1" },
          tenantId: "tenant-1",
        })
        .mockResolvedValueOnce({
          user: { id: "user-2" },
          tenantId: "tenant-2",
        });

      await authMiddleware(event1 as any);
      await authMiddleware(event2 as any);

      expect(event1.context.userId).toBe("user-1");
      expect(event2.context.userId).toBe("user-2");
    });
  });

  // ========================================
  // ERROR CODE VALIDATION
  // ========================================

  describe("Error Code Validation", () => {
    it("throws AUTH_REQUIRED error code for missing session", async () => {
      mockEvent.path = "/api/v1/protected";

      global.getUserSession.mockResolvedValue(null);

      try {
        await authMiddleware(mockEvent);
        expect.fail("Should have thrown AuthenticationError");
      } catch (error: any) {
        expect(error).toBeInstanceOf(AuthenticationError);
        expect(error.code).toBe("AUTH_REQUIRED");
      }
    });
  });

  // ========================================
  // ROUTE PATTERN MATCHING TESTS
  // ========================================

  describe("Route Pattern Matching", () => {
    it("protects API routes not in public list", async () => {
      const protectedRoutes = [
        "/api/v1/users",
        "/api/v1/posts",
        "/api/v1/data",
        "/api/custom/endpoint",
      ];

      for (const route of protectedRoutes) {
        mockEvent.path = route;
        global.getUserSession.mockResolvedValue(null);

        await expect(authMiddleware(mockEvent)).rejects.toThrow(
          AuthenticationError
        );
      }
    });

    it("correctly identifies exact route matches", async () => {
      mockEvent.path = "/api/v1/auth/signup"; // Exact public route

      await authMiddleware(mockEvent);

      expect(global.getUserSession).not.toHaveBeenCalled();
    });

    it("correctly identifies prefix matches", async () => {
      mockEvent.path = "/api/_auth/session/custom"; // Starts with /api/_auth/session

      await authMiddleware(mockEvent);

      expect(global.getUserSession).not.toHaveBeenCalled();
    });
  });
});
