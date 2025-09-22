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
    const range = searchParams.get('range') || '30d'

    // Calculate date ranges
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
        startDate = new Date(2020, 0, 1) // Far enough back
        previousStartDate = new Date(2020, 0, 1)
    }

    // Current period analytics
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

      // Recent orders for activity
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
        slug: true,
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

    // Calculate growth percentages
    const totalRevenue = Number(currentRevenue._sum.total || 0)
    const totalOrders = currentOrders
    const totalCustomers = currentCustomers.length
    const prevRevenue = Number(previousRevenue._sum.total || 0)
    const prevOrders = previousOrders
    const prevCustomers = previousCustomers.length

    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0
    const ordersGrowth = prevOrders > 0 ? ((totalOrders - prevOrders) / prevOrders) * 100 : 0
    const customersGrowth = prevCustomers > 0 ? ((totalCustomers - prevCustomers) / prevCustomers) * 100 : 0

    // Format top products data
    const topProductsData = topProducts.map(item => {
      const product = topProductsWithDetails.find(p => p.id === item.productId)
      return {
        id: item.productId,
        name: product?.name || 'Unknown Product',
        slug: product?.slug || '',
        totalSold: item._sum.quantity || 0,
        revenue: Number(item._sum.total || 0),
        averagePrice: Number(product?.price || 0)
      }
    })

    // Format top customers data
    const topCustomersData = topCustomers.map(item => {
      const user = topCustomersWithDetails.find(u => u.id === item.userId)
      return {
        id: item.userId,
        name: user?.name || 'Unknown Customer',
        email: user?.email || '',
        totalOrders: item._count,
        totalSpent: Number(item._sum.total || 0),
        averageOrderValue: Number(item._sum.total || 0) / item._count
      }
    })

    // Generate sales by period data
    const salesByPeriod = []
    const daysInRange = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : range === '365d' ? 12 : 30

    if (range === '365d') {
      // Monthly data for yearly view
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

        const monthData = await prisma.order.aggregate({
          _sum: { total: true },
          _count: true,
          where: {
            paymentStatus: 'SUCCEEDED',
            createdAt: { gte: monthStart, lte: monthEnd }
          }
        })

        const monthCustomers = await prisma.order.groupBy({
          by: ['userId'],
          where: { createdAt: { gte: monthStart, lte: monthEnd } }
        })

        salesByPeriod.push({
          period: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: Number(monthData._sum.total || 0),
          orders: monthData._count,
          customers: monthCustomers.length
        })
      }
    } else {
      // Daily data for other ranges
      for (let i = daysInRange - 1; i >= 0; i--) {
        const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(dayStart)
        dayEnd.setHours(23, 59, 59, 999)

        const dayData = await prisma.order.aggregate({
          _sum: { total: true },
          _count: true,
          where: {
            paymentStatus: 'SUCCEEDED',
            createdAt: { gte: dayStart, lte: dayEnd }
          }
        })

        const dayCustomers = await prisma.order.groupBy({
          by: ['userId'],
          where: { createdAt: { gte: dayStart, lte: dayEnd } }
        })

        salesByPeriod.push({
          period: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: Number(dayData._sum.total || 0),
          orders: dayData._count,
          customers: dayCustomers.length
        })
      }
    }

    // Format recent activity
    const recentActivity = recentOrders.map(order => ({
      type: 'order',
      description: `New order #${order.orderNumber} from ${order.user.name || order.user.email}`,
      timestamp: order.createdAt.toISOString(),
      amount: Number(order.total)
    }))

    return NextResponse.json({
      overview: {
        totalRevenue,
        totalOrders,
        totalCustomers,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        revenueGrowth,
        ordersGrowth,
        customersGrowth
      },
      salesByPeriod,
      topProducts: topProductsData,
      topCustomers: topCustomersData,
      recentActivity
    })

  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}