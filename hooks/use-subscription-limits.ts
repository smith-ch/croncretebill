import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface SubscriptionLimits {
  maxUsers: number
  maxInvoices: number
  maxProducts: number
  maxClients: number
  planName: string
  planDisplayName: string
  isLoading: boolean
}

interface UsageCount {
  users: number
  invoices: number
  products: number
  clients: number
}

export function useSubscriptionLimits() {
  const [limits, setLimits] = useState<SubscriptionLimits>({
    maxUsers: 1,
    maxInvoices: 10,
    maxProducts: 20,
    maxClients: 10,
    planName: 'free',
    planDisplayName: 'Plan Gratuito',
    isLoading: true,
  })

  const [usage, setUsage] = useState<UsageCount>({
    users: 0,
    invoices: 0,
    products: 0,
    clients: 0,
  })

  useEffect(() => {
    loadLimits()
    loadUsage()

    // Suscribirse a cambios en tiempo real en user_subscriptions
    const subscriptionChannel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuchar todos los eventos (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'user_subscriptions'
        },
        (payload) => {
          console.log('🔄 Realtime: Subscription changed', payload)
          // Recargar límites cuando cambia la suscripción
          loadLimits()
        }
      )
      .subscribe()

    // Cleanup al desmontar
    return () => {
      supabase.removeChannel(subscriptionChannel)
    }
  }, [])

  async function loadLimits() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('❌ No user found')
        return
      }

      console.log('🔍 Loading subscription limits for user:', user.id)

      // Usar función RPC que bypasea RLS y obtiene suscripción heredada correctamente
      const { data: subscription, error: subError } = await supabase
        .rpc('get_effective_subscription', { user_uuid: user.id })

      if (subError) {
        console.error('❌ Error loading subscription:', subError)
        // Fallback a plan gratuito
        setLimits({
          maxUsers: 1,
          maxInvoices: 5,
          maxProducts: 10,
          maxClients: 5,
          planName: 'free',
          planDisplayName: 'Plan Gratuito',
          isLoading: false,
        })
        return
      }

      console.log('📋 Subscription data:', subscription)

      if (subscription && subscription.length > 0) {
        const sub = subscription[0]
        
        console.log('✅ Plan detected:', sub.plan_name, '-', sub.plan_display_name)
        console.log('📊 Límites heredados:', {
          users: sub.current_max_users,
          invoices: sub.current_max_invoices,
          products: sub.current_max_products,
          clients: sub.current_max_clients,
          is_inherited: sub.is_inherited
        })

        setLimits({
          maxUsers: sub.current_max_users || 1,
          maxInvoices: sub.current_max_invoices || 5,
          maxProducts: sub.current_max_products || 10,
          maxClients: sub.current_max_clients || 5,
          planName: sub.plan_name || 'free',
          planDisplayName: sub.plan_display_name || 'Plan Gratuito',
          isLoading: false,
        })
      } else {
        // No active subscription, use default free plan limits
        console.log('⚠️ No active subscription found, using free plan defaults')
        setLimits({
          maxUsers: 1,
          maxInvoices: 5,
          maxProducts: 10,
          maxClients: 5,
          planName: 'free',
          planDisplayName: 'Plan Gratuito',
          isLoading: false,
        })
      }
    } catch (error) {
      console.error('❌ Error loading subscription limits:', error)
      setLimits(prev => ({ ...prev, isLoading: false }))
    }
  }

  async function loadUsage() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('❌ No user found for usage count')
        return
      }

      console.log('📊 Loading usage for user:', user.id)

      // Usar función RPC que cuenta correctamente para owner y empleados
      const { data: usageData, error: usageError } = await supabase
        .rpc('get_subscription_usage', { user_uuid: user.id })

      if (usageError) {
        console.error('❌ Error loading usage:', usageError)
        return
      }

      console.log('📊 Usage data:', usageData)

      if (usageData && usageData.length > 0) {
        const usage = usageData[0]
        
        const usageCount = {
          users: usage.users_count || 0,
          invoices: usage.invoices_count || 0,
          products: usage.products_count || 0,
          clients: usage.clients_count || 0,
        }

        console.log('✅ Usage loaded:', usageCount)
        setUsage(usageCount)
      }
    } catch (error) {
      console.error('❌ Error loading usage:', error)
    }
  }

  // Check if can add more of a specific resource
  const canAddUsers = () => usage.users < limits.maxUsers
  const canAddInvoices = () => usage.invoices < limits.maxInvoices
  const canAddProducts = () => usage.products < limits.maxProducts
  const canAddClients = () => usage.clients < limits.maxClients

  // Get remaining count for each resource
  const remainingUsers = Math.max(0, limits.maxUsers - usage.users)
  const remainingInvoices = Math.max(0, limits.maxInvoices - usage.invoices)
  const remainingProducts = Math.max(0, limits.maxProducts - usage.products)
  const remainingClients = Math.max(0, limits.maxClients - usage.clients)

  // Refresh usage after an action
  const refreshUsage = () => {
    loadUsage()
  }

  // Refresh limits (useful after subscription change)
  const refreshLimits = () => {
    loadLimits()
  }

  return {
    limits,
    usage,
    canAddUsers,
    canAddInvoices,
    canAddProducts,
    canAddClients,
    remainingUsers,
    remainingInvoices,
    remainingProducts,
    remainingClients,
    refreshUsage,
    refreshLimits,
  }
}
