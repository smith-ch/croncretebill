"use client"

interface CacheItem<T> {
  data: T
  timestamp: number
  expiresIn: number
}

class GlobalCache {
  private cache = new Map<string, CacheItem<any>>()
  
  set<T>(key: string, data: T, expiresIn: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn
    })
  }
  
  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) {
      return null
    }
    
    const isExpired = Date.now() - item.timestamp > item.expiresIn
    if (isExpired) {
      this.cache.delete(key)
      return null
    }
    
    return item.data as T
  }
  
  delete(key: string) {
    this.cache.delete(key)
  }
  
  clear() {
    this.cache.clear()
  }
  
  // Clear expired items
  cleanup() {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.expiresIn) {
        this.cache.delete(key)
      }
    }
  }
}

export const globalCache = new GlobalCache()

// Cleanup expired items every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    globalCache.cleanup()
  }, 5 * 60 * 1000)
}