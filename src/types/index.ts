export * from './auth'

// Common types
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Product types
export interface ProductFilters {
  category?: string
  minPrice?: number
  maxPrice?: number
  search?: string
  status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED'
}

export interface CartItem {
  id: string
  productId: string
  quantity: number
  product: {
    id: string
    name: string
    price: number
    image?: string
  }
}

// Order types
export interface OrderSummary {
  subtotal: number
  tax: number
  shipping: number
  discount: number
  total: number
}