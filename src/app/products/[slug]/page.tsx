import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ProductGallery } from '@/components/products/product-gallery'
import { AddToCartButton } from '@/components/cart/add-to-cart-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Star, Package, Truck, Shield } from 'lucide-react'
import { formatCurrency } from '@/utils/format'

interface ProductPageProps {
  params: { slug: string }
}

async function getProduct(slug: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  const response = await fetch(`${baseUrl}/api/products`, {
    cache: 'no-store'
  })

  if (!response.ok) {
    throw new Error('Failed to fetch products')
  }

  const data = await response.json()
  return data.products.find((product: any) => product.slug === slug)
}

async function getProductById(id: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  const response = await fetch(`${baseUrl}/api/products/${id}`, {
    cache: 'no-store'
  })

  if (!response.ok) {
    return null
  }

  return response.json()
}

function ProductPageLoading() {
  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="animate-pulse">
          <div className="aspect-square bg-gray-200 rounded-lg mb-4"></div>
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-md"></div>
            ))}
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  )
}

async function ProductContent({ slug }: { slug: string }) {
  const product = await getProduct(slug)

  if (!product) {
    notFound()
  }

  const fullProduct = await getProductById(product.id)

  if (!fullProduct) {
    notFound()
  }

  const isOutOfStock = fullProduct.inventory === 0
  const hasDiscount = fullProduct.comparePrice && fullProduct.comparePrice > fullProduct.price
  const discountPercentage = hasDiscount
    ? Math.round(((fullProduct.comparePrice - fullProduct.price) / fullProduct.comparePrice) * 100)
    : 0

  const averageRating = fullProduct.averageRating || 0
  const reviewCount = fullProduct._count.reviews

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Images */}
        <div>
          <ProductGallery images={fullProduct.images} productName={fullProduct.name} />
        </div>

        {/* Product Information */}
        <div className="space-y-6">
          {/* Header */}
          <div>
            {fullProduct.category && (
              <Badge variant="outline" className="mb-2">
                {fullProduct.category.name}
              </Badge>
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {fullProduct.name}
            </h1>

            {/* Rating and Reviews */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.floor(averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {averageRating > 0 ? averageRating.toFixed(1) : 'No ratings'}
              </span>
              <span className="text-sm text-gray-600">
                ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-gray-900">
                {formatCurrency(fullProduct.price)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-gray-500 line-through">
                    {formatCurrency(fullProduct.comparePrice)}
                  </span>
                  <Badge className="bg-red-500 text-white">
                    {discountPercentage}% OFF
                  </Badge>
                </>
              )}
            </div>

            {fullProduct.sku && (
              <p className="text-sm text-gray-600">SKU: {fullProduct.sku}</p>
            )}
          </div>

          {/* Stock Status */}
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-500" />
            <span className={`font-medium ${isOutOfStock ? 'text-red-600' : 'text-green-600'}`}>
              {isOutOfStock ? 'Out of Stock' : `${fullProduct.inventory} in stock`}
            </span>
          </div>

          {/* Description */}
          {fullProduct.description && (
            <div>
              <h3 className="font-semibold text-lg mb-2">Description</h3>
              <p className="text-gray-700 leading-relaxed">{fullProduct.description}</p>
            </div>
          )}

          {/* Product Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Product Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {fullProduct.weight && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Weight:</span>
                  <span>{fullProduct.weight} kg</span>
                </div>
              )}
              {fullProduct.dimensions && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Dimensions:</span>
                  <span>{fullProduct.dimensions}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <Badge variant={fullProduct.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {fullProduct.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Add to Cart */}
          <div className="space-y-4">
            <AddToCartButton
              productId={fullProduct.id}
              maxQuantity={fullProduct.inventory}
              isOutOfStock={isOutOfStock}
              size="lg"
              showQuantitySelector={true}
            />

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Truck className="h-4 w-4" />
                <span>Free Shipping</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Shield className="h-4 w-4" />
                <span>2 Year Warranty</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Package className="h-4 w-4" />
                <span>Easy Returns</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      {fullProduct.reviews && fullProduct.reviews.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
          <div className="space-y-6">
            {fullProduct.reviews.map((review: any) => (
              <Card key={review.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{review.title || 'Review'}</CardTitle>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <CardDescription>
                    By {review.user.name} • {new Date(review.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                {review.content && (
                  <CardContent>
                    <p className="text-gray-700">{review.content}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProductPage({ params }: ProductPageProps) {
  return (
    <Suspense fallback={<ProductPageLoading />}>
      <ProductContent slug={params.slug} />
    </Suspense>
  )
}