import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import duration from 'dayjs/plugin/duration'

// Enable dayjs plugins
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(duration)

/**
 * Time Handling Utilities
 *
 * ARCHITECTURE:
 * - Database: INTEGER (Unix milliseconds, always UTC)
 * - Application: Date objects (JavaScript standard)
 * - API: ISO 8601 strings (with timezone offsets)
 * - Drizzle ORM: Automatic Date ↔ integer conversion
 *
 * RULES:
 * 1. Always store timestamps in UTC (no timezone ambiguity)
 * 2. Use Date objects in application code (type-safe, natural APIs)
 * 3. Let Drizzle handle Date ↔ integer conversion automatically
 * 4. Never manually convert: Math.floor(date.getTime()) ❌
 * 5. Store location timezones for business logic
 * 6. Convert to local timezone only at presentation layer
 */

// ========================================
// ISO STRING PARSING
// ========================================

/**
 * Parse ISO 8601 string to Date object
 * Used in API handlers to convert incoming timestamps
 *
 * @throws {Error} if string is invalid
 */
export function parseISODate(isoString: string): Date {
  const parsed = dayjs(isoString)
  if (!parsed.isValid()) {
    throw new Error(`Invalid ISO date string: ${isoString}`)
  }
  return parsed.toDate()
}

/**
 * Safely parse ISO date, returning null on failure
 */
export function tryParseISODate(isoString: string): Date | null {
  try {
    return parseISODate(isoString)
  } catch {
    return null
  }
}

// ========================================
// TIMEZONE-AWARE OPERATIONS
// ========================================

/**
 * Create a Date for a specific time-of-day in a timezone
 * Used for shift generation: converts local business hours to UTC
 *
 * @param date - Business date (e.g., 2025-10-09)
 * @param timeMins - Minutes from midnight (540 = 9:00 AM)
 * @param timezone - IANA timezone (e.g., "America/Los_Angeles")
 * @returns UTC Date object
 *
 * @example
 * // Create 9:00 AM Pacific on Oct 9, 2025
 * const shiftStart = createTimeInTimezone(
 *   new Date('2025-10-09'),
 *   540,
 *   'America/Los_Angeles'
 * )
 * // Returns Date representing 2025-10-09T16:00:00.000Z (UTC)
 */
export function createTimeInTimezone(date: Date, timeMins: number, timezone: string): Date {
  const hours = Math.floor(timeMins / 60)
  const mins = timeMins % 60

  // Create local time in specified timezone, then convert to UTC
  return dayjs(date)
    .tz(timezone)
    .startOf('day')
    .add(hours, 'hour')
    .add(mins, 'minute')
    .utc()
    .toDate()
}

/**
 * Format a Date in a specific timezone
 * Used for displaying shift times to users
 *
 * @param date - UTC Date object
 * @param timezone - IANA timezone
 * @param formatStr - dayjs format string
 * @returns Formatted string in local timezone
 *
 * @example
 * const utcDate = new Date('2025-10-09T16:00:00.000Z')
 * formatInTimezone(utcDate, 'America/Los_Angeles', 'h:mm A')
 * // Returns: "9:00 AM"
 */
export function formatInTimezone(date: Date, timezone: string, formatStr: string = 'YYYY-MM-DD HH:mm:ss'): string {
  return dayjs(date).tz(timezone).format(formatStr)
}

/**
 * Convert UTC date to local date in timezone
 * Returns a Date object representing the same wall-clock time
 *
 * @param date - UTC Date
 * @param timezone - IANA timezone
 * @returns Date object in local timezone
 */
export function toLocalTime(date: Date, timezone: string): Date {
  return dayjs(date).tz(timezone).toDate()
}

/**
 * Get timezone offset in minutes for a specific date
 */
export function getTimezoneOffset(date: Date, timezone: string): number {
  return dayjs(date).tz(timezone).utcOffset()
}

// ========================================
// BUSINESS DATE OPERATIONS
// ========================================

/**
 * Get business date (00:00:00 local time)
 * Used for daily timesheet date keys
 *
 * @param date - Optional date (defaults to now)
 * @returns Date with time set to midnight
 */
export function getBusinessDate(date: Date = new Date()): Date {
  return dayjs(date).startOf('day').toDate()
}

/**
 * Get start of day in UTC (00:00:00 UTC)
 */
export function getStartOfDayUTC(date: Date): Date {
  return dayjs(date).utc().startOf('day').toDate()
}

/**
 * Get end of day in UTC (23:59:59.999 UTC)
 */
export function getEndOfDayUTC(date: Date): Date {
  return dayjs(date).utc().endOf('day').toDate()
}

/**
 * Get start of day in specific timezone
 */
export function getStartOfDayInTimezone(date: Date, timezone: string): Date {
  return dayjs(date).tz(timezone).startOf('day').toDate()
}

/**
 * Get end of day in specific timezone
 */
export function getEndOfDayInTimezone(date: Date, timezone: string): Date {
  return dayjs(date).tz(timezone).endOf('day').toDate()
}

// ========================================
// DURATION CALCULATIONS
// ========================================

/**
 * Calculate duration in minutes between two dates
 * Used for timesheet calculations
 */
export function minutesBetween(start: Date, end: Date): number {
  return dayjs(end).diff(dayjs(start), 'minute')
}

/**
 * Calculate work minutes excluding break time
 * Used for clock interval calculations
 */
export function calculateWorkMinutes(
  clockIn: Date,
  clockOut: Date,
  breakStart?: Date | null,
  breakEnd?: Date | null
): number {
  let totalMinutes = minutesBetween(clockIn, clockOut)

  // Subtract break time if both timestamps exist
  if (breakStart && breakEnd) {
    const breakMinutes = minutesBetween(breakStart, breakEnd)
    totalMinutes -= breakMinutes
  }

  return Math.max(0, totalMinutes)
}

/**
 * Convert minutes to hours (decimal)
 */
export function minutesToHours(minutes: number): number {
  return minutes / 60
}

/**
 * Convert hours to minutes
 */
export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60)
}

// ========================================
// DATE ARITHMETIC
// ========================================

/**
 * Add days to a date
 * Returns a new Date object
 */
export function addDays(date: Date, days: number): Date {
  return dayjs(date).add(days, 'day').toDate()
}

/**
 * Add minutes to a date
 */
export function addMinutes(date: Date, minutes: number): Date {
  return dayjs(date).add(minutes, 'minute').toDate()
}

/**
 * Add hours to a date
 */
export function addHours(date: Date, hours: number): Date {
  return dayjs(date).add(hours, 'hour').toDate()
}

/**
 * Add weeks to a date
 */
export function addWeeks(date: Date, weeks: number): Date {
  return dayjs(date).add(weeks, 'week').toDate()
}

/**
 * Add months to a date
 */
export function addMonths(date: Date, months: number): Date {
  return dayjs(date).add(months, 'month').toDate()
}

/**
 * Subtract days from a date
 */
export function subtractDays(date: Date, days: number): Date {
  return dayjs(date).subtract(days, 'day').toDate()
}

// ========================================
// DATE COMPARISON & VALIDATION
// ========================================

/**
 * Check if date is within range (inclusive)
 */
export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  const d = dayjs(date)
  return (d.isSame(startDate) || d.isAfter(startDate)) && (d.isSame(endDate) || d.isBefore(endDate))
}

/**
 * Check if date is in the past
 */
export function isInPast(date: Date): boolean {
  return dayjs(date).isBefore(dayjs())
}

/**
 * Check if date is in the future
 */
export function isInFuture(date: Date): boolean {
  return dayjs(date).isAfter(dayjs())
}

/**
 * Check if two dates are on the same day (UTC)
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return dayjs(date1).utc().isSame(dayjs(date2).utc(), 'day')
}

/**
 * Check if date is today
 */
export function isToday(date: Date): boolean {
  return dayjs(date).isSame(dayjs(), 'day')
}

/**
 * Check if date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = dayjs(date).day()
  return day === 0 || day === 6 // 0 = Sunday, 6 = Saturday
}

/**
 * Get day of week (0 = Sunday, 6 = Saturday)
 */
export function getDayOfWeek(date: Date): number {
  return dayjs(date).day()
}

/**
 * Convert day of week to ISO day (1 = Monday, 7 = Sunday)
 */
export function toISODayOfWeek(dayOfWeek: number): number {
  return dayOfWeek === 0 ? 7 : dayOfWeek
}

// ========================================
// FORMATTING
// ========================================

/**
 * Format date to ISO string
 */
export function toISOString(date: Date): string {
  return dayjs(date).toISOString()
}

/**
 * Format date using custom format
 * See: https://day.js.org/docs/en/display/format
 */
export function formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
  return dayjs(date).format(format)
}

/**
 * Format time (HH:mm)
 */
export function formatTime(date: Date): string {
  return dayjs(date).format('HH:mm')
}

/**
 * Format date and time (YYYY-MM-DD HH:mm:ss)
 */
export function formatDateTime(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

// ========================================
// TIMEZONE UTILITIES
// ========================================

/**
 * Get all available IANA timezones
 * Useful for timezone dropdowns in UI
 */
export function getAvailableTimezones(): string[] {
  // Common US timezones (can be expanded)
  return [
    'America/New_York',      // Eastern
    'America/Chicago',       // Central
    'America/Denver',        // Mountain
    'America/Phoenix',       // Arizona (no DST)
    'America/Los_Angeles',   // Pacific
    'America/Anchorage',     // Alaska
    'Pacific/Honolulu',      // Hawaii
  ]
}

/**
 * Validate timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    dayjs().tz(timezone)
    return true
  } catch {
    return false
  }
}

/**
 * Get user's system timezone
 */
export function getSystemTimezone(): string {
  return dayjs.tz.guess()
}

// ========================================
// CONSTANTS
// ========================================

export const MINUTES_PER_HOUR = 60
export const HOURS_PER_DAY = 24
export const MINUTES_PER_DAY = 1440
export const MILLISECONDS_PER_MINUTE = 60000
export const MILLISECONDS_PER_HOUR = 3600000
export const MILLISECONDS_PER_DAY = 86400000

/**
 * Common timezones by abbreviation
 */
export const TIMEZONE_BY_ABBR = {
  EST: 'America/New_York',
  EDT: 'America/New_York',
  CST: 'America/Chicago',
  CDT: 'America/Chicago',
  MST: 'America/Denver',
  MDT: 'America/Denver',
  PST: 'America/Los_Angeles',
  PDT: 'America/Los_Angeles',
  AKST: 'America/Anchorage',
  AKDT: 'America/Anchorage',
  HST: 'Pacific/Honolulu',
} as const

/**
 * Day of week constants (JavaScript standard: 0 = Sunday)
 */
export const DAY_OF_WEEK = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const

/**
 * ISO day of week constants (ISO standard: 1 = Monday)
 */
export const ISO_DAY_OF_WEEK = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
} as const
