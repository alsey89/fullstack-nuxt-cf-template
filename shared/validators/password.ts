import { z } from "zod";

// ========================================
// PASSWORD VALIDATION
// ========================================
// Centralized password strength validation
// Single source of truth for password requirements
// ========================================

/**
 * Password strength requirements
 * Modify these constants to adjust password policy
 */
export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: false,
  requireLowercase: false,
  requireNumber: true,
  requireSpecial: false,
} as const;

/**
 * Validate password strength (programmatic validation)
 *
 * @returns Object with validation result and error messages
 *
 * @example
 * const result = validatePasswordStrength('weak')
 * if (!result.valid) {
 *   console.error(result.errors)
 * }
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < PASSWORD_RULES.minLength) {
    errors.push(
      `Password must be at least ${PASSWORD_RULES.minLength} characters`
    );
  }

  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (PASSWORD_RULES.requireNumber && !/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (PASSWORD_RULES.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Password Zod schema (reusable for all auth endpoints)
 *
 * Use this in signup, password reset, and password change schemas
 *
 * @example
 * const signupSchema = z.object({
 *   email: z.string().email(),
 *   password: passwordSchema,
 * })
 */
export const passwordSchema = z
  .string()
  .min(
    PASSWORD_RULES.minLength,
    `Password must be at least ${PASSWORD_RULES.minLength} characters`
  )
  .max(
    PASSWORD_RULES.maxLength,
    `Password must be less than ${PASSWORD_RULES.maxLength} characters`
  )
  .refine(
    (password) => validatePasswordStrength(password).valid,
    (password) => ({
      message: validatePasswordStrength(password).errors.join(", "),
    })
  );

/**
 * Type for password validation input
 */
export type PasswordValidationResult = ReturnType<
  typeof validatePasswordStrength
>;
