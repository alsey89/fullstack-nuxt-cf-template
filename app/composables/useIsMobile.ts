// ~/composables/useIsMobile.ts

import { ref, computed, onMounted, onUnmounted } from "vue";
import type { ComputedRef } from "vue";

/**
 * A composable to determine if the client is a mobile device.
 * Checks if the viewport width is less than or equal to 667px.
 * Returns a reactive boolean value
 *
 * @returns Computed boolean indicating if device is mobile
 */
export function useIsMobile(): ComputedRef<boolean> | undefined {
  const isMobile = ref(false);

  // Skip the server side check
  if (import.meta.server) {
    return;
  }

  onMounted(() => {
    const mq = window.matchMedia("(max-width: 667px)");
    // Set initial value
    isMobile.value = mq.matches;

    // Update on resize
    const handleChange = (e: MediaQueryListEvent) => {
      isMobile.value = e.matches;
    };

    mq.addEventListener("change", handleChange);

    // Cleanup listener on unmount
    onUnmounted(() => {
      mq.removeEventListener("change", handleChange);
    });
  });

  return computed(() => isMobile.value);
}
