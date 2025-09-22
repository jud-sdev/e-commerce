import { GET, PATCH } from '@/app/api/user/profile/route'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}))

describe('/api/user/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return user profile when authenticated', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'john@example.com' },
      }

      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        image: null,
        role: 'USER',
        createdAt: new Date(),
        emailVerified: null,
      }

      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockUser)
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: expect.any(Object),
      })
    })

    it('should return 401 when not authenticated', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    })

    it('should return 404 when user not found', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'john@example.com' },
      }

      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })
  })

  describe('PATCH', () => {
    it('should update user profile successfully', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'john@example.com' },
      }

      const updatedUser = {
        id: 'user-123',
        name: 'John Updated',
        email: 'john@example.com',
        image: null,
        role: 'USER',
      }

      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.update as jest.Mock).mockResolvedValue(updatedUser)

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'John Updated',
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Profile updated successfully')
      expect(data.user).toEqual(updatedUser)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { name: 'John Updated' },
        select: expect.any(Object),
      })
    })

    it('should update password when valid current password provided', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'john@example.com' },
      }

      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ password: 'old-hashed-password' })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password')
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        image: null,
        role: 'USER',
      })

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123',
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(bcrypt.compare).toHaveBeenCalledWith('oldpassword', 'old-hashed-password')
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10)
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            password: 'new-hashed-password',
          }),
        })
      )
    })

    it('should return error when email already in use', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'john@example.com' },
      }

      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'other-user',
        email: 'taken@example.com',
      })

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          email: 'taken@example.com',
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email already in use')
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('should return 401 when not authenticated', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'John Updated',
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(prisma.user.update).not.toHaveBeenCalled()
    })
  })
})