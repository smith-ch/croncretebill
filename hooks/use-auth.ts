/**
 * Offline-first authentication hook
 * Uses local session without requiring network connection
 */

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getOfflineUser } from '@/lib/offline-auth'

interface UseAuthReturn {
  user: User | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to get authenticated user - works offline
 * Uses cached session from localStorage
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get user from local session (offline-capable)
      const userData = await getOfflineUser()
      setUser(userData)
    } catch (err: any) {
      console.error('Error fetching user:', err)
      setError(err.message || 'Error de autenticación')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    loading,
    error,
    refetch: fetchUser
  }
}
