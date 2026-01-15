// ========================================
// WORKSPACE COMPOSABLE (CLIENT)
// ========================================

/**
 * Composable for workspace/multi-workspace detection and utilities
 */
export function useWorkspace() {
  const runtimeConfig = useRuntimeConfig();

  /**
   * Check if multi-workspace mode is enabled
   */
  const isMultiWorkspace = computed(() => {
    return runtimeConfig.public.multitenancy?.enabled ?? true;
  });

  /**
   * Check if the app is in single-workspace mode
   */
  const isSingleWorkspace = computed(() => {
    return !isMultiWorkspace.value;
  });

  /**
   * Get the current mode as a string
   */
  const mode = computed(() => {
    return isMultiWorkspace.value ? "multi-workspace" : "single-workspace";
  });

  /**
   * Check if workspace headers/subdomains are required
   */
  const requiresWorkspaceId = computed(() => {
    return isMultiWorkspace.value;
  });

  /**
   * Get workspace configuration details
   */
  const configuration = computed(() => ({
    enabled: isMultiWorkspace.value,
    mode: mode.value,
    requiresWorkspaceId: requiresWorkspaceId.value,
  }));

  return {
    isMultiWorkspace: readonly(isMultiWorkspace),
    isSingleWorkspace: readonly(isSingleWorkspace),
    mode: readonly(mode),
    requiresWorkspaceId: readonly(requiresWorkspaceId),
    config: readonly(configuration),
  };
}
