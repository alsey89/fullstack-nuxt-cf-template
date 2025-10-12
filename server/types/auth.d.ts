// Type definitions for nuxt-auth-utils
import type { PermissionCode } from '../database/schema/identity'

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
    userId: string
    permissions: PermissionCode[]
    roleIds: string[] // IDs of roles assigned to user
    loggedInAt: number
  }

  interface SecureSessionData {
    // Add sensitive data that should only be accessible server-side
  }
}

export {}
