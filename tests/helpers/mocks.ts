import { vi } from 'vitest'
import type { H3Event } from 'h3'

// ========================================
// MOCK FACTORIES
// ========================================
// Reusable mock objects for testing
// ========================================

/**
 * Create a mock D1Database instance
 */
export function createMockD1Database() {
  const preparedStatement = {
    bind: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue({ success: true, results: [] }),
    all: vi.fn().mockResolvedValue({ success: true, results: [] }),
    first: vi.fn().mockResolvedValue(null),
  }

  return {
    prepare: vi.fn().mockReturnValue(preparedStatement),
    batch: vi.fn().mockResolvedValue([]),
    exec: vi.fn().mockResolvedValue({ success: true }),
    dump: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
  }
}

/**
 * Create a mock H3Event with Cloudflare context
 */
export function createMockH3Event(overrides?: {
  companyId?: string
  userId?: string
  db?: any
}): Partial<H3Event> {
  const db = overrides?.db || createMockD1Database()

  return {
    context: {
      companyId: overrides?.companyId || 'test-company-id',
      userId: overrides?.userId || 'test-user-id',
      db: db, // Add db directly to context (required by getDatabase utility)
      tenantId: 'test-tenant',
      cloudflare: {
        env: {
          DB: db,
          KV: {},
          R2: {},
        },
        context: {},
        cf: {},
        caches: {},
      },
    },
    node: {
      req: {},
      res: {},
    },
  } as any
}

/**
 * Create mock repository with common methods
 */
export function createMockRepository() {
  return {
    table: {} as any,
    findById: vi.fn(),
    findByIds: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    hardDelete: vi.fn(),
    restore: vi.fn(),
    exists: vi.fn(),
    count: vi.fn(),
    getDrizzle: vi.fn(),
  }
}

/**
 * Create all timekeeping repository mocks
 */
export function createMockTimekeepingRepositories() {
  return {
    shift: {
      ...createMockRepository(),
      list: vi.fn(),
      bulkCreate: vi.fn(),
    },
    shiftTemplate: {
      ...createMockRepository(),
      findActiveByLocation: vi.fn(),
    },
    shiftSwapRequest: createMockRepository(),
    clockEvent: {
      ...createMockRepository(),
      findLatestByAssignment: vi.fn(),
    },
    clockInterval: {
      ...createMockRepository(),
      findActiveByAssignment: vi.fn(),
      findByAssignmentAndDate: vi.fn(),
      getNextIntervalNumber: vi.fn(),
    },
    dailyTimesheet: {
      ...createMockRepository(),
      findActiveByAssignment: vi.fn(),
      findByAssignmentAndDate: vi.fn(),
      findOrCreate: vi.fn(),
      list: vi.fn(),
    },
    leaveRequest: {
      ...createMockRepository(),
      findOverlapping: vi.fn(),
      list: vi.fn(),
    },
    leaveBalance: {
      ...createMockRepository(),
      findByAssignment: vi.fn(),
      findByAssignmentAndType: vi.fn(),
    },
    availability: createMockRepository(),
    assignment: {
      ...createMockRepository(),
      findActiveByUser: vi.fn(),
    },
  }
}

// ========================================
// MOCK DATA FACTORIES
// ========================================
// Generate test data objects
// ========================================

export function createMockAssignment(overrides?: any) {
  return {
    id: 'test-assignment-id',
    companyId: 'test-company-id',
    userId: 'test-user-id',
    positionId: 'test-position-id',
    status: 'ACTIVE',
    startDate: new Date('2025-01-01'),
    endDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }
}

export function createMockShift(overrides?: any) {
  return {
    id: 'test-shift-id',
    companyId: 'test-company-id',
    date: new Date('2025-10-10'),
    locationId: 'test-location-id',
    departmentId: null,
    assignmentId: 'test-assignment-id',
    startAt: new Date('2025-10-10T09:00:00Z'),
    endAt: new Date('2025-10-10T17:00:00Z'),
    status: 'SCHEDULED',
    title: null,
    notes: null,
    unpaidBreakMins: 60,
    isRecurring: false,
    templateId: null,
    publishedAt: null,
    lockedAt: null,
    createdBy: 'test-user-id',
    updatedBy: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }
}

export function createMockClockInterval(overrides?: any) {
  return {
    id: 'test-interval-id',
    companyId: 'test-company-id',
    assignmentId: 'test-assignment-id',
    date: new Date('2025-10-10'),
    intervalNumber: 1,
    clockIn: new Date('2025-10-10T09:00:00Z'),
    clockOut: null,
    breakStart: null,
    breakEnd: null,
    workMinutes: 0,
    breakMinutes: 0,
    status: 'ACTIVE',
    isManual: false,
    createdBy: 'test-user-id',
    updatedBy: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }
}

export function createMockClockEvent(overrides?: any) {
  return {
    id: 'test-event-id',
    companyId: 'test-company-id',
    assignmentId: 'test-assignment-id',
    type: 'CLOCK_IN',
    clockedAt: new Date('2025-10-10T09:00:00Z'),
    shiftId: null,
    latitude: null,
    longitude: null,
    isManual: false,
    clockIntervalId: null,
    createdBy: 'test-user-id',
    updatedBy: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }
}

export function createMockTimesheet(overrides?: any) {
  return {
    id: 'test-timesheet-id',
    companyId: 'test-company-id',
    assignmentId: 'test-assignment-id',
    date: new Date('2025-10-10'),
    totalWorkMinutes: 0,
    totalBreakMinutes: 0,
    intervalCount: 0,
    lastIntervalNumber: 0,
    hasActiveInterval: false,
    activeIntervalId: null,
    firstClockIn: null,
    lastClockOut: null,
    status: 'DRAFT',
    approvedBy: null,
    approvedAt: null,
    lastModifiedBy: 'test-user-id',
    lastModifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }
}

export function createMockShiftTemplate(overrides?: any) {
  return {
    id: 'test-template-id',
    companyId: 'test-company-id',
    name: 'Morning Shift',
    description: 'Standard morning shift',
    locationId: 'test-location-id',
    departmentId: null,
    startTimeMins: 540, // 9:00 AM
    endTimeMins: 1020, // 5:00 PM
    unpaidBreakMins: 60,
    daysOfWeek: JSON.stringify([1, 2, 3, 4, 5]), // Mon-Fri
    effectiveFrom: new Date('2025-01-01'),
    effectiveUntil: null,
    defaultAssignmentId: null,
    requiredStaffCount: 1,
    assignmentStrategy: 'AUTO',
    title: null,
    notes: null,
    isActive: true,
    createdBy: 'test-user-id',
    updatedBy: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }
}
