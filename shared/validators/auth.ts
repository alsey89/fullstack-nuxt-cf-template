import { z } from "zod";
import { passwordSchema } from "./password";

// ========================================
// AUTHENTICATION VALIDATORS
// ========================================
// Zod schemas for auth-related endpoints
// Validates data types, formats, and constraints
// Note: Password validation is centralized in ./password.ts
// ========================================

/**
 * Sign in validation schema
 * POST /api/v1/auth/signin
 */
export const signinSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format")
    .max(255, "Email must be less than 255 characters"),
  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password must be less than 128 characters"),
  turnstileToken: z.string().optional(), // TODO: Turnstile - see docs/ROADMAP.md
});

/**
 * Sign up validation schema
 * POST /api/v1/auth/signup
 */
export const signupSchema = z
  .object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email format")
      .max(255, "Email must be less than 255 characters"),
    password: passwordSchema,
    passwordConfirmation: z
      .string()
      .min(1, "Password confirmation is required"),
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(100, "First name must be less than 100 characters"),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(100, "Last name must be less than 100 characters"),
    turnstileToken: z.string().optional(), // TODO: Turnstile - see docs/ROADMAP.md
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Passwords must match",
    path: ["passwordConfirmation"],
  });

/**
 * Password reset request validation schema
 * POST /api/v1/auth/password/reset/request
 */
export const passwordResetRequestSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format")
    .max(255, "Email must be less than 255 characters"),
  turnstileToken: z.string().optional(), // TODO: Turnstile - see docs/ROADMAP.md
});

/**
 * Password reset validation schema
 * PUT /api/v1/auth/password/reset
 */
export const passwordResetSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: passwordSchema,
    newPasswordConfirmation: z
      .string()
      .min(1, "Password confirmation is required"),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirmation, {
    message: "Passwords must match",
    path: ["newPasswordConfirmation"],
  });

/**
 * Email confirmation validation schema
 * POST /api/v1/auth/email/confirm
 */
export const emailConfirmSchema = z.object({
  token: z.string().min(1, "Confirmation token is required"),
});

// ========================================
// TYPE EXPORTS
// ========================================
// Use these types in your handlers for type safety

export type SigninInput = z.infer<typeof signinSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type PasswordResetRequestInput = z.infer<
  typeof passwordResetRequestSchema
>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type EmailConfirmInput = z.infer<typeof emailConfirmSchema>;
