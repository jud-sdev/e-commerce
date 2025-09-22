import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import {
  checkRateLimit,
  clearRateLimit,
  validateCardNumber,
  validateExpiryDate,
  validateCVV,
  validateOrderAmounts,
  sanitizeInput,
  generateSecureTransactionId,
  logSecurityEvent,
  detectSuspiciousActivity,
  hashForLogging
} from '@/lib/security'

const checkoutSchema = z.object({
  email: z.string().email(),

  // Shipping Address
  shippingFirstName: z.string().min(1),
  shippingLastName: z.string().min(1),
  shippingAddress1: z.string().min(1),
  shippingAddress2: z.string().optional(),
  shippingCity: z.string().min(1),
  shippingState: z.string().min(1),
  shippingPostalCode: z.string().min(1),
  shippingCountry: z.string().min(1),
  shippingPhone: z.string().optional(),

  // Billing Address
  billingFirstName: z.string().min(1),
  billingLastName: z.string().min(1),
  billingAddress1: z.string().min(1),
  billingAddress2: z.string().optional(),
  billingCity: z.string().min(1),
  billingState: z.string().min(1),
  billingPostalCode: z.string().min(1),
  billingCountry: z.string().min(1),
  billingPhone: z.string().optional(),

  // Payment Information
  cardNumber: z.string().regex(/^[0-9]{16}$/),
  expiryMonth: z.string(),
  expiryYear: z.string(),
  cvv: z.string().regex(/^[0-9]{3,4}$/),
  cardName: z.string().min(1),

  // Order data
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
    price: z.number().positive()
  })),
  summary: z.object({
    subtotal: z.number(),
    tax: z.number(),
    total: z.number(),
    totalItems: z.number(),
    itemCount: z.number()
  })
})

// Mock payment processor
async function processPayment(paymentData: {
  cardNumber: string
  expiryMonth: string
  expiryYear: string
  cvv: string
  cardName: string
  amount: number
}) {
  // Simulate payment processing delay
  const processingDelay = parseInt(process.env.PAYMENT_PROCESSING_DELAY || '2000')
  await new Promise(resolve => setTimeout(resolve, processingDelay))

  // Determine card brand
  const cardBrand = getCardBrand(paymentData.cardNumber)
  const cardLast4 = paymentData.cardNumber.slice(-4)

  // Mock payment logic
  const successRate = parseFloat(process.env.PAYMENT_SUCCESS_RATE || '0.95')
  const isSuccess = Math.random() < successRate

  // Special test cards
  if (paymentData.cardNumber === '4111111111111111') {
    return {
      success: true,
      transactionId: generateTransactionId(),
      cardBrand,
      cardLast4,
      status: 'SUCCEEDED'
    }
  }

  if (paymentData.cardNumber === '4000000000000002') {
    return {
      success: false,
      error: 'Your card was declined. Please try a different payment method.',
      status: 'FAILED'
    }
  }

  // Random success/failure for other cards
  if (isSuccess) {
    return {
      success: true,
      transactionId: generateTransactionId(),
      cardBrand,
      cardLast4,
      status: 'SUCCEEDED'
    }
  } else {
    return {
      success: false,
      error: 'Payment processing failed. Please try again.',
      status: 'FAILED'
    }
  }
}

function getCardBrand(cardNumber: string): string {
  if (cardNumber.startsWith('4')) return 'Visa'
  if (cardNumber.startsWith('5')) return 'Mastercard'
  if (cardNumber.startsWith('3')) return 'Amex'
  return 'Unknown'
}

function generateTransactionId(): string {
  return generateSecureTransactionId()
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substr(2, 4).toUpperCase()
  return `ORD-${timestamp}-${random}`
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get client IP for security logging
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Rate limiting check
    const rateLimit = checkRateLimit(session.user.id)
    if (!rateLimit.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        userId: session.user.id,
        ip: clientIp,
        userAgent,
        resetTime: new Date(rateLimit.resetTime).toISOString()
      }, 'high')

      return NextResponse.json({
        error: 'Too many payment attempts. Please try again later.',
        retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      }, { status: 429 })
    }

    const body = await request.json()
    const validatedData = checkoutSchema.parse(body)

    // Sanitize string inputs
    validatedData.email = sanitizeInput(validatedData.email)
    validatedData.shippingFirstName = sanitizeInput(validatedData.shippingFirstName)
    validatedData.shippingLastName = sanitizeInput(validatedData.shippingLastName)
    validatedData.billingFirstName = sanitizeInput(validatedData.billingFirstName)
    validatedData.billingLastName = sanitizeInput(validatedData.billingLastName)
    validatedData.cardName = sanitizeInput(validatedData.cardName)

    // Validate card details with enhanced security
    if (!validateCardNumber(validatedData.cardNumber)) {
      logSecurityEvent('INVALID_CARD_NUMBER', {
        userId: session.user.id,
        cardHash: hashForLogging(validatedData.cardNumber),
        ip: clientIp
      })
      return NextResponse.json({ error: 'Invalid card number' }, { status: 400 })
    }

    if (!validateExpiryDate(validatedData.expiryMonth, validatedData.expiryYear)) {
      return NextResponse.json({ error: 'Invalid or expired card' }, { status: 400 })
    }

    const cardBrand = getCardBrand(validatedData.cardNumber)
    if (!validateCVV(validatedData.cvv, cardBrand)) {
      return NextResponse.json({ error: 'Invalid CVV' }, { status: 400 })
    }

    // Verify user's cart items
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: session.user.id },
      include: {
        product: {
          include: {
            images: { orderBy: { order: 'asc' }, take: 1 }
          }
        }
      }
    })

    if (cartItems.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Validate inventory
    for (const cartItem of cartItems) {
      if (cartItem.product.inventory < cartItem.quantity) {
        return NextResponse.json({
          error: `Insufficient inventory for ${cartItem.product.name}`
        }, { status: 400 })
      }
    }

    // Validate order amounts with security checks
    const calculatedAmounts = validateOrderAmounts(
      cartItems.map(item => ({
        price: Number(item.product.price),
        quantity: item.quantity
      }))
    )

    // Verify submitted totals match calculated totals
    if (Math.abs(calculatedAmounts.total - validatedData.summary.total) > 0.01) {
      logSecurityEvent('ORDER_TOTAL_MISMATCH', {
        userId: session.user.id,
        submittedTotal: validatedData.summary.total,
        calculatedTotal: calculatedAmounts.total,
        ip: clientIp
      }, 'high')
      return NextResponse.json({ error: 'Order total mismatch' }, { status: 400 })
    }

    const { subtotal, tax, total } = calculatedAmounts
    const shipping = 0 // Free shipping

    // Check for suspicious activity
    const suspiciousCheck = detectSuspiciousActivity({
      amount: total,
      cardNumber: validatedData.cardNumber,
      userAgent,
      ip: clientIp
    })

    if (suspiciousCheck.suspicious) {
      logSecurityEvent('SUSPICIOUS_PAYMENT_ACTIVITY', {
        userId: session.user.id,
        reasons: suspiciousCheck.reasons,
        amount: total,
        cardHash: hashForLogging(validatedData.cardNumber),
        ip: clientIp
      }, 'high')

      // For now, we'll log but not block. In production, you might want to require additional verification
    }

    // Process payment
    const paymentResult = await processPayment({
      cardNumber: validatedData.cardNumber,
      expiryMonth: validatedData.expiryMonth,
      expiryYear: validatedData.expiryYear,
      cvv: validatedData.cvv,
      cardName: validatedData.cardName,
      amount: total
    })

    if (!paymentResult.success) {
      return NextResponse.json({
        success: false,
        error: paymentResult.error
      }, { status: 400 })
    }

    // Create order
    const orderNumber = generateOrderNumber()

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: session.user.id,
        status: 'CONFIRMED',
        paymentStatus: paymentResult.status as any,
        subtotal,
        tax,
        shipping,
        total,

        // Payment information
        paymentMethod: 'credit_card',
        transactionId: paymentResult.transactionId,
        cardLast4: paymentResult.cardLast4,
        cardBrand: paymentResult.cardBrand,

        // Shipping address
        shippingFirstName: validatedData.shippingFirstName,
        shippingLastName: validatedData.shippingLastName,
        shippingAddress1: validatedData.shippingAddress1,
        shippingAddress2: validatedData.shippingAddress2,
        shippingCity: validatedData.shippingCity,
        shippingState: validatedData.shippingState,
        shippingPostalCode: validatedData.shippingPostalCode,
        shippingCountry: validatedData.shippingCountry,
        shippingPhone: validatedData.shippingPhone,

        // Billing address
        billingFirstName: validatedData.billingFirstName,
        billingLastName: validatedData.billingLastName,
        billingAddress1: validatedData.billingAddress1,
        billingAddress2: validatedData.billingAddress2,
        billingCity: validatedData.billingCity,
        billingState: validatedData.billingState,
        billingPostalCode: validatedData.billingPostalCode,
        billingCountry: validatedData.billingCountry,
        billingPhone: validatedData.billingPhone,

        // Order items
        items: {
          create: cartItems.map(cartItem => ({
            productId: cartItem.productId,
            quantity: cartItem.quantity,
            price: cartItem.product.price,
            total: Number(cartItem.product.price) * cartItem.quantity
          }))
        }
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { order: 'asc' }, take: 1 }
              }
            }
          }
        }
      }
    })

    // Update product inventory
    for (const cartItem of cartItems) {
      await prisma.product.update({
        where: { id: cartItem.productId },
        data: {
          inventory: {
            decrement: cartItem.quantity
          }
        }
      })
    }

    // Clear user's cart
    await prisma.cartItem.deleteMany({
      where: { userId: session.user.id }
    })

    // Send confirmation email
    try {
      const { sendOrderConfirmation } = await import('@/lib/email')

      await sendOrderConfirmation({
        orderNumber: order.orderNumber,
        customerEmail: validatedData.email,
        customerName: `${validatedData.billingFirstName} ${validatedData.billingLastName}`,
        orderTotal: total,
        orderDate: order.createdAt.toISOString(),
        items: order.items.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          price: Number(item.price),
          total: Number(item.total)
        })),
        shippingAddress: {
          name: `${validatedData.shippingFirstName} ${validatedData.shippingLastName}`,
          address1: validatedData.shippingAddress1,
          address2: validatedData.shippingAddress2,
          city: validatedData.shippingCity,
          state: validatedData.shippingState,
          postalCode: validatedData.shippingPostalCode,
          country: validatedData.shippingCountry
        }
      })
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError)
      // Don't fail the order if email fails
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      message: 'Order placed successfully'
    })

  } catch (error) {
    console.error('Checkout error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid checkout data',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}