import { describe, it, expect, beforeEach } from "vitest";
import { TestClient } from "./utils/client";
import {
  signIn,
  signUp,
  signOut,
  createAuthenticatedClient,
  uniqueEmail,
} from "./utils/auth";

// Response types
interface ApiResponse<T = unknown> {
  success?: boolean;
  message: string;
  data: T;
  error?: { traceID: string; code: string; message?: string } | null;
}

interface SignInData {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  permissions: string[];
  permissionVersion?: number;
}

/**
 * Integration Tests for Auth API
 *
 * These tests require the test server to be running with Cloudflare Workers bindings.
 * Run tests with: npm run test:integration
 *
 * Prerequisites:
 * 1. npm run db:reset:local:test
 * 2. npm run dev:test (in a separate terminal)
 */
describe("Authentication", () => {
  let client: TestClient;

  beforeEach(() => {
    client = new TestClient();
  });

  describe("POST /api/v1/auth/signin", () => {
    it("should sign in with valid credentials after signup", async () => {
      const email = uniqueEmail("signin");
      const password = "password123";

      // First sign up
      await signUp(client, {
        email,
        password,
        passwordConfirmation: password,
        firstName: "Test",
        lastName: "User",
      });

      // Then sign in with new client
      const authClient = new TestClient();
      const response = await authClient.post<ApiResponse<SignInData>>(
        "/api/v1/auth/signin",
        {
          email,
          password,
        }
      );

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data.data.user.email).toBe(email);
      expect(response.data.data.permissions).toBeInstanceOf(Array);
    });

    it("should reject invalid password", async () => {
      const email = uniqueEmail("wrongpass");
      const password = "password123";

      // Sign up first
      await signUp(client, {
        email,
        password,
        passwordConfirmation: password,
        firstName: "Wrong",
        lastName: "Pass",
      });

      // Try to sign in with wrong password
      const authClient = new TestClient();
      const response = await authClient.post("/api/v1/auth/signin", {
        email,
        password: "wrongpassword",
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });

    it("should reject non-existent user", async () => {
      const response = await client.post("/api/v1/auth/signin", {
        email: "nonexistent@test.com",
        password: "anypassword",
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });

    it("should reject invalid email format", async () => {
      const response = await client.post("/api/v1/auth/signin", {
        email: "not-an-email",
        password: "anypassword",
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it("should reject missing password", async () => {
      const response = await client.post("/api/v1/auth/signin", {
        email: "test@example.com",
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it("should reject missing email", async () => {
      const response = await client.post("/api/v1/auth/signin", {
        password: "somepassword",
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/v1/auth/signup", () => {
    it("should sign up a new user", async () => {
      const email = uniqueEmail("signup");

      const response = await client.post<ApiResponse<unknown>>(
        "/api/v1/auth/signup",
        {
          email,
          password: "password123",
          passwordConfirmation: "password123",
          firstName: "New",
          lastName: "User",
        }
      );

      expect(response.ok).toBe(true);
      expect([200, 201]).toContain(response.status);
      expect(response.data.message).toContain("created");
    });

    it("should reject signup with mismatched passwords", async () => {
      const response = await client.post("/api/v1/auth/signup", {
        email: uniqueEmail("mismatch"),
        password: "password123",
        passwordConfirmation: "differentpassword",
        firstName: "Test",
        lastName: "User",
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it("should reject signup with invalid email", async () => {
      const response = await client.post("/api/v1/auth/signup", {
        email: "not-an-email",
        password: "password123",
        passwordConfirmation: "password123",
        firstName: "Test",
        lastName: "User",
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it("should reject signup without required fields", async () => {
      const response = await client.post("/api/v1/auth/signup", {
        email: uniqueEmail("incomplete"),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it("should reject signup with weak password", async () => {
      const response = await client.post("/api/v1/auth/signup", {
        email: uniqueEmail("weak"),
        password: "123", // Too short
        passwordConfirmation: "123",
        firstName: "Test",
        lastName: "User",
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });

    it("should reject duplicate email", async () => {
      const email = uniqueEmail("duplicate");

      // First signup
      await signUp(client, {
        email,
        password: "password123",
        passwordConfirmation: "password123",
        firstName: "First",
        lastName: "User",
      });

      // Second signup with same email should fail
      const response = await client.post("/api/v1/auth/signup", {
        email,
        password: "password123",
        passwordConfirmation: "password123",
        firstName: "Second",
        lastName: "User",
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(409); // Conflict
    });
  });

  describe("Protected Routes", () => {
    it("should reject unauthenticated requests to protected routes", async () => {
      const response = await client.get("/api/v1/user/profile");

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });

    it("should allow authenticated requests to protected routes", async () => {
      // Create authenticated client
      const { client: authClient } = await createAuthenticatedClient();

      // Access protected route
      const response = await authClient.get("/api/v1/user/profile");

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/v1/auth/signout", () => {
    it("should sign out successfully", async () => {
      // Create authenticated client
      const { client: authClient } = await createAuthenticatedClient("signout");

      // Verify we can access protected routes
      const beforeSignout = await authClient.get("/api/v1/user/profile");
      expect(beforeSignout.ok).toBe(true);

      // Sign out
      const signoutResponse = await authClient.post("/api/v1/auth/signout");
      expect(signoutResponse.ok).toBe(true);

      // Clear cookies (simulating what happens in browser)
      authClient.clearCookies();

      // Should no longer have access
      const afterSignout = await authClient.get("/api/v1/user/profile");
      expect(afterSignout.ok).toBe(false);
      expect(afterSignout.status).toBe(401);
    });

    it("should invalidate session after signout using helper", async () => {
      // Create authenticated client
      const { client: authClient } = await createAuthenticatedClient("signout2");

      // Verify we can access protected routes
      const beforeSignout = await authClient.get("/api/v1/user/profile");
      expect(beforeSignout.ok).toBe(true);

      // Sign out using helper
      await signOut(authClient);

      // Should no longer have access
      const afterSignout = await authClient.get("/api/v1/user/profile");
      expect(afterSignout.ok).toBe(false);
      expect(afterSignout.status).toBe(401);
    });
  });
});

describe("Health Check", () => {
  it("should return healthy status", async () => {
    const client = new TestClient();
    const response = await client.get("/api/health");

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
  });

  it("should be accessible without authentication", async () => {
    const client = new TestClient();
    const response = await client.get("/api/health");

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
  });
});
