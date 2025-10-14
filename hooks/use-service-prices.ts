import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface ServicePrice {
  id: string
  service_id: string
  price_name: string | null
  price: number
  min_quantity: number | null
  max_quantity: number | null
  description: string | null
  valid_from: string | null
  valid_until: string | null
  customer_type: string | null
  customer_id: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export function useServicePrices(serviceId: string) {
  const [prices, setPrices] = useState<ServicePrice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (serviceId) {
      fetchPrices()
    }
  }, [serviceId])

  const fetchPrices = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('service_prices')
        .select('*')
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPrices(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching prices')
    } finally {
      setLoading(false)
    }
  }

  const createPrice = async (priceData: Omit<ServicePrice, 'id' | 'service_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('service_prices')
        .insert({
          ...priceData,
          service_id: serviceId,
          is_default: prices.length === 0 // First price is default
        })
        .select()
        .single()

      if (error) throw error
      
      await fetchPrices()
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating price')
      throw err
    }
  }

  const updatePrice = async (priceId: string, priceData: Partial<ServicePrice>) => {
    try {
      const { error } = await supabase
        .from('service_prices')
        .update(priceData)
        .eq('id', priceId)

      if (error) throw error
      await fetchPrices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating price')
      throw err
    }
  }

  const deletePrice = async (priceId: string) => {
    try {
      const { error } = await supabase
        .from('service_prices')
        .delete()
        .eq('id', priceId)

      if (error) throw error
      await fetchPrices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting price')
      throw err
    }
  }

  const setAsDefault = async (priceId: string) => {
    try {
      // First, unset all as default
      const { error: unsetError } = await supabase
        .from('service_prices')
        .update({ is_default: false })
        .eq('service_id', serviceId)

      if (unsetError) throw unsetError

      // Then set the selected one as default
      const { error: setError } = await supabase
        .from('service_prices')
        .update({ is_default: true })
        .eq('id', priceId)

      if (setError) throw setError
      await fetchPrices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error setting default price')
      throw err
    }
  }

  return {
    prices,
    loading,
    error,
    createPrice,
    updatePrice,
    deletePrice,
    setAsDefault,
    refetch: fetchPrices
  }
}