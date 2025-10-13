import { getHeader, defineEventHandler } from "h3";
import { seedDatabase, clearDatabase } from "#server/database/seed";
import { createSuccessResponse } from "#server/lib/response";
import { AuthorizationError } from "#server/error/errors";
import { isProduction } from "#server/utils/environment";

// ========================================
// POST /api/seed
// ========================================
// Seeds the database with test data
// PRODUCTION: Only allow if SEED_SECRET matches
// DEVELOPMENT: Always allowed
// ========================================

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const env = event.context.cloudflare?.env;

  // Check if we're in production
  const isProd = isProduction(event);
  const seedSecret = config.seedSecret;

  if (isProd) {
    // Require secret in production
    const providedSecret = getHeader(event, "x-seed-secret");

    if (!seedSecret || providedSecret !== seedSecret) {
      throw new AuthorizationError("Invalid seed secret.");
    }
  }

  // Get D1 database
  const db = env?.DB as D1Database;
  if (!db) {
    throw new Error("D1 database not available");
  }

  console.log("🗑️  Clearing database...");
  await clearDatabase(db);

  console.log("🌱 Seeding database...");
  const isMultitenancyEnabled = config.multitenancy?.enabled ?? true;
  await seedDatabase(db, { multitenancyEnabled: isMultitenancyEnabled });

  return createSuccessResponse("Database seeded successfully", {
    environment: isProd ? "production" : "development",
    multitenancy: isMultitenancyEnabled ? "enabled" : "disabled",
  });
});
