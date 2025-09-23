'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Category {
  id: string
  name: string
  slug: string
  _count: {
    products: number
  }
}

interface SearchFilterProps {
  categories?: Category[]
}

export function SearchFilter({ categories = [] }: SearchFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    featured: searchParams.get('featured') === 'true',
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: searchParams.get('sortOrder') || 'desc',
  })

  const [searchTerm, setSearchTerm] = useState(filters.q)

  useEffect(() => {
    setSearchTerm(searchParams.get('q') || '')
  }, [searchParams])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateUrl({ ...filters, q: searchTerm, page: undefined })
  }

  const handleFilterChange = (key: string, value: string | boolean) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
  }

  const applyFilters = () => {
    updateUrl({ ...filters, page: undefined })
    setIsFilterOpen(false)
  }

  const clearAllFilters = () => {
    const clearedFilters = {
      q: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      featured: false,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }
    setFilters(clearedFilters)
    setSearchTerm('')
    updateUrl({ page: undefined })
    setIsFilterOpen(false)
  }

  const removeFilter = (key: string) => {
    const newFilters = { ...filters }
    if (key === 'q') {
      newFilters.q = ''
      setSearchTerm('')
    } else if (key === 'featured') {
      newFilters.featured = false
    } else {
      newFilters[key as keyof typeof filters] = '' as any
    }
    setFilters(newFilters)
    updateUrl({ ...newFilters, page: undefined })
  }

  const updateUrl = (params: Record<string, any>) => {
    const url = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== '' && value !== false && key !== 'page') {
        url.set(key, value.toString())
      }
    })

    router.push(`/products?${url.toString()}`)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.q) count++
    if (filters.category) count++
    if (filters.minPrice) count++
    if (filters.maxPrice) count++
    if (filters.featured) count++
    return count
  }

  const activeFiltersCount = getActiveFiltersCount()
  const selectedCategory = categories.find(cat => cat.id === filters.category)

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit">Search</Button>
        <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Filter Products</DialogTitle>
              <DialogDescription>
                Refine your search with these filters
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Category Filter */}
              <div>
                <Label className="text-base font-medium">Category</Label>
                <div className="mt-2 space-y-2">
                  <Button
                    variant={!filters.category ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange('category', '')}
                    className="w-full justify-start"
                  >
                    All Categories
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={filters.category === category.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleFilterChange('category', category.id)}
                      className="w-full justify-start"
                    >
                      {category.name}
                      <span className="ml-auto text-xs text-gray-500">
                        {category._count.products}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <Label className="text-base font-medium">Price Range</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="minPrice" className="text-sm">Min Price</Label>
                    <Input
                      id="minPrice"
                      type="number"
                      placeholder="0"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxPrice" className="text-sm">Max Price</Label>
                    <Input
                      id="maxPrice"
                      type="number"
                      placeholder="999999"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Sort Options */}
              <div>
                <Label className="text-base font-medium">Sort By</Label>
                <div className="mt-2 space-y-2">
                  {[
                    { value: 'createdAt:desc', label: 'Newest First' },
                    { value: 'createdAt:asc', label: 'Oldest First' },
                    { value: 'name:asc', label: 'Name A-Z' },
                    { value: 'name:desc', label: 'Name Z-A' },
                    { value: 'price:asc', label: 'Price Low to High' },
                    { value: 'price:desc', label: 'Price High to Low' },
                  ].map((option) => {
                    const [sortBy, sortOrder] = option.value.split(':')
                    const isActive = filters.sortBy === sortBy && filters.sortOrder === sortOrder

                    return (
                      <Button
                        key={option.value}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          handleFilterChange('sortBy', sortBy)
                          handleFilterChange('sortOrder', sortOrder)
                        }}
                        className="w-full justify-start"
                      >
                        {option.label}
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* Featured Products */}
              <div>
                <Button
                  variant={filters.featured ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange('featured', !filters.featured)}
                  className="w-full justify-start"
                >
                  Featured Products Only
                </Button>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={applyFilters} className="flex-1">
                  Apply Filters
                </Button>
                <Button variant="outline" onClick={clearAllFilters}>
                  Clear All
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </form>

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.q && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.q}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter('q')}
                className="h-auto p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {selectedCategory && (
            <Badge variant="secondary" className="gap-1">
              Category: {selectedCategory.name}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter('category')}
                className="h-auto p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filters.minPrice && (
            <Badge variant="secondary" className="gap-1">
              Min: ${filters.minPrice}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter('minPrice')}
                className="h-auto p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filters.maxPrice && (
            <Badge variant="secondary" className="gap-1">
              Max: ${filters.maxPrice}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter('maxPrice')}
                className="h-auto p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filters.featured && (
            <Badge variant="secondary" className="gap-1">
              Featured
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter('featured')}
                className="h-auto p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-red-600 hover:text-red-700"
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  )
}