/**
 * Sistema de caché offline usando IndexedDB
 * Permite almacenar datos localmente cuando no hay conexión
 */

const DB_NAME = 'concretebill_offline_cache'
const DB_VERSION = 2
const CACHE_DURATION = {
  SHORT: 5 * 60 * 1000,      // 5 minutos
  MEDIUM: 15 * 60 * 1000,     // 15 minutos
  LONG: 60 * 60 * 1000,       // 1 hora
  VERY_LONG: 24 * 60 * 60 * 1000  // 24 horas
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  userId: string
}

class OfflineCache {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  async init(): Promise<void> {
    if (this.db) { return }
    if (this.initPromise) { return this.initPromise }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('Error opening IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('✅ IndexedDB initialized')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Store para facturas
        if (!db.objectStoreNames.contains('invoices')) {
          const invoiceStore = db.createObjectStore('invoices', { keyPath: 'id' })
          invoiceStore.createIndex('userId', 'userId', { unique: false })
          invoiceStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Store para clientes
        if (!db.objectStoreNames.contains('clients')) {
          const clientStore = db.createObjectStore('clients', { keyPath: 'id' })
          clientStore.createIndex('userId', 'userId', { unique: false })
          clientStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Store para productos
        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'id' })
          productStore.createIndex('userId', 'userId', { unique: false })
          productStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Store para servicios
        if (!db.objectStoreNames.contains('services')) {
          const serviceStore = db.createObjectStore('services', { keyPath: 'id' })
          serviceStore.createIndex('userId', 'userId', { unique: false })
          serviceStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Store para company settings
        if (!db.objectStoreNames.contains('companySettings')) {
          const settingsStore = db.createObjectStore('companySettings', { keyPath: 'userId' })
          settingsStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        // Store para dashboard stats
        if (!db.objectStoreNames.contains('dashboardStats')) {
          const statsStore = db.createObjectStore('dashboardStats', { keyPath: 'userId' })
          statsStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        console.log('📦 IndexedDB stores created')
      }
    })

    return this.initPromise
  }

  /**
   * Guardar datos en caché
   */
  async set<T>(
    storeName: string,
    key: string,
    data: T,
    userId: string,
    ttl: number = CACHE_DURATION.MEDIUM
  ): Promise<void> {
    await this.init()
    if (!this.db) { throw new Error('Database not initialized') }

    const transaction = this.db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      userId
    }

    return new Promise((resolve, reject) => {
      const request = store.put({ ...entry, id: key })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Obtener datos de caché
   */
  async get<T>(storeName: string, key: string): Promise<T | null> {
    await this.init()
    if (!this.db) { return null }

    const transaction = this.db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)

    return new Promise((resolve, reject) => {
      const request = store.get(key)
      
      request.onsuccess = () => {
        const entry = request.result as CacheEntry<T> | undefined
        
        if (!entry) {
          resolve(null)
          return
        }

        // Verificar si expiró
        const age = Date.now() - entry.timestamp
        if (age > entry.ttl) {
          // Cache expirado, eliminar
          this.delete(storeName, key)
          resolve(null)
          return
        }

        resolve(entry.data)
      }
      
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Obtener todos los items de un store para un usuario
   */
  async getAll<T>(storeName: string, userId: string): Promise<T[]> {
    await this.init()
    if (!this.db) { return [] }

    const transaction = this.db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const index = store.index('userId')

    return new Promise((resolve, reject) => {
      const request = index.getAll(userId)
      
      request.onsuccess = () => {
        const entries = request.result as CacheEntry<T>[]
        const now = Date.now()
        
        // Filtrar expirados y retornar solo los datos
        const validData = entries
          .filter(entry => (now - entry.timestamp) <= entry.ttl)
          .map(entry => entry.data)
        
        resolve(validData)
      }
      
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Eliminar entrada específica
   */
  async delete(storeName: string, key: string): Promise<void> {
    await this.init()
    if (!this.db) { return }

    const transaction = this.db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)

    return new Promise((resolve, reject) => {
      const request = store.delete(key)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Limpiar todo el caché de un usuario
   */
  async clearUserCache(userId: string): Promise<void> {
    await this.init()
    if (!this.db) { return }

    const stores = ['invoices', 'clients', 'products', 'companySettings', 'dashboardStats']
    
    for (const storeName of stores) {
      const transaction = this.db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const index = store.index('userId')
      
      const request = index.getAllKeys(userId)
      
      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          const keys = request.result
          let deleteCount = keys.length
          
          if (deleteCount === 0) {
            resolve()
            return
          }

          keys.forEach(key => {
            const deleteRequest = store.delete(key)
            deleteRequest.onsuccess = () => {
              deleteCount--
              if (deleteCount === 0) { resolve() }
            }
            deleteRequest.onerror = () => reject(deleteRequest.error)
          })
        }
        
        request.onerror = () => reject(request.error)
      })
    }

    console.log('🗑️ Cache cleared for user:', userId)
  }

  /**
   * Limpiar cache expirado (maintenance)
   */
  async cleanExpired(): Promise<void> {
    await this.init()
    if (!this.db) { return }

    const stores = ['invoices', 'clients', 'products', 'companySettings', 'dashboardStats']
    const now = Date.now()

    for (const storeName of stores) {
      const transaction = this.db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      
      const request = store.openCursor()
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        
        if (cursor) {
          const entry = cursor.value as CacheEntry<any>
          const age = now - entry.timestamp
          
          if (age > entry.ttl) {
            cursor.delete()
          }
          
          cursor.continue()
        }
      }
    }

    console.log('🧹 Expired cache cleaned')
  }

  /**
   * Obtener estadísticas de caché
   */
  async getStats(): Promise<{
    invoices: number
    clients: number
    products: number
    totalSize: number
  }> {
    await this.init()
    if (!this.db) { return { invoices: 0, clients: 0, products: 0, totalSize: 0 } }

    const stats = {
      invoices: await this.getStoreCount('invoices'),
      clients: await this.getStoreCount('clients'),
      products: await this.getStoreCount('products'),
      totalSize: 0
    }

    // Estimar tamaño (aproximado)
    stats.totalSize = (stats.invoices * 5) + (stats.clients * 2) + (stats.products * 1) // KB aproximados

    return stats
  }

  private async getStoreCount(storeName: string): Promise<number> {
    if (!this.db) { return 0 }

    const transaction = this.db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)

    return new Promise((resolve, reject) => {
      const request = store.count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
}

// Singleton instance
export const offlineCache = new OfflineCache()

// Auto-limpieza periódica (cada hora)
if (typeof window !== 'undefined') {
  setInterval(() => {
    offlineCache.cleanExpired()
  }, 60 * 60 * 1000)
}

export { CACHE_DURATION }
