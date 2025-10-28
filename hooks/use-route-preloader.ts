"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const COMMON_ROUTES = [
  '/dashboard',
  '/invoices',
  '/clients',
  '/products',
  '/services',
  '/inventory'
]

export function useRoutePreloader() {
  const router = useRouter()

  useEffect(() => {
    // Pre-load common routes after initial load
    const preloadRoutes = () => {
      COMMON_ROUTES.forEach(route => {
        router.prefetch(route)
      })
    }

    // Preload after a small delay to not interfere with initial load
    const timer = setTimeout(preloadRoutes, 1000)
    
    return () => clearTimeout(timer)
  }, [router])

  const preloadRoute = (route: string) => {
    router.prefetch(route)
  }

  return { preloadRoute }
}

// Component to trigger preloading
export function RoutePreloader() {
  useRoutePreloader()
  return null
}