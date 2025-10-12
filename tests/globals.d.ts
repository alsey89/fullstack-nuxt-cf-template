import type { Mock } from 'vitest'

declare global {
  var hashPassword: Mock<(password: string) => Promise<string>>
  var verifyPassword: Mock<(hash: string, password: string) => Promise<boolean>>
  var getUserSession: Mock<() => Promise<any>>
  var setUserSession: Mock<(session: any) => Promise<void>>
}

export {}
