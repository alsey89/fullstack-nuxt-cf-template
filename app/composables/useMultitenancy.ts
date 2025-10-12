// ========================================
// MULTITENANCY COMPOSABLE (CLIENT)
// ========================================

/**
 * Composable for multitenancy detection and utilities
 */
export function useMultitenancy() {
  const runtimeConfig = useRuntimeConfig();

  /**
   * Check if multitenancy is enabled
   */
  const isEnabled = computed(() => {
    return runtimeConfig.public.multitenancy?.enabled ?? true;
  });

  /**
   * Check if the app is in single-tenant mode
   */
  const isSingleTenant = computed(() => {
    return !isEnabled.value;
  });

  /**
   * Get the current mode as a string
   */
  const mode = computed(() => {
    return isEnabled.value ? "multi-tenant" : "single-tenant";
  });

  /**
   * Check if tenant headers/subdomains are required
   */
  const requiresTenantId = computed(() => {
    return isEnabled.value;
  });

  /**
   * Get multitenancy configuration details
   */
  const configuration = computed(() => ({
    enabled: isEnabled.value,
    mode: mode.value,
    requiresTenantId: requiresTenantId.value,
  }));

  return {
    isEnabled: readonly(isEnabled),
    isSingleTenant: readonly(isSingleTenant),
    mode: readonly(mode),
    requiresTenantId: readonly(requiresTenantId),
    config: readonly(configuration),
  };
}