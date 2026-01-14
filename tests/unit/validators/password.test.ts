import { describe, it, expect } from "vitest";
import {
  PASSWORD_RULES,
  validatePasswordStrength,
  passwordSchema,
} from "#shared/validators/password";

describe("PASSWORD_RULES", () => {
  it("has correct default values", () => {
    expect(PASSWORD_RULES.minLength).toBe(8);
    expect(PASSWORD_RULES.maxLength).toBe(128);
    expect(PASSWORD_RULES.requireUppercase).toBe(false);
    expect(PASSWORD_RULES.requireLowercase).toBe(false);
    expect(PASSWORD_RULES.requireNumber).toBe(true);
    expect(PASSWORD_RULES.requireSpecial).toBe(false);
  });
});

describe("validatePasswordStrength", () => {
  it("returns valid for password meeting all requirements", () => {
    const result = validatePasswordStrength("password123");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns invalid for password too short", () => {
    const result = validatePasswordStrength("short1");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      `Password must be at least ${PASSWORD_RULES.minLength} characters`
    );
  });

  it("returns invalid for password missing number", () => {
    const result = validatePasswordStrength("passwordwithoutnum");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Password must contain at least one number"
    );
  });

  it("returns multiple errors for multiple violations", () => {
    const result = validatePasswordStrength("short");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it("returns valid for password at exact minimum length with number", () => {
    const result = validatePasswordStrength("passwor1"); // exactly 8 chars
    expect(result.valid).toBe(true);
  });

  it("returns valid for password with special characters", () => {
    const result = validatePasswordStrength("password123!@#");
    expect(result.valid).toBe(true);
  });

  it("returns valid for password with mixed case", () => {
    const result = validatePasswordStrength("PassWord123");
    expect(result.valid).toBe(true);
  });

  it("returns invalid for empty password", () => {
    const result = validatePasswordStrength("");
    expect(result.valid).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("parses valid password", () => {
    const result = passwordSchema.safeParse("password123");
    expect(result.success).toBe(true);
  });

  it("rejects password too short", () => {
    const result = passwordSchema.safeParse("short1");
    expect(result.success).toBe(false);
  });

  it("rejects password too long", () => {
    const result = passwordSchema.safeParse("a".repeat(129) + "1");
    expect(result.success).toBe(false);
  });

  it("rejects password without number", () => {
    const result = passwordSchema.safeParse("passwordwithoutnum");
    expect(result.success).toBe(false);
  });

  it("provides meaningful error message", () => {
    const result = passwordSchema.safeParse("short");
    expect(result.success).toBe(false);
    if (!result.success) {
      // Error message should mention the issue
      const messages = result.error.issues.map((i) => i.message).join(" ");
      expect(messages.length).toBeGreaterThan(0);
    }
  });

  it("accepts password at max length with number", () => {
    const result = passwordSchema.safeParse("a".repeat(127) + "1");
    expect(result.success).toBe(true);
  });
});
