/**
 * Optimized hook for fetching company and user data
 * Uses caching and deduplication to prevent redundant API calls
 */

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchWithDedup, getCacheKey, ClientCacheTTL } from '@/lib/client-fetch'

export interface CompanyData {
  company_name?: string
  company_email?: string
  company_phone?: string
  company_address?: string
  company_logo?: string
  tax_id?: string
  business_type?: string
  currency_symbol?: string
  currency_code?: string
}

export interface UserData {
  id: string
  email: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  phone?: string
}

interface UseCompanyDataReturn {
  company: CompanyData | null
  user: UserData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch company and user data with caching
 * Multiple components can use this hook without making duplicate requests
 */
export function useCompanyData(): UseCompanyDataReturn {
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get user from local session (offline-capable)
      const { data: { session } } = await supabase.auth.getSession()
      const userData = session?.user

      if (!userData) {
        setLoading(false)
        return
      }

      // Set user data
      setUser({
        id: userData.id,
        email: userData.email || '',
        first_name: userData.user_metadata?.first_name || '',
        last_name: userData.user_metadata?.last_name || '',
        avatar_url: userData.user_metadata?.avatar_url || '',
        phone: userData.user_metadata?.phone || ''
      })

      // Check if user is employee (has parent_user_id) to use owner's company settings
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('parent_user_id')
        .eq('user_id', userData.id)
        .maybeSingle()

      // Use owner's ID if employee, otherwise use current user's ID
      const ownerUserId = (profile as any)?.parent_user_id || userData.id

      // Get company settings with deduplication
      const companyData = await fetchWithDedup(
        getCacheKey('company', ownerUserId),
        async () => {
          const { data, error: companyError } = await supabase
            .from('company_settings')
            .select('company_name, company_email, company_phone, company_address, company_logo, tax_id, business_type, currency_symbol, currency_code')
            .eq('user_id', ownerUserId)
            .single()

          if (companyError && companyError.code !== 'PGRST116') {
            throw companyError
          }

          return data
        },
        ClientCacheTTL.LONG // Company settings change infrequently
      )

      setCompany(companyData)
    } catch (err: any) {
      console.error('Error fetching company data:', err)
      setError(err.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return {
    company,
    user,
    loading,
    error,
    refetch: fetchData
  }
}

/**
 * Hook to fetch only company settings (lighter version)
 */
export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true)

        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        if (!user) {
          setLoading(false)
          return
        }

        const data = await fetchWithDedup(
          getCacheKey('company', user.id),
          async () => {
            const { data, error } = await supabase
              .from('company_settings')
              .select('company_name, company_email, company_phone, company_address, company_logo, tax_id, business_type, currency_symbol, currency_code')
              .eq('user_id', user.id)
              .single()

            if (error && error.code !== 'PGRST116') {
              throw error
            }

            return data
          },
          ClientCacheTTL.LONG
        )

        setSettings(data)
      } catch (err: any) {
        console.error('Error fetching company settings:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  return { settings, loading, error }
}
