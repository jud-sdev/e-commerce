/**
 * @jest-environment node
 */

import { createMocks } from 'node-mocks-http'
import { GET, PATCH } from '@/app/api/admin/users/route'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'

// Mock dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  },
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/admin/users', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/admin/users',
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
        url: '/api/admin/users',
      })

      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })

    it('should return users data for admin user', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      const mockUsers = [
        {
          id: 'user1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'USER',
          emailVerified: new Date('2023-01-01'),
          createdAt: new Date('2023-01-01'),
          orders: [
            {
              total: 150.00,
              createdAt: new Date('2023-06-01'),
              paymentStatus: 'SUCCEEDED',
            },
          ],
        },
      ]

      mockPrisma.user.findMany.mockResolvedValue(mockUsers as any)
      mockPrisma.user.count.mockResolvedValue(1)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/admin/users',
      })

      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('users')
      expect(data).toHaveProperty('pagination')
      expect(data.users).toHaveLength(1)
      expect(data.users[0]).toMatchObject({
        id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'USER',
        ordersCount: 1,
        totalSpent: 150.00,
      })
    })

    it('should handle search filtering', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      mockPrisma.user.findMany.mockResolvedValue([])
      mockPrisma.user.count.mockResolvedValue(0)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/admin/users?search=john',
      })

      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.users).toHaveLength(0)
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'john', mode: 'insensitive' } },
              { email: { contains: 'john', mode: 'insensitive' } },
            ],
          }),
        })
      )
    })

    it('should handle role filtering', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      mockPrisma.user.findMany.mockResolvedValue([])
      mockPrisma.user.count.mockResolvedValue(0)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/admin/users?role=ADMIN',
      })

      const response = await GET(req as any)

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: 'ADMIN',
          }),
        })
      )
    })

    it('should handle status filtering', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      mockPrisma.user.findMany.mockResolvedValue([])
      mockPrisma.user.count.mockResolvedValue(0)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/admin/users?status=verified',
      })

      const response = await GET(req as any)

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            emailVerified: { not: null },
          }),
        })
      )
    })

    it('should return CSV export when export=true', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      const mockUsers = [
        {
          id: 'user1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'USER',
          emailVerified: new Date('2023-01-01'),
          createdAt: new Date('2023-01-01'),
          orders: [
            {
              total: 150.00,
              createdAt: new Date('2023-06-01'),
              paymentStatus: 'SUCCEEDED',
            },
          ],
        },
      ]

      mockPrisma.user.findMany.mockResolvedValue(mockUsers as any)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/admin/users?export=true',
      })

      const response = await GET(req as any)

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/csv')
      expect(response.headers.get('content-disposition')).toMatch(/attachment; filename="users-.*\.csv"/)
    })
  })

  describe('PATCH', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'PATCH',
        body: { userId: 'user1', role: 'ADMIN' },
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
        body: { userId: 'user1', role: 'ADMIN' },
      })

      const response = await PATCH(req as any)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })

    it('should return 400 if userId is missing', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      const { req } = createMocks({
        method: 'PATCH',
        body: { role: 'ADMIN' },
      })

      const response = await PATCH(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('User ID is required')
    })

    it('should return 400 if admin tries to change own role', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      const { req } = createMocks({
        method: 'PATCH',
        body: { userId: 'admin1', role: 'USER' },
      })

      const response = await PATCH(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot change your own role')
    })

    it('should return 400 for invalid role', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      const { req } = createMocks({
        method: 'PATCH',
        body: { userId: 'user1', role: 'INVALID_ROLE' },
      })

      const response = await PATCH(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid role')
    })

    it('should update user role successfully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      const mockUpdatedUser = {
        id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'ADMIN',
        emailVerified: new Date(),
        createdAt: new Date(),
      }

      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser as any)

      const { req } = createMocks({
        method: 'PATCH',
        body: { userId: 'user1', role: 'ADMIN' },
      })

      const response = await PATCH(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.user).toMatchObject({
        id: 'user1',
        role: 'ADMIN',
      })
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: { role: 'ADMIN' },
        select: expect.any(Object),
      })
    })

    it('should update email verification status', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      const mockUpdatedUser = {
        id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'USER',
        emailVerified: new Date(),
        createdAt: new Date(),
      }

      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser as any)

      const { req } = createMocks({
        method: 'PATCH',
        body: { userId: 'user1', emailVerified: true },
      })

      const response = await PATCH(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: { emailVerified: expect.any(Date) },
        select: expect.any(Object),
      })
    })

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
        expires: '',
      })

      mockPrisma.user.update.mockRejectedValue(new Error('Database error'))

      const { req } = createMocks({
        method: 'PATCH',
        body: { userId: 'user1', role: 'ADMIN' },
      })

      const response = await PATCH(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update user')
    })
  })
})