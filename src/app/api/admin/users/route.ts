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
    const role = searchParams.get('role')
    const status = searchParams.get('status')
    const exportData = searchParams.get('export') === 'true'

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (role && role !== 'all') {
      where.role = role
    }

    if (status && status !== 'all') {
      if (status === 'verified') {
        where.emailVerified = { not: null }
      } else if (status === 'unverified') {
        where.emailVerified = null
      }
    }

    if (exportData) {
      // Export all matching users as CSV
      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          orders: {
            select: {
              total: true,
              createdAt: true,
              paymentStatus: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      // Generate CSV
      const csvHeaders = [
        'ID',
        'Name',
        'Email',
        'Role',
        'Email Verified',
        'Orders Count',
        'Total Spent',
        'Last Order Date',
        'Joined Date'
      ]

      const csvRows = users.map(user => {
        const successfulOrders = user.orders.filter(o => o.paymentStatus === 'SUCCEEDED')
        const totalSpent = successfulOrders.reduce((sum, order) => sum + Number(order.total), 0)
        const lastOrderDate = successfulOrders.length > 0
          ? new Date(Math.max(...successfulOrders.map(o => new Date(o.createdAt).getTime()))).toISOString()
          : ''

        return [
          user.id,
          user.name || '',
          user.email,
          user.role,
          user.emailVerified ? 'Yes' : 'No',
          successfulOrders.length.toString(),
          totalSpent.toFixed(2),
          lastOrderDate,
          user.createdAt.toISOString()
        ]
      })

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="users-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // Regular API response
    const [users, totalUsers] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          orders: {
            select: {
              total: true,
              createdAt: true,
              paymentStatus: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),

      prisma.user.count({ where })
    ])

    const totalPages = Math.ceil(totalUsers / limit)
    const hasMore = page < totalPages

    const formattedUsers = users.map(user => {
      const successfulOrders = user.orders.filter(o => o.paymentStatus === 'SUCCEEDED')
      const totalSpent = successfulOrders.reduce((sum, order) => sum + Number(order.total), 0)
      const lastOrderDate = successfulOrders.length > 0
        ? new Date(Math.max(...successfulOrders.map(o => new Date(o.createdAt).getTime()))).toISOString()
        : null

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified?.toISOString() || null,
        createdAt: user.createdAt.toISOString(),
        ordersCount: successfulOrders.length,
        totalSpent,
        lastOrderDate
      }
    })

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        totalUsers,
        totalPages,
        hasMore
      }
    })

  } catch (error) {
    console.error('Admin users error:', error)
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

    const { userId, role, emailVerified } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Prevent admin from changing their own role
    if (userId === session.user.id && role) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
    }

    const updateData: any = {}

    if (role) {
      // Validate role
      const validRoles = ['USER', 'ADMIN']
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      updateData.role = role
    }

    if (typeof emailVerified === 'boolean') {
      updateData.emailVerified = emailVerified ? new Date() : null
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      success: true,
      user: updatedUser
    })

  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({
      error: 'Failed to update user'
    }, { status: 500 })
  }
}