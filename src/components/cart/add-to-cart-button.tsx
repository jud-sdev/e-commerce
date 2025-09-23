'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Minus, ShoppingCart } from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { cn } from '@/lib/utils'

interface AddToCartButtonProps {
  productId: string
  maxQuantity: number
  isOutOfStock?: boolean
  className?: string
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'secondary'
  showQuantitySelector?: boolean
}

export function AddToCartButton({
  productId,
  maxQuantity,
  isOutOfStock = false,
  className,
  size = 'default',
  variant = 'default',
  showQuantitySelector = true
}: AddToCartButtonProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const { addItem, loading, error } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [localLoading, setLocalLoading] = useState(false)

  const handleAddToCart = async () => {
    if (!session) {
      router.push('/auth/signin')
      return
    }

    setLocalLoading(true)
    const success = await addItem(productId, quantity)
    if (success) {
      setQuantity(1) // Reset quantity after successful add
    }
    setLocalLoading(false)
  }

  const incrementQuantity = () => {
    setQuantity(prev => Math.min(prev + 1, maxQuantity))
  }

  const decrementQuantity = () => {
    setQuantity(prev => Math.max(prev - 1, 1))
  }

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1
    setQuantity(Math.min(Math.max(value, 1), maxQuantity))
  }

  if (isOutOfStock) {
    return (
      <Button
        disabled
        size={size}
        variant="secondary"
        className={cn('cursor-not-allowed', className)}
      >
        Out of Stock
      </Button>
    )
  }

  return (
    <div className="space-y-3">
      {showQuantitySelector && (
        <div className="flex items-center space-x-2">
          <Label htmlFor="quantity" className="text-sm font-medium">
            Quantity:
          </Label>
          <div className="flex items-center space-x-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={decrementQuantity}
              disabled={quantity <= 1 || loading || localLoading}
              className="h-8 w-8 p-0"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={maxQuantity}
              value={quantity}
              onChange={handleQuantityChange}
              disabled={loading || localLoading}
              className="h-8 w-16 text-center"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={incrementQuantity}
              disabled={quantity >= maxQuantity || loading || localLoading}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <span className="text-sm text-gray-500">
            {maxQuantity} available
          </span>
        </div>
      )}

      <Button
        onClick={handleAddToCart}
        disabled={loading || localLoading || maxQuantity < 1}
        size={size}
        variant={variant}
        className={cn('w-full', className)}
      >
        {loading || localLoading ? (
          'Adding...'
        ) : (
          <>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add to Cart
          </>
        )}
      </Button>

      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}

      {!session && (
        <p className="text-xs text-gray-500 mt-1">
          Sign in to add items to your cart
        </p>
      )}
    </div>
  )
}