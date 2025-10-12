#!/usr/bin/env tsx
/**
 * Safe Migration Script with Time Travel Snapshots
 *
 * Usage:
 *   npm run db:migrate:safe staging
 *   npm run db:migrate:safe production
 *
 * Features:
 * - Captures Time Travel bookmark before migration
 * - Validates migration count
 * - Tracks migration state in database
 * - Provides rollback command on failure
 */

import { createHash } from 'crypto'
import { $ } from 'bun'
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'

type Environment = 'local' | 'staging' | 'production'

const ENV_CONFIG = {
  local: {
    dbName: 'ppm-local',
    wranglerConfig: 'wrangler.jsonc',
  },
  staging: {
    dbName: 'ppm-staging',
    wranglerConfig: 'wrangler.staging.jsonc',
  },
  production: {
    dbName: 'ppm-production',
    wranglerConfig: 'wrangler.production.jsonc',
  },
}

async function getTimeravelBookmark(dbName: string): Promise<string> {
  try {
    const result = await $`wrangler d1 time-travel info ${dbName}`.text()
    const match = result.match(/bookmark is '([^']+)'/)
    if (!match) {
      throw new Error('Failed to extract bookmark from output')
    }
    return match[1]
  } catch (error) {
    console.error('⚠️  Failed to get Time Travel bookmark:', error)
    throw error
  }
}

async function getMigrationHash(migrationPath: string): Promise<string> {
  const content = await readFile(migrationPath, 'utf-8')
  return createHash('sha256').update(content).digest('hex')
}

async function getPendingMigrations(): Promise<string[]> {
  const migrationsDir = './server/database/migrations'
  const files = await readdir(migrationsDir)

  return files
    .filter(f => f.endsWith('.sql') && !f.startsWith('meta'))
    .sort()
}

async function recordMigration(
  dbName: string,
  migrationId: string,
  hash: string,
  bookmark: string,
  env: Environment,
  status: 'PENDING' | 'APPLIED' | 'FAILED',
  errorMessage?: string
) {
  const sql = `
    INSERT INTO _migrations (id, hash, applied_at, applied_by, timetravel_bookmark, status, error_message, environment)
    VALUES (?, ?, datetime('now'), ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      error_message = excluded.error_message,
      applied_at = excluded.applied_at
  `

  const appliedBy = process.env.GITHUB_ACTOR || process.env.USER || 'unknown'

  try {
    await $`wrangler d1 execute ${dbName} --command=${sql} \
      --binding=${migrationId} \
      --binding=${hash} \
      --binding=${appliedBy} \
      --binding=${bookmark} \
      --binding=${status} \
      --binding=${errorMessage || null} \
      --binding=${env}`
  } catch (error) {
    console.error('⚠️  Failed to record migration state:', error)
  }
}

async function validateMigration(env: Environment) {
  const migrations = await getPendingMigrations()

  console.log(`\n📋 Pending migrations: ${migrations.length}`)
  migrations.forEach(m => console.log(`  - ${m}`))

  if (migrations.length === 0) {
    console.log('✅ No migrations to apply')
    return false
  }

  if (migrations.length > 10) {
    console.log(`⚠️  Warning: ${migrations.length} migrations pending. Consider batching.`)
  }

  return true
}

async function promptConfirm(message: string): Promise<boolean> {
  if (process.env.CI === 'true') {
    return true // Auto-confirm in CI
  }

  const readline = await import('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

async function safeMigrate(env: Environment) {
  const config = ENV_CONFIG[env]
  const { dbName, wranglerConfig } = config

  console.log(`\n🚀 Safe Migration - ${env.toUpperCase()}`)
  console.log(`Database: ${dbName}`)
  console.log(`Config: ${wranglerConfig}\n`)

  // Step 1: Validate migrations
  const hasMigrations = await validateMigration(env)
  if (!hasMigrations) {
    return
  }

  // Step 2: Get Time Travel bookmark
  console.log('📸 Capturing Time Travel bookmark...')
  const bookmark = await getTimeravelBookmark(dbName)
  console.log(`   Bookmark: ${bookmark}\n`)

  // Step 3: Test on staging first (if production)
  if (env === 'production') {
    console.log('⚠️  Production migration detected!')
    console.log('   You should test on staging first.\n')

    const proceed = await promptConfirm('Have you tested this migration on staging?')
    if (!proceed) {
      console.log('❌ Migration cancelled')
      return
    }
  }

  // Step 4: Confirm migration
  const confirmed = await promptConfirm(`Apply migrations to ${env}?`)
  if (!confirmed) {
    console.log('❌ Migration cancelled')
    return
  }

  // Step 5: Apply migrations
  console.log('\n🔄 Applying migrations...')

  const migrations = await getPendingMigrations()

  for (const migration of migrations) {
    const migrationPath = join('./server/database/migrations', migration)
    const migrationId = migration.replace('.sql', '')
    const hash = await getMigrationHash(migrationPath)

    console.log(`\n📝 Migration: ${migrationId}`)

    // Record as PENDING
    await recordMigration(dbName, migrationId, hash, bookmark, env, 'PENDING')

    try {
      // Apply migration
      await $`wrangler d1 migrations apply ${dbName} --remote --config=${wranglerConfig}`

      // Record as APPLIED
      await recordMigration(dbName, migrationId, hash, bookmark, env, 'APPLIED')

      console.log(`✅ Applied successfully`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Record as FAILED
      await recordMigration(dbName, migrationId, hash, bookmark, env, 'FAILED', errorMessage)

      console.error(`\n❌ Migration failed: ${errorMessage}`)
      console.error(`\n📊 Rollback options:`)
      console.error(`\n1. Time Travel (Recommended):`)
      console.error(`   wrangler d1 time-travel restore ${dbName} --bookmark=${bookmark}`)
      console.error(`\n2. Manual rollback:`)
      console.error(`   Check ./rollbacks/${migrationId}.sql (if exists)`)

      throw error
    }
  }

  console.log('\n✅ All migrations applied successfully')
  console.log(`\n📊 Rollback bookmark (if needed):`)
  console.log(`   wrangler d1 time-travel restore ${dbName} --bookmark=${bookmark}`)
}

// Main
const env = process.argv[2] as Environment

if (!env || !ENV_CONFIG[env]) {
  console.error('Usage: npm run db:migrate:safe <local|staging|production>')
  process.exit(1)
}

safeMigrate(env).catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
