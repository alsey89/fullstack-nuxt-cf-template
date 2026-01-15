// composables/useExtendedFetch.ts
import { handleApiError } from "./useErrorHandler";

type HttpMethod =
  | "GET"
  | "HEAD"
  | "PATCH"
  | "POST"
  | "PUT"
  | "DELETE"
  | "CONNECT"
  | "OPTIONS"
  | "TRACE"
  | "get"
  | "head"
  | "patch"
  | "post"
  | "put"
  | "delete"
  | "connect"
  | "options"
  | "trace";

interface FetchResult<T = any> {
  status: number;
  ok: boolean;
  payload: T;
}

interface ExtendedFetchOptions {
  method?: HttpMethod;
  body?: any;
  query?: Record<string, any>;
  headers?: Record<string, string>;
  params?: Record<string, any>;
}

/**
 * A composable for making API requests with extended functionality.
 * It includes request ID and workspace ID headers and centralized error handling.
 * Authentication is handled automatically by nuxt-auth-utils via session cookies.
 * It also provides a simple fetch that does not handle errors.
 *
 * @module useExtendedFetch
 * @requires handleApiError - For centralized error handling
 * @requires useSubdomain - For workspace identification
 * @requires useRuntimeConfig - For accessing runtime configuration like API URL
 */
export function useExtendedFetch() {
  const baseUrl = useRuntimeConfig().public.apiUrl;

  /**
   * A simple $fetch wrapper that includes request ID and workspace ID headers.
   * It does NOT handle errors.
   *
   * @param path - The API endpoint to fetch
   * @param options - Optional fetch options like method, body, etc.
   * @returns Returns an object with status and payload
   * @throws Error - Throws an error if the fetch fails
   */
  async function simpleFetch<T = any>(
    path: string,
    options: ExtendedFetchOptions = {}
  ): Promise<FetchResult<T>> {
    const requestId = crypto.randomUUID();
    const subdomain = useSubdomain();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Request-Id": requestId,
      "X-Workspace-Id": subdomain || "",
      ...options.headers,
    };

    const res = await $fetch.raw<T>(path, {
      method: options.method,
      body: options.body,
      query: options.query,
      params: options.params,
      baseURL: baseUrl,
      credentials: "include" as RequestCredentials,
      headers,
    });

    return {
      status: res.status,
      ok: res.ok,
      payload: res._data as T,
    };
  }

  /**
   * A wrapper around simpleFetch, includes everything from simpleFetch.
   * Additionally provides centralized error handling.
   * Authentication is handled automatically via nuxt-auth-utils session cookies.
   *
   * @param path - The API endpoint to fetch
   * @param options - Optional fetch options like method, body, etc.
   * @param blockRedirect - If true, prevents redirecting on 401/403 errors
   * @returns Returns an object with status and payload, or undefined on error
   */
  async function extendedFetch<T = any>(
    path: string,
    options: ExtendedFetchOptions = {},
    blockRedirect = false
  ): Promise<FetchResult<T> | undefined> {
    try {
      return await simpleFetch<T>(path, options);
    } catch (error: any) {
      /////////////////////////////////////////////////////////////////////
      // Central Error Handler
      /////////////////////////////////////////////////////////////////////
      handleApiError(error, { blockRedirect });
      return undefined;
    }
  }

  return { simpleFetch, extendedFetch };
}
