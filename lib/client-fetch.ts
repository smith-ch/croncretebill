/**
 * Client-side data fetching helpers with deduplication
 * Prevents multiple simultaneous requests for the same data
 */

import { globalCache } from './global-cache'

// Map to track in-flight requests
const inflightRequests = new Map<string, Promise<any>>()

/**
 * Fetch data with automatic deduplication
 * If multiple components request the same data simultaneously, only one request is made
 */
export async function fetchWithDedup<T>(
  key: string,
  fetchFn: () => Promise<T>,
  cacheTime: number = 5 * 60 * 1000 // 5 minutes default
): Promise<T> {
  // Check cache first
  const cached = globalCache.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // Check if already fetching
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key)!
  }

  // Start new fetch
  const promise = fetchFn()
    .then(data => {
      // Store in cache
      globalCache.set(key, data, cacheTime)
      return data
    })
    .finally(() => {
      // Clean up inflight request
      inflightRequests.delete(key)
    })

  inflightRequests.set(key, promise)
  return promise
}

/**
 * Helper to generate consistent cache keys
 */
export function getCacheKey(prefix: string, ...parts: (string | number | undefined | null)[]) {
  return `${prefix}:${parts.filter(Boolean).join(':')}`
}

/**
 * Invalidate cache for specific key
 */
export function invalidateCache(key: string) {
  globalCache.delete(key)
}

/**
 * Batch fetch multiple items efficiently
 * Useful for fetching related data in one go
 */
export async function batchFetch<T>(
  items: Array<{ key: string; fetchFn: () => Promise<T> }>,
  cacheTime?: number
): Promise<T[]> {
  return Promise.all(
    items.map(item => fetchWithDedup(item.key, item.fetchFn, cacheTime))
  )
}

/**
 * Common client-side cache TTLs
 */
export const ClientCacheTTL = {
  VERY_SHORT: 30 * 1000,        // 30 seconds
  SHORT: 2 * 60 * 1000,         // 2 minutes
  MEDIUM: 5 * 60 * 1000,        // 5 minutes
  LONG: 10 * 60 * 1000,         // 10 minutes
  VERY_LONG: 30 * 60 * 1000     // 30 minutes
}
