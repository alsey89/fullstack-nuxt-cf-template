import type { User } from "#server/database/schema/identity";

/**
 * User object safe for client consumption (no sensitive fields)
 */
export type SafeUser = Omit<User, "passwordHash">;

/**
 * Remove sensitive fields from user object before sending to client
 *
 * SECURITY: Never expose passwordHash to clients
 *
 * @param user - User object from database
 * @returns User object without sensitive fields
 */
export function sanitizeUserForClient(user: User): SafeUser {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

/**
 * Remove sensitive fields from multiple user objects
 *
 * @param users - Array of user objects from database
 * @returns Array of user objects without sensitive fields
 */
export function sanitizeUsersForClient(users: User[]): SafeUser[] {
  return users.map(sanitizeUserForClient);
}
