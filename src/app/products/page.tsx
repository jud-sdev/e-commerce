import { Suspense } from 'react'
import { ProductCard } from '@/components/products/product-card'
import { SearchFilter } from '@/components/products/search-filter'

interface SearchParams {
  q?: string
  category?: string
  page?: string
  limit?: string
  sortBy?: string
  sortOrder?: string
  minPrice?: string
  maxPrice?: string
  featured?: string
}

interface ProductsPageProps {
  searchParams: Promise<SearchParams>
}

async function getProducts(params: Record<string, string> = {}) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const urlParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value) urlParams.append(key, value)
  })

  const response = await fetch(`${baseUrl}/api/products?${urlParams.toString()}`, {
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

function ProductsLoading() {
  return (
    <div className="container mx-auto py-8">
      <div className="text-center">Loading products...</div>
    </div>
  )
}

async function ProductsData({ searchParams }: { searchParams: SearchParams }) {
  try {
    const [productsData, categoriesData] = await Promise.all([
      getProducts(searchParams),
      getCategories()
    ])

    const { products } = productsData
    const { categories } = categoriesData

    return (
      <div className="container mx-auto py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:w-64">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Categories</h3>
                <div className="space-y-2">
                  <a
                    href="/products"
                    className="block px-3 py-2 rounded-md text-sm hover:bg-gray-100"
                  >
                    All Categories
                  </a>
                  {categories.map((category: any) => (
                    <a
                      key={category.id}
                      href={`/products?category=${category.id}`}
                      className="block px-3 py-2 rounded-md text-sm hover:bg-gray-100"
                    >
                      {category.name}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Products</h1>
              <p className="text-gray-600">
                {products.length} products found
              </p>
            </div>

            {/* Search Filter */}
            <div className="mb-6">
              <SearchFilter categories={categories} />
            </div>

            {/* Products Grid */}
            {products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No products found
                </h3>
                <p className="text-gray-600">
                  Try adjusting your search or filter criteria.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading products:', error)
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-red-600">
          Error loading products. Please try again.
        </div>
      </div>
    )
  }
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedSearchParams = await searchParams

  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsData searchParams={resolvedSearchParams} />
    </Suspense>
  )
}