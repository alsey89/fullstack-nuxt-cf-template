// Type definitions for nuxt-auth-utils
import type { PermissionCode } from '#server/database/schema/identity'

declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    firstName?: string
    lastName?: string
    isEmailVerified: boolean
    isActive: boolean
  }

  interface UserSession {
    tenantId: string // Tenant ID bound to session (prevents cross-tenant access)
    permissions: PermissionCode[]
    permissionVersion: number // Version for permission cache invalidation
    loggedInAt: number
  }

  interface SecureSessionData {
    // Add sensitive data that should only be accessible server-side
  }
}

export {}
