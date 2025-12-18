/**
 * Server-side caching system for optimizing database queries
 * Only works in server-side context (API routes, server components)
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class ServerCache {
  private cache = new Map<string, CacheEntry<any>>()
  private requestCache = new Map<string, Map<string, Promise<any>>>()

  /**
   * Get cached data or execute fetch function if not in cache
   */
  async get<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 5 * 60 * 1000 // 5 minutes default
  ): Promise<T> {
    const cached = this.cache.get(key)
    
    // Check if cached data is still valid
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T
    }

    // Fetch fresh data
    const data = await fetchFn()
    
    // Store in cache
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })

    return data
  }

  /**
   * Request-scoped caching to prevent duplicate queries in the same request
   * Useful for preventing N+1 queries
   */
  async getOrFetch<T>(
    requestId: string,
    key: string,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    // Get or create request-specific cache
    if (!this.requestCache.has(requestId)) {
      this.requestCache.set(requestId, new Map())
    }
    
    const reqCache = this.requestCache.get(requestId)!
    
    // Check if already fetching or fetched
    if (reqCache.has(key)) {
      return reqCache.get(key)
    }

    // Start fetching and store the promise
    const promise = fetchFn()
    reqCache.set(key, promise)

    // Clean up request cache after completion
    promise.finally(() => {
      setTimeout(() => {
        this.requestCache.delete(requestId)
      }, 1000)
    })

    return promise
  }

  /**
   * Invalidate cache for a specific key
   */
  invalidate(key: string) {
    this.cache.delete(key)
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string | RegExp) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear()
    this.requestCache.clear()
  }

  /**
   * Clean expired entries
   */
  cleanup() {
    const now = Date.now()
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      entries: this.cache.size,
      requestCaches: this.requestCache.size
    }
  }
}

// Export singleton instance
export const serverCache = new ServerCache()

// Cleanup expired entries every 10 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    serverCache.cleanup()
  }, 10 * 60 * 1000)
}

/**
 * Helper function to generate cache keys
 */
export function getCacheKey(prefix: string, ...parts: (string | number)[]) {
  return `${prefix}:${parts.join(':')}`
}

/**
 * Common cache TTLs
 */
export const CacheTTL = {
  VERY_SHORT: 60 * 1000,        // 1 minute
  SHORT: 5 * 60 * 1000,         // 5 minutes
  MEDIUM: 15 * 60 * 1000,       // 15 minutes
  LONG: 60 * 60 * 1000,         // 1 hour
  VERY_LONG: 24 * 60 * 60 * 1000 // 24 hours
}
