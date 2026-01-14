import { describe, it, expect, beforeEach } from "vitest";
import { TestClient } from "./utils/client";
import { createAuthenticatedClient } from "./utils/auth";

// Response types
interface ApiResponse<T = unknown> {
  success?: boolean;
  message: string;
  data: T;
  error?: { traceID: string; code: string; message?: string } | null;
}

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
}

/**
 * Integration Tests for Profile API
 *
 * These tests require the test server to be running with Cloudflare Workers bindings.
 * Run tests with: npm run test:integration
 *
 * Prerequisites:
 * 1. npm run db:reset:local:test
 * 2. npm run dev:test (in a separate terminal)
 */
describe("Profile API Integration", () => {
  let unauthClient: TestClient;

  beforeEach(() => {
    unauthClient = new TestClient();
  });

  describe("GET /api/v1/user/profile", () => {
    it("returns profile for authenticated user", async () => {
      const { client, email } = await createAuthenticatedClient("profile-get");

      const response = await client.get<ApiResponse<UserProfile>>(
        "/api/v1/user/profile"
      );

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data.data).toBeDefined();
      expect(response.data.data.email).toBe(email);
      expect(response.data.data.firstName).toBe("Test");
      expect(response.data.data.lastName).toBe("User");
      // Should not include password hash (implicit - not in type)
    });

    it("rejects unauthenticated request", async () => {
      const response = await unauthClient.get("/api/v1/user/profile");

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  describe("PUT /api/v1/user/profile", () => {
    it("updates profile for authenticated user", async () => {
      const { client } = await createAuthenticatedClient("profile-update");

      // Update profile
      const updateResponse = await client.put<ApiResponse<{ user: UserProfile }>>(
        "/api/v1/user/profile",
        {
          firstName: "Updated",
          lastName: "Name",
        }
      );

      expect(updateResponse.ok).toBe(true);
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.message).toContain("success");

      // Verify update
      const profileResponse = await client.get<ApiResponse<UserProfile>>(
        "/api/v1/user/profile"
      );

      expect(profileResponse.ok).toBe(true);
      expect(profileResponse.data.data.firstName).toBe("Updated");
      expect(profileResponse.data.data.lastName).toBe("Name");
    });

    it("updates address fields", async () => {
      const { client } = await createAuthenticatedClient("profile-address");

      // Update address
      const updateResponse = await client.put<ApiResponse<{ user: UserProfile }>>(
        "/api/v1/user/profile",
        {
          address: "123 Test Street",
          city: "Test City",
          state: "Test State",
          country: "Test Country",
          postalCode: "12345",
        }
      );

      expect(updateResponse.ok).toBe(true);

      // Verify update
      const profileResponse = await client.get<ApiResponse<UserProfile>>(
        "/api/v1/user/profile"
      );

      expect(profileResponse.ok).toBe(true);
      expect(profileResponse.data.data.address).toBe("123 Test Street");
      expect(profileResponse.data.data.city).toBe("Test City");
      expect(profileResponse.data.data.state).toBe("Test State");
      expect(profileResponse.data.data.country).toBe("Test Country");
      expect(profileResponse.data.data.postalCode).toBe("12345");
    });

    it("rejects unauthenticated update request", async () => {
      const response = await unauthClient.put("/api/v1/user/profile", {
        firstName: "Hacker",
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });

    it("handles partial updates", async () => {
      const { client } = await createAuthenticatedClient("profile-partial");

      // Update only firstName
      const updateResponse = await client.put<ApiResponse<{ user: UserProfile }>>(
        "/api/v1/user/profile",
        {
          firstName: "PartialUpdate",
        }
      );

      expect(updateResponse.ok).toBe(true);

      // Verify only firstName changed
      const profileResponse = await client.get<ApiResponse<UserProfile>>(
        "/api/v1/user/profile"
      );

      expect(profileResponse.ok).toBe(true);
      expect(profileResponse.data.data.firstName).toBe("PartialUpdate");
      expect(profileResponse.data.data.lastName).toBe("User"); // Unchanged
    });
  });
});
