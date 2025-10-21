// ========================================
// API CONSTANTS
// ========================================
// Shared constants for API behavior
// Used by both frontend and backend
// ========================================

//////////////////////////////////////////////////////////////////////////
// PAGINATION CONSTANTS
//////////////////////////////////////////////////////////////////////////

/**
 * Maximum number of items per page
 * Used to prevent excessive data retrieval
 */
export const MAX_PER_PAGE = 100;

/**
 * Default number of items per page
 * Used when client doesn't specify perPage
 */
export const DEFAULT_PER_PAGE = 20;

/**
 * Default page number
 * Used when client doesn't specify page
 */
export const DEFAULT_PAGE = 1;
