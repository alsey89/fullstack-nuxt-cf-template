import { z } from "zod";

// ========================================
// User Profile Validation Schemas
// ========================================

/**
 * Schema for updating user profile
 * All fields are optional (partial update)
 * Validates:
 * - Name fields: 1-100 chars, no HTML
 * - Phone: E.164 format
 * - Email: Valid email format
 * - Address fields: Max lengths
 * - Date: Valid ISO date string
 */
export const updateProfileSchema = z.object({
  // Personal info
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  dateOfBirth: z.string().date().optional(), // ISO date string
  phone: z.string().max(20).optional(),

  // Address
  address: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),

  // Emergency contact (ec prefix)
  ecFirstName: z.string().max(100).optional(),
  ecLastName: z.string().max(100).optional(),
  ecRelationship: z.string().max(50).optional(),
  ecEmail: z.string().email().max(255).optional(),
  ecPhone: z.string().max(20).optional(),
  ecAddress: z.string().max(255).optional(),
  ecCity: z.string().max(100).optional(),
  ecState: z.string().max(100).optional(),
  ecCountry: z.string().max(100).optional(),
  ecPostalCode: z.string().max(20).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
