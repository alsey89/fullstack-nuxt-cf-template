import { describe, it, expect } from "vitest";
import {
  signinSchema,
  signupSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  emailConfirmSchema,
} from "#shared/validators/auth";

describe("signinSchema", () => {
  it("accepts valid input", () => {
    const result = signinSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional turnstileToken", () => {
    const result = signinSchema.safeParse({
      email: "test@example.com",
      password: "password123",
      turnstileToken: "token123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing email", () => {
    const result = signinSchema.safeParse({
      password: "password123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("email");
    }
  });

  it("rejects missing password", () => {
    const result = signinSchema.safeParse({
      email: "test@example.com",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("password");
    }
  });

  it("rejects empty email", () => {
    const result = signinSchema.safeParse({
      email: "",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = signinSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("email");
    }
  });

  it("rejects email exceeding max length", () => {
    const longEmail = "a".repeat(250) + "@test.com";
    const result = signinSchema.safeParse({
      email: longEmail,
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password exceeding max length", () => {
    const result = signinSchema.safeParse({
      email: "test@example.com",
      password: "a".repeat(129),
    });
    expect(result.success).toBe(false);
  });
});

describe("signupSchema", () => {
  const validInput = {
    email: "test@example.com",
    password: "password123",
    passwordConfirmation: "password123",
    firstName: "John",
    lastName: "Doe",
  };

  it("accepts valid input", () => {
    const result = signupSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts optional turnstileToken", () => {
    const result = signupSchema.safeParse({
      ...validInput,
      turnstileToken: "token123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects password mismatch", () => {
    const result = signupSchema.safeParse({
      ...validInput,
      passwordConfirmation: "different",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("passwordConfirmation");
      expect(result.error.issues[0].message).toContain("match");
    }
  });

  it("rejects missing firstName", () => {
    const result = signupSchema.safeParse({
      email: "test@example.com",
      password: "password123",
      passwordConfirmation: "password123",
      lastName: "Doe",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("firstName");
    }
  });

  it("rejects missing lastName", () => {
    const result = signupSchema.safeParse({
      email: "test@example.com",
      password: "password123",
      passwordConfirmation: "password123",
      firstName: "John",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("lastName");
    }
  });

  it("rejects firstName exceeding max length", () => {
    const result = signupSchema.safeParse({
      ...validInput,
      firstName: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects lastName exceeding max length", () => {
    const result = signupSchema.safeParse({
      ...validInput,
      lastName: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects weak password (too short)", () => {
    const result = signupSchema.safeParse({
      ...validInput,
      password: "short1",
      passwordConfirmation: "short1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without number", () => {
    const result = signupSchema.safeParse({
      ...validInput,
      password: "passwordnonum",
      passwordConfirmation: "passwordnonum",
    });
    expect(result.success).toBe(false);
  });
});

describe("passwordResetRequestSchema", () => {
  it("accepts valid email", () => {
    const result = passwordResetRequestSchema.safeParse({
      email: "test@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional turnstileToken", () => {
    const result = passwordResetRequestSchema.safeParse({
      email: "test@example.com",
      turnstileToken: "token123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing email", () => {
    const result = passwordResetRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = passwordResetRequestSchema.safeParse({
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("passwordResetSchema", () => {
  it("accepts valid input", () => {
    const result = passwordResetSchema.safeParse({
      token: "reset-token-123",
      newPassword: "newpassword123",
      newPasswordConfirmation: "newpassword123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing token", () => {
    const result = passwordResetSchema.safeParse({
      newPassword: "newpassword123",
      newPasswordConfirmation: "newpassword123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("token");
    }
  });

  it("rejects empty token", () => {
    const result = passwordResetSchema.safeParse({
      token: "",
      newPassword: "newpassword123",
      newPasswordConfirmation: "newpassword123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password mismatch", () => {
    const result = passwordResetSchema.safeParse({
      token: "reset-token-123",
      newPassword: "newpassword123",
      newPasswordConfirmation: "different123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("newPasswordConfirmation");
    }
  });

  it("rejects weak new password", () => {
    const result = passwordResetSchema.safeParse({
      token: "reset-token-123",
      newPassword: "weak",
      newPasswordConfirmation: "weak",
    });
    expect(result.success).toBe(false);
  });
});

describe("emailConfirmSchema", () => {
  it("accepts valid token", () => {
    const result = emailConfirmSchema.safeParse({
      token: "confirm-token-123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing token", () => {
    const result = emailConfirmSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty token", () => {
    const result = emailConfirmSchema.safeParse({
      token: "",
    });
    expect(result.success).toBe(false);
  });
});
