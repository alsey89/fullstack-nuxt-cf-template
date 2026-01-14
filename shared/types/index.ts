// ========================================
// SHARED TYPES
// ========================================
// Re-exports types for frontend consumption
// Import from '#shared/types' in frontend code
// ========================================

// Types from database schema (safe subset for frontend)
export type {
  User,
  Workspace,
  WorkspaceMember,
  WorkspaceInvite,
  UserSettings,
  AuditLog,
} from "#server/database/schema/identity";

// API types
export type {
  ApiResponse,
  ApiError,
  Pagination,
  PaginatedResponse,
  SortOrder,
  SortOptions,
  Filter,
  FilterOperator,
  ListQuery,
} from "#server/types/api";

// Error codes
export { ERROR_CODES, type ErrorCode } from "#shared/error/codes";
