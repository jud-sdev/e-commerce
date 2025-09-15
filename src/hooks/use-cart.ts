'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { CartItem } from '@/types'

export function useCart() {
  const { data: session } = useSession()
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)

  const addItem = async (productId: string, quantity: number = 1) => {
    if (!session?.user?.id) return

    setLoading(true)
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      })

      if (response.ok) {
        await fetchCart()
      }
    } catch (error) {
      console.error('Failed to add item to cart:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (!session?.user?.id) return

    setLoading(true)
    try {
      const response = await fetch(`/api/cart/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      })

      if (response.ok) {
        await fetchCart()
      }
    } catch (error) {
      console.error('Failed to update cart item:', error)
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
    if (!session?.user?.id) return

    setLoading(true)
    try {
      const response = await fetch('/api/cart')
      if (response.ok) {
        const data = await response.json()
        setItems(data.items || [])
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  const clearCart = async () => {
    if (!session?.user?.id) return

    setLoading(true)
    try {
      const response = await fetch('/api/cart', {
        method: 'DELETE',
      })

      if (response.ok) {
        setItems([])
      }
    } catch (error) {
      console.error('Failed to clear cart:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )

  useEffect(() => {
    if (session?.user?.id) {
      fetchCart()
    } else {
      setItems([])
    }
  }, [session?.user?.id, fetchCart])

  return {
    items,
    loading,
    totalItems,
    totalPrice,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    refetch: fetchCart,
  }
}