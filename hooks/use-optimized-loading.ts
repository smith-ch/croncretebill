"use client"

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseOptimizedLoadingOptions {
  minLoadingTime?: number // Minimum loading time to prevent flashing
  maxLoadingTime?: number // Maximum loading time before timeout
  cacheKey?: string // Cache key for storing results
  cacheDuration?: number // Cache duration in milliseconds
}

export function useOptimizedLoading<T>(
  loadingFunction: () => Promise<T>,
  options: UseOptimizedLoadingOptions = {}
) {
  const {
    minLoadingTime = 300,
    maxLoadingTime = 5000,
    cacheKey,
    cacheDuration = 5 * 60 * 1000 // 5 minutes
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const loadData = useCallback(async (force = false) => {
    // Check cache first
    if (cacheKey && !force) {
      try {
        const cached = localStorage.getItem(`cache_${cacheKey}`)
        const cacheTime = localStorage.getItem(`cache_time_${cacheKey}`)
        
        if (cached && cacheTime) {
          const age = Date.now() - parseInt(cacheTime)
          if (age < cacheDuration) {
            const parsedData = JSON.parse(cached)
            setData(parsedData)
            return parsedData
          }
        }
      } catch (e) {
        // Cache error, proceed with loading
      }
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setLoading(true)
    setError(null)

    const startTime = Date.now()

    try {
      // Set timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Loading timeout')), maxLoadingTime)
      })

      // Race between loading and timeout
      const result = await Promise.race([
        loadingFunction(),
        timeoutPromise
      ])

      // Ensure minimum loading time to prevent flashing
      const elapsedTime = Date.now() - startTime
      if (elapsedTime < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime))
      }

      setData(result)

      // Cache the result
      if (cacheKey) {
        try {
          localStorage.setItem(`cache_${cacheKey}`, JSON.stringify(result))
          localStorage.setItem(`cache_time_${cacheKey}`, Date.now().toString())
        } catch (e) {
          // Cache storage error, not critical
        }
      }

      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Loading failed')
      setError(error)
      throw error
    } finally {
      setLoading(false)
      abortControllerRef.current = null
    }
  }, [loadingFunction, cacheKey, cacheDuration, minLoadingTime, maxLoadingTime])

  const refresh = useCallback(() => {
    return loadData(true)
  }, [loadData])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    data,
    loading,
    error,
    refresh,
    loadData
  }
}