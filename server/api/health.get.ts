import { defineEventHandler } from "h3";
import { getDatabase } from "#server/database/utils";
import { drizzle } from "drizzle-orm/d1";
import { users, workspaces } from "#server/database/schema";
import * as schema from "#server/database/schema";

/**
 * Health check endpoint to verify D1 connection
 * GET /api/health
 */
export default defineEventHandler(async (event) => {
  const d1 = getDatabase(event);
  const db = drizzle(d1, { schema });

  try {
    // Test database connection by querying tables
    const userCount = await db.select().from(users).all();
    const workspaceCount = await db.select().from(workspaces).all();

    return {
      success: true,
      message: "API is healthy and DB connection works!",
      data: {
        users: userCount.length,
        workspaces: workspaceCount.length,
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
