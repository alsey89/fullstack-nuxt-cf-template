import { TestClient } from "./client";

/**
 * Sign in response structure
 */
interface SignInResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
    permissions: string[];
    permissionVersion?: number;
  };
}

/**
 * Sign up response structure
 */
interface SignUpResponse {
  success: boolean;
  message: string;
}

/**
 * Generate a unique email for test isolation
 */
export function uniqueEmail(prefix: string = "test"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
}

/**
 * Sign in a user and return session data
 * The client will have session cookies set after this call.
 */
export async function signIn(
  client: TestClient,
  email: string,
  password: string
): Promise<SignInResponse["data"]> {
  const response = await client.post<SignInResponse>("/api/v1/auth/signin", {
    email,
    password,
  });

  if (!response.ok) {
    throw new Error(
      `Sign in failed for ${email}: ${response.status} - ${JSON.stringify(response.data)}`
    );
  }

  return response.data.data;
}

/**
 * Sign up a new user
 */
export async function signUp(
  client: TestClient,
  data: {
    email: string;
    password: string;
    passwordConfirmation: string;
    firstName: string;
    lastName: string;
  }
): Promise<void> {
  const response = await client.post<SignUpResponse>(
    "/api/v1/auth/signup",
    data
  );

  if (!response.ok) {
    throw new Error(
      `Sign up failed for ${data.email}: ${response.status} - ${JSON.stringify(response.data)}`
    );
  }
}

/**
 * Create an authenticated client with new user
 * Creates a new user and signs in, returning the authenticated client
 */
export async function createAuthenticatedClient(
  prefix: string = "auth"
): Promise<{ client: TestClient; email: string; password: string }> {
  const client = new TestClient();
  const email = uniqueEmail(prefix);
  const password = "password123";

  // Sign up
  await signUp(client, {
    email,
    password,
    passwordConfirmation: password,
    firstName: "Test",
    lastName: "User",
  });

  // Sign in (new client to get session)
  const authClient = new TestClient();
  await signIn(authClient, email, password);

  return { client: authClient, email, password };
}

/**
 * Sign out and clear cookies
 */
export async function signOut(client: TestClient): Promise<void> {
  await client.post("/api/v1/auth/signout");
  client.clearCookies();
}
