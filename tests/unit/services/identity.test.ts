import { describe, it, expect, beforeEach, vi } from "vitest";
import { IdentityService } from "../../../server/services/identity";
import {
  InvalidCredentialsError,
  EmailAlreadyExistsError,
  UserNotFoundError,
  ValidationError,
  AccountInactiveError,
  AuthenticationError,
} from "../../../server/error/errors";
import { createMockH3Event, createMockRepository } from "../../helpers/mocks";

// Note: hashPassword, verifyPassword, getUserSession, setUserSession are globally mocked in tests/setup.ts

// Create mock functions for auth utilities
const mockGenerateEmailConfirmToken = vi.fn();
const mockGeneratePasswordResetToken = vi.fn();
const mockVerifyEmailConfirmToken = vi.fn();
const mockVerifyPasswordResetToken = vi.fn();
const mockValidatePasswordStrength = vi.fn();

// Mock auth utilities
vi.mock("../../../server/lib/auth", () => ({
  generateEmailConfirmToken: (...args: any[]) =>
    mockGenerateEmailConfirmToken(...args),
  generatePasswordResetToken: (...args: any[]) =>
    mockGeneratePasswordResetToken(...args),
  verifyEmailConfirmToken: (...args: any[]) =>
    mockVerifyEmailConfirmToken(...args),
  verifyPasswordResetToken: (...args: any[]) =>
    mockVerifyPasswordResetToken(...args),
}));

// Mock password validator
vi.mock("../../../shared/validators/password", () => ({
  validatePasswordStrength: (...args: any[]) =>
    mockValidatePasswordStrength(...args),
}));

describe("IdentityService", () => {
  let service: IdentityService;
  let mockEvent: any;
  let mockUserRepo: any;
  let mockUserSettingsRepo: any;
  let mockAuditLogRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set default return values for auth utility mocks
    mockValidatePasswordStrength.mockImplementation(() => {
      // Don't throw by default
    });
    mockGenerateEmailConfirmToken.mockReturnValue("mock-email-token");
    mockGeneratePasswordResetToken.mockReturnValue("mock-reset-token");
    mockVerifyEmailConfirmToken.mockResolvedValue({
      userId: "user-1",
      email: "test@example.com",
    });
    mockVerifyPasswordResetToken.mockResolvedValue({
      userId: "user-1",
      email: "test@example.com",
    });

    // Create mock event with db in context
    mockEvent = createMockH3Event({});

    // Create mock repositories
    mockUserRepo = createMockRepository();
    mockUserRepo.findByEmail = vi.fn();
    mockUserRepo.confirmEmail = vi.fn();
    mockUserRepo.updatePassword = vi.fn();
    mockUserRepo.list = vi.fn();

    mockUserSettingsRepo = {
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
    };

    mockAuditLogRepo = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    service = new IdentityService(
      mockEvent as any,
      mockUserRepo as any,
      mockUserSettingsRepo as any,
      mockAuditLogRepo as any
    );
  });

  // ========================================
  // AUTHENTICATION TESTS
  // ========================================

  describe("signUp", () => {
    it("successfully creates new user", async () => {
      const mockUser = {
        id: "user-1",
        email: "new@example.com",
        passwordHash: "hashed-password",
        firstName: "John",
        lastName: "Doe",
        role: "user",
        isEmailVerified: false,
        isActive: true,
      };

      mockUserRepo.findByEmail.mockResolvedValue(null); // Email not taken
      mockUserRepo.create.mockResolvedValue(mockUser);

      const result = await service.signUp({
        email: "new@example.com",
        password: "SecurePass123!",
        firstName: "John",
        lastName: "Doe",
      });

      expect(result.user.email).toBe("new@example.com");
      expect(result.confirmToken).toBe("mock-email-token");
      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "new@example.com",
          firstName: "John",
          lastName: "Doe",
          isEmailVerified: false,
          isActive: true,
        })
      );
      expect(mockAuditLogRepo.log).toHaveBeenCalledWith(
        "user-1",
        "USER_SIGNED_UP",
        "User",
        "user-1",
        expect.any(Object)
      );
    });

    it("throws error if email already exists", async () => {
      const existingUser = {
        id: "user-1",
        email: "existing@example.com",
      };

      mockUserRepo.findByEmail.mockResolvedValue(existingUser);

      await expect(
        service.signUp({
          email: "existing@example.com",
          password: "SecurePass123!",
          firstName: "John",
          lastName: "Doe",
        })
      ).rejects.toThrow(EmailAlreadyExistsError);
    });

    it("validates password strength", async () => {
      mockValidatePasswordStrength.mockImplementation(() => {
        throw new ValidationError("Password too weak");
      });

      mockUserRepo.findByEmail.mockResolvedValue(null);

      await expect(
        service.signUp({
          email: "new@example.com",
          password: "123",
          firstName: "John",
          lastName: "Doe",
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("signIn", () => {
    it("successfully signs in with valid credentials", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        passwordHash: "hashed_password123", // Matches global mock pattern
        isEmailVerified: true,
        isActive: true,
      };

      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      const result = await service.signIn("test@example.com", "password123");

      expect(result.user.id).toBe("user-1");
      expect(mockAuditLogRepo.log).toHaveBeenCalledWith(
        "user-1",
        "USER_SIGNED_IN",
        "User",
        "user-1",
        expect.any(Object)
      );
    });

    it("throws error for invalid email", async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      await expect(
        service.signIn("invalid@example.com", "password123")
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it("throws error for invalid password", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        passwordHash: "hashed_wrong_password", // Won't match 'hashed_password123'
        isEmailVerified: true,
        isActive: true,
      };

      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.signIn("test@example.com", "password123")
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it("throws error if account is inactive", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        passwordHash: "hashed_password123",
        isEmailVerified: true,
        isActive: false,
      };

      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.signIn("test@example.com", "password123")
      ).rejects.toThrow(AccountInactiveError);
    });
  });

  // ========================================
  // EMAIL CONFIRMATION TESTS
  // ========================================

  describe("confirmEmail", () => {
    it("successfully confirms email with valid token", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        isEmailVerified: false,
      };

      const mockUpdatedUser = {
        ...mockUser,
        isEmailVerified: true,
      };

      mockVerifyEmailConfirmToken.mockResolvedValue({
        userId: "user-1",
        email: "test@example.com",
      });
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockUserRepo.confirmEmail.mockResolvedValue(mockUpdatedUser);

      const result = await service.confirmEmail("valid-token");

      expect(result.isEmailVerified).toBe(true);
      expect(mockUserRepo.confirmEmail).toHaveBeenCalledWith("user-1");
      expect(mockAuditLogRepo.log).toHaveBeenCalledWith(
        "user-1",
        "EMAIL_CONFIRMED",
        "User",
        "user-1",
        expect.any(Object)
      );
    });

    it("throws error if user not found", async () => {
      mockVerifyEmailConfirmToken.mockResolvedValue({
        userId: "user-1",
        email: "nonexistent@example.com",
      });
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(service.confirmEmail("valid-token")).rejects.toThrow(
        ValidationError
      );
    });

    it("throws error if email doesn't match", async () => {
      const mockUser = {
        id: "user-1",
        email: "different@example.com",
        isEmailVerified: false,
      };

      mockVerifyEmailConfirmToken.mockResolvedValue({
        userId: "user-1",
        email: "test@example.com",
      });
      mockUserRepo.findById.mockResolvedValue(mockUser);

      await expect(service.confirmEmail("valid-token")).rejects.toThrow(
        ValidationError
      );
    });
  });

  // ========================================
  // PASSWORD RESET TESTS
  // ========================================

  describe("requestPasswordReset", () => {
    it("generates reset token for valid email", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
      };

      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockGeneratePasswordResetToken.mockReturnValue("reset-token");

      const result = await service.requestPasswordReset("test@example.com");

      expect(result.resetToken).toBe("reset-token");
      expect(mockAuditLogRepo.log).toHaveBeenCalledWith(
        "user-1",
        "PASSWORD_RESET_REQUESTED",
        "User",
        "user-1",
        expect.any(Object)
      );
    });

    it("does not reveal if email exists (security)", async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      const result = await service.requestPasswordReset(
        "nonexistent@example.com"
      );

      expect(result.resetToken).toBe(null);
      expect(mockGeneratePasswordResetToken).not.toHaveBeenCalled();
    });
  });

  describe("resetPassword", () => {
    it("successfully resets password with valid token", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
      };

      const mockUpdatedUser = {
        ...mockUser,
        passwordHash: "hashed_NewPassword123!",
      };

      mockVerifyPasswordResetToken.mockResolvedValue({
        userId: "user-1",
        email: "test@example.com",
      });
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockUserRepo.updatePassword.mockResolvedValue(mockUpdatedUser);

      const result = await service.resetPassword(
        "valid-token",
        "NewPassword123!"
      );

      expect(result.id).toBe("user-1");
      expect(mockUserRepo.updatePassword).toHaveBeenCalled();
      expect(mockAuditLogRepo.log).toHaveBeenCalledWith(
        "user-1",
        "PASSWORD_RESET",
        "User",
        "user-1",
        expect.any(Object)
      );
    });

    it("validates new password strength", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
      };

      mockVerifyPasswordResetToken.mockResolvedValue({
        userId: "user-1",
        email: "test@example.com",
      });
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockValidatePasswordStrength.mockImplementation(() => {
        throw new ValidationError("Password too weak");
      });

      await expect(
        service.resetPassword("valid-token", "weak")
      ).rejects.toThrow(ValidationError);
    });

    it("throws error if user not found", async () => {
      mockVerifyPasswordResetToken.mockResolvedValue({
        userId: "user-1",
        email: "test@example.com",
      });
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(
        service.resetPassword("valid-token", "NewPassword123!")
      ).rejects.toThrow(ValidationError);
    });
  });

  // ========================================
  // USER MANAGEMENT TESTS
  // ========================================

  describe("getUser", () => {
    it("returns user by ID", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
      };

      mockUserRepo.findById.mockResolvedValue(mockUser);

      const result = await service.getUser("user-1");

      expect(result.id).toBe("user-1");
      expect(result.email).toBe("test@example.com");
    });

    it("throws error if user not found", async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      await expect(service.getUser("nonexistent")).rejects.toThrow(
        UserNotFoundError
      );
    });
  });

  describe("updateUser", () => {
    it("successfully updates user profile", async () => {
      const mockUpdatedUser = {
        id: "user-1",
        firstName: "Jane",
        lastName: "Smith",
      };

      mockUserRepo.update.mockResolvedValue(mockUpdatedUser);

      const result = await service.updateUser("user-1", {
        firstName: "Jane",
        lastName: "Smith",
      });

      expect(result.firstName).toBe("Jane");
      expect(mockAuditLogRepo.log).toHaveBeenCalledWith(
        "test-user-id",
        "USER_UPDATED",
        "User",
        "user-1",
        expect.any(Object)
      );
    });

    it("throws error if user not found", async () => {
      mockUserRepo.update.mockResolvedValue(null);

      await expect(
        service.updateUser("nonexistent", { firstName: "Test" })
      ).rejects.toThrow(UserNotFoundError);
    });

    it("throws error if not authenticated", async () => {
      const unauthEvent = createMockH3Event({});
      // Explicitly remove userId from context
      if (unauthEvent.context) {
        delete unauthEvent.context.userId;
      }

      // Create a fresh repository mock for this test
      const unauthUserRepo = createMockRepository();
      unauthUserRepo.update = vi.fn();

      const unauthService = new IdentityService(
        unauthEvent as any,
        unauthUserRepo as any,
        mockUserSettingsRepo as any,
        mockAuditLogRepo as any
      );

      await expect(
        unauthService.updateUser("user-1", { firstName: "Test" })
      ).rejects.toThrow(AuthenticationError);

      // Verify that update was never called (auth check happens first)
      expect(unauthUserRepo.update).not.toHaveBeenCalled();
    });

    it("removes sensitive fields from update data", async () => {
      const mockUpdatedUser = {
        id: "user-1",
        firstName: "Jane",
      };

      mockUserRepo.update.mockResolvedValue(mockUpdatedUser);

      await service.updateUser("user-1", {
        firstName: "Jane",
        passwordHash: "should-not-be-updated" as any,
        id: "should-not-be-updated" as any,
      });

      // Verify that sensitive fields were removed
      expect(mockUserRepo.update).toHaveBeenCalledWith("user-1", {
        firstName: "Jane",
      });
    });
  });

  describe("listUsers", () => {
    it("returns list of users", async () => {
      const mockUsers = [
        { id: "user-1", firstName: "John" },
        { id: "user-2", firstName: "Jane" },
      ];

      mockUserRepo.list.mockResolvedValue(mockUsers);

      const result = await service.listUsers(10, 0);

      expect(result).toHaveLength(2);
      expect(mockUserRepo.list).toHaveBeenCalledWith(10, 0, undefined, undefined, undefined);
    });
  });

  // ========================================
  // USER SETTINGS TESTS
  // ========================================

  describe("getUserSettings", () => {
    it("returns user settings", async () => {
      const mockSettings = {
        theme: "dark",
        language: "en",
      };

      mockUserSettingsRepo.getSettings.mockResolvedValue(mockSettings);

      const result = await service.getUserSettings("user-1");

      expect(result).toEqual(mockSettings);
      expect(mockUserSettingsRepo.getSettings).toHaveBeenCalledWith("user-1");
    });
  });

  describe("updateUserSettings", () => {
    it("successfully updates settings", async () => {
      const mockUpdatedSettings = {
        theme: "light",
        language: "en",
      };

      mockUserSettingsRepo.updateSettings.mockResolvedValue(
        mockUpdatedSettings
      );

      const result = await service.updateUserSettings("user-1", {
        theme: "light",
      });

      expect(result).toEqual(mockUpdatedSettings);
      expect(mockUserSettingsRepo.updateSettings).toHaveBeenCalledWith(
        "user-1",
        { theme: "light" }
      );
      expect(mockAuditLogRepo.log).toHaveBeenCalled();
    });
  });

  // ========================================
  // RBAC / PERMISSIONS TESTS
  // ========================================

  describe("getUserPermissions", () => {
    it("returns empty array when RBAC is disabled", async () => {
      // Mock the RBAC service to be disabled
      vi.doMock("~/server/services/rbac", () => ({
        getRBACService: () => ({
          isEnabled: () => false,
          getUserPermissions: vi.fn(),
        }),
      }));

      const result = await service.getUserPermissions("user-1");

      expect(result).toEqual([]);
    });
  });

  describe("getPermissionVersion", () => {
    it("returns 0 when RBAC is disabled", async () => {
      // Mock the RBAC service to be disabled
      vi.doMock("~/server/services/rbac", () => ({
        getRBACService: () => ({
          isEnabled: () => false,
        }),
      }));

      const result = await service.getPermissionVersion("user-1");

      expect(result).toBe(0);
    });
  });
});
