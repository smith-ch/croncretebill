"use client"

import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface UseAutoLogoutOptions {
  timeoutMinutes?: number
  onWarning?: (minutesLeft: number) => void
  onLogout?: () => void
}

export function useAutoLogout(options: UseAutoLogoutOptions = {}) {
  const { timeoutMinutes = 30, onWarning, onLogout } = options
  const router = useRouter()
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const lastActivityRef = useRef<number>(Date.now())

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      router.push('/auth/login')
      onLogout?.()
    } catch (error) {
      console.error('Error during auto-logout:', error)
    }
  }, [router, onLogout])

  const showWarning = useCallback((minutesLeft: number) => {
    onWarning?.(minutesLeft)
  }, [onWarning])

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now()

    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
    }

    // Set warning timer (5 minutes before logout)
    const warningTime = Math.max(0, (timeoutMinutes - 5) * 60 * 1000)
    if (warningTime > 0) {
      warningTimeoutRef.current = setTimeout(() => {
        showWarning(5)
      }, warningTime)
    }

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      logout()
    }, timeoutMinutes * 60 * 1000)
  }, [timeoutMinutes, logout, showWarning])

  const checkActivity = useCallback(() => {
    const now = Date.now()
    const timeSinceLastActivity = now - lastActivityRef.current
    const timeoutMs = timeoutMinutes * 60 * 1000

    if (timeSinceLastActivity >= timeoutMs) {
      logout()
    } else {
      // Calculate remaining time and show warning if needed
      const remainingMs = timeoutMs - timeSinceLastActivity
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000))
      
      if (remainingMinutes <= 5 && remainingMinutes > 0) {
        showWarning(remainingMinutes)
      }
    }
  }, [timeoutMinutes, logout, showWarning])

  useEffect(() => {
    let cleanupFunctions: (() => void)[] = []
    let checkInterval: NodeJS.Timeout | null = null
    
    const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          return
        }

        // Add event listeners
        activities.forEach(activity => {
          document.addEventListener(activity, resetTimer, true)
        })

        // Check for page visibility changes
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            checkActivity()
          }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)

        cleanupFunctions.push(() => {
          document.removeEventListener('visibilitychange', handleVisibilityChange)
        })

        // Initial timer setup
        resetTimer()

        // Periodic check (every minute)
        checkInterval = setInterval(checkActivity, 60 * 1000)
      } catch (error) {
        // Silently fail if we can't check auth
        console.log('[AutoLogout] Cannot check auth, skipping')
      }
    }

    init()

    // Cleanup function
    return () => {
      activities.forEach(activity => {
        document.removeEventListener(activity, resetTimer, true)
      })
      
      cleanupFunctions.forEach(fn => fn())
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current)
      }
      if (checkInterval) {
        clearInterval(checkInterval)
      }
    }
  }, [resetTimer, checkActivity, timeoutMinutes])

  return {
    resetTimer,
    logout
  }
}