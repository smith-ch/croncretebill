"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useDataUserId } from '@/hooks/use-data-user-id'

export interface ProductPrice {
  id: string
  product_id: string
  user_id: string
  price_name: string
  price: number
  min_quantity: number
  max_quantity?: number | null
  is_default: boolean
  is_active: boolean
  valid_from?: string | null
  valid_until?: string | null
  description?: string | null
  customer_type?: string | null  // 'general', 'vip', 'wholesale', etc.
  customer_id?: string | null    // Para clientes específicos (texto libre)
  created_at: string
  updated_at: string
}

interface UseProductPricesReturn {
  prices: ProductPrice[]
  loading: boolean
  error: string | null
  createPrice: (priceData: Omit<ProductPrice, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<ProductPrice | null>
  updatePrice: (id: string, updates: Partial<ProductPrice>) => Promise<boolean>
  deletePrice: (id: string) => Promise<boolean>
  getApplicablePrice: (productId: string, quantity?: number, date?: Date) => ProductPrice | null
  setAsDefault: (priceId: string, productId: string) => Promise<boolean>
  refreshPrices: () => Promise<void>
}

export function useProductPrices(productId?: string): UseProductPricesReturn {
  const [prices, setPrices] = useState<ProductPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { dataUserId, loading: userIdLoading } = useDataUserId()

  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (!dataUserId) {
        setPrices([])
        return
      }

      let query = (supabase as any)
        .from('product_prices')
        .select('*')
        .eq('user_id', dataUserId)
        .order('product_id')
        .order('is_default', { ascending: false })
        .order('min_quantity', { ascending: false })

      if (productId) {
        query = query.eq('product_id', productId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      setPrices(data || [])
    } catch (err) {
      console.error('Error fetching product prices:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [dataUserId, productId])

  const createPrice = async (priceData: Omit<ProductPrice, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<ProductPrice | null> => {
    try {
      if (!dataUserId) {
        throw new Error('Usuario no autenticado')
      }

      // Check if price name already exists for this product
      const { data: existingPrices } = await (supabase as any)
        .from('product_prices')
        .select('price_name')
        .eq('product_id', priceData.product_id)
        .eq('user_id', dataUserId)
        .eq('price_name', priceData.price_name)
        .eq('is_active', true)

      if (existingPrices && existingPrices.length > 0) {
        throw new Error(`Ya existe un precio llamado "${priceData.price_name}" para este producto`)
      }

      const { data, error: insertError } = await (supabase as any)
        .from('product_prices')
        .insert({
          ...priceData,
          user_id: dataUserId
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      // Update local state
      setPrices(prev => [...prev, data].sort((a, b) => {
        if (a.product_id !== b.product_id) {
          return a.product_id.localeCompare(b.product_id)
        }
        if (a.is_default !== b.is_default) {
          return b.is_default ? 1 : -1
        }
        return b.min_quantity - a.min_quantity
      }))

      return data
    } catch (err) {
      console.error('Error creating product price:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error creando precio'
      setError(errorMessage)
      
      if (typeof window !== 'undefined') {
        alert(errorMessage)
      }
      
      return null
    }
  }

  const updatePrice = async (id: string, updates: Partial<ProductPrice>): Promise<boolean> => {
    try {
      const { error: updateError } = await (supabase as any)
        .from('product_prices')
        .update(updates)
        .eq('id', id)

      if (updateError) {
        throw updateError
      }

      // Update local state
      setPrices(prev => 
        prev.map(price => 
          price.id === id ? { ...price, ...updates } : price
        )
      )
      return true
    } catch (err) {
      console.error('Error updating product price:', err)
      setError(err instanceof Error ? err.message : 'Error actualizando precio')
      return false
    }
  }

  const deletePrice = async (id: string): Promise<boolean> => {
    try {
      // Soft delete - mark as inactive
      const { error: deleteError } = await (supabase as any)
        .from('product_prices')
        .update({ is_active: false })
        .eq('id', id)

      if (deleteError) {
        throw deleteError
      }

      // Update local state
      setPrices(prev => prev.filter(price => price.id !== id))
      return true
    } catch (err) {
      console.error('Error deleting product price:', err)
      setError(err instanceof Error ? err.message : 'Error eliminando precio')
      return false
    }
  }

  const setAsDefault = async (priceId: string, productId: string): Promise<boolean> => {
    try {
      if (!dataUserId) {
        throw new Error('Usuario no autenticado')
      }

      // First, remove default flag from all prices for this product
      await (supabase as any)
        .from('product_prices')
        .update({ is_default: false })
        .eq('product_id', productId)
        .eq('user_id', dataUserId)

      // Then set the selected price as default
      const { error: updateError } = await (supabase as any)
        .from('product_prices')
        .update({ is_default: true })
        .eq('id', priceId)

      if (updateError) {
        throw updateError
      }

      // Update local state
      setPrices(prev => 
        prev.map(price => ({
          ...price,
          is_default: price.product_id === productId ? price.id === priceId : price.is_default
        }))
      )

      return true
    } catch (err) {
      console.error('Error setting default price:', err)
      setError(err instanceof Error ? err.message : 'Error estableciendo precio por defecto')
      return false
    }
  }

  const getApplicablePrice = (productId: string, quantity: number = 1, date: Date = new Date()): ProductPrice | null => {
    const productPrices = prices.filter(p => 
      p.product_id === productId && 
      p.is_active &&
      p.min_quantity <= quantity &&
      (p.max_quantity === null || p.max_quantity === undefined || p.max_quantity >= quantity)
    )

    // Filter by date validity
    const validPrices = productPrices.filter(p => {
      const now = date.toISOString().split('T')[0]
      return (!p.valid_from || p.valid_from <= now) && 
             (!p.valid_until || p.valid_until >= now)
    })

    if (validPrices.length === 0) {
      return null
    }

    // Sort by priority: default first, then by min_quantity desc, then by price asc
    validPrices.sort((a, b) => {
      if (a.is_default !== b.is_default) {
        return b.is_default ? 1 : -1
      }
      if (a.min_quantity !== b.min_quantity) {
        return b.min_quantity - a.min_quantity
      }
      return a.price - b.price
    })

    return validPrices[0]
  }

  const refreshPrices = async () => {
    await fetchPrices()
  }

  useEffect(() => {
    if (userIdLoading) return
    fetchPrices()
  }, [userIdLoading, fetchPrices])

  return {
    prices,
    loading,
    error,
    createPrice,
    updatePrice,
    deletePrice,
    getApplicablePrice,
    setAsDefault,
    refreshPrices
  }
}