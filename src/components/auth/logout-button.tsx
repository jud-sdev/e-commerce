'use client'

import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'

interface LogoutButtonProps {
  className?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
}

export function LogoutButton({ className, variant = 'outline' }: LogoutButtonProps) {
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' })
  }

  return (
    <Button onClick={handleLogout} variant={variant} className={className}>
      Sign out
    </Button>
  )
}