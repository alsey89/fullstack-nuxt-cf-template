import { drizzle } from "drizzle-orm/d1";
import * as schema from "#server/database/schema/identity";
import { Hash } from "@adonisjs/hash";
import { Scrypt } from "@adonisjs/hash/drivers/scrypt";
import { createBatchInserts, executeBatch } from "#server/database/batch";

// Create hash instance for password hashing
const scrypt = new Scrypt({
  cost: 16384,
  blockSize: 8,
  parallelization: 1,
  maxMemory: 33554432,
});
const hashUtil = new Hash(scrypt);

async function hashPassword(password: string): Promise<string> {
  return await hashUtil.make(password);
}

// ========================================
// DATABASE SEEDER - Full Template Pattern
// ========================================
// Seeds: users, workspace, workspace_members, user_settings
// Demonstrates multitenancy pattern for template users
// RBAC is config-based (see server/config/rbac.ts) - no roles table needed
// ========================================

export async function seedDatabase(
  db: D1Database,
  options?: { multitenancyEnabled?: boolean }
) {
  const now = new Date();
  const isMultitenancyEnabled = options?.multitenancyEnabled ?? true;

  console.log("🌱 Starting template database seed...\n");

  // ========================================
  // 1. CREATE USERS
  // ========================================
  console.log("👥 Creating users...");

  // TODO: Update default password for development (currently "testtesttest")
  // IMPORTANT: Do NOT use these test accounts in production!
  const passwordHash = await hashPassword("testtesttest");

  // TODO: Customize these test users or remove after initial setup
  const users = [
    {
      id: crypto.randomUUID(),
      email: "admin@test.com", // TODO: Update for your domain
      firstName: "Admin",
      lastName: "User",
      phone: "+1-555-234-5678",
      role: "admin", // Config-based role (see server/config/rbac.ts)
    },
    {
      id: crypto.randomUUID(),
      email: "manager@test.com", // TODO: Update for your domain
      firstName: "Manager",
      lastName: "User",
      phone: "+1-555-345-6789",
      role: "manager",
    },
    {
      id: crypto.randomUUID(),
      email: "user@test.com", // TODO: Update for your domain
      firstName: "Regular",
      lastName: "User",
      phone: "+1-555-456-7890",
      role: "user",
    },
  ];

  // Insert users using batch operation
  const userValues = users.map((u) => ({
    id: u.id,
    email: u.email,
    password_hash: passwordHash,
    first_name: u.firstName,
    last_name: u.lastName,
    phone: u.phone,
    role: u.role,
    is_email_verified: 1, // SQLite uses 1/0 for boolean
    is_active: 1,
    has_completed_onboarding: 1,
    created_at: now.getTime(),
    updated_at: now.getTime(),
    deleted_at: null,
  }));

  const userStatements = createBatchInserts(db, "users", userValues);
  await executeBatch(db, userStatements);

  users.forEach((u) => {
    console.log(`✅ Created user: ${u.email} (${u.role})`);
  });
  console.log(`   Password for all users: testtesttest\n`);

  // ========================================
  // 2. CREATE DEFAULT WORKSPACE
  // ========================================
  console.log("🏢 Creating default workspace...");

  const workspaceId = crypto.randomUUID();
  // Non-null assertion safe: users array is defined with 3 elements above
  const adminUser = users[0]!;

  const workspaceStatement = db
    .prepare(
      `INSERT INTO workspaces (id, name, slug, description, owner_id, is_active, settings, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      workspaceId,
      "Default Workspace",
      "default",
      "Default workspace for the template",
      adminUser.id,
      1,
      JSON.stringify({}),
      now.getTime(),
      now.getTime(),
      null
    );

  await db.batch([workspaceStatement]);
  console.log(`✅ Created workspace: Default Workspace (slug: default)\n`);

  // ========================================
  // 3. CREATE WORKSPACE MEMBERSHIPS
  // ========================================
  console.log("👥 Adding users to workspace...");

  const membershipValues = users.map((u) => ({
    id: crypto.randomUUID(),
    workspace_id: workspaceId,
    user_id: u.id,
    role: u.role, // Same role as their global role for simplicity
    joined_at: now.getTime(),
    created_at: now.getTime(),
    updated_at: now.getTime(),
    deleted_at: null,
  }));

  const membershipStatements = createBatchInserts(
    db,
    "workspace_members",
    membershipValues
  );
  await executeBatch(db, membershipStatements);

  users.forEach((u) => {
    console.log(`✅ Added ${u.email} to workspace as ${u.role}`);
  });
  console.log();

  // ========================================
  // 4. CREATE USER SETTINGS
  // ========================================
  console.log("⚙️  Creating user settings...");

  const settingsValues = users.map((u) => ({
    id: crypto.randomUUID(),
    user_id: u.id,
    settings: JSON.stringify({
      theme: "system",
      notifications: true,
      language: "en",
    }),
    created_at: now.getTime(),
    updated_at: now.getTime(),
    deleted_at: null,
  }));

  const settingsStatements = createBatchInserts(
    db,
    "user_settings",
    settingsValues
  );
  await executeBatch(db, settingsStatements);

  console.log(`✅ Created settings for ${users.length} users\n`);

  // ========================================
  // SUMMARY
  // ========================================
  console.log("🎉 Template seed completed successfully!\n");
  console.log("═══════════════════════════════════════");
  console.log("📊 TEMPLATE SEED SUMMARY");
  console.log("═══════════════════════════════════════");
  console.log(`Architecture: Per-tenant database`);
  console.log(`Mode: ${isMultitenancyEnabled ? "Multi-tenant" : "Single-tenant"}`);
  console.log(`Transaction: Atomic batch operations (D1 batch API)`);
  console.log(`Users: 3 (admin, manager, user)`);
  console.log(`Workspaces: 1 (default)`);
  console.log(`RBAC: Config-based roles (see server/config/rbac.ts)`);
  console.log(`\nTest Accounts:`);

  users.forEach((user) => {
    console.log(`\n👤 ${user.firstName} ${user.lastName} (${user.role}):`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: testtesttest`);
  });

  console.log(`\n🔧 Usage:`);
  if (isMultitenancyEnabled) {
    console.log(`   # Multi-tenant mode: Include x-tenant-id header`);
    console.log(`   curl -X POST http://localhost:3000/api/v1/auth/signin \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -H "x-tenant-id: your-tenant-id" \\`);
    console.log(`     -d '{"email":"admin@test.com","password":"testtesttest"}'`);
  } else {
    console.log(`   # Single-tenant mode: No tenant header needed`);
    console.log(`   curl -X POST http://localhost:3000/api/v1/auth/signin \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"email":"admin@test.com","password":"testtesttest"}'`);
  }
  console.log("═══════════════════════════════════════\n");
}

/**
 * Clear all data from database (for re-seeding)
 */
export async function clearDatabase(db: D1Database) {
  const drizzleDb = drizzle(db, { schema });

  console.log("🗑️  Clearing database...\n");

  // Temporarily disable foreign keys to avoid constraint errors during clearing
  await db.exec("PRAGMA foreign_keys = OFF;");

  try {
    // Delete in reverse order of dependencies
    await drizzleDb.delete(schema.auditLogs);
    await drizzleDb.delete(schema.workspaceInvites);
    await drizzleDb.delete(schema.workspaceMembers);
    await drizzleDb.delete(schema.userSettings);
    await drizzleDb.delete(schema.workspaces);
    await drizzleDb.delete(schema.users);

    console.log("✅ Database cleared\n");
  } finally {
    // Re-enable foreign keys
    await db.exec("PRAGMA foreign_keys = ON;");
  }
}
