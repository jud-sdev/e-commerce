'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ShoppingBag, CreditCard } from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface CartSummaryProps {
  className?: string
  showCheckoutButton?: boolean
  showClearButton?: boolean
  compact?: boolean
}

export function CartSummary({
  className,
  showCheckoutButton = true,
  showClearButton = true,
  compact = false
}: CartSummaryProps) {
  const { summary, loading, clearCart, items } = useCart()

  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      await clearCart()
    }
  }

  const hasItems = items.length > 0
  const hasUnavailableItems = items.some(item => !item.isAvailable)

  if (compact) {
    return (
      <div className={cn('bg-gray-50 p-4 rounded-lg', className)}>
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium">Subtotal:</span>
          <span className="font-semibold">{formatCurrency(summary.subtotal)}</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Tax:</span>
          <span className="text-sm">{formatCurrency(summary.tax)}</span>
        </div>
        <Separator className="my-2" />
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-bold">Total:</span>
          <span className="text-lg font-bold">{formatCurrency(summary.total)}</span>
        </div>
        {showCheckoutButton && (
          <Button
            className="w-full"
            disabled={!hasItems || hasUnavailableItems || loading}
            asChild
          >
            <Link href="/checkout">
              <CreditCard className="mr-2 h-4 w-4" />
              Checkout
            </Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Order Summary
        </CardTitle>
        <CardDescription>
          {summary.itemCount === 0
            ? 'Your cart is empty'
            : `${summary.itemCount} item${summary.itemCount !== 1 ? 's' : ''} in your cart`
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {hasItems && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal ({summary.totalItems} items)</span>
                <span>{formatCurrency(summary.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax (10%)</span>
                <span>{formatCurrency(summary.tax)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Shipping</span>
                <span className="text-green-600">Free</span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(summary.total)}</span>
            </div>

            {hasUnavailableItems && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                <p className="text-sm text-orange-800">
                  Some items in your cart are no longer available or have limited stock.
                  Please review your cart before checkout.
                </p>
              </div>
            )}
          </>
        )}

        {!hasItems && (
          <div className="text-center py-6 text-gray-500">
            <ShoppingBag className="mx-auto h-12 w-12 mb-2 opacity-50" />
            <p>Your cart is empty</p>
            <p className="text-sm">Start shopping to add items</p>
          </div>
        )}
      </CardContent>

      {hasItems && (
        <CardFooter className="flex flex-col gap-2">
          {showCheckoutButton && (
            <Button
              className="w-full"
              size="lg"
              disabled={!hasItems || hasUnavailableItems || loading}
              asChild
            >
              <Link href="/checkout">
                <CreditCard className="mr-2 h-4 w-4" />
                Proceed to Checkout
              </Link>
            </Button>
          )}

          {showClearButton && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleClearCart}
              disabled={!hasItems || loading}
            >
              Clear Cart
            </Button>
          )}

          <p className="text-xs text-gray-500 text-center mt-2">
            Shipping and taxes calculated at checkout
          </p>
        </CardFooter>
      )}
    </Card>
  )
}