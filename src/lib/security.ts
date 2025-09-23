import crypto from 'crypto'

/**
 * Security utilities for payment processing
 */

// Rate limiting storage (in production, use Redis or database)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

/**
 * Simple rate limiting for payment attempts
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; remainingAttempts: number; resetTime: number } {
  const now = Date.now()
  const key = `payment:${identifier}`

  const current = rateLimitMap.get(key)

  // If no record or window has expired, reset
  if (!current || now > current.resetTime) {
    const resetTime = now + windowMs
    rateLimitMap.set(key, { count: 1, resetTime })
    return {
      allowed: true,
      remainingAttempts: maxAttempts - 1,
      resetTime
    }
  }

  // If within rate limit, increment
  if (current.count < maxAttempts) {
    current.count += 1
    rateLimitMap.set(key, current)
    return {
      allowed: true,
      remainingAttempts: maxAttempts - current.count,
      resetTime: current.resetTime
    }
  }

  // Rate limit exceeded
  return {
    allowed: false,
    remainingAttempts: 0,
    resetTime: current.resetTime
  }
}

/**
 * Clear rate limit for successful payments
 */
export function clearRateLimit(identifier: string) {
  const key = `payment:${identifier}`
  rateLimitMap.delete(key)
}

/**
 * Validate card number format (basic validation)
 */
export function validateCardNumber(cardNumber: string): boolean {
  // Remove spaces and validate format
  const cleaned = cardNumber.replace(/\s/g, '')

  // Must be 13-19 digits
  if (!/^\d{13,19}$/.test(cleaned)) {
    return false
  }

  // Luhn algorithm validation
  return luhnCheck(cleaned)
}

/**
 * Luhn algorithm for card validation
 */
function luhnCheck(cardNumber: string): boolean {
  let sum = 0
  let isEven = false

  // Loop through values starting from the right
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i])

    if (isEven) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    isEven = !isEven
  }

  return sum % 10 === 0
}

/**
 * Validate expiry date
 */
export function validateExpiryDate(month: string, year: string): boolean {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const expiryYear = parseInt(year)
  const expiryMonth = parseInt(month)

  // Check for non-numeric inputs
  if (isNaN(expiryMonth) || isNaN(expiryYear)) {
    return false
  }

  // Basic format validation
  if (expiryMonth < 1 || expiryMonth > 12) {
    return false
  }

  if (expiryYear < currentYear || expiryYear > currentYear + 20) {
    return false
  }

  // Check if expired
  if (expiryYear === currentYear && expiryMonth < currentMonth) {
    return false
  }

  return true
}

/**
 * Validate CVV
 */
export function validateCVV(cvv: string, cardType: string = ''): boolean {
  // Amex has 4 digits, others have 3
  const expectedLength = cardType.toLowerCase() === 'amex' ? 4 : 3
  return /^\d+$/.test(cvv) && cvv.length === expectedLength
}

/**
 * Mask card number for display
 */
export function maskCardNumber(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, '')
  if (cleaned.length < 4) return '****'
  return '**** **** **** ' + cleaned.slice(-4)
}

/**
 * Hash sensitive data for logging (without revealing actual values)
 */
export function hashForLogging(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 8)
}

/**
 * Validate order amounts to prevent manipulation
 */
export function validateOrderAmounts(items: Array<{ price: number; quantity: number }>) {
  let calculatedSubtotal = 0

  for (const item of items) {
    if (item.price <= 0 || item.quantity <= 0) {
      throw new Error('Invalid item price or quantity')
    }

    if (item.quantity > 1000) {
      throw new Error('Quantity too large')
    }

    calculatedSubtotal += item.price * item.quantity
  }

  // Calculate tax (10%)
  const calculatedTax = calculatedSubtotal * 0.1
  const calculatedTotal = calculatedSubtotal + calculatedTax

  return {
    subtotal: calculatedSubtotal,
    tax: calculatedTax,
    total: calculatedTotal
  }
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>'"()]/g, '') // Remove potentially dangerous characters
    .substring(0, 1000) // Limit length
}

/**
 * Generate secure transaction ID
 */
export function generateSecureTransactionId(): string {
  const timestamp = Date.now().toString()
  const random = crypto.randomBytes(8).toString('hex')
  return `txn_${timestamp}_${random}`
}

/**
 * Log security events (in production, integrate with monitoring service)
 */
export function logSecurityEvent(event: string, details: any, severity: 'low' | 'medium' | 'high' = 'medium') {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    severity,
    details: {
      ...details,
      // Hash any sensitive data
      userAgent: details.userAgent ? hashForLogging(details.userAgent) : undefined,
      ip: details.ip ? hashForLogging(details.ip) : undefined
    }
  }

  console.warn('🔒 SECURITY EVENT:', JSON.stringify(logEntry, null, 2))

  // In production, send to monitoring service
  // await sendToMonitoringService(logEntry)
}

/**
 * Check if payment attempt looks suspicious
 */
export function detectSuspiciousActivity(paymentData: {
  amount: number
  cardNumber: string
  userAgent?: string
  ip?: string
}): { suspicious: boolean; reasons: string[] } {
  const reasons: string[] = []

  // Large amount threshold
  if (paymentData.amount > 10000) {
    reasons.push('Large payment amount')
  }

  // Multiple consecutive identical card numbers (basic check)
  const cardHash = hashForLogging(paymentData.cardNumber)
  const recentAttempts = Array.from(rateLimitMap.keys())
    .filter(key => key.includes(cardHash))

  if (recentAttempts.length > 3) {
    reasons.push('Multiple recent attempts with same card')
  }

  return {
    suspicious: reasons.length > 0,
    reasons
  }
}