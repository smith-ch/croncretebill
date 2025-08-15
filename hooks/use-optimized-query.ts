"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface QueryOptions<T> {
  queryKey: string[]
  queryFn: () => Promise<T>
  staleTime?: number
  cacheTime?: number
  refetchOnWindowFocus?: boolean
  enabled?: boolean
}

interface QueryResult<T> {
  data: T | undefined
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  isStale: boolean
}

// Simple in-memory cache
const queryCache = new Map<string, { data: any; timestamp: number; staleTime: number }>()

export function useOptimizedQuery<T>({
  queryKey,
  queryFn,
  staleTime = 5 * 60 * 1000, // 5 minutes
  cacheTime = 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus = true,
  enabled = true,
}: QueryOptions<T>): QueryResult<T> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isStale, setIsStale] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)
  const cacheKey = queryKey.join("-")

  const fetchData = useCallback(async () => {
    if (!enabled) return

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Check cache first
    const cached = queryCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < cached.staleTime) {
      setData(cached.data)
      setIsStale(false)
      return
    }

    setIsLoading(true)
    setError(null)

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    try {
      const result = await queryFn()

      // Update cache
      queryCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        staleTime,
      })

      setData(result)
      setIsStale(false)
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err)
      }
    } finally {
      setIsLoading(false)
    }
  }, [queryKey, queryFn, enabled, cacheKey, staleTime])

  const refetch = useCallback(async () => {
    // Force refetch by removing from cache
    queryCache.delete(cacheKey)
    await fetchData()
  }, [cacheKey, fetchData])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Check if data is stale
  useEffect(() => {
    const cached = queryCache.get(cacheKey)
    if (cached) {
      const isDataStale = Date.now() - cached.timestamp > cached.staleTime
      setIsStale(isDataStale)
    }
  }, [cacheKey, staleTime])

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return

    const handleFocus = () => {
      if (isStale) {
        fetchData()
      }
    }

    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [refetchOnWindowFocus, isStale, fetchData])

  // Cleanup cache periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now()
      for (const [key, value] of queryCache.entries()) {
        if (now - value.timestamp > cacheTime) {
          queryCache.delete(key)
        }
      }
    }, cacheTime)

    return () => clearInterval(cleanup)
  }, [cacheTime])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    data,
    isLoading,
    error,
    refetch,
    isStale,
  }
}
