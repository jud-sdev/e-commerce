import { Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, ArrowRight } from 'lucide-react'

async function getCategories() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001'
    const response = await fetch(`${baseUrl}/api/categories`, {
      cache: 'no-store',
      next: { revalidate: 60 }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch categories')
    }

    return response.json()
  } catch (error) {
    console.error('Error fetching categories:', error)
    return { categories: [] }
  }
}

function CategoriesLoading() {
  return (
    <div className="container mx-auto py-8">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-40"></div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CategoryCard({ category }: { category: any }) {
  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        <div className="relative aspect-video overflow-hidden rounded-t-lg">
          {category.image ? (
            <img
              src={category.image}
              alt={category.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Package className="h-12 w-12 text-white" />
            </div>
          )}
          {category._count.products > 0 && (
            <Badge className="absolute top-2 right-2">
              {category._count.products} products
            </Badge>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2">{category.name}</h3>
          {category.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{category.description}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {category._count.products} product{category._count.products !== 1 ? 's' : ''}
            </span>
          </div>
          <Link href={`/categories/${category.slug}`}>
            <Button className="w-full mt-3" variant="outline">
              Browse Category
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

async function CategoriesData() {
  const { categories } = await getCategories()

  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold mb-2">No categories available</h3>
        <p className="text-gray-600 mb-4">Categories will appear here once they are created.</p>
        <Link href="/products">
          <Button>Browse All Products</Button>
        </Link>
      </div>
    )
  }

  // Separate parent categories and subcategories
  const parentCategories = categories.filter((cat: any) => !cat.parent)
  const subcategories = categories.filter((cat: any) => cat.parent)

  return (
    <div className="space-y-8">
      {/* Main Categories */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Main Categories</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {parentCategories.map((category: any) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </div>

      {/* Subcategories */}
      {subcategories.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6">Subcategories</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {subcategories.map((category: any) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default async function CategoriesPage() {
  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Product Categories</h1>
        <p className="text-gray-600 text-lg">
          Browse our product categories to find exactly what you're looking for.
        </p>
      </div>

      {/* Categories */}
      <Suspense fallback={<CategoriesLoading />}>
        <CategoriesData />
      </Suspense>

      {/* Call to Action */}
      <div className="mt-12 text-center bg-gray-50 rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-4">Can't find what you're looking for?</h2>
        <p className="text-gray-600 mb-6">
          Browse all our products or use our search to find specific items.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/products">
            <Button size="lg">
              Browse All Products
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/search">
            <Button size="lg" variant="outline">
              Search Products
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}