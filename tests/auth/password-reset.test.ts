import { POST as forgotPasswordPOST } from '@/app/api/auth/forgot-password/route'
import { POST as resetPasswordPOST } from '@/app/api/auth/reset-password/route'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}))

describe('Password Reset Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('/api/auth/forgot-password', () => {
    it('should create reset token for existing user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'john@example.com',
        name: 'John Doe',
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValue({})
      ;(prisma.passwordResetToken.create as jest.Mock).mockResolvedValue({
        id: 'token-123',
        email: 'john@example.com',
        token: 'reset-token',
        expires: new Date(),
      })

      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'john@example.com',
        }),
      })

      const response = await forgotPasswordPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('password reset link has been sent')
      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      })
      expect(prisma.passwordResetToken.create).toHaveBeenCalled()
    })

    it('should return generic message for non-existent user', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
        }),
      })

      const response = await forgotPasswordPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('password reset link has been sent')
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled()
    })

    it('should validate email format', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
        }),
      })

      const response = await forgotPasswordPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid email address')
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    })
  })

  describe('/api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const mockToken = {
        id: 'token-123',
        email: 'john@example.com',
        token: 'valid-token',
        expires: new Date(Date.now() + 3600000),
      }

      const mockUser = {
        id: 'user-123',
        email: 'john@example.com',
      }

      ;(prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(mockToken)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password')
      ;(prisma.user.update as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.passwordResetToken.delete as jest.Mock).mockResolvedValue({})

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'valid-token',
          password: 'newpassword123',
        }),
      })

      const response = await resetPasswordPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Password has been reset successfully')
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { password: 'new-hashed-password' },
      })
      expect(prisma.passwordResetToken.delete).toHaveBeenCalledWith({
        where: { id: 'token-123' },
      })
    })

    it('should reject invalid token', async () => {
      ;(prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'invalid-token',
          password: 'newpassword123',
        }),
      })

      const response = await resetPasswordPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid or expired reset token')
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('should reject expired token', async () => {
      const mockToken = {
        id: 'token-123',
        email: 'john@example.com',
        token: 'expired-token',
        expires: new Date(Date.now() - 3600000),
      }

      ;(prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(mockToken)
      ;(prisma.passwordResetToken.delete as jest.Mock).mockResolvedValue({})

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'expired-token',
          password: 'newpassword123',
        }),
      })

      const response = await resetPasswordPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Reset token has expired')
      expect(prisma.passwordResetToken.delete).toHaveBeenCalledWith({
        where: { id: 'token-123' },
      })
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('should validate password length', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'valid-token',
          password: '1234567',
        }),
      })

      const response = await resetPasswordPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Password must be at least 8 characters')
      expect(prisma.passwordResetToken.findUnique).not.toHaveBeenCalled()
    })
  })
})