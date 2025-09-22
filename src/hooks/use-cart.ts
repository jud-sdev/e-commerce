'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface CartItem {
  id: string
  quantity: number
  userId: string
  productId: string
  createdAt: string
  updatedAt: string
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

interface CartSummary {
  subtotal: number
  tax: number
  total: number
  totalItems: number
  itemCount: number
}

export function useCart() {
  const { data: session } = useSession()
  const [items, setItems] = useState<CartItem[]>([])
  const [summary, setSummary] = useState<CartSummary>({
    subtotal: 0,
    tax: 0,
    total: 0,
    totalItems: 0,
    itemCount: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addItem = async (productId: string, quantity: number = 1) => {
    if (!session?.user?.id) {
      setError('Please sign in to add items to cart')
      return false
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      })

      const data = await response.json()

      if (response.ok) {
        await fetchCart()
        return true
      } else {
        setError(data.error || 'Failed to add item to cart')
        return false
      }
    } catch (error) {
      console.error('Failed to add item to cart:', error)
      setError('Failed to add item to cart')
      return false
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (!session?.user?.id) return false

    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/cart/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      })

      const data = await response.json()

      if (response.ok) {
        await fetchCart()
        return true
      } else {
        setError(data.error || 'Failed to update cart item')
        return false
      }
    } catch (error) {
      console.error('Failed to update cart item:', error)
      setError('Failed to update cart item')
      return false
    } finally {
      setLoading(false)
    }
  }

  const removeItem = async (itemId: string) => {
    if (!session?.user?.id) return

    setLoading(true)
    try {
      const response = await fetch(`/api/cart/${itemId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchCart()
      }
    } catch (error) {
      console.error('Failed to remove cart item:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCart = useCallback(async () => {
    if (!session?.user?.id) {
      setItems([])
      setSummary({
        subtotal: 0,
        tax: 0,
        total: 0,
        totalItems: 0,
        itemCount: 0
      })
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/cart')
      if (response.ok) {
        const data = await response.json()
        setItems(data.items || [])
        setSummary(data.summary || {
          subtotal: 0,
          tax: 0,
          total: 0,
          totalItems: 0,
          itemCount: 0
        })
      } else {
        setError('Failed to fetch cart')
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error)
      setError('Failed to fetch cart')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  const clearCart = async () => {
    if (!session?.user?.id) return false

    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/cart', {
        method: 'DELETE',
      })

      if (response.ok) {
        setItems([])
        setSummary({
          subtotal: 0,
          tax: 0,
          total: 0,
          totalItems: 0,
          itemCount: 0
        })
        return true
      } else {
        setError('Failed to clear cart')
        return false
      }
    } catch (error) {
      console.error('Failed to clear cart:', error)
      setError('Failed to clear cart')
      return false
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  return {
    items,
    summary,
    loading,
    error,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    refetch: fetchCart,
    // Legacy compatibility
    totalItems: summary.totalItems,
    totalPrice: summary.total,
  }
}