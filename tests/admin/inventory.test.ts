/**
 * @jest-environment node
 */

import { createMocks } from 'node-mocks-http'
import { GET, PATCH } from '@/app/api/admin/inventory/route'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'

// Mock dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    productVariant: {
      update: jest.fn(),
    },
  },
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/admin/inventory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/admin/inventory',
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
        url: '/api/admin/inventory',
      })

      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })

    it('should return inventory data for admin user', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      const mockProducts = [
        {
          id: 'product1',
          name: 'Test Product',
          slug: 'test-product',
          sku: 'TEST-001',
          price: 99.99,
          comparePrice: null,
          inventory: 10,
          status: 'ACTIVE',
          featured: false,
          category: { id: 'cat1', name: 'Test Category' },
          images: [{ url: 'https://example.com/image.jpg', altText: 'Test' }],
          variants: [{ id: 'var1', name: 'Size', value: 'Large', inventory: 5 }],
          _count: { orderItems: 3 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      const mockCategories = [
        { id: 'cat1', name: 'Test Category' },
      ]

      mockPrisma.product.findMany.mockResolvedValue(mockProducts as any)
      mockPrisma.product.count.mockResolvedValue(1)
      mockPrisma.category.findMany.mockResolvedValue(mockCategories)
      mockPrisma.product.aggregate.mockResolvedValue({
        _sum: { inventory: 10 },
        _count: { _all: 1 },
        _avg: null,
        _max: null,
        _min: null,
      })

      const { req } = createMocks({
        method: 'GET',
        url: '/api/admin/inventory',
      })

      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('products')
      expect(data).toHaveProperty('categories')
      expect(data).toHaveProperty('summary')
      expect(data).toHaveProperty('pagination')
      expect(data.products).toHaveLength(1)
      expect(data.products[0]).toMatchObject({
        id: 'product1',
        name: 'Test Product',
        inventory: 10,
        variantsInventory: 5,
        totalInventory: 15,
      })
    })

    it('should handle search filtering', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      mockPrisma.product.findMany.mockResolvedValue([])
      mockPrisma.product.count.mockResolvedValue(0)
      mockPrisma.category.findMany.mockResolvedValue([])
      mockPrisma.product.aggregate.mockResolvedValue({
        _sum: { inventory: 0 },
        _count: { _all: 0 },
        _avg: null,
        _max: null,
        _min: null,
      })

      const { req } = createMocks({
        method: 'GET',
        url: '/api/admin/inventory?search=nonexistent',
      })

      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.products).toHaveLength(0)
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'nonexistent', mode: 'insensitive' } },
              { sku: { contains: 'nonexistent', mode: 'insensitive' } },
              { description: { contains: 'nonexistent', mode: 'insensitive' } },
            ],
          }),
        })
      )
    })
  })

  describe('PATCH', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'PATCH',
        body: { productId: 'product1', inventory: 20 },
      })

      const response = await PATCH(req as any)
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
        method: 'PATCH',
        body: { productId: 'product1', inventory: 20 },
      })

      const response = await PATCH(req as any)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })

    it('should return 400 if productId is missing', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      const { req } = createMocks({
        method: 'PATCH',
        body: { inventory: 20 },
      })

      const response = await PATCH(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Product ID is required')
    })

    it('should update product inventory successfully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      const mockUpdatedProduct = {
        id: 'product1',
        name: 'Test Product',
        inventory: 25,
        category: { id: 'cat1', name: 'Test Category' },
        images: [{ url: 'https://example.com/image.jpg', altText: 'Test' }],
        variants: [],
      }

      mockPrisma.product.update.mockResolvedValue(mockUpdatedProduct as any)

      const { req } = createMocks({
        method: 'PATCH',
        body: {
          productId: 'product1',
          inventory: 25,
          price: 109.99,
          status: 'ACTIVE',
        },
      })

      const response = await PATCH(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.product).toMatchObject({
        id: 'product1',
        name: 'Test Product',
        inventory: 25,
      })
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product1' },
        data: expect.objectContaining({
          inventory: 25,
          price: 109.99,
          status: 'ACTIVE',
        }),
        include: expect.any(Object),
      })
    })

    it('should return 400 for invalid status', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      const { req } = createMocks({
        method: 'PATCH',
        body: {
          productId: 'product1',
          status: 'INVALID_STATUS',
        },
      })

      const response = await PATCH(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid status')
    })

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      mockPrisma.product.update.mockRejectedValue(new Error('Database error'))

      const { req } = createMocks({
        method: 'PATCH',
        body: {
          productId: 'product1',
          inventory: 25,
        },
      })

      const response = await PATCH(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update inventory')
    })
  })
})