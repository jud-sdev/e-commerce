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

    // Get dashboard analytics
    const [
      totalProducts,
      totalOrders,
      totalUsers,
      totalRevenue,
      recentOrders,
      topProducts,
      inventoryAlerts
    ] = await Promise.all([
      // Total products
      prisma.product.count(),

      // Total orders
      prisma.order.count(),

      // Total users
      prisma.user.count(),

      // Total revenue
      prisma.order.aggregate({
        _sum: {
          total: true
        },
        where: {
          paymentStatus: 'SUCCEEDED'
        }
      }),

      // Recent orders (last 10)
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true, email: true }
          },
          items: {
            take: 1,
            include: {
              product: {
                select: { name: true }
              }
            }
          }
        }
      }),

      // Top selling products
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: {
          quantity: true
        },
        orderBy: {
          _sum: {
            quantity: 'desc'
          }
        },
        take: 5
      }),

      // Low inventory products
      prisma.product.findMany({
        where: {
          inventory: {
            lte: 10
          },
          status: 'ACTIVE'
        },
        select: {
          id: true,
          name: true,
          inventory: true,
          slug: true
        },
        take: 10
      })
    ])

    // Get product details for top selling products
    const topProductsWithDetails = await prisma.product.findMany({
      where: {
        id: {
          in: topProducts.map(p => p.productId)
        }
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true
      }
    })

    // Combine top products with sales data
    const topProductsData = topProducts.map(item => {
      const product = topProductsWithDetails.find(p => p.id === item.productId)
      return {
        ...product,
        totalSold: item._sum.quantity || 0
      }
    })

    // Calculate growth metrics (compared to last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [lastMonthOrders, lastMonthRevenue] = await Promise.all([
      prisma.order.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      }),

      prisma.order.aggregate({
        _sum: {
          total: true
        },
        where: {
          paymentStatus: 'SUCCEEDED',
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      })
    ])

    return NextResponse.json({
      stats: {
        totalProducts,
        totalOrders,
        totalUsers,
        totalRevenue: totalRevenue._sum.total || 0,
        lastMonthOrders,
        lastMonthRevenue: lastMonthRevenue._sum.total || 0
      },
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.user.name,
        customerEmail: order.user.email,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        itemsCount: order.items.length,
        firstItem: order.items[0]?.product.name
      })),
      topProducts: topProductsData,
      inventoryAlerts: inventoryAlerts.map(product => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        inventory: product.inventory,
        status: product.inventory === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK'
      }))
    })

  } catch (error) {
    console.error('Admin dashboard error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}