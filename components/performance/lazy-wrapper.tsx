"use client"

import type React from "react"

import { Suspense, lazy, type ComponentType } from "react"
import { OptimizedSkeleton } from "@/components/ui/optimized-skeleton"
import { ErrorBoundary } from "@/components/error-boundary"

interface LazyWrapperProps {
  importFn: () => Promise<{ default: ComponentType<any> }>
  fallback?: React.ReactNode
  errorFallback?: ComponentType<{ error?: Error; resetError: () => void }>
  [key: string]: any
}

export function LazyWrapper({
  importFn,
  fallback = <OptimizedSkeleton variant="card" />,
  errorFallback,
  ...props
}: LazyWrapperProps) {
  const LazyComponent = lazy(importFn)

  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  )
}
