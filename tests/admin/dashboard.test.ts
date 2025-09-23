/**
 * @jest-environment node
 */

import { createMocks } from 'node-mocks-http'
import { GET } from '@/app/api/admin/dashboard/route'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'

// Mock dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    order: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
    orderItem: {
      groupBy: jest.fn(),
    },
  },
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/admin/dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'GET',
      })

      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 403 if user is not admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
        expires: '',
      })

      const { req } = createMocks({
        method: 'GET',
      })

      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })

    it('should return dashboard data for admin user', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      // Mock database responses
      mockPrisma.product.count.mockResolvedValue(50)
      mockPrisma.order.count.mockResolvedValue(100)
      mockPrisma.user.count.mockResolvedValue(25)
      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { total: 12500 },
        _count: 100,
        _avg: null,
        _max: null,
        _min: null,
      })
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'product1',
          name: 'Low Stock Product',
          inventory: 5,
          price: 99.99,
        },
      ])
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'order1',
          orderNumber: 'ORD-001',
          total: 150.00,
          createdAt: new Date(),
          user: { name: 'John Doe', email: 'john@example.com' },
        },
      ])
      mockPrisma.orderItem.groupBy.mockResolvedValue([
        {
          productId: 'product1',
          _sum: { quantity: 10, total: 999.90 },
        },
      ])

      const { req } = createMocks({
        method: 'GET',
      })

      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('overview')
      expect(data).toHaveProperty('lowStockProducts')
      expect(data).toHaveProperty('recentOrders')
      expect(data).toHaveProperty('topProducts')
      expect(data.overview).toMatchObject({
        totalProducts: 50,
        totalOrders: 100,
        totalUsers: 25,
        totalRevenue: 12500,
      })
    })

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      mockPrisma.product.count.mockRejectedValue(new Error('Database error'))

      const { req } = createMocks({
        method: 'GET',
      })

      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})