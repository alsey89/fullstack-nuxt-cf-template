// /client/composables/useSubdomain.ts

/**
 ** A composable that extracts the subdomain from host.
 ** Works both on the server and client side (window.location vs request headers).
 ** Returns the subdomain as a string if present, or null if not.
 **/
export function useSubdomain(): string | null {
  // Determine the full host (with optional port)
  const host = import.meta.server
    ? useRequestEvent()?.node?.req?.headers.host ?? ""
    : window.location.host;

  // Strip off port if present
  const hostname = host.split(":")[0];
  // Split into domain segments
  const parts = hostname.split(".");

  // Return the subdomain string (or null)
  return parts.length > 2 ? parts[0] : null;
}
