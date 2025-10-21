import { z } from "zod";
import { MAX_PER_PAGE, DEFAULT_PER_PAGE, DEFAULT_PAGE } from "../constants/api";

// ========================================
// QUERY VALIDATION SCHEMAS
// ========================================
// Zod schemas for validating list query parameters
// ========================================

/**
 * Pagination parameters schema
 */
export const paginationSchema = z.object({
  page: z
    .number()
    .int()
    .min(1, "Page must be at least 1")
    .default(DEFAULT_PAGE)
    .optional(),
  perPage: z
    .number()
    .int()
    .refine((val) => val === -1 || (val >= 1 && val <= MAX_PER_PAGE), {
      message: `perPage must be -1 (all) or between 1 and ${MAX_PER_PAGE}`,
    })
    .default(DEFAULT_PER_PAGE)
    .optional(),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

/**
 * Sort order schema
 */
export const sortOrderSchema = z.enum(["asc", "desc"]).default("asc");

export type SortOrderParam = z.infer<typeof sortOrderSchema>;

/**
 * Sort parameters schema
 */
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: sortOrderSchema.optional(),
});

export type SortParams = z.infer<typeof sortSchema>;

/**
 * Filter operator schema
 */
export const filterOperatorSchema = z.enum([
  "eq",
  "ne",
  "like",
  "contains",
  "startsWith",
  "endsWith",
  "in",
  "gt",
  "gte",
  "lt",
  "lte",
  "isNull",
  "notNull",
]);

export type FilterOperatorParam = z.infer<typeof filterOperatorSchema>;

/**
 * Single filter schema
 */
export const filterSchema = z.object({
  field: z.string().min(1, "Field is required"),
  operator: filterOperatorSchema,
  value: z.any().optional(),
});

export type FilterParam = z.infer<typeof filterSchema>;

/**
 * Complete list query schema
 */
export const listQuerySchema = paginationSchema.merge(sortSchema).extend({
  filters: z.array(filterSchema).optional(),
});

export type ListQueryParams = z.infer<typeof listQuerySchema>;

/**
 * User-specific list query schema
 */
export const userListQuerySchema = listQuerySchema.extend({
  sortBy: z
    .enum([
      "email",
      "firstName",
      "lastName",
      "createdAt",
      "role",
      "isActive",
      "isEmailVerified",
    ])
    .optional(),
});

export type UserListQueryParams = z.infer<typeof userListQuerySchema>;

/**
 * Role-specific list query schema
 */
export const roleListQuerySchema = listQuerySchema.extend({
  sortBy: z.enum(["name", "createdAt", "isSystem", "description"]).optional(),
  includeSystem: z.boolean().default(true).optional(),
});

export type RoleListQueryParams = z.infer<typeof roleListQuerySchema>;

/**
 * Permission-specific list query schema
 */
export const permissionListQuerySchema = listQuerySchema.extend({
  sortBy: z.enum(["code", "category", "description"]).optional(),
});

export type PermissionListQueryParams = z.infer<
  typeof permissionListQuerySchema
>;

/**
 * Helper function to validate and parse list query parameters
 */
export function validateListQuery<T extends z.ZodType>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data);
}

/**
 * Helper function to safely validate and parse (returns error on failure)
 */
export function safeValidateListQuery<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
