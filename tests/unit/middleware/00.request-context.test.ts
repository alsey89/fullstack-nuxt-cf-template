import { describe, it, expect, beforeEach, vi } from "vitest";
import requestContextMiddleware from "../../../server/middleware/00.request-context";

// Mock h3 utilities
vi.mock("h3", async () => {
  const actual = await vi.importActual("h3");
  return {
    ...actual,
    getRequestIP: vi.fn(),
    getHeader: vi.fn(),
    setHeader: vi.fn(),
  };
});

// Import mocked functions for testing
import { getRequestIP, getHeader } from "h3";

// Note: setHeader is a global mock from tests/setup.ts

describe("Request Context Middleware (00.request-context)", () => {
  let mockEvent: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock event
    mockEvent = {
      path: "/api/test",
      method: "GET",
      context: {},
    };

    // Set default mock implementations
    vi.mocked(getHeader).mockReturnValue(undefined);
    vi.mocked(getRequestIP).mockReturnValue("127.0.0.1");
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

      await requestContextMiddleware(nonApiEvent as any);

      expect(nonApiEvent.context).toEqual({});
      expect(getHeader).not.toHaveBeenCalled();
    });

    it("processes routes starting with /api/", async () => {
      mockEvent.path = "/api/users";

      await requestContextMiddleware(mockEvent);

      expect(mockEvent.context.requestId).toBeDefined();
      expect(mockEvent.context.endpoint).toBe("/api/users");
    });

    it("processes nested API routes", async () => {
      mockEvent.path = "/api/v1/auth/signin";

      await requestContextMiddleware(mockEvent);

      expect(mockEvent.context.requestId).toBeDefined();
      expect(mockEvent.context.endpoint).toBe("/api/v1/auth/signin");
    });
  });

  // ========================================
  // REQUEST ID TESTS
  // ========================================

  describe("Request ID Generation", () => {
    it("uses client-provided X-Request-ID header if available", async () => {
      const clientRequestId = "client-provided-123";
      vi.mocked(getHeader).mockImplementation((event, header) => {
        if (header === "x-request-id") return clientRequestId;
        return undefined;
      });

      await requestContextMiddleware(mockEvent);

      expect(mockEvent.context.requestId).toBe(clientRequestId);
      expect(global.setHeader).toHaveBeenCalledWith(
        mockEvent,
        "X-Request-ID",
        clientRequestId
      );
    });

    it("generates UUID if X-Request-ID header is not provided", async () => {
      vi.mocked(getHeader).mockReturnValue(undefined);

      await requestContextMiddleware(mockEvent);

      // Check that a UUID-like string was generated
      expect(mockEvent.context.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(global.setHeader).toHaveBeenCalledWith(
        mockEvent,
        "X-Request-ID",
        mockEvent.context.requestId
      );
    });

    it("sets X-Request-ID response header for client tracking", async () => {
      await requestContextMiddleware(mockEvent);

      expect(global.setHeader).toHaveBeenCalledWith(
        mockEvent,
        "X-Request-ID",
        mockEvent.context.requestId
      );
    });
  });

  // ========================================
  // REQUEST METADATA TESTS
  // ========================================

  describe("Request Metadata Capture", () => {
    it("captures IP address from request", async () => {
      const mockIP = "192.168.1.100";
      vi.mocked(getRequestIP).mockReturnValue(mockIP);

      await requestContextMiddleware(mockEvent);

      expect(mockEvent.context.ipAddress).toBe(mockIP);
      expect(getRequestIP).toHaveBeenCalledWith(mockEvent);
    });

    it("captures user agent from headers", async () => {
      const mockUserAgent = "Mozilla/5.0 (Test Browser)";
      vi.mocked(getHeader).mockImplementation((event, header) => {
        if (header === "user-agent") return mockUserAgent;
        return undefined;
      });

      await requestContextMiddleware(mockEvent);

      expect(mockEvent.context.userAgent).toBe(mockUserAgent);
    });

    it('sets user agent to "unknown" if not provided', async () => {
      vi.mocked(getHeader).mockReturnValue(undefined);

      await requestContextMiddleware(mockEvent);

      expect(mockEvent.context.userAgent).toBe("unknown");
    });

    it("captures endpoint path", async () => {
      mockEvent.path = "/api/v1/users/profile";

      await requestContextMiddleware(mockEvent);

      expect(mockEvent.context.endpoint).toBe("/api/v1/users/profile");
    });

    it("captures HTTP method", async () => {
      mockEvent.method = "POST";

      await requestContextMiddleware(mockEvent);

      expect(mockEvent.context.method).toBe("POST");
    });
  });

  // ========================================
  // COMPLETE CONTEXT TESTS
  // ========================================

  describe("Complete Context Setup", () => {
    it("sets all required context fields for API request", async () => {
      const mockIP = "10.0.0.5";
      const mockUserAgent = "Test Agent/1.0";
      const mockRequestId = "custom-request-id";

      vi.mocked(getRequestIP).mockReturnValue(mockIP);
      vi.mocked(getHeader).mockImplementation((event, header) => {
        if (header === "x-request-id") return mockRequestId;
        if (header === "user-agent") return mockUserAgent;
        return undefined;
      });

      mockEvent.path = "/api/data";
      mockEvent.method = "PUT";

      await requestContextMiddleware(mockEvent);

      expect(mockEvent.context).toEqual({
        requestId: mockRequestId,
        ipAddress: mockIP,
        userAgent: mockUserAgent,
        endpoint: "/api/data",
        method: "PUT",
      });
    });

    it("handles multiple requests with different contexts", async () => {
      // First request
      const event1 = { path: "/api/users", method: "GET", context: {} };
      vi.mocked(getRequestIP).mockReturnValue("192.168.1.1");
      await requestContextMiddleware(event1 as any);

      // Second request
      const event2 = { path: "/api/posts", method: "POST", context: {} };
      vi.mocked(getRequestIP).mockReturnValue("192.168.1.2");
      await requestContextMiddleware(event2 as any);

      expect(event1.context.endpoint).toBe("/api/users");
      expect(event1.context.method).toBe("GET");
      expect(event2.context.endpoint).toBe("/api/posts");
      expect(event2.context.method).toBe("POST");
    });
  });

  // ========================================
  // EDGE CASES
  // ========================================

  describe("Edge Cases", () => {
    it("handles missing IP address gracefully", async () => {
      vi.mocked(getRequestIP).mockReturnValue(undefined as any);

      await requestContextMiddleware(mockEvent);

      expect(mockEvent.context.ipAddress).toBeUndefined();
    });

    it("handles empty headers gracefully", async () => {
      vi.mocked(getHeader).mockReturnValue(undefined);

      await requestContextMiddleware(mockEvent);

      expect(mockEvent.context.userAgent).toBe("unknown");
      expect(mockEvent.context.requestId).toBeDefined();
    });

    it("handles API routes with query parameters", async () => {
      mockEvent.path = "/api/search?q=test&limit=10";

      await requestContextMiddleware(mockEvent);

      expect(mockEvent.context.endpoint).toBe("/api/search?q=test&limit=10");
    });

    it("handles API routes with trailing slashes", async () => {
      mockEvent.path = "/api/users/";

      await requestContextMiddleware(mockEvent);

      expect(mockEvent.context.endpoint).toBe("/api/users/");
    });
  });
});
