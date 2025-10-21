import validator from 'validator'

// ========================================
// INPUT SANITIZATION LIBRARY
// ========================================
// Functions to sanitize user input before processing
// Use AFTER Zod validation for defense in depth
// ========================================

/**
 * Sanitize HTML input - strips all HTML tags
 * Use for: names, descriptions, notes, titles, etc.
 *
 * @example
 * sanitizeHtml('<script>alert("xss")</script>John') // Returns: 'John'
 * sanitizeHtml('John <b>Doe</b>') // Returns: 'John Doe'
 */
export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return ''

  // Strip ALL HTML tags using a simple regex approach
  // This is CF-compatible (no DOM dependencies)
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // Remove style tags
    .replace(/<[^>]+>/g, '')                                             // Remove all other HTML tags
    .replace(/&lt;/g, '')                                                // Remove HTML entities
    .replace(/&gt;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .trim()
}

/**
 * Sanitize email - normalize and validate format
 * Use for: email addresses
 *
 * @example
 * sanitizeEmail('User@Example.COM ') // Returns: 'user@example.com'
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return ''

  const normalized = validator.normalizeEmail(email.trim(), {
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    outlookdotcom_remove_subaddress: false,
    yahoo_remove_subaddress: false,
    icloud_remove_subaddress: false,
  })

  return normalized || email.toLowerCase().trim()
}

/**
 * Sanitize general string - remove control characters and null bytes
 * Use for: general text fields, IDs, codes
 *
 * @example
 * sanitizeString('  hello\x00world\n  ') // Returns: 'hello world'
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return ''

  return input
    .replace(/\0/g, '')              // Null bytes
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') // Control chars (except \t, \n, \r)
    .trim()
}

/**
 * Sanitize phone number - keep only digits, spaces, hyphens, parentheses, plus sign
 * Use for: phone numbers
 *
 * @example
 * sanitizePhone('+1 (555) 123-4567<script>') // Returns: '+1 (555) 123-4567'
 */
export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone) return ''

  // Keep only valid phone characters
  return phone.replace(/[^0-9\s\-\(\)\+]/g, '').trim()
}

/**
 * Sanitize URL - validate and normalize
 * Use for: URLs, website addresses
 *
 * @example
 * sanitizeUrl('javascript:alert(1)') // Returns: ''
 * sanitizeUrl('https://example.com') // Returns: 'https://example.com'
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return ''

  const trimmed = url.trim()

  // Only allow http/https protocols
  if (!validator.isURL(trimmed, {
    protocols: ['http', 'https'],
    require_protocol: true,
  })) {
    return ''
  }

  return trimmed
}

/**
 * Sanitize object recursively - apply sanitization to all string values
 * Use for: complex nested objects when you want to sanitize all strings
 *
 * @example
 * sanitizeObject({ name: '<script>XSS</script>', nested: { email: 'User@Example.COM' }})
 * // Returns: { name: 'XSS', nested: { email: 'User@Example.COM' }}
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') return sanitizeString(obj)
  if (Array.isArray(obj)) return obj.map(sanitizeObject)
  if (obj && typeof obj === 'object') {
    const sanitized: any = {}
    for (const key in obj) {
      sanitized[key] = sanitizeObject(obj[key])
    }
    return sanitized
  }
  return obj
}

/**
 * Sanitize postal/zip code - keep only alphanumeric, spaces, hyphens
 * Use for: postal codes, zip codes
 *
 * @example
 * sanitizePostalCode('12345-6789<script>') // Returns: '12345-6789'
 */
export function sanitizePostalCode(postalCode: string | null | undefined): string {
  if (!postalCode) return ''

  // Keep only alphanumeric, spaces, hyphens
  return postalCode.replace(/[^A-Za-z0-9\s\-]/g, '').trim()
}

/**
 * Sanitize numeric string - keep only digits and optional decimal point
 * Use for: amounts, quantities (as strings)
 *
 * @example
 * sanitizeNumeric('$123.45abc') // Returns: '123.45'
 */
export function sanitizeNumeric(input: string | null | undefined): string {
  if (!input) return ''

  // Keep only digits and decimal point
  const cleaned = input.replace(/[^0-9.]/g, '')

  // Ensure only one decimal point
  const parts = cleaned.split('.')
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('')
  }

  return cleaned
}
