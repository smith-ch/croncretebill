/**
 * Offline-first authentication utilities
 * Provides auth without requiring network connection
 */

import { supabase } from './supabase'
import { User } from '@supabase/supabase-js'

/**
 * Get user from session (localStorage) - works offline
 * This NEVER makes a network request
 */
export async function getOfflineUser(): Promise<User | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user ?? null
  } catch (error) {
    console.error('[OfflineAuth] Error getting session:', error)
    return null
  }
}

/**
 * Check if user is authenticated (offline-capable)
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getOfflineUser()
  return user !== null
}

/**
 * Get user ID (offline-capable)
 */
export async function getUserId(): Promise<string | null> {
  const user = await getOfflineUser()
  return user?.id ?? null
}

/**
 * Execute a function that requires user authentication
 * Works offline by using cached session
 */
export async function withAuth<T>(
  callback: (user: User) => Promise<T> | T
): Promise<T | null> {
  try {
    const user = await getOfflineUser()
    if (!user) {
      console.warn('[OfflineAuth] No authenticated user')
      return null
    }
    return await callback(user)
  } catch (error) {
    console.error('[OfflineAuth] Error in withAuth:', error)
    return null
  }
}

/**
 * Try to execute an online operation, fallback to offline mode silently
 */
export async function tryOnline<T>(
  onlineCallback: () => Promise<T>,
  offlineCallback: () => Promise<T> | T
): Promise<T> {
  try {
    return await onlineCallback()
  } catch (error: any) {
    // Network errors: Failed to fetch, ERR_INTERNET_DISCONNECTED, etc.
    if (
      error?.message?.includes('fetch') ||
      error?.message?.includes('network') ||
      error?.code === 'NETWORK_ERROR' ||
      !navigator.onLine
    ) {
      console.log('[OfflineAuth] Network error detected, using offline mode')
      return await offlineCallback()
    }
    // Re-throw non-network errors
    throw error
  }
}

/**
 * Safe auth update that doesn't fail offline
 */
export async function safeAuthUpdate(
  updates: any
): Promise<{ success: boolean; error?: string }> {
  if (!navigator.onLine) {
    console.log('[OfflineAuth] Skipping auth update - offline')
    return { success: false, error: 'offline' }
  }

  try {
    await supabase.auth.updateUser(updates)
    return { success: true }
  } catch (error: any) {
    console.error('[OfflineAuth] Error updating user:', error)
    return { success: false, error: error.message }
  }
}
