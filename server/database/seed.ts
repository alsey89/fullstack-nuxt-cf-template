import { drizzle } from "drizzle-orm/d1";
import * as schema from "#server/database/schema";
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
// DATABASE SEEDER - Simplified Template
// ========================================
// TODO: Customize this seeder for your application
// - Update test user accounts and passwords
// - Add your own domain-specific seed data
// - Customize roles and permissions for your use case
// ========================================

export async function seedDatabase(
  db: D1Database,
  options?: { multitenancyEnabled?: boolean }
) {
  const now = new Date();
  const isMultitenancyEnabled = options?.multitenancyEnabled ?? true;

  console.log("🌱 Starting template database seed (using atomic batch operations)...\n");

  // ========================================
  // 3. CREATE BASIC PERMISSIONS (BATCH)
  // ========================================
  console.log("🔐 Creating permissions...");

  const permissionCodes = [
    // Users
    { code: "users:view", name: "View Users", category: "USERS" },
    { code: "users:create", name: "Create Users", category: "USERS" },
    { code: "users:update", name: "Update Users", category: "USERS" },
    { code: "users:delete", name: "Delete Users", category: "USERS" },
    { code: "users:*", name: "All User Permissions", category: "USERS" },
    // Roles
    { code: "roles:view", name: "View Roles", category: "ROLES" },
    { code: "roles:create", name: "Create Roles", category: "ROLES" },
    { code: "roles:update", name: "Update Roles", category: "ROLES" },
    { code: "roles:delete", name: "Delete Roles", category: "ROLES" },
    { code: "roles:*", name: "All Role Permissions", category: "ROLES" },
    // System
    { code: "*", name: "Super Admin (All Permissions)", category: "SYSTEM" },
  ] as const;

  // Insert permissions atomically using batch operation
  const permissionValues = permissionCodes.map(p => ({
    code: p.code,
    name: p.name,
    description: p.name,
    category: p.category,
    created_at: now.getTime(),
    updated_at: now.getTime(),
    deleted_at: null,
  }));

  const permissionStatements = createBatchInserts(db, 'permissions', permissionValues);
  await executeBatch(db, permissionStatements);

  console.log(`✅ Created ${permissionCodes.length} permission definitions (atomic batch)\n`);

  // ========================================
  // 4. CREATE USERS (BATCH)
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
      role: "admin",
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

  // Insert users atomically using batch operation
  const userValues = users.map(u => ({
    id: u.id,
    email: u.email,
    password_hash: passwordHash,
    first_name: u.firstName,
    last_name: u.lastName,
    phone: u.phone,
    role: u.role,
    is_email_verified: 1, // SQLite uses 1/0 for boolean
    is_active: 1,
    created_at: now.getTime(),
    updated_at: now.getTime(),
    deleted_at: null,
  }));

  const userStatements = createBatchInserts(db, 'users', userValues);
  await executeBatch(db, userStatements);

  // Keep reference to created users for role assignment
  const createdUsers = users;

  users.forEach(u => {
    console.log(`✅ Created user: ${u.email} (${u.role})`);
  });

  console.log(`   Password for all users: testtesttest\n`);

  // ========================================
  // 5. CREATE ROLES (RBAC) - BATCH
  // ========================================
  console.log("🎭 Creating roles...");

  // Define roles
  const roles = [
    {
      id: crypto.randomUUID(),
      name: "admin",
      description: "Full system access (super admin)",
      permissions: ["*"], // All permissions via wildcard
      isSystem: true,
    },
    {
      id: crypto.randomUUID(),
      name: "manager",
      description: "User management access",
      permissions: ["users:view", "users:update"],
      isSystem: true,
    },
    {
      id: crypto.randomUUID(),
      name: "user",
      description: "Basic user access (read-only)",
      permissions: ["users:view"],
      isSystem: true,
    },
  ];

  // Insert roles atomically using batch operation
  const roleStatements = roles.map(role =>
    db.prepare(
      `INSERT INTO roles (id, name, description, permissions, is_system, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      role.id,
      role.name,
      role.description,
      JSON.stringify(role.permissions), // SQLite stores JSON as TEXT
      role.isSystem ? 1 : 0,
      now.getTime(),
      now.getTime(),
      null
    )
  );
  await executeBatch(db, roleStatements);

  // Keep references for role assignment
  const adminRole = roles[0];
  const managerRole = roles[1];
  const userRole = roles[2];

  roles.forEach(role => {
    console.log(`✅ Created role: ${role.name} (${role.permissions.length} permissions)`);
  });
  console.log();

  // ========================================
  // 6. ASSIGN ROLES TO USERS (BATCH)
  // ========================================
  console.log("🔗 Assigning roles to users...");

  // Create role assignments
  const roleAssignments = [
    {
      id: crypto.randomUUID(),
      userId: createdUsers[0].id,
      roleId: adminRole.id,
      roleName: adminRole.name,
      userEmail: createdUsers[0].email,
    },
    {
      id: crypto.randomUUID(),
      userId: createdUsers[1].id,
      roleId: managerRole.id,
      roleName: managerRole.name,
      userEmail: createdUsers[1].email,
    },
    {
      id: crypto.randomUUID(),
      userId: createdUsers[2].id,
      roleId: userRole.id,
      roleName: userRole.name,
      userEmail: createdUsers[2].email,
    },
  ];

  // Insert role assignments atomically using batch operation
  const userRoleValues = roleAssignments.map(ra => ({
    id: ra.id,
    user_id: ra.userId,
    role_id: ra.roleId,
    created_at: now.getTime(),
    updated_at: now.getTime(),
    deleted_at: null,
  }));

  const userRoleStatements = createBatchInserts(db, 'user_roles', userRoleValues);
  await executeBatch(db, userRoleStatements);

  roleAssignments.forEach(ra => {
    console.log(`✅ Assigned "${ra.roleName}" role to ${ra.userEmail}`);
  });
  console.log();

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
  console.log(`Permissions: 11 permissions with wildcards`);
  console.log(`Roles: 3 system roles (admin, manager, user)`);
  console.log(`\nTest Accounts:`);

  createdUsers.forEach((user) => {
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
  await db.exec('PRAGMA foreign_keys = OFF;');

  try {
    // Delete in reverse order of dependencies
    await drizzleDb.delete(schema.userRoles);
    await drizzleDb.delete(schema.roles);
    await drizzleDb.delete(schema.userSettings);
    await drizzleDb.delete(schema.users);
    await drizzleDb.delete(schema.permissions);
    await drizzleDb.delete(schema.auditLogs);

    console.log("✅ Database cleared\n");
  } finally {
    // Re-enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON;');
  }
}
