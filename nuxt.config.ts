// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  runtimeConfig: {
    // Multitenancy Configuration
    // Default: Single-tenant mode (one database for all data)
    // Set to true for multi-tenant mode (requires manual DB provisioning per tenant)
    multitenancy: {
      enabled: false, // Override with NUXT_MULTITENANCY_ENABLED
    },
    // RBAC Configuration
    rbac: {
      enabled: true, // Set to false to disable RBAC enforcement (can override with NUXT_RBAC_ENABLED)
    },
    // Email Configuration
    email: {
      provider: "none", // "none" | "resend" | "postmark" (override with NUXT_EMAIL_PROVIDER)
      apiKey: "", // Email provider API key (override with NUXT_EMAIL_API_KEY)
      from: "noreply@localhost", // From email address (override with NUXT_EMAIL_FROM)
    },

    // Private Keys
    session: {
      password: "overwrite-this-with-environment-in-production", // Min 32 chars
      cookie: {
        sameSite: "lax", // CSRF protection via SameSite cookies
        secure: process.env.NODE_ENV === "production", // HTTPS only in production
        httpOnly: true, // Prevent XSS access to cookies
      },
    },

    // JWT Secret (for email confirmation and password reset tokens)
    jwtSecret: "overwrite-this-with-environment-in-production", // Override with NUXT_JWT_SECRET

    // Seed Secret (for production database seeding via API)
    seedSecret: "overwrite-this-with-environment-in-production", // Override with NUXT_SEED_SECRET

    // Cloudflare Turnstile (bot protection)
    turnstileSecretKey: "overwrite-this-with-environment-in-production", // Override with NUXT_TURNSTILE_SECRET_KEY

    // Public Keys
    public: {
      environment: "development", // "development" | "staging" | "production"
      debugMode: true,
      apiUrl: "/api",
      turnstileSiteKey: "overwrite-this-with-environment-in-production", // Cloudflare Turnstile site key (public, set via NUXT_PUBLIC_TURNSTILE_SITE_KEY)
      // posthogPublicKey: "overwrite-this-with-environment-in-production", // PostHog public key (set via NUXT_PUBLIC_POSTHOG_PUBLIC_KEY)
      // posthogHost: "https://us.i.posthog.com",
      // posthogAutocapture: true,

      // Multitenancy Configuration (publicly accessible)
      // Must match server-side config for client to know routing strategy
      multitenancy: {
        enabled: false, // Override with NUXT_PUBLIC_MULTITENANCY_ENABLED
      },
    },
  },
  modules: [
    "@nuxt/eslint",
    "@nuxt/fonts",
    "@nuxt/icon",
    "@nuxt/test-utils",
    "@nuxt/image",
    "shadcn-nuxt",
    "@pinia/nuxt",
    "pinia-plugin-persistedstate/nuxt",
    "@formkit/auto-animate/nuxt",
    "@vite-pwa/nuxt",
    "@nuxtjs/i18n",
    "dayjs-nuxt",
    "nitro-cloudflare-dev",
    "nuxt-auth-utils",
  ],
  css: ["~/assets/css/tailwind.css"],
  vite: {
    plugins: [tailwindcss()],
  },
  alias: {
    "#server": fileURLToPath(new URL("./server", import.meta.url)),
    "#shared": fileURLToPath(new URL("./shared", import.meta.url)),
  },
  nitro: {
    preset: "cloudflare-module",
    compatibilityDate: "2025-07-15",
    errorHandler: "server/error/errorHandler.ts",
    cloudflareDev: {
      configPath: "./wrangler.staging.jsonc",
    },
  },
  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: "",
    /**
     * Directory that the component lives in.
     * @default "~/components/ui"
     */
    componentDir: "~/components/ui",
  },
  i18n: {
    vueI18n: "./i18n.config.ts",
    strategy: "prefix_except_default",
    defaultLocale: "en",
    bundle: {
      optimizeTranslationDirective: false,
    },
    locales: [
      { code: "en", name: "English", iso: "en-US" },
      { code: "zh-CN", name: "简体中文", iso: "zh-CN" },
      { code: "zh-TW", name: "繁體中文", iso: "zh-TW" },
    ],
  },
  pwa: {
    registerType: "prompt",
    manifest: {
      // TODO: Customize these values for your application
      name: "App Template", // TODO: Full app name (e.g., "My Awesome App")
      short_name: "app-template", // TODO: Short name for home screen (e.g., "MyApp")
      description: "A boilerplate for Nuxt 4 apps with auth", // TODO: App description
      display: "fullscreen",
      scope: "/",
      start_url: "/",
      theme_color: "#000000", // TODO: Update to match your brand color
      icons: [
        // TODO: Replace these icons with your own app icons in public/icons/
        { src: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { src: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        {
          src: "/icons/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png",
        },
        {
          src: "/icons/android-chrome-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/icons/android-chrome-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    },
    workbox: {
      // don’t precache _anything_
      globPatterns: [],

      // intercept *all* fetches and use network only
      runtimeCaching: [
        {
          urlPattern: /.*/i,
          handler: "NetworkOnly",
          method: "GET",
        },
      ],

      // no offline fallback page
      navigateFallback: null,
    },
    devOptions: { enabled: false, type: "module" },
  },
});
