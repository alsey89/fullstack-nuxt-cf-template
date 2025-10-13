import type { H3Event } from 'h3';
import { getQuery } from 'h3';
import type {
  ListQuery,
  Filter,
  FilterOperator,
  SortOrder,
} from '#server/types/api';
import {
  DEFAULT_PAGE,
  DEFAULT_PER_PAGE,
  MAX_PER_PAGE,
} from '#server/types/api';

// ========================================
// QUERY PARSER UTILITY
// ========================================
// Parses query parameters from H3Event into structured ListQuery object
// Handles pagination, sorting, and filtering with sensible defaults
// ========================================

/**
 * Parse pagination parameters from query string
 */
export function parsePaginationParams(query: Record<string, any>): {
  page: number;
  perPage: number;
} {
  const page = query.page
    ? Math.max(1, parseInt(query.page as string, 10))
    : DEFAULT_PAGE;

  let perPage = query.perPage
    ? parseInt(query.perPage as string, 10)
    : DEFAULT_PER_PAGE;

  // Allow -1 to disable pagination (return all results)
  if (perPage !== -1) {
    perPage = Math.min(Math.max(1, perPage), MAX_PER_PAGE);
  }

  return { page, perPage };
}

/**
 * Parse sorting parameters from query string
 */
export function parseSortParams(query: Record<string, any>): {
  sortBy?: string;
  sortOrder?: SortOrder;
} {
  const sortBy = query.sortBy ? String(query.sortBy) : undefined;
  const sortOrder =
    query.sortOrder === 'asc' || query.sortOrder === 'desc'
      ? query.sortOrder
      : undefined;

  return { sortBy, sortOrder };
}

/**
 * Parse filter parameters from query string
 * Supports format: filter[field][operator]=value
 * Example: filter[email][like]=%@example.com
 */
export function parseFilterParams(query: Record<string, any>): Filter[] {
  const filters: Filter[] = [];

  // Look for filter[...] parameters
  const filterPrefix = 'filter[';

  Object.keys(query).forEach((key) => {
    if (!key.startsWith(filterPrefix)) {
      return;
    }

    // Parse filter[field][operator]
    const match = key.match(/^filter\[([^\]]+)\]\[([^\]]+)\]$/);
    if (!match) {
      return;
    }

    const [, field, operator] = match;
    const value = query[key];

    // Validate operator
    const validOperators: FilterOperator[] = [
      'eq',
      'ne',
      'like',
      'contains',
      'startsWith',
      'endsWith',
      'in',
      'gt',
      'gte',
      'lt',
      'lte',
      'isNull',
      'notNull',
    ];

    if (!validOperators.includes(operator as FilterOperator)) {
      return;
    }

    // Parse value based on operator
    let parsedValue = value;

    if (operator === 'in' && typeof value === 'string') {
      // Split comma-separated values
      parsedValue = value.split(',').map((v: string) => v.trim());
    } else if (operator === 'isNull' || operator === 'notNull') {
      // These operators don't need a value
      parsedValue = null;
    }

    filters.push({
      field,
      operator: operator as FilterOperator,
      value: parsedValue,
    });
  });

  return filters;
}

/**
 * Parse all list query parameters from H3Event
 */
export function parseListQuery(event: H3Event): ListQuery {
  const query = getQuery(event);

  const { page, perPage } = parsePaginationParams(query);
  const { sortBy, sortOrder } = parseSortParams(query);
  const filters = parseFilterParams(query);

  return {
    page,
    perPage,
    sortBy,
    sortOrder,
    filters,
  };
}

/**
 * Validate that sortBy field is in allowed list
 */
export function validateSortField(
  sortBy: string | undefined,
  allowedFields: string[],
  defaultField: string
): string {
  if (!sortBy) {
    return defaultField;
  }

  if (!allowedFields.includes(sortBy)) {
    return defaultField;
  }

  return sortBy;
}

/**
 * Validate that filter fields are in allowed list
 */
export function validateFilters(
  filters: Filter[],
  allowedFields: string[]
): Filter[] {
  return filters.filter((filter) => allowedFields.includes(filter.field));
}
