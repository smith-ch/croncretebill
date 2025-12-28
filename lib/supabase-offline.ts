/**
 * Supabase client with offline-first error handling
 * Suppresses network errors to allow offline operation
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create base client
const baseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  }
})

// Wrapper to suppress network errors
function isNetworkError(error: any): boolean {
  if (!error) return false
  
  const message = error.message || error.toString()
  return (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('Failed to fetch') ||
    message.includes('ERR_INTERNET_DISCONNECTED') ||
    message.includes('NetworkError') ||
    error.code === 'NETWORK_ERROR' ||
    !navigator.onLine
  )
}

// Global error handler to suppress network errors
if (typeof window !== 'undefined') {
  const originalError = console.error
  console.error = (...args: any[]) => {
    // Check if this is a network error from Supabase
    const errorStr = args.join(' ')
    if (
      errorStr.includes('ERR_INTERNET_DISCONNECTED') ||
      errorStr.includes('Failed to fetch') ||
      errorStr.includes('auth/v1/user')
    ) {
      // Silently ignore network errors
      return
    }
    // Log other errors normally
    originalError.apply(console, args)
  }
}

export const supabase = baseClient
