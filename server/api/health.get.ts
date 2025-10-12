import { defineEventHandler } from "h3";
import { getDatabase } from "#server/database/utils";
import { drizzle } from "drizzle-orm/d1";
import { users, roles } from "#server/database/schema";
import * as schema from "#server/database/schema";

/**
 * Health check endpoint to verify D1 connection
 * GET /api/health
 */
export default defineEventHandler(async (event) => {
  const d1 = getDatabase(event);
  const db = drizzle(d1, { schema });

  try {
    // Test 1: Query users table
    const userCount = await db.select().from(users).all();

    // Test 2: Query roles table
    const roleCount = await db.select().from(roles).all();

    return {
      success: true,
      message: "API is healthy and DB connection works!",
      data: {
        users: userCount.length,
        roles: roleCount.length,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      stack: error.stack,
    };
  }
});
