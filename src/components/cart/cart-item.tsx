'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Minus, AlertTriangle } from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/lib/utils'

interface CartItemProps {
  item: {
    id: string
    quantity: number
    itemTotal: number
    isAvailable: boolean
    product: {
      id: string
      name: string
      slug: string
      price: number
      inventory: number
      status: string
      images: Array<{
        id: string
        url: string
        altText?: string
      }>
      category?: {
        name: string
      }
    }
  }
  className?: string
  showRemoveButton?: boolean
  compact?: boolean
}

export function CartItem({
  item,
  className,
  showRemoveButton = true,
  compact = false
}: CartItemProps) {
  const { updateQuantity, removeItem, loading } = useCart()
  const [localLoading, setLocalLoading] = useState(false)
  const [quantityInput, setQuantityInput] = useState(item.quantity.toString())

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1 || newQuantity > item.product.inventory) return

    setLocalLoading(true)
    await updateQuantity(item.id, newQuantity)
    setLocalLoading(false)
  }

  const handleQuantityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuantityInput(e.target.value)
  }

  const handleQuantityInputBlur = () => {
    const newQuantity = parseInt(quantityInput) || item.quantity
    const validQuantity = Math.min(Math.max(newQuantity, 1), item.product.inventory)
    setQuantityInput(validQuantity.toString())

    if (validQuantity !== item.quantity) {
      handleQuantityChange(validQuantity)
    }
  }

  const handleRemove = async () => {
    setLocalLoading(true)
    await removeItem(item.id)
    setLocalLoading(false)
  }

  const incrementQuantity = () => {
    const newQuantity = item.quantity + 1
    if (newQuantity <= item.product.inventory) {
      handleQuantityChange(newQuantity)
      setQuantityInput(newQuantity.toString())
    }
  }

  const decrementQuantity = () => {
    const newQuantity = item.quantity - 1
    if (newQuantity >= 1) {
      handleQuantityChange(newQuantity)
      setQuantityInput(newQuantity.toString())
    }
  }

  const primaryImage = item.product.images[0]
  const isDisabled = loading || localLoading || !item.isAvailable

  return (
    <div className={cn(
      'flex gap-4 p-4 border rounded-lg',
      !item.isAvailable && 'bg-gray-50 opacity-75',
      className
    )}>
      {/* Product Image */}
      <div className={cn(
        'relative flex-shrink-0 overflow-hidden rounded-md bg-gray-200',
        compact ? 'w-16 h-16' : 'w-20 h-20 sm:w-24 sm:h-24'
      )}>
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage.altText || item.product.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-xs">No image</span>
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link
              href={`/products/${item.product.slug}`}
              className="font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
            >
              {item.product.name}
            </Link>

            {item.product.category && (
              <Badge variant="outline" className="mt-1 text-xs">
                {item.product.category.name}
              </Badge>
            )}

            <div className="mt-1 flex items-center gap-2">
              <span className="text-lg font-semibold text-gray-900">
                {formatCurrency(item.product.price)}
              </span>
              {!compact && (
                <span className="text-sm text-gray-500">
                  each
                </span>
              )}
            </div>

            {!item.isAvailable && (
              <div className="mt-2 flex items-center gap-1 text-orange-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">
                  {item.product.status !== 'ACTIVE'
                    ? 'Product unavailable'
                    : `Only ${item.product.inventory} left in stock`
                  }
                </span>
              </div>
            )}
          </div>

          {/* Quantity Controls */}
          <div className="flex items-center gap-2">
            {compact ? (
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">Qty:</span>
                <Input
                  type="number"
                  min="1"
                  max={item.product.inventory}
                  value={quantityInput}
                  onChange={handleQuantityInputChange}
                  onBlur={handleQuantityInputBlur}
                  disabled={isDisabled}
                  className="w-16 h-8 text-center text-sm"
                />
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={decrementQuantity}
                  disabled={isDisabled || item.quantity <= 1}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  min="1"
                  max={item.product.inventory}
                  value={quantityInput}
                  onChange={handleQuantityInputChange}
                  onBlur={handleQuantityInputBlur}
                  disabled={isDisabled}
                  className="w-16 h-8 text-center"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={incrementQuantity}
                  disabled={isDisabled || item.quantity >= item.product.inventory}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}

            {showRemoveButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={isDisabled}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Item Total */}
        <div className="mt-2 flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {item.quantity} × {formatCurrency(item.product.price)}
          </span>
          <span className="font-semibold text-lg">
            {formatCurrency(item.itemTotal)}
          </span>
        </div>
      </div>
    </div>
  )
}