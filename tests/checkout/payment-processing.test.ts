import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import {
  validateCardNumber,
  validateExpiryDate,
  validateCVV,
  checkRateLimit,
  clearRateLimit,
  validateOrderAmounts,
  sanitizeInput,
  generateSecureTransactionId,
  detectSuspiciousActivity,
  maskCardNumber,
  hashForLogging
} from '@/lib/security'

describe('Payment Security', () => {
  describe('Card Validation', () => {
    it('should validate correct card numbers', () => {
      // Valid test card numbers
      expect(validateCardNumber('4111111111111111')).toBe(true) // Visa
      expect(validateCardNumber('5500000000000004')).toBe(true) // Mastercard
      expect(validateCardNumber('340000000000009')).toBe(true) // Amex
      expect(validateCardNumber('6011000000000004')).toBe(true) // Discover
    })

    it('should reject invalid card numbers', () => {
      expect(validateCardNumber('1234567890123456')).toBe(false) // Invalid Luhn
      expect(validateCardNumber('411111111111111')).toBe(false) // Too short
      expect(validateCardNumber('41111111111111112')).toBe(false) // Too long
      expect(validateCardNumber('abcd1234567890ab')).toBe(false) // Non-numeric
      expect(validateCardNumber('')).toBe(false) // Empty
    })

    it('should validate card numbers with spaces', () => {
      expect(validateCardNumber('4111 1111 1111 1111')).toBe(true)
      expect(validateCardNumber('5500 0000 0000 0004')).toBe(true)
    })
  })

  describe('Expiry Date Validation', () => {
    it('should validate future expiry dates', () => {
      const currentYear = new Date().getFullYear()
      const futureYear = (currentYear + 1).toString()

      expect(validateExpiryDate('12', futureYear)).toBe(true)
      expect(validateExpiryDate('01', futureYear)).toBe(true)
      expect(validateExpiryDate('06', futureYear)).toBe(true)
    })

    it('should reject expired dates', () => {
      const currentYear = new Date().getFullYear()
      const pastYear = (currentYear - 1).toString()

      expect(validateExpiryDate('01', pastYear)).toBe(false)
      expect(validateExpiryDate('12', pastYear)).toBe(false)
    })

    it('should reject invalid months', () => {
      const currentYear = new Date().getFullYear().toString()

      expect(validateExpiryDate('00', currentYear)).toBe(false)
      expect(validateExpiryDate('13', currentYear)).toBe(false)
      expect(validateExpiryDate('-1', currentYear)).toBe(false)
      expect(validateExpiryDate('ab', currentYear)).toBe(false)
    })

    it('should handle current year correctly', () => {
      const now = new Date()
      const currentYear = now.getFullYear().toString()
      const currentMonth = now.getMonth() + 1

      // Current month should be valid
      expect(validateExpiryDate(currentMonth.toString().padStart(2, '0'), currentYear)).toBe(true)

      // Previous month should be invalid
      if (currentMonth > 1) {
        const previousMonth = (currentMonth - 1).toString().padStart(2, '0')
        expect(validateExpiryDate(previousMonth, currentYear)).toBe(false)
      }

      // Next month should be valid
      if (currentMonth < 12) {
        const nextMonth = (currentMonth + 1).toString().padStart(2, '0')
        expect(validateExpiryDate(nextMonth, currentYear)).toBe(true)
      }
    })
  })

  describe('CVV Validation', () => {
    it('should validate correct CVV formats', () => {
      expect(validateCVV('123')).toBe(true)
      expect(validateCVV('456')).toBe(true)
      expect(validateCVV('789')).toBe(true)
      expect(validateCVV('1234', 'amex')).toBe(true)
    })

    it('should reject invalid CVV formats', () => {
      expect(validateCVV('12')).toBe(false) // Too short
      expect(validateCVV('12345')).toBe(false) // Too long
      expect(validateCVV('abc')).toBe(false) // Non-numeric
      expect(validateCVV('')).toBe(false) // Empty
      expect(validateCVV('1234')).toBe(false) // 4 digits for non-Amex
      expect(validateCVV('123', 'amex')).toBe(false) // 3 digits for Amex
    })
  })

  describe('Rate Limiting', () => {
    const testIdentifier = 'test-user-123'

    beforeEach(() => {
      clearRateLimit(testIdentifier)
    })

    it('should allow requests within rate limit', () => {
      const result1 = checkRateLimit(testIdentifier, 3)
      expect(result1.allowed).toBe(true)
      expect(result1.remainingAttempts).toBe(2)

      const result2 = checkRateLimit(testIdentifier, 3)
      expect(result2.allowed).toBe(true)
      expect(result2.remainingAttempts).toBe(1)

      const result3 = checkRateLimit(testIdentifier, 3)
      expect(result3.allowed).toBe(true)
      expect(result3.remainingAttempts).toBe(0)
    })

    it('should block requests exceeding rate limit', () => {
      // Use up all attempts
      checkRateLimit(testIdentifier, 2)
      checkRateLimit(testIdentifier, 2)

      // This should be blocked
      const result = checkRateLimit(testIdentifier, 2)
      expect(result.allowed).toBe(false)
      expect(result.remainingAttempts).toBe(0)
    })

    it('should reset rate limit after clearing', () => {
      checkRateLimit(testIdentifier, 2)
      checkRateLimit(testIdentifier, 2)

      // Clear the rate limit
      clearRateLimit(testIdentifier)

      // Should be allowed again
      const result = checkRateLimit(testIdentifier, 2)
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(1)
    })
  })

  describe('Order Amount Validation', () => {
    it('should calculate correct amounts', () => {
      const items = [
        { price: 29.99, quantity: 2 },
        { price: 49.99, quantity: 1 },
        { price: 19.99, quantity: 3 }
      ]

      const result = validateOrderAmounts(items)

      const expectedSubtotal = 29.99 * 2 + 49.99 + 19.99 * 3
      const expectedTax = expectedSubtotal * 0.1
      const expectedTotal = expectedSubtotal + expectedTax

      expect(result.subtotal).toBeCloseTo(expectedSubtotal)
      expect(result.tax).toBeCloseTo(expectedTax)
      expect(result.total).toBeCloseTo(expectedTotal)
    })

    it('should reject invalid item prices', () => {
      expect(() => validateOrderAmounts([{ price: -10, quantity: 1 }]))
        .toThrow('Invalid item price or quantity')

      expect(() => validateOrderAmounts([{ price: 0, quantity: 1 }]))
        .toThrow('Invalid item price or quantity')
    })

    it('should reject invalid quantities', () => {
      expect(() => validateOrderAmounts([{ price: 10, quantity: -1 }]))
        .toThrow('Invalid item price or quantity')

      expect(() => validateOrderAmounts([{ price: 10, quantity: 0 }]))
        .toThrow('Invalid item price or quantity')

      expect(() => validateOrderAmounts([{ price: 10, quantity: 1001 }]))
        .toThrow('Quantity too large')
    })
  })

  describe('Input Sanitization', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>'))
        .toBe('scriptalertxss/script')

      expect(sanitizeInput('John\'s Store'))
        .toBe('Johns Store')

      expect(sanitizeInput('"Quoted Text"'))
        .toBe('Quoted Text')
    })

    it('should trim whitespace', () => {
      expect(sanitizeInput('  text  ')).toBe('text')
      expect(sanitizeInput('\n\ttext\n\t')).toBe('text')
    })

    it('should limit length', () => {
      const longString = 'a'.repeat(2000)
      expect(sanitizeInput(longString)).toHaveLength(1000)
    })
  })

  describe('Transaction ID Generation', () => {
    it('should generate unique transaction IDs', () => {
      const ids = new Set()
      for (let i = 0; i < 100; i++) {
        ids.add(generateSecureTransactionId())
      }
      expect(ids.size).toBe(100) // All should be unique
    })

    it('should follow correct format', () => {
      const txnId = generateSecureTransactionId()
      expect(txnId).toMatch(/^txn_\d+_[a-f0-9]{16}$/)
    })
  })

  describe('Card Number Masking', () => {
    it('should mask card numbers correctly', () => {
      expect(maskCardNumber('4111111111111111'))
        .toBe('**** **** **** 1111')

      expect(maskCardNumber('5500000000000004'))
        .toBe('**** **** **** 0004')

      expect(maskCardNumber('340000000000009'))
        .toBe('**** **** **** 0009')
    })

    it('should handle short or invalid inputs', () => {
      expect(maskCardNumber('123')).toBe('****')
      expect(maskCardNumber('')).toBe('****')
    })
  })

  describe('Suspicious Activity Detection', () => {
    it('should flag large payment amounts', () => {
      const result = detectSuspiciousActivity({
        amount: 15000,
        cardNumber: '4111111111111111'
      })

      expect(result.suspicious).toBe(true)
      expect(result.reasons).toContain('Large payment amount')
    })

    it('should not flag normal payment amounts', () => {
      const result = detectSuspiciousActivity({
        amount: 500,
        cardNumber: '4111111111111111'
      })

      expect(result.suspicious).toBe(false)
      expect(result.reasons).toHaveLength(0)
    })
  })

  describe('Hashing for Logging', () => {
    it('should produce consistent hashes', () => {
      const data = 'sensitive-data-123'
      const hash1 = hashForLogging(data)
      const hash2 = hashForLogging(data)

      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(8)
    })

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashForLogging('data1')
      const hash2 = hashForLogging('data2')

      expect(hash1).not.toBe(hash2)
    })
  })
})