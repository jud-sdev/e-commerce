import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = resetPasswordSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { token, password } = validation.data

    const passwordResetToken = await prisma.passwordResetToken.findUnique({
      where: { token }
    })

    if (!passwordResetToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    if (passwordResetToken.expires < new Date()) {
      await prisma.passwordResetToken.delete({
        where: { id: passwordResetToken.id }
      })

      return NextResponse.json(
        { error: 'Reset token has expired' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: passwordResetToken.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    })

    await prisma.passwordResetToken.delete({
      where: { id: passwordResetToken.id }
    })

    return NextResponse.json({
      message: 'Password has been reset successfully'
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}