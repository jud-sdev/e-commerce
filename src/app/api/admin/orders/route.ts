import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const paymentStatus = searchParams.get('paymentStatus')
    const exportData = searchParams.get('export') === 'true'

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ]
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (paymentStatus && paymentStatus !== 'all') {
      where.paymentStatus = paymentStatus
    }

    if (exportData) {
      // Export all matching orders as CSV
      const orders = await prisma.order.findMany({
        where,
        include: {
          user: {
            select: { name: true, email: true }
          },
          items: {
            include: {
              product: {
                select: { name: true, price: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      // Generate CSV
      const csvHeaders = [
        'Order Number',
        'Customer Name',
        'Customer Email',
        'Status',
        'Payment Status',
        'Total',
        'Items Count',
        'Created At',
        'Items'
      ]

      const csvRows = orders.map(order => [
        order.orderNumber,
        order.user.name || '',
        order.user.email,
        order.status,
        order.paymentStatus,
        order.total.toString(),
        order.items.length.toString(),
        order.createdAt.toISOString(),
        order.items.map(item => `${item.product.name} (${item.quantity}x)`).join('; ')
      ])

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // Regular API response
    const [orders, totalOrders] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: { name: true, email: true }
          },
          items: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),

      prisma.order.count({ where })
    ])

    const totalPages = Math.ceil(totalOrders / limit)
    const hasMore = page < totalPages

    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.user.name || 'Unknown',
      customerEmail: order.user.email,
      total: Number(order.total),
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt.toISOString(),
      itemsCount: order.items.length
    }))

    return NextResponse.json({
      orders: formattedOrders,
      pagination: {
        page,
        limit,
        totalOrders,
        totalPages,
        hasMore
      }
    })

  } catch (error) {
    console.error('Admin orders error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { orderId, status, paymentStatus } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    const updateData: any = {}

    if (status) {
      // Validate status transition
      const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid order status' }, { status: 400 })
      }
      updateData.status = status
    }

    if (paymentStatus) {
      // Validate payment status
      const validPaymentStatuses = ['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED']
      if (!validPaymentStatuses.includes(paymentStatus)) {
        return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 })
      }
      updateData.paymentStatus = paymentStatus
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        user: {
          select: { name: true, email: true }
        },
        items: {
          include: {
            product: {
              select: { name: true }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      order: updatedOrder
    })

  } catch (error) {
    console.error('Update order error:', error)
    return NextResponse.json({
      error: 'Failed to update order'
    }, { status: 500 })
  }
}