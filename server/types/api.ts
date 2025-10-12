export const HdrKeyRequestID = 'X-Request-ID';
export const HdrKeyTenantID = 'X-Tenant-ID';

export const CtxKeyRequestID = 'requestID';
export const CtxKeyRawTenantID = 'rawTenantID'; // The raw tenant ID from the request header, not resolved.
export const CtxKeyResolvedTenantID = 'resolvedTenantID';

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
// PAGINATION
//////////////////////////////////////////////////////////////////////////

export const MAX_PER_PAGE = 100;

export interface Pagination {
  page: number;
  perPage: number;
  total?: number;
}
