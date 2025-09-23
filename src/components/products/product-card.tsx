'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AddToCartButton } from '@/components/cart/add-to-cart-button'
import { formatCurrency } from '@/utils/format'

interface Product {
  id: string
  name: string
  slug: string
  description?: string
  price: number
  comparePrice?: number
  inventory: number
  featured: boolean
  status: string
  category?: {
    id: string
    name: string
    slug: string
  }
  images: {
    id: string
    url: string
    altText?: string
  }[]
  _count: {
    reviews: number
  }
}

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const primaryImage = product.images[0]
  const isOutOfStock = product.inventory === 0
  const hasDiscount = product.comparePrice && product.comparePrice > product.price

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="p-0">
        <div className="relative aspect-square overflow-hidden rounded-t-lg">
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.altText || product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400 text-sm">No Image</span>
            </div>
          )}

          {product.featured && (
            <Badge className="absolute top-2 left-2 bg-yellow-500 text-yellow-900">
              Featured
            </Badge>
          )}

          {hasDiscount && (
            <Badge className="absolute top-2 right-2 bg-red-500 text-white">
              Sale
            </Badge>
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="secondary" className="text-sm">
                Out of Stock
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="space-y-2">
          {product.category && (
            <Badge variant="outline" className="text-xs">
              {product.category.name}
            </Badge>
          )}

          <CardTitle className="text-lg line-clamp-2">
            <Link
              href={`/products/${product.slug}`}
              className="hover:text-blue-600 transition-colors"
            >
              {product.name}
            </Link>
          </CardTitle>

          {product.description && (
            <CardDescription className="line-clamp-2">
              {product.description}
            </CardDescription>
          )}

          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">
              {formatCurrency(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-gray-500 line-through">
                {formatCurrency(product.comparePrice!)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {product._count.reviews > 0 ? (
                <span>{product._count.reviews} review{product._count.reviews !== 1 ? 's' : ''}</span>
              ) : (
                <span>No reviews</span>
              )}
            </div>

            <div className="text-sm text-gray-500">
              {product.inventory > 0 ? (
                <span>{product.inventory} in stock</span>
              ) : (
                <span className="text-red-500">Out of stock</span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant="outline"
              asChild
            >
              <Link href={`/products/${product.slug}`}>
                View
              </Link>
            </Button>

            <AddToCartButton
              productId={product.id}
              maxQuantity={product.inventory}
              isOutOfStock={isOutOfStock}
              className="flex-1"
              showQuantitySelector={false}
              size="default"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}