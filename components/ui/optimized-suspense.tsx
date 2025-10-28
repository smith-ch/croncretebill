"use client"

import React, { Suspense } from 'react'

interface OptimizedSuspenseProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

const DefaultLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="flex flex-col items-center space-y-3">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      <p className="text-sm text-gray-600 animate-pulse">Cargando...</p>
    </div>
  </div>
)

export function OptimizedSuspense({ children, fallback }: OptimizedSuspenseProps) {
  return (
    <Suspense fallback={fallback || <DefaultLoadingFallback />}>
      {children}
    </Suspense>
  )
}