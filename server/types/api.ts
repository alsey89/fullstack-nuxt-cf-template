export const HdrKeyRequestID = "X-Request-ID";
export const HdrKeyTenantID = "X-Tenant-ID";

export interface ApiResponse<T = any> {
  message: string;
  data: T | null;
  error: ApiError | null;
  pagination?: Pagination;
}

export interface ApiError {
  traceID: string;
  code: string;
  message?: string; // Only included in non-PROD environments
}

//////////////////////////////////////////////////////////////////////////
// PAGINATION & FILTERING
//////////////////////////////////////////////////////////////////////////

export const MAX_PER_PAGE = 100;
export const DEFAULT_PER_PAGE = 20;
export const DEFAULT_PAGE = 1;

export interface Pagination {
  page: number;
  perPage: number;
  total?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

//////////////////////////////////////////////////////////////////////////
// SORTING
//////////////////////////////////////////////////////////////////////////

export type SortOrder = "asc" | "desc";

export interface SortOptions {
  sortBy?: string;
  sortOrder?: SortOrder;
}

//////////////////////////////////////////////////////////////////////////
// FILTERING
//////////////////////////////////////////////////////////////////////////

export type FilterOperator =
  | "eq" // equal
  | "ne" // not equal
  | "like" // SQL LIKE pattern (user provides %)
  | "contains" // contains (auto-wrapped with %)
  | "startsWith" // starts with (auto-appends %)
  | "endsWith" // ends with (auto-prepends %)
  | "in" // in array
  | "gt" // greater than
  | "gte" // greater than or equal
  | "lt" // less than
  | "lte" // less than or equal
  | "isNull" // is NULL
  | "notNull"; // is NOT NULL;

export interface Filter {
  field: string;
  operator: FilterOperator;
  value: any;
}

//////////////////////////////////////////////////////////////////////////
// LIST QUERY
//////////////////////////////////////////////////////////////////////////

export interface ListQuery extends SortOptions {
  page?: number;
  perPage?: number;
  filters?: Filter[];
}
