import type { H3Event } from "h3";
import {
  UserRepository,
  UserSettingsRepository,
  AuditLogRepository,
} from "#server/repositories/identity";
import {
  generateEmailConfirmToken,
  generatePasswordResetToken,
  verifyEmailConfirmToken,
  verifyPasswordResetToken,
} from "#server/lib/auth";
import { validatePasswordStrength } from "#shared/validators/password";
import {
  InvalidCredentialsError,
  EmailAlreadyExistsError,
  UserNotFoundError,
  ValidationError,
  AccountInactiveError,
  AuthenticationError,
  InternalServerError,
  PasswordSameAsOldError,
} from "#server/error/errors";
import type { User } from "#server/database/schema/identity";
import { getDatabase } from "#server/database/utils";
import { isTest } from "#server/utils/environment";

// Note: hashPassword, verifyPassword are auto-imported by nuxt-auth-utils

// ========================================
// IDENTITY SERVICE
// ========================================
// Simplified identity service for template
// Handles authentication, user management, and settings
// Note: Permissions are now managed by RBACService (see services/rbac.ts)
// ========================================

export class IdentityService {
  private readonly db: D1Database;
  private readonly userId?: string;

  constructor(
    private readonly event: H3Event,
    private readonly userRepo: UserRepository,
    private readonly userSettingsRepo: UserSettingsRepository,
    private readonly auditLogRepo: AuditLogRepository
  ) {
    // Get database from event context (set by tenant middleware)
    this.db = getDatabase(event);
    this.userId = event.context.userId;
  }

  /**
   * Helper to log audit events with request context
   * Note: tenantId can be null for tenant-agnostic actions like signup
   */
  private async logAudit(
    userId: string | null,
    action: string,
    entityType: string | null,
    entityId: string | null,
    options?: {
      statusCode?: number;
      metadata?: Record<string, any>;
      stateBefore?: Record<string, any>;
      stateAfter?: Record<string, any>;
    }
  ) {
    // Get tenantId from context (may be null for tenant-agnostic actions)
    const tenantId = this.event.context.tenantId || null;

    return this.auditLogRepo.log(tenantId, userId, action, entityType, entityId, {
      requestId: this.event.context.requestId,
      endpoint: this.event.context.endpoint,
      method: this.event.context.method,
      statusCode: options?.statusCode || 200,
      ipAddress: this.event.context.ipAddress,
      userAgent: this.event.context.userAgent,
      metadata: options?.metadata,
      stateBefore: options?.stateBefore,
      stateAfter: options?.stateAfter,
    });
  }

  // ========================================
  // AUTHENTICATION
  // ========================================

  /**
   * Sign up a new user
   * Note: Signup is tenant-agnostic - users are global entities
   */
  async signUp(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
  }) {
    const { email, password, firstName, lastName, role = "user" } = data;

    // Validate password strength
    validatePasswordStrength(password);

    // Check if email already exists
    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      throw new EmailAlreadyExistsError(undefined, {
        field: 'email',
        email: email,
        existingUserId: existingUser.id
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // In test environment, auto-verify email (no email provider available)
    const isTestEnv = isTest(this.event);

    // Create user
    const user = await this.userRepo.create({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      role,
      isEmailVerified: isTestEnv, // Auto-verify in test environment
      isActive: true,
    });

    // Log the signup
    await this.logAudit(user.id, "USER_SIGNED_UP", "User", user.id, {
      statusCode: 201,
      metadata: { email: user.email, role, autoVerified: isTestEnv },
    });

    // In test environment, skip email confirmation token generation
    if (isTestEnv) {
      return { user, confirmToken: null };
    }

    // Generate email confirmation token
    // Use "global" as tenantId since signup is tenant-agnostic
    const confirmToken = await generateEmailConfirmToken(
      user.id,
      user.email,
      "global",
      this.event
    );

    // TODO: Send confirmation email (implement based on your email provider)

    return { user, confirmToken };
  }

  /**
   * Sign in a user
   */
  async signIn(email: string, password: string) {
    // Find user by email
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialsError(undefined, {
        email: email
      });
    }

    // Check if account is active
    if (!user.isActive) {
      throw new AccountInactiveError(undefined, {
        userId: user.id,
        email: user.email
      });
    }

    // Verify password
    //* according to nuxt-auth-utils docs, it's (hash, password)
    const isValid = await verifyPassword(user.passwordHash, password);
    if (!isValid) {
      throw new InvalidCredentialsError(undefined, {
        userId: user.id,
        email: email
      });
    }

    //remove sensitive fields before returning
    const { passwordHash, ...userData } = user;

    // Log the signin
    await this.logAudit(user.id, "USER_SIGNED_IN", "User", user.id);

    return {
      user: userData,
    };
  }

  /**
   * Find or create user from OAuth provider
   */
  async findOrCreateOAuthUser(data: {
    provider: "google";
    providerId: string;
    email: string;
    emailVerified: boolean;
    firstName: string;
    lastName: string;
    picture?: string;
  }) {
    const { provider, providerId, email, emailVerified, firstName, lastName, picture } = data;

    // Step 1: Try to find existing OAuth user
    let user = await this.userRepo.findByOAuth(provider, providerId);

    if (user) {
      // Update login info
      const updatedUser = await this.userRepo.update(user.id, {
        picture: picture || user.picture,
        lastLoginAt: new Date(),
        lastLoginMethod: provider,
      });

      if (!updatedUser) {
        throw new InternalServerError("Failed to update user login info");
      }

      const { passwordHash, ...userData } = updatedUser;
      return { user: userData };
    }

    // Step 2: Check if email already exists (account linking)
    user = await this.userRepo.findByEmail(email);

    if (user) {
      // Auto-link ONLY if OAuth email is verified
      if (!emailVerified) {
        throw new ValidationError(
          "Cannot link accounts: Email not verified by OAuth provider",
          { email, provider, emailVerified }
        );
      }

      // Check if already linked to different provider
      if (user.oauthProvider && user.oauthProvider !== provider) {
        throw new ValidationError(
          `This email is already linked to ${user.oauthProvider}. Please sign in with that provider.`,
          { email, existingProvider: user.oauthProvider, attemptedProvider: provider }
        );
      }

      // Link OAuth to existing account
      const linkedUser = await this.userRepo.update(user.id, {
        oauthProvider: provider,
        oauthProviderId: providerId,
        picture: picture || user.picture,
        isEmailVerified: true,
        lastLoginAt: new Date(),
        lastLoginMethod: provider,
      });

      if (!linkedUser) {
        throw new InternalServerError("Failed to link OAuth account");
      }

      await this.logAudit(user.id, "ACCOUNT_LINKED_OAUTH", "User", user.id, {
        metadata: { provider, email, autoLinked: true },
      });

      const { passwordHash, ...userData } = linkedUser;
      return { user: userData };
    }

    // Step 3: Create new OAuth-only user
    const newUser = await this.userRepo.create({
      email: email.toLowerCase(),
      passwordHash: "", // Empty for OAuth-only accounts
      firstName,
      lastName,
      picture,
      oauthProvider: provider,
      oauthProviderId: providerId,
      isEmailVerified: emailVerified,
      role: "user",
      isActive: true,
      lastLoginAt: new Date(),
      lastLoginMethod: provider,
    });

    await this.logAudit(newUser.id, "USER_OAUTH_SIGNUP", "User", newUser.id, {
      statusCode: 201,
      metadata: { email: newUser.email, provider, emailVerified },
    });

    const { passwordHash, ...userData } = newUser;
    return { user: userData };
  }

  /**
   * Confirm email address
   */
  async confirmEmail(token: string) {
    const tenantId = this.event.context.tenantId;
    if (!tenantId) {
      throw new InternalServerError("Tenant context not available");
    }

    const { userId, email } = await verifyEmailConfirmToken(
      token,
      tenantId,
      this.event
    );

    const user = await this.userRepo.findById(userId);
    if (!user || user.email !== email) {
      throw new ValidationError("Invalid confirmation token", {
        userId: userId,
        email: email
      });
    }

    const updatedUser = await this.userRepo.confirmEmail(userId);
    if (!updatedUser) {
      throw new UserNotFoundError(undefined, {
        userId: userId
      });
    }

    // Log email confirmation
    await this.logAudit(userId, "EMAIL_CONFIRMED", "User", userId);

    return updatedUser;
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not
      return { resetToken: null };
    }

    const tenantId = this.event.context.tenantId;
    if (!tenantId) {
      throw new InternalServerError("Tenant context not available");
    }

    const resetToken = await generatePasswordResetToken(
      user.id,
      user.email,
      tenantId,
      this.event
    );

    // Log password reset request
    await this.logAudit(user.id, "PASSWORD_RESET_REQUESTED", "User", user.id, {
      metadata: { email },
    });

    // TODO: Send password reset email

    return { resetToken };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string) {
    const tenantId = this.event.context.tenantId;
    if (!tenantId) {
      throw new InternalServerError("Tenant context not available");
    }

    const { userId, email } = await verifyPasswordResetToken(
      token,
      tenantId,
      this.event
    );

    // Validate new password
    validatePasswordStrength(newPassword);

    const user = await this.userRepo.findById(userId);
    if (!user || user.email !== email) {
      throw new ValidationError("Invalid reset token", {
        userId: userId,
        email: email
      });
    }

    // Check if new password is same as old password
    const isSamePassword = await verifyPassword(user.passwordHash, newPassword);
    if (isSamePassword) {
      throw new PasswordSameAsOldError(undefined, {
        field: 'password',
        userId: userId
      });
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    const updatedUser = await this.userRepo.updatePassword(
      userId,
      passwordHash
    );
    if (!updatedUser) {
      throw new UserNotFoundError();
    }

    // Log password reset
    await this.logAudit(userId, "PASSWORD_RESET", "User", userId);

    return updatedUser;
  }

  // ========================================
  // USER MANAGEMENT
  // ========================================

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    if (!this.userId) {
      throw new AuthenticationError("User not authenticated");
    }

    const user = await this.userRepo.findById(this.userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    // Remove sensitive fields
    const { passwordHash, ...userData } = user;
    return userData as User;
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    return user;
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    if (!this.userId) {
      throw new AuthenticationError("User not authenticated");
    }

    // Remove sensitive fields that shouldn't be updated via this method
    const { id, passwordHash, createdAt, updatedAt, deletedAt, ...updateData } =
      data;

    const user = await this.userRepo.update(userId, updateData);
    if (!user) {
      throw new UserNotFoundError();
    }

    // Log the update
    await this.logAudit(this.userId, "USER_UPDATED", "User", userId, {
      metadata: { updates: updateData },
    });

    return user;
  }

  /**
   * List users with pagination, filtering, and sorting
   */
  async listUsers(
    limit?: number,
    offset?: number,
    filters?: import("#server/types/api").Filter[],
    sortBy?: string,
    sortOrder?: import("#server/types/api").SortOrder
  ): Promise<User[]> {
    return this.userRepo.list(limit, offset, filters, sortBy, sortOrder);
  }

  /**
   * Count users with optional filters
   */
  async countUsers(filters?: import("#server/types/api").Filter[]): Promise<number> {
    return this.userRepo.count(filters);
  }

  // ========================================
  // RBAC / PERMISSIONS
  // ========================================

  /**
   * Get user permissions from RBAC system
   * Delegates to RBACService for permission resolution
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    // Import here to avoid circular dependency
    const { getRBACService } = await import("./rbac");
    const rbacService = getRBACService(this.event);

    // If RBAC is disabled, return empty permissions array
    if (!rbacService.isEnabled()) {
      return [];
    }

    return rbacService.getUserPermissions(userId);
  }

  /**
   * Get permission version for cache invalidation
   * Returns a timestamp representing when user's permissions last changed
   */
  async getPermissionVersion(userId: string): Promise<number> {
    // Import here to avoid circular dependency
    const { getRBACService } = await import("./rbac");
    const rbacService = getRBACService(this.event);

    // If RBAC is disabled, return static version
    if (!rbacService.isEnabled()) {
      return 0;
    }

    // For now, return current timestamp
    // TODO: Implement actual version tracking in database
    return Date.now();
  }

  // ========================================
  // USER SETTINGS
  // ========================================

  /**
   * Get user settings
   */
  async getUserSettings(userId: string): Promise<Record<string, any>> {
    return this.userSettingsRepo.getSettings(userId);
  }

  /**
   * Update user settings
   */
  async updateUserSettings(userId: string, settings: Record<string, any>) {
    const updatedSettings = await this.userSettingsRepo.updateSettings(
      userId,
      settings
    );

    // Log settings update
    await this.logAudit(
      this.userId || userId,
      "USER_SETTINGS_UPDATED",
      "User",
      userId,
      {
        metadata: { settings },
      }
    );

    return updatedSettings;
  }
}

// ========================================
// FACTORY FUNCTION
// ========================================

/**
 * Create IdentityService from H3Event
 */
export function createIdentityService(event: H3Event): IdentityService {
  const db = getDatabase(event);

  return new IdentityService(
    event,
    new UserRepository(db),
    new UserSettingsRepository(db),
    new AuditLogRepository(db)
  );
}
