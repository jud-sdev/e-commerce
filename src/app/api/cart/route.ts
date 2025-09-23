import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const addToCartSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: session.user.id },
      include: {
        product: {
          include: {
            images: {
              orderBy: { order: 'asc' },
              take: 1
            },
            category: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate totals
    let subtotal = 0
    let totalItems = 0

    const itemsWithTotals = cartItems.map(item => {
      const itemTotal = Number(item.product.price) * item.quantity
      subtotal += itemTotal
      totalItems += item.quantity

      return {
        ...item,
        itemTotal,
        isAvailable: item.product.status === 'ACTIVE' && item.product.inventory >= item.quantity
      }
    })

    const tax = subtotal * 0.1 // 10% tax
    const total = subtotal + tax

    return NextResponse.json({
      items: itemsWithTotals,
      summary: {
        subtotal,
        tax,
        total,
        totalItems,
        itemCount: cartItems.length
      }
    })
  } catch (error) {
    console.error('Cart fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = addToCartSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { productId, quantity } = validation.data

    // Check if product exists and is available
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        price: true,
        inventory: true,
        status: true
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    if (product.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Product is not available' },
        { status: 400 }
      )
    }

    if (product.inventory < quantity) {
      return NextResponse.json(
        { error: `Only ${product.inventory} items available in stock` },
        { status: 400 }
      )
    }

    // Check if item already exists in cart
    const existingCartItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId
        }
      }
    })

    let cartItem

    if (existingCartItem) {
      const newQuantity = existingCartItem.quantity + quantity

      if (newQuantity > product.inventory) {
        return NextResponse.json(
          { error: `Cannot add ${quantity} more. Only ${product.inventory - existingCartItem.quantity} additional items available` },
          { status: 400 }
        )
      }

      cartItem = await prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: newQuantity },
        include: {
          product: {
            include: {
              images: {
                orderBy: { order: 'asc' },
                take: 1
              }
            }
          }
        }
      })
    } else {
      cartItem = await prisma.cartItem.create({
        data: {
          userId: session.user.id,
          productId,
          quantity
        },
        include: {
          product: {
            include: {
              images: {
                orderBy: { order: 'asc' },
                take: 1
              }
            }
          }
        }
      })
    }

    return NextResponse.json({
      message: existingCartItem ? 'Cart updated successfully' : 'Item added to cart successfully',
      item: cartItem
    })
  } catch (error) {
    console.error('Add to cart error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Clear entire cart
    await prisma.cartItem.deleteMany({
      where: { userId: session.user.id }
    })

    return NextResponse.json({
      message: 'Cart cleared successfully'
    })
  } catch (error) {
    console.error('Clear cart error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}