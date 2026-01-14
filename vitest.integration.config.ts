import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Integration Test Configuration
 *
 * Uses npm run dev:test to spin up the Nuxt dev server with local D1/R2 emulation.
 * Tests make real HTTP requests to the running server.
 *
 * The server is started in globalSetup and stopped in globalTeardown.
 * If the server is already running (manual dev workflow), it will be reused.
 */
export default defineConfig({
  test: {
    globals: true,
    include: ["tests/integration/**/*.test.ts"],
    exclude: ["node_modules", ".nuxt", "dist"],
    globalSetup: ["./tests/integration/global-setup.ts"],
    // Run tests sequentially to avoid race conditions with shared database
    sequence: {
      shuffle: false,
    },
    fileParallelism: false,
    // Increase timeout for integration tests
    testTimeout: 30000, // 30s for individual tests
    hookTimeout: 120000, // 2 min for server startup
  },
  resolve: {
    alias: {
      "~": fileURLToPath(new URL(".", import.meta.url)),
      "@": fileURLToPath(new URL(".", import.meta.url)),
      "#server": fileURLToPath(new URL("./server", import.meta.url)),
      "#shared": fileURLToPath(new URL("./shared", import.meta.url)),
    },
  },
});
