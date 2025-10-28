"use client"

import React, { lazy } from 'react'
import { OptimizedSuspense } from '@/components/ui/optimized-suspense'

// Lazy load heavy components
export const LazyDashboard = lazy(() => 
  import('@/app/dashboard/page').then(module => ({ 
    default: module.default 
  }))
)

export const LazyInvoices = lazy(() => 
  import('@/app/invoices/page').then(module => ({ 
    default: module.default 
  }))
)

export const LazyClients = lazy(() => 
  import('@/app/clients/page').then(module => ({ 
    default: module.default 
  }))
)

export const LazyProducts = lazy(() => 
  import('@/app/products/page').then(module => ({ 
    default: module.default 
  }))
)

export const LazyServices = lazy(() => 
  import('@/app/services/page').then(module => ({ 
    default: module.default 
  }))
)

export const LazyInventory = lazy(() => 
  import('@/app/inventory/page').then(module => ({ 
    default: module.default 
  }))
)

// Wrapper component for lazy loaded pages
export function LazyPageWrapper({ 
  children, 
  fallback 
}: { 
  children: React.ReactNode
  fallback?: React.ReactNode 
}) {
  return (
    <OptimizedSuspense fallback={fallback}>
      {children}
    </OptimizedSuspense>
  )
}