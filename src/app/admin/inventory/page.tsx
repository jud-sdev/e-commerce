'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Search, Download, Filter, Package, AlertTriangle, Edit3, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'
import { formatCurrency } from '@/utils/format'

interface Product {
  id: string
  name: string
  slug: string
  sku: string | null
  price: number
  comparePrice: number | null
  inventory: number
  variantsInventory: number
  totalInventory: number
  status: string
  featured: boolean
  category: { id: string; name: string } | null
  image: string | null
  variants: {
    id: string
    name: string
    value: string
    inventory: number
  }[]
  totalSold: number
  createdAt: string
  updatedAt: string
}

interface Category {
  id: string
  name: string
}

interface InventoryResponse {
  products: Product[]
  categories: Category[]
  summary: {
    totalProducts: number
    totalInventory: number
    lowStockCount: number
    outOfStockCount: number
  }
  pagination: {
    page: number
    limit: number
    totalProducts: number
    totalPages: number
    hasMore: boolean
  }
}

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [summary, setSummary] = useState({
    totalProducts: 0,
    totalInventory: 0,
    lowStockCount: 0,
    outOfStockCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [lowStockFilter, setLowStockFilter] = useState(false)
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    totalProducts: 0,
    totalPages: 0,
    hasMore: false
  })

  const fetchInventory = async (page = 1, search = '', status = 'all', category = 'all', lowStock = false, sort = 'name', order = 'asc') => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy: sort,
        sortOrder: order,
        ...(search && { search }),
        ...(status !== 'all' && { status }),
        ...(category !== 'all' && { category }),
        ...(lowStock && { lowStock: 'true' })
      })

      const response = await fetch(`/api/admin/inventory?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch inventory')
      }

      const data: InventoryResponse = await response.json()

      if (page === 1) {
        setProducts(data.products)
      } else {
        setProducts(prev => [...prev, ...data.products])
      }

      setCategories(data.categories)
      setSummary(data.summary)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching inventory:', error)
      setError('Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
  }, [])

  const handleSearch = () => {
    fetchInventory(1, searchTerm, statusFilter, categoryFilter, lowStockFilter, sortBy, sortOrder)
  }

  const handleFilterChange = (filterType: string, value: string | boolean) => {
    if (filterType === 'status') {
      setStatusFilter(value as string)
      fetchInventory(1, searchTerm, value as string, categoryFilter, lowStockFilter, sortBy, sortOrder)
    } else if (filterType === 'category') {
      setCategoryFilter(value as string)
      fetchInventory(1, searchTerm, statusFilter, value as string, lowStockFilter, sortBy, sortOrder)
    } else if (filterType === 'lowStock') {
      setLowStockFilter(value as boolean)
      fetchInventory(1, searchTerm, statusFilter, categoryFilter, value as boolean, sortBy, sortOrder)
    }
  }

  const handleSort = (field: string) => {
    const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc'
    setSortBy(field)
    setSortOrder(newOrder)
    fetchInventory(1, searchTerm, statusFilter, categoryFilter, lowStockFilter, field, newOrder)
  }

  const handleLoadMore = () => {
    fetchInventory(pagination.page + 1, searchTerm, statusFilter, categoryFilter, lowStockFilter, sortBy, sortOrder)
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        export: 'true',
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(lowStockFilter && { lowStock: 'true' })
      })

      const response = await fetch(`/api/admin/inventory?${params}`)
      if (!response.ok) {
        throw new Error('Failed to export inventory')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export inventory')
    }
  }

  const updateProduct = async (productId: string, updates: any) => {
    try {
      setUpdating(productId)
      const response = await fetch('/api/admin/inventory', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          ...updates
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update product')
      }

      const result = await response.json()

      // Update local state
      setProducts(prev => prev.map(product =>
        product.id === productId ? { ...product, ...updates } : product
      ))

      setEditDialogOpen(false)
      setSelectedProduct(null)
    } catch (error) {
      console.error('Update error:', error)
      alert('Failed to update product')
    } finally {
      setUpdating(null)
    }
  }

  const getStockStatus = (inventory: number) => {
    if (inventory <= 0) return { label: 'Out of Stock', color: 'destructive' }
    if (inventory <= 10) return { label: 'Low Stock', color: 'secondary' }
    return { label: 'In Stock', color: 'default' }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'default'
      case 'INACTIVE': return 'secondary'
      case 'DRAFT': return 'outline'
      case 'ARCHIVED': return 'destructive'
      default: return 'secondary'
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-red-600">{error}</p>
        </div>
        <Button onClick={() => fetchInventory()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-gray-600">Manage product inventory and stock levels</p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Inventory
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Active products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalInventory}</div>
            <p className="text-xs text-muted-foreground">Units in stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summary.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">≤ 10 units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.outOfStockCount}</div>
            <p className="text-xs text-muted-foreground">0 units</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <Select value={statusFilter} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={(value) => handleFilterChange('category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Switch
                id="low-stock"
                checked={lowStockFilter}
                onCheckedChange={(value) => handleFilterChange('lowStock', value)}
              />
              <Label htmlFor="low-stock" className="text-sm">Low Stock Only</Label>
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="inventory">Inventory</SelectItem>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="category">Category</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-gray-500 flex items-center">
              {pagination.totalProducts} total products
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>
            {pagination.totalProducts === 0 ? 'No products found' : `Showing ${products.length} of ${pagination.totalProducts} products`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && products.length === 0 ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No products found matching your criteria</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('inventory')}>
                      Stock {sortBy === 'inventory' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('price')}>
                      Price {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
                      Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Total Sold</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const stockStatus = getStockStatus(product.totalInventory)
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded border flex-shrink-0">
                              {product.image && (
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-full h-full object-cover rounded"
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-gray-500">
                                SKU: {product.sku || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={stockStatus.color as any}>
                              {stockStatus.label}
                            </Badge>
                            <div className="text-sm text-gray-500">
                              {product.inventory} + {product.variantsInventory} variants = {product.totalInventory}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{formatCurrency(product.price)}</div>
                            {product.comparePrice && (
                              <div className="text-sm text-gray-500 line-through">
                                {formatCurrency(product.comparePrice)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(product.status) as any}>
                            {product.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {product.category?.name || 'Uncategorized'}
                        </TableCell>
                        <TableCell className="text-center">
                          {product.totalSold}
                        </TableCell>
                        <TableCell>
                          <Dialog open={editDialogOpen && selectedProduct?.id === product.id} onOpenChange={(open) => {
                            setEditDialogOpen(open)
                            if (!open) setSelectedProduct(null)
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedProduct(product)}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Product Inventory</DialogTitle>
                                <DialogDescription>
                                  Update inventory and product details for {product.name}
                                </DialogDescription>
                              </DialogHeader>
                              <InventoryEditForm
                                product={product}
                                updating={updating === product.id}
                                onUpdate={(updates) => updateProduct(product.id, updates)}
                              />
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {pagination.hasMore && (
                <div className="text-center mt-6">
                  <Button onClick={handleLoadMore} disabled={loading} variant="outline">
                    {loading ? 'Loading...' : 'Load More Products'}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InventoryEditForm({ product, updating, onUpdate }: {
  product: Product
  updating: boolean
  onUpdate: (updates: any) => void
}) {
  const [inventory, setInventory] = useState(product.inventory)
  const [price, setPrice] = useState(product.price)
  const [comparePrice, setComparePrice] = useState(product.comparePrice || 0)
  const [status, setStatus] = useState(product.status)
  const [sku, setSku] = useState(product.sku || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate({
      inventory,
      price,
      comparePrice: comparePrice > 0 ? comparePrice : null,
      status,
      sku: sku.trim() || null
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="inventory">Inventory</Label>
          <Input
            id="inventory"
            type="number"
            min="0"
            value={inventory}
            onChange={(e) => setInventory(parseInt(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="comparePrice">Compare Price</Label>
          <Input
            id="comparePrice"
            type="number"
            step="0.01"
            min="0"
            value={comparePrice}
            onChange={(e) => setComparePrice(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor="sku">SKU</Label>
          <Input
            id="sku"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {product.variants.length > 0 && (
        <div>
          <Label>Variants Inventory</Label>
          <div className="mt-2 space-y-2">
            {product.variants.map((variant) => (
              <div key={variant.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <span className="font-medium">{variant.name}: {variant.value}</span>
                </div>
                <div className="text-sm">
                  Inventory: {variant.inventory}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button type="submit" disabled={updating} className="w-full">
        {updating ? 'Updating...' : 'Update Product'}
      </Button>
    </form>
  )
}