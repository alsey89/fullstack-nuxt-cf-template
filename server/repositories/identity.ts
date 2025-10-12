import { eq, and } from "drizzle-orm";
import * as schema from "../database/schema";
import { BaseRepository } from "./base";
import type {
  User,
  NewUser,
  UserSettings,
  NewUserSettings,
  AuditLog,
  NewAuditLog,
} from "../database/schema/identity";

// ========================================
// USER REPOSITORY
// ========================================

/**
 * User Repository - Simplified for template
 */
export class UserRepository extends BaseRepository {
  constructor(db: D1Database) {
    super(db);
  }

  /**
   * Find user by email (database-scoped)
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await this.drizzle
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.email, email.toLowerCase()),
          this.notDeleted(schema.users)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Find user by ID (database-scoped)
   */
  async findById(id: string): Promise<User | null> {
    const result = await this.drizzle
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.id, id),
          this.notDeleted(schema.users)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * List users (database-scoped)
   */
  async list(limit = 100, offset = 0): Promise<User[]> {
    return this.drizzle
      .select()
      .from(schema.users)
      .where(this.notDeleted(schema.users))
      .orderBy(schema.users.createdAt)
      .limit(limit)
      .offset(offset);
  }

  /**
   * Create user
   */
  async create(data: NewUser): Promise<User> {
    const normalizedData = {
      ...data,
      email: data.email.toLowerCase(),
    };

    const [user] = await this.drizzle
      .insert(schema.users)
      .values(normalizedData)
      .returning();

    return user;
  }

  /**
   * Update user
   */
  async update(id: string, data: Partial<User>): Promise<User | null> {
    const [user] = await this.drizzle
      .update(schema.users)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(schema.users.id, id),
          this.notDeleted(schema.users)
        )
      )
      .returning();

    return user || null;
  }

  /**
   * Update password
   */
  async updatePassword(id: string, passwordHash: string): Promise<User | null> {
    return this.update(id, { passwordHash });
  }

  /**
   * Confirm email
   */
  async confirmEmail(id: string): Promise<User | null> {
    return this.update(id, { isEmailVerified: true });
  }

  /**
   * Soft delete user
   */
  async softDelete(id: string): Promise<void> {
    await this.drizzle
      .update(schema.users)
      .set({ deletedAt: new Date() })
      .where(eq(schema.users.id, id));
  }
}

// ========================================
// USER SETTINGS REPOSITORY
// ========================================

/**
 * User Settings Repository
 */
export class UserSettingsRepository extends BaseRepository {
  constructor(db: D1Database) {
    super(db);
  }

  /**
   * Get user settings (database-scoped)
   */
  async getSettings(userId: string): Promise<Record<string, any>> {
    const result = await this.drizzle
      .select()
      .from(schema.userSettings)
      .where(
        and(
          eq(schema.userSettings.userId, userId),
          this.notDeleted(schema.userSettings)
        )
      )
      .limit(1);

    return result[0]?.settings || {};
  }

  /**
   * Update user settings
   */
  async updateSettings(userId: string, settings: Record<string, any>): Promise<UserSettings> {
    const [userSettings] = await this.drizzle
      .insert(schema.userSettings)
      .values({
        userId,
        settings,
      })
      .onConflictDoUpdate({
        target: schema.userSettings.userId,
        set: {
          settings,
          updatedAt: new Date(),
        },
      })
      .returning();

    return userSettings;
  }
}

// ========================================
// AUDIT LOG REPOSITORY
// ========================================

/**
 * Audit Log Repository
 */
export class AuditLogRepository extends BaseRepository {
  constructor(db: D1Database) {
    super(db);
  }

  /**
   * Log an action
   */
  async log(
    userId: string | null,
    action: string,
    entityType: string | null,
    entityId: string | null,
    context?: {
      requestId?: string;
      endpoint?: string;
      method?: string;
      statusCode?: number;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, any>;
      stateBefore?: Record<string, any>;
      stateAfter?: Record<string, any>;
    }
  ): Promise<AuditLog> {
    const [log] = await this.drizzle
      .insert(schema.auditLogs)
      .values({
        userId,
        action,
        entityType,
        entityId,
        requestId: context?.requestId,
        endpoint: context?.endpoint,
        method: context?.method,
        statusCode: context?.statusCode,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        metadata: context?.metadata,
        stateBefore: context?.stateBefore,
        stateAfter: context?.stateAfter,
      })
      .returning();

    return log;
  }

  /**
   * Get audit logs for entity (database-scoped)
   */
  async getLogsForEntity(
    entityType: string,
    entityId: string,
    limit = 50
  ): Promise<AuditLog[]> {
    return this.drizzle
      .select()
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.entityType, entityType),
          eq(schema.auditLogs.entityId, entityId)
        )
      )
      .orderBy(schema.auditLogs.createdAt)
      .limit(limit);
  }

  /**
   * Get recent audit logs (database-scoped)
   */
  async getRecentLogs(limit = 100): Promise<AuditLog[]> {
    return this.drizzle
      .select()
      .from(schema.auditLogs)
      .orderBy(schema.auditLogs.createdAt)
      .limit(limit);
  }
}