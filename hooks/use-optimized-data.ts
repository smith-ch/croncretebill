"use client"

import { supabase } from '@/lib/supabase'
import { useOptimizedLoading } from '@/hooks/use-optimized-loading'

// Hook optimizado para cargar datos del dashboard
export function useDashboardData() {
  return useOptimizedLoading(
    async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) {
        throw new Error('No user')
      }

      // Optimized parallel queries instead of sequential
      const [
        invoicesResult,
        clientsResult,
        productsResult,
        reportsResult
      ] = await Promise.allSettled([
        supabase
          .from('invoices')
          .select('id, invoice_number, total, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5), // Only load recent invoices for dashboard
        
        supabase
          .from('clients')
          .select('id, name')
          .eq('user_id', user.id)
          .limit(10), // Only count, don't load full data
        
        supabase
          .from('products')
          .select('id, name, stock, min_stock')
          .eq('user_id', user.id)
          .lt('stock', supabase.rpc('min_stock')) // Only low stock items
          .limit(5),
        
        supabase
          .from('invoices')
          .select('total, created_at')
          .eq('user_id', user.id)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      ])

      return {
        invoices: invoicesResult.status === 'fulfilled' ? invoicesResult.value.data || [] : [],
        clients: clientsResult.status === 'fulfilled' ? clientsResult.value.data || [] : [],
        lowStockProducts: productsResult.status === 'fulfilled' ? productsResult.value.data || [] : [],
        recentRevenue: reportsResult.status === 'fulfilled' ? reportsResult.value.data || [] : []
      }
    },
    {
      cacheKey: 'dashboard_data',
      cacheDuration: 2 * 60 * 1000, // 2 minutes cache
      minLoadingTime: 200,
      maxLoadingTime: 3000
    }
  )
}

// Hook optimizado para cargar listas
export function useOptimizedList(table: string, columns: string = '*', filters?: Record<string, any>) {
  return useOptimizedLoading(
    async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) {
        throw new Error('No user')
      }

      let query = supabase
        .from(table)
        .select(columns)
        .eq('user_id', user.id)

      // Apply filters if provided
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value)
        })
      }

      const { data, error } = await query
      if (error) {
        throw error
      }
      return data || []
    },
    {
      cacheKey: `${table}_list`,
      cacheDuration: 5 * 60 * 1000, // 5 minutes cache for lists
      minLoadingTime: 100,
      maxLoadingTime: 2000
    }
  )
}