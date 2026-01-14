export const TEST_PORT = Number(process.env.TEST_PORT || 3123);
// Ensure BASE_URL is absolute and points to our test server
// We ignore process.env.BASE_URL if it's just '/' (common in Nuxt)
export const BASE_URL =
  !process.env.BASE_URL || process.env.BASE_URL === "/"
    ? `http://127.0.0.1:${TEST_PORT}`
    : process.env.BASE_URL;

export const TEST_TIMEOUT = 30000;
