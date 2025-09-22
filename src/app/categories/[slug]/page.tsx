import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ProductCard } from '@/components/products/product-card'
import { SearchFilter } from '@/components/products/search-filter'
import { Pagination } from '@/components/ui/pagination'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface CategoryPageProps {
  params: { slug: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

async function getCategory(slug: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  const response = await fetch(`${baseUrl}/api/categories`, {
    cache: 'no-store'
  })

  if (!response.ok) {
    throw new Error('Failed to fetch categories')
  }

  const data = await response.json()
  return data.categories.find((category: any) => category.slug === slug)
}

async function getCategoryProducts(categoryId: string, searchParams: any) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const params = new URLSearchParams()

  params.set('category', categoryId)

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value && key !== 'category') {
      params.append(key, value.toString())
    }
  })

  const response = await fetch(`${baseUrl}/api/products?${params.toString()}`, {
    cache: 'no-store'
  })

  if (!response.ok) {
    throw new Error('Failed to fetch products')
  }

  return response.json()
}

async function getCategories() {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  const response = await fetch(`${baseUrl}/api/categories`, {
    cache: 'no-store'
  })

  if (!response.ok) {
    throw new Error('Failed to fetch categories')
  }

  return response.json()
}

function CategoryPageLoading() {
  return (
    <div className="container mx-auto py-8">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-80"></div>
          ))}
        </div>
      </div>
    </div>
  )
}

async function CategoryContent({ slug, searchParams }: CategoryPageProps) {
  const category = await getCategory(slug)

  if (!category) {
    notFound()
  }

  const [productsData, categoriesData] = await Promise.all([
    getCategoryProducts(category.id, searchParams),
    getCategories()
  ])

  const { products, pagination } = productsData
  const { categories } = categoriesData

  return (
    <div className="container mx-auto py-8">
      {/* Category Header */}
      <div className="mb-8">
        <div className="flex items-start gap-6">
          {category.image && (
            <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{category.name}</h1>
              <Badge variant="outline">
                {category._count.products} product{category._count.products !== 1 ? 's' : ''}
              </Badge>
            </div>

            {category.description && (
              <p className="text-gray-600 text-lg">{category.description}</p>
            )}

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
              <a href="/" className="hover:text-gray-700">Home</a>
              <span>/</span>
              <a href="/products" className="hover:text-gray-700">Products</a>
              <span>/</span>
              {category.parent && (
                <>
                  <a href={`/categories/${category.parent.slug}`} className="hover:text-gray-700">
                    {category.parent.name}
                  </a>
                  <span>/</span>
                </>
              )}
              <span className="text-gray-900">{category.name}</span>
            </div>
          </div>
        </div>

        {/* Subcategories */}
        {category.children && category.children.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Subcategories</CardTitle>
              <CardDescription>Browse more specific product categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {category.children.map((child: any) => (
                  <a
                    key={child.id}
                    href={`/categories/${child.slug}`}
                    className="flex items-center p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium">{child.name}</span>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Search and Filter */}
      <div className="mb-6">
        <SearchFilter categories={categories} />
      </div>

      {/* Products */}
      <div className="mb-6">
        <p className="text-gray-600">
          {pagination.total} product{pagination.total !== 1 ? 's' : ''} found in {category.name}
        </p>
      </div>

      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {products.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            basePath={`/categories/${slug}`}
          />
        </>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500 mb-4">
            There are currently no products in this category.
          </p>
          <a
            href="/products"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Browse All Products
          </a>
        </div>
      )}
    </div>
  )
}

export default function CategoryPage({ params, searchParams }: CategoryPageProps) {
  return (
    <Suspense fallback={<CategoryPageLoading />}>
      <CategoryContent slug={params.slug} searchParams={searchParams} />
    </Suspense>
  )
}