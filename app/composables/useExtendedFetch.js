// composables/useExtendedFetch.js
import { handleApiError } from "./useErrorHandler";

/**
 ** A composable for making API requests with extended functionality.
 ** It includes request ID and tenant ID headers and centralized error handling.
 ** Authentication is handled automatically by nuxt-auth-utils via session cookies.
 ** It also provides a simple fetch that does not handle errors.
 * @module useExtendedFetch
 * @requires handleApiError - For centralized error handling
 * @requires useSubdomain - For tenant identification
 * @requires useRuntimeConfig - For accessing runtime configuration like API URL
 **/
export function useExtendedFetch() {
  const baseUrl = useRuntimeConfig().public.apiUrl;

  /**
   ** A simple $fetch wrapper that includes request ID and tenant ID headers.
   ** It does ***NOT*** handler errors.
   * @param {string} path - The API endpoint to fetch
   * @param {Object} [options={}] - Optional fetch options like method, body, etc.
   * @returns {Promise<Object>} - Returns an object with status and payload
   * @throws {Error} - Throws an error if the fetch fails
   **/
  async function simpleFetch(path, options = {}) {
    const requestId = crypto.randomUUID();
    const subdomain = useSubdomain();

    const headers = {
      "Content-Type": "application/json",
      "X-Request-Id": requestId,
      "X-Tenant-Id": subdomain,
      ...options.headers,
    };

    const res = await $fetch.raw(path, {
      ...options,
      baseURL: baseUrl,
      credentials: "include",
      headers,
    });
    return { status: res.status, ok: res.ok, payload: res._data };
  }

  /**
   ** A wrapper around simpleFetch, includes everything from simpleFetch.
   ** Additionally provides centralized error handling.
   ** Authentication is handled automatically via nuxt-auth-utils session cookies.
   * @param {string} path - The API endpoint to fetch
   * @param {Object} [options={}] - Optional fetch options like method, body, etc.
   * @param {boolean} [blockRedirect=false] - If true, prevents redirecting on 401/403 errors
   **/
  async function extendedFetch(
    path,
    options = {},
    blockRedirect = false
  ) {
    try {
      return await simpleFetch(path, options);
    } catch (error) {
      /////////////////////////////////////////////////////////////////////
      // Central Error Handler
      /////////////////////////////////////////////////////////////////////
      handleApiError(error, { blockRedirect });
    }
  }

  return { simpleFetch, extendedFetch };
}
