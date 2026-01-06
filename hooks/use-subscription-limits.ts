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

      // Check if user is an employee (has parent_user_id)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('parent_user_id')
        .eq('user_id', user.id)
        .single()

      // Use owner's ID if employee, otherwise use current user's ID
      const ownerUserId = profile?.parent_user_id || user.id
      
      if (profile?.parent_user_id) {
        console.log('👤 Employee detected, loading owner limits:', ownerUserId)
      }

      // Get owner's subscription with plan details
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select(`
          current_max_users,
          current_max_invoices,
          current_max_products,
          current_max_clients,
          plan_id,
          subscription_plans!inner (
            name,
            display_name
          )
        `)
        .eq('user_id', ownerUserId)
        .eq('status', 'active')
        .single()

      if (subError) {
        console.error('❌ Error loading subscription:', subError)
      }

      console.log('📋 Subscription data:', subscription)

      if (subscription) {
        const sub = subscription as any
        const planName = sub.subscription_plans?.name || 'free'
        const planDisplayName = sub.subscription_plans?.display_name || 'Plan Gratuito'
        
        console.log('✅ Plan detected:', planName, '-', planDisplayName)
        console.log('📊 Limits:', {
          users: sub.current_max_users,
          invoices: sub.current_max_invoices,
          products: sub.current_max_products,
          clients: sub.current_max_clients
        })

        setLimits({
          maxUsers: sub.current_max_users || 1,
          maxInvoices: sub.current_max_invoices || 5,
          maxProducts: sub.current_max_products || 10,
          maxClients: sub.current_max_clients || 5,
          planName: planName,
          planDisplayName: planDisplayName,
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

      // Check if user is an employee (has parent_user_id)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('parent_user_id')
        .eq('user_id', user.id)
        .single()

      // Use owner's ID for counting usage (employees share owner's limits)
      const ownerUserId = profile?.parent_user_id || user.id
      
      if (profile?.parent_user_id) {
        console.log('👤 Employee detected, counting owner usage:', ownerUserId)
      }

      // Get current month's start date
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      // Count users (employees) of the OWNER
      const { count: usersCount, error: usersError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('parent_user_id', ownerUserId)

      if (usersError) console.error('Error counting users:', usersError)

      // Count invoices for current month (of the OWNER, includes both regular invoices and thermal receipts)
      const { count: invoicesCount, error: invoicesError } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ownerUserId)
        .gte('created_at', monthStart.toISOString())

      if (invoicesError) console.error('Error counting invoices:', invoicesError)

      // Count thermal receipts for current month (of the OWNER)
      const { count: thermalReceiptsCount, error: thermalError } = await supabase
        .from('thermal_receipts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ownerUserId)
        .gte('created_at', monthStart.toISOString())

      if (thermalError) console.error('Error counting thermal receipts:', thermalError)

      // Total invoices = regular invoices + thermal receipts
      const totalInvoices = (invoicesCount || 0) + (thermalReceiptsCount || 0)

      // Count products (of the OWNER)
      const { count: productsCount, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ownerUserId)

      if (productsError) console.error('Error counting products:', productsError)

      // Count clients (of the OWNER)
      const { count: clientsCount, error: clientsError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ownerUserId)

      if (clientsError) console.error('Error counting clients:', clientsError)

      const usageData = {
        users: usersCount || 0,
        invoices: totalInvoices,
        products: productsCount || 0,
        clients: clientsCount || 0,
      }

      console.log('✅ Usage loaded:', usageData)

      setUsage(usageData)
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
