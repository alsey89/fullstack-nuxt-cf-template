#!/usr/bin/env npx tsx
/**
 * Production Database Migration Script
 *
 * This script safely applies migrations to the production D1 database by:
 * 1. Recording a Time Travel bookmark before migration (for rollback)
 * 2. Logging the operation to operations.log
 * 3. Running the migration
 * 4. Recording success/failure
 *
 * Usage:
 *   npm run db:migrate:remote:production
 *   npx tsx server/database/operations/migrate-production.ts
 *
 * Rollback (if needed):
 *   wrangler d1 time-travel restore template-production --bookmark=<BOOKMARK_ID>
 */

import { execSync } from "child_process";
import { appendFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "../../..");
const LOG_FILE = join(__dirname, "operations.log");
const CONFIG_FILE = join(PROJECT_ROOT, "wrangler.production.jsonc");

// TODO: Update this to match your production database name
const DB_NAME = "template-production";

interface TimeTravelInfo {
  bookmark: string;
  timestamp: string;
}

function log(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function appendToLog(entry: string): void {
  // Ensure log directory exists
  const logDir = dirname(LOG_FILE);
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} | ${entry}\n`;
  appendFileSync(LOG_FILE, logEntry);
}

function exec(command: string): string {
  try {
    return execSync(command, {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (error: any) {
    throw new Error(
      `Command failed: ${command}\n${error.stderr || error.message}`
    );
  }
}

function getTimeTravelBookmark(): TimeTravelInfo {
  const timestamp = new Date().toISOString();

  log(`Getting Time Travel bookmark for ${timestamp}...`);

  try {
    // Get bookmark for current timestamp
    const output = exec(
      `npx wrangler d1 time-travel info ${DB_NAME} --timestamp="${timestamp}" --config="${CONFIG_FILE}" --json`
    );

    const info = JSON.parse(output);
    return {
      bookmark: info.bookmark || "unknown",
      timestamp: info.timestamp || timestamp,
    };
  } catch (error: any) {
    // If time-travel info fails, log the timestamp anyway
    log(`Warning: Could not get Time Travel bookmark: ${error.message}`);
    return {
      bookmark: "unavailable",
      timestamp,
    };
  }
}

function getPendingMigrations(): string[] {
  log("Checking for pending migrations...");

  try {
    const output = exec(
      `npx wrangler d1 migrations list ${DB_NAME} --config="${CONFIG_FILE}" --remote`
    );

    // Parse output to find unapplied migrations
    const lines = output.split("\n");
    const pending: string[] = [];

    for (const line of lines) {
      // Look for lines with migration names that are marked as not applied
      if (
        line.includes("|") &&
        !line.includes("Yes") &&
        line.includes(".sql")
      ) {
        const match = line.match(/(\d{4}_[^\s|]+\.sql)/);
        if (match) {
          pending.push(match[1]);
        }
      }
    }

    return pending;
  } catch (error: any) {
    // Don't mask errors - throw so user knows something is wrong
    throw new Error(`Failed to list migrations: ${error.message}`);
  }
}

function runMigration(): void {
  log("Applying migrations to production...");

  const output = exec(
    `npx wrangler d1 migrations apply ${DB_NAME} --remote --config="${CONFIG_FILE}"`
  );

  console.log(output);
}

async function main(): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("  PRODUCTION DATABASE MIGRATION");
  console.log("=".repeat(60) + "\n");

  // Safety check
  log(`Database: ${DB_NAME}`);
  log(`Config: ${CONFIG_FILE}`);
  log(`Log file: ${LOG_FILE}`);
  console.log("");

  // Get pending migrations
  const pending = getPendingMigrations();
  if (pending.length === 0) {
    log("No pending migrations found.");
    appendToLog(`production | check | no pending migrations`);
    return;
  }

  log(`Pending migrations: ${pending.join(", ")}`);
  console.log("");

  // Get pre-migration bookmark
  const preMigration = getTimeTravelBookmark();
  log(`Pre-migration bookmark: ${preMigration.bookmark}`);
  console.log("");

  // Log pre-migration state
  appendToLog(
    `production | pre-migration | migrations: ${pending.join(", ")} | rollback-bookmark: ${preMigration.bookmark}`
  );

  // Confirm before proceeding
  console.log(
    "\x1b[33mWARNING: This will modify the PRODUCTION database!\x1b[0m"
  );
  console.log(`\x1b[33m   Rollback command if needed:\x1b[0m`);
  console.log(
    `\x1b[36m   wrangler d1 time-travel restore ${DB_NAME} --bookmark=${preMigration.bookmark}\x1b[0m`
  );
  console.log("");

  // Check for --yes flag to skip confirmation
  const skipConfirm =
    process.argv.includes("--yes") || process.argv.includes("-y");

  if (!skipConfirm) {
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question("Proceed with migration? (yes/no): ", resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== "yes") {
      log("Migration cancelled by user.");
      appendToLog(`production | cancelled | migrations: ${pending.join(", ")}`);
      return;
    }
  }

  // Run migration
  try {
    runMigration();
    log("Migration completed successfully!");

    appendToLog(
      `production | success | migrations: ${pending.join(", ")} | rollback-bookmark: ${preMigration.bookmark}`
    );

    console.log("\n" + "=".repeat(60));
    console.log("  MIGRATION SUCCESSFUL");
    console.log("=".repeat(60));
    console.log(`\nRollback bookmark saved: ${preMigration.bookmark}`);
    console.log(`See ${LOG_FILE} for full operation history.\n`);
  } catch (error: any) {
    log(`Migration FAILED: ${error.message}`);

    appendToLog(
      `production | FAILED | migrations: ${pending.join(", ")} | rollback-bookmark: ${preMigration.bookmark} | error: ${error.message}`
    );

    console.log("\n" + "=".repeat(60));
    console.log("  MIGRATION FAILED");
    console.log("=".repeat(60));
    console.log(`\nTo restore the database, run:`);
    console.log(
      `\x1b[36m  wrangler d1 time-travel restore ${DB_NAME} --bookmark=${preMigration.bookmark}\x1b[0m\n`
    );

    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
