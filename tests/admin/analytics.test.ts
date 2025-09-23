/**
 * @jest-environment node
 */

import { createMocks } from 'node-mocks-http'
import { GET } from '@/app/api/admin/analytics/route'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'

// Mock dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      aggregate: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    orderItem: {
      groupBy: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  },
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/admin/analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/admin/analytics',
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
        url: '/api/admin/analytics',
      })

      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })

    it('should return analytics data for admin user with default range', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      // Mock all the database responses
      mockPrisma.order.aggregate
        .mockResolvedValueOnce({
          _sum: { total: 5000 },
          _count: 50,
          _avg: null,
          _max: null,
          _min: null,
        })
        .mockResolvedValueOnce({
          _sum: { total: 4000 },
          _count: 40,
          _avg: null,
          _max: null,
          _min: null,
        })

      mockPrisma.order.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(40)

      mockPrisma.order.groupBy
        .mockResolvedValueOnce([{ userId: 'user1' }, { userId: 'user2' }])
        .mockResolvedValueOnce([{ userId: 'user1' }])
        .mockResolvedValueOnce([
          {
            userId: 'user1',
            _sum: { total: 1000 },
            _count: 5,
          },
        ])

      mockPrisma.orderItem.groupBy.mockResolvedValue([
        {
          productId: 'product1',
          _sum: { quantity: 10, total: 500 },
        },
      ])

      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'order1',
          orderNumber: 'ORD-001',
          total: 150,
          createdAt: new Date(),
          user: { name: 'John Doe', email: 'john@example.com' },
        },
      ])

      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'product1',
          name: 'Test Product',
          slug: 'test-product',
          price: 50,
        },
      ])

      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'user1',
          name: 'John Doe',
          email: 'john@example.com',
        },
      ])

      const { req } = createMocks({
        method: 'GET',
        url: '/api/admin/analytics',
      })

      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('overview')
      expect(data).toHaveProperty('salesByPeriod')
      expect(data).toHaveProperty('topProducts')
      expect(data).toHaveProperty('topCustomers')
      expect(data).toHaveProperty('recentActivity')

      expect(data.overview).toMatchObject({
        totalRevenue: 5000,
        totalOrders: 50,
        totalCustomers: 2,
        averageOrderValue: 100,
        revenueGrowth: 25,
        ordersGrowth: 25,
        customersGrowth: 100,
      })
    })

    it('should handle different time ranges', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      // Mock minimal responses for 7d range
      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { total: 1000 },
        _count: 10,
        _avg: null,
        _max: null,
        _min: null,
      })
      mockPrisma.order.count.mockResolvedValue(10)
      mockPrisma.order.groupBy.mockResolvedValue([])
      mockPrisma.orderItem.groupBy.mockResolvedValue([])
      mockPrisma.order.findMany.mockResolvedValue([])
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.user.findMany.mockResolvedValue([])

      const { req } = createMocks({
        method: 'GET',
        url: '/api/admin/analytics?range=7d',
      })

      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.overview.totalRevenue).toBe(1000)
      expect(data.overview.totalOrders).toBe(10)
    })

    it('should handle yearly range with monthly aggregation', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      // Mock responses for yearly view
      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { total: 50000 },
        _count: 500,
        _avg: null,
        _max: null,
        _min: null,
      })
      mockPrisma.order.count.mockResolvedValue(500)
      mockPrisma.order.groupBy.mockResolvedValue([])
      mockPrisma.orderItem.groupBy.mockResolvedValue([])
      mockPrisma.order.findMany.mockResolvedValue([])
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.user.findMany.mockResolvedValue([])

      const { req } = createMocks({
        method: 'GET',
        url: '/api/admin/analytics?range=365d',
      })

      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Should call aggregate for monthly data
      expect(mockPrisma.order.aggregate).toHaveBeenCalledTimes(14) // 2 for overview + 12 for months
    })

    it('should calculate growth percentages correctly', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      // Current period: 1000 revenue, 10 orders, 2 customers
      // Previous period: 500 revenue, 5 orders, 1 customer
      // Expected growth: 100%, 100%, 100%
      mockPrisma.order.aggregate
        .mockResolvedValueOnce({
          _sum: { total: 1000 },
          _count: 10,
          _avg: null,
          _max: null,
          _min: null,
        })
        .mockResolvedValueOnce({
          _sum: { total: 500 },
          _count: 5,
          _avg: null,
          _max: null,
          _min: null,
        })

      mockPrisma.order.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)

      mockPrisma.order.groupBy
        .mockResolvedValueOnce([{ userId: 'user1' }, { userId: 'user2' }])
        .mockResolvedValueOnce([{ userId: 'user1' }])
        .mockResolvedValueOnce([])

      mockPrisma.orderItem.groupBy.mockResolvedValue([])
      mockPrisma.order.findMany.mockResolvedValue([])
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.user.findMany.mockResolvedValue([])

      const { req } = createMocks({
        method: 'GET',
        url: '/api/admin/analytics',
      })

      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.overview.revenueGrowth).toBe(100)
      expect(data.overview.ordersGrowth).toBe(100)
      expect(data.overview.customersGrowth).toBe(100)
    })

    it('should handle zero previous values for growth calculation', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      // Current period has data, previous period has none
      mockPrisma.order.aggregate
        .mockResolvedValueOnce({
          _sum: { total: 1000 },
          _count: 10,
          _avg: null,
          _max: null,
          _min: null,
        })
        .mockResolvedValueOnce({
          _sum: { total: 0 },
          _count: 0,
          _avg: null,
          _max: null,
          _min: null,
        })

      mockPrisma.order.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(0)

      mockPrisma.order.groupBy
        .mockResolvedValueOnce([{ userId: 'user1' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      mockPrisma.orderItem.groupBy.mockResolvedValue([])
      mockPrisma.order.findMany.mockResolvedValue([])
      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.user.findMany.mockResolvedValue([])

      const { req } = createMocks({
        method: 'GET',
        url: '/api/admin/analytics',
      })

      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.overview.revenueGrowth).toBe(0)
      expect(data.overview.ordersGrowth).toBe(0)
      expect(data.overview.customersGrowth).toBe(0)
    })

    it('should format top products correctly', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { total: 1000 },
        _count: 10,
        _avg: null,
        _max: null,
        _min: null,
      })
      mockPrisma.order.count.mockResolvedValue(10)
      mockPrisma.order.groupBy.mockResolvedValue([])

      mockPrisma.orderItem.groupBy.mockResolvedValue([
        {
          productId: 'product1',
          _sum: { quantity: 15, total: 750 },
        },
      ])

      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'product1',
          name: 'Best Seller',
          slug: 'best-seller',
          price: 50,
        },
      ])

      mockPrisma.order.findMany.mockResolvedValue([])
      mockPrisma.user.findMany.mockResolvedValue([])

      const { req } = createMocks({
        method: 'GET',
        url: '/api/admin/analytics',
      })

      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.topProducts).toHaveLength(1)
      expect(data.topProducts[0]).toMatchObject({
        id: 'product1',
        name: 'Best Seller',
        totalSold: 15,
        revenue: 750,
        averagePrice: 50,
      })
    })

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      mockPrisma.order.aggregate.mockRejectedValue(new Error('Database error'))

      const { req } = createMocks({
        method: 'GET',
        url: '/api/admin/analytics',
      })

      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})