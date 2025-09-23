import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import PDFDocument from 'pdfkit'

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
    const range = searchParams.get('range') || '30d'

    // Calculate date ranges (same logic as analytics route)
    const now = new Date()
    let startDate: Date
    let previousStartDate: Date

    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        previousStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        previousStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        previousStartDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
        break
      case '365d':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        previousStartDate = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000)
        break
      default: // 'all'
        startDate = new Date(2020, 0, 1)
        previousStartDate = new Date(2020, 0, 1)
    }

    // Fetch analytics data
    const [
      currentRevenue,
      currentOrders,
      currentCustomers,
      previousRevenue,
      previousOrders,
      previousCustomers,
      topProducts,
      topCustomers,
      recentOrders
    ] = await Promise.all([
      // Current period revenue
      prisma.order.aggregate({
        _sum: { total: true },
        _count: true,
        where: {
          paymentStatus: 'SUCCEEDED',
          createdAt: { gte: startDate }
        }
      }),

      // Current period orders
      prisma.order.count({
        where: {
          createdAt: { gte: startDate }
        }
      }),

      // Current period customers
      prisma.order.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: startDate }
        }
      }),

      // Previous period revenue (for growth calculation)
      prisma.order.aggregate({
        _sum: { total: true },
        _count: true,
        where: {
          paymentStatus: 'SUCCEEDED',
          createdAt: { gte: previousStartDate, lt: startDate }
        }
      }),

      // Previous period orders
      prisma.order.count({
        where: {
          createdAt: { gte: previousStartDate, lt: startDate }
        }
      }),

      // Previous period customers
      prisma.order.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: previousStartDate, lt: startDate }
        }
      }),

      // Top selling products
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: {
          quantity: true,
          total: true
        },
        where: {
          order: {
            paymentStatus: 'SUCCEEDED',
            createdAt: { gte: startDate }
          }
        },
        orderBy: {
          _sum: {
            total: 'desc'
          }
        },
        take: 10
      }),

      // Top customers
      prisma.order.groupBy({
        by: ['userId'],
        _sum: {
          total: true
        },
        _count: true,
        where: {
          paymentStatus: 'SUCCEEDED',
          createdAt: { gte: startDate }
        },
        orderBy: {
          _sum: {
            total: 'desc'
          }
        },
        take: 10
      }),

      // Recent orders
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: { createdAt: { gte: startDate } },
        include: {
          user: { select: { name: true, email: true } }
        }
      })
    ])

    // Get product details for top products
    const topProductsWithDetails = await prisma.product.findMany({
      where: {
        id: { in: topProducts.map(p => p.productId) }
      },
      select: {
        id: true,
        name: true,
        price: true
      }
    })

    // Get user details for top customers
    const topCustomersWithDetails = await prisma.user.findMany({
      where: {
        id: { in: topCustomers.map(c => c.userId) }
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    })

    // Calculate metrics
    const totalRevenue = Number(currentRevenue._sum.total || 0)
    const totalOrders = currentOrders
    const totalCustomers = currentCustomers.length
    const prevRevenue = Number(previousRevenue._sum.total || 0)
    const prevOrders = previousOrders
    const prevCustomers = previousCustomers.length

    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0
    const ordersGrowth = prevOrders > 0 ? ((totalOrders - prevOrders) / prevOrders) * 100 : 0
    const customersGrowth = prevCustomers > 0 ? ((totalCustomers - prevCustomers) / prevCustomers) * 100 : 0

    // Create PDF report
    const doc = new PDFDocument({ margin: 50 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))

    // Header
    doc.fontSize(20).text('Analytics Report', { align: 'center' })
    doc.fontSize(12).text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' })
    doc.fontSize(12).text(`Period: ${range}`, { align: 'center' })
    doc.moveDown()

    // Overview section
    doc.fontSize(16).text('Overview', { underline: true })
    doc.moveDown(0.5)

    doc.fontSize(12)
    doc.text(`Total Revenue: $${totalRevenue.toFixed(2)} (${revenueGrowth > 0 ? '+' : ''}${revenueGrowth.toFixed(1)}%)`)
    doc.text(`Total Orders: ${totalOrders} (${ordersGrowth > 0 ? '+' : ''}${ordersGrowth.toFixed(1)}%)`)
    doc.text(`Total Customers: ${totalCustomers} (${customersGrowth > 0 ? '+' : ''}${customersGrowth.toFixed(1)}%)`)
    doc.text(`Average Order Value: $${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'}`)
    doc.moveDown()

    // Top Products section
    doc.fontSize(16).text('Top Products by Revenue', { underline: true })
    doc.moveDown(0.5)

    topProducts.forEach((item, index) => {
      const product = topProductsWithDetails.find(p => p.id === item.productId)
      doc.fontSize(12).text(
        `${index + 1}. ${product?.name || 'Unknown'} - $${Number(item._sum.total || 0).toFixed(2)} (${item._sum.quantity || 0} units)`
      )
    })
    doc.moveDown()

    // Top Customers section
    doc.fontSize(16).text('Top Customers by Spending', { underline: true })
    doc.moveDown(0.5)

    topCustomers.forEach((item, index) => {
      const customer = topCustomersWithDetails.find(u => u.id === item.userId)
      doc.fontSize(12).text(
        `${index + 1}. ${customer?.name || 'Unknown'} - $${Number(item._sum.total || 0).toFixed(2)} (${item._count} orders)`
      )
    })
    doc.moveDown()

    // Recent Orders section
    doc.fontSize(16).text('Recent Orders', { underline: true })
    doc.moveDown(0.5)

    recentOrders.forEach((order) => {
      doc.fontSize(12).text(
        `#${order.orderNumber} - ${order.user.name || order.user.email} - $${Number(order.total).toFixed(2)} - ${order.createdAt.toLocaleDateString()}`
      )
    })

    doc.end()

    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks))
      })
    })

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="analytics-report-${range}-${new Date().toISOString().split('T')[0]}.pdf"`
      }
    })

  } catch (error) {
    console.error('Analytics export error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}