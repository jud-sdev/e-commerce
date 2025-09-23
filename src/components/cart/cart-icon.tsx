'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/hooks/use-cart'
import { cn } from '@/lib/utils'

interface CartIconProps {
  className?: string
  showBadge?: boolean
  asButton?: boolean
  size?: 'sm' | 'default' | 'lg'
}

export function CartIcon({
  className,
  showBadge = true,
  asButton = false,
  size = 'default'
}: CartIconProps) {
  const { summary, loading } = useCart()

  const iconSizes = {
    sm: 'h-4 w-4',
    default: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  const content = (
    <div className="relative inline-flex">
      <ShoppingCart className={cn(iconSizes[size], className)} />
      {showBadge && summary.itemCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {summary.itemCount > 99 ? '99+' : summary.itemCount}
        </Badge>
      )}
    </div>
  )

  if (asButton) {
    return (
      <Button
        variant="ghost"
        size="sm"
        asChild
        disabled={loading}
        className={cn('relative', className)}
      >
        <Link href="/cart">
          {content}
        </Link>
      </Button>
    )
  }

  return (
    <Link href="/cart" className={cn('relative inline-flex', className)}>
      {content}
    </Link>
  )
}