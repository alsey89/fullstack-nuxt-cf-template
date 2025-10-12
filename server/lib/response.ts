import type { ApiResponse, ApiError, Pagination } from '#server/types/api';
import { MAX_PER_PAGE } from '#server/types/api';

/**
 * Normalize returns the normalized pagination values and
 * shows whether pagination should be applied.
 *
 * Rules:
 *   - If pagination is nil, skip pagination.
 *   - If `perPage` <= 0, skip pagination.
 *   - If `page` < 1, treat as 1.
 *   - If `perPage` > `MAX_PER_PAGE`, cap at `MAX_PER_PAGE`.
 */
export function normalizePagination(
  pagination?: Pagination | null
): { limit: number; offset: number; applyPagination: boolean } {
  if (!pagination) {
    return { limit: 0, offset: 0, applyPagination: false };
  }

  if (pagination.perPage <= 0) {
    return { limit: 0, offset: 0, applyPagination: false };
  }

  // max picks whichever is larger (floor)
  // ensures that page is never less than 1
  const page = Math.max(pagination.page, 1);

  // min picks whichever is smaller (ceiling)
  // ensures that perPage is never more than MAX_PER_PAGE
  const perPage = Math.min(pagination.perPage, MAX_PER_PAGE);

  return {
    limit: perPage,
    offset: (page - 1) * perPage,
    applyPagination: true,
  };
}

export function createSuccessResponse<T>(
  message: string,
  data?: T,
  pagination?: Pagination
): ApiResponse<T> {
  const response: ApiResponse<T> = {
    message,
    data: data !== undefined ? data : null,
    error: null,
  };

  if (pagination) {
    response.pagination = pagination;
  }

  return response;
}

export function createErrorResponse(
  traceID: string,
  code: string,
  message?: string
): ApiResponse {
  // Get environment from runtime config
  const config = useRuntimeConfig();
  const isDevelopment = config.public.environment !== 'production';

  return {
    message: 'Error occurred',
    data: null,
    error: {
      traceID,
      code,
      message: isDevelopment ? message : undefined,
    },
  };
}
