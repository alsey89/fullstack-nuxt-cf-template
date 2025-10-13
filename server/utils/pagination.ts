import type { Pagination, PaginatedResponse } from '#server/types/api';

// ========================================
// PAGINATION UTILITY
// ========================================
// Builds pagination metadata and paginated responses
// ========================================

/**
 * Calculate pagination metadata from total count
 */
export function calculatePagination(
  page: number,
  perPage: number,
  total: number
): Pagination {
  // Handle case where pagination is disabled (perPage = -1)
  if (perPage === -1) {
    return {
      page: 1,
      perPage: total,
      total,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    };
  }

  const totalPages = Math.ceil(total / perPage);

  return {
    page,
    perPage,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

/**
 * Build a paginated response with items and metadata
 */
export function buildPaginatedResponse<T>(
  items: T[],
  page: number,
  perPage: number,
  total: number
): PaginatedResponse<T> {
  return {
    items,
    pagination: calculatePagination(page, perPage, total),
  };
}

/**
 * Calculate limit and offset for database queries
 */
export function calculateLimitOffset(
  page: number,
  perPage: number
): { limit: number; offset: number } {
  // If perPage is -1, disable pagination
  if (perPage === -1) {
    return { limit: -1, offset: 0 };
  }

  return {
    limit: perPage,
    offset: (page - 1) * perPage,
  };
}
