// ========================================
// TRANSLATIONS HELPER
// ========================================
// Safe i18n access for non-component contexts (stores, utilities)
// Falls back gracefully when Nuxt context is unavailable
// ========================================

/**
 * Get a translation string from i18n
 * Safe to use in stores and other non-component contexts
 *
 * @param key - The i18n translation key (e.g., 'auth.signin.success.title')
 * @returns The translated string, or the key itself if translation unavailable
 *
 * @example
 * // In a Pinia store
 * const title = getTranslation('auth.signin.success.title');
 */
export function getTranslation(key: string): string {
  try {
    const nuxtApp = useNuxtApp();
    if (nuxtApp.$i18n) {
      const translated = nuxtApp.$i18n.t(key) as string;
      // Return key if translation not found (i18n returns key as fallback)
      return translated !== key ? translated : key;
    }
    return key;
  } catch {
    // Nuxt context not available (SSR, outside component lifecycle)
    return key;
  }
}

/**
 * Get multiple translation strings at once
 * Useful for getting title and description together
 *
 * @param keys - Object mapping property names to i18n keys
 * @returns Object with translated values
 *
 * @example
 * const { title, description } = getTranslations({
 *   title: 'auth.signin.success.title',
 *   description: 'auth.signin.success.description',
 * });
 */
export function getTranslations<T extends Record<string, string>>(
  keys: T
): { [K in keyof T]: string } {
  const result = {} as { [K in keyof T]: string };
  for (const [prop, key] of Object.entries(keys)) {
    result[prop as keyof T] = getTranslation(key);
  }
  return result;
}
