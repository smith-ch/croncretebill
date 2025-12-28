/**
 * Cola de sincronización para operaciones pendientes cuando no hay conexión
 * Las acciones se guardan en localStorage y se sincronizan cuando vuelve la conexión
 */

const QUEUE_KEY = 'concretebill_sync_queue'
const MAX_RETRIES = 3

export interface PendingAction {
  id: string
  type: 'create' | 'update' | 'delete'
  entity: 'invoice' | 'client' | 'product' | 'expense' | 'stock' | 'service'
  data: any
  userId: string
  timestamp: number
  retries: number
  status: 'pending' | 'syncing' | 'failed' | 'completed'
  error?: string
  tempId?: string // ID temporal para mapeo después de sincronizar
  realId?: string // ID real asignado por el servidor
}

class SyncQueue {
  private queue: PendingAction[] = []
  private isSyncing = false
  private listeners: Set<() => void> = new Set()

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadQueue()
      
      // Escuchar evento de reconexión
      window.addEventListener('app:reconnected', () => {
        this.syncAll()
      })

      // Auto-sync periódico (cada 30 segundos si hay conexión)
      setInterval(() => {
        if (navigator.onLine && this.queue.length > 0) {
          this.syncAll()
        }
      }, 30000)
    }
  }

  /**
   * Cargar cola desde localStorage
   */
  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(QUEUE_KEY)
      if (stored) {
        this.queue = JSON.parse(stored)
        console.log(`📋 Loaded ${this.queue.length} pending actions from queue`)
      }
    } catch (error) {
      console.error('Error loading sync queue:', error)
      this.queue = []
    }
  }

  /**
   * Guardar cola en localStorage
   */
  private saveQueue(): void {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue))
      this.notifyListeners()
    } catch (error) {
      console.error('Error saving sync queue:', error)
    }
  }

  /**
   * Agregar acción a la cola
   */
  add(action: Omit<PendingAction, 'id' | 'timestamp' | 'retries' | 'status'>): string {
    const id = `${action.type}_${action.entity}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const pendingAction: PendingAction = {
      ...action,
      id,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending'
    }

    this.queue.push(pendingAction)
    this.saveQueue()

    console.log(`➕ Added to sync queue: ${action.type} ${action.entity}`, id)

    // Intentar sincronizar inmediatamente si hay conexión
    if (navigator.onLine) {
      setTimeout(() => this.syncAll(), 1000)
    }

    return id
  }

  /**
   * Obtener todas las acciones pendientes
   */
  getAll(): PendingAction[] {
    return [...this.queue]
  }

  /**
   * Obtener acciones por estado
   */
  getByStatus(status: PendingAction['status']): PendingAction[] {
    return this.queue.filter(action => action.status === status)
  }

  /**
   * Obtener cantidad de acciones pendientes
   */
  getPendingCount(): number {
    return this.queue.filter(action => action.status === 'pending').length
  }

  /**
   * Sincronizar todas las acciones pendientes
   */
  async syncAll(): Promise<void> {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress')
      return
    }

    if (!navigator.onLine) {
      console.log('🔴 No connection, skipping sync')
      return
    }

    const pendingActions = this.queue.filter(
      action => action.status === 'pending' && action.retries < MAX_RETRIES
    )

    if (pendingActions.length === 0) {
      console.log('✅ No pending actions to sync')
      return
    }

    console.log(`🔄 Starting sync of ${pendingActions.length} actions`)
    this.isSyncing = true

    for (const action of pendingActions) {
      await this.syncAction(action)
      await new Promise(resolve => setTimeout(resolve, 500)) // Pequeño delay entre acciones
    }

    this.isSyncing = false
    this.cleanCompleted()
    
    console.log(`✅ Sync completed. ${this.getPendingCount()} actions remaining`)
  }

  /**
   * Sincronizar una acción específica
   */
  private async syncAction(action: PendingAction): Promise<void> {
    action.status = 'syncing'
    this.saveQueue()

    try {
      // Determinar endpoint según entidad y tipo
      const endpoint = this.getEndpoint(action)
      const method = this.getMethod(action.type)

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(action.data),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      // Si es una creación, guardar el mapeo del ID temporal al ID real
      if (action.type === 'create' && action.tempId && result.id) {
        action.realId = result.id
        
        // Actualizar el cache con el ID real
        await this.updateCacheIds(action.entity, action.tempId, result.id, action.userId)
        
        console.log(`🔄 Mapped temp ID ${action.tempId} to real ID ${result.id}`)
      }

      // Éxito
      action.status = 'completed'
      console.log(`✅ Synced: ${action.type} ${action.entity}`, action.id)
    } catch (error) {
      // Error
      action.retries++
      action.error = error instanceof Error ? error.message : 'Unknown error'
      
      if (action.retries >= MAX_RETRIES) {
        action.status = 'failed'
        console.error(`❌ Failed after ${MAX_RETRIES} retries: ${action.type} ${action.entity}`, action.id)
      } else {
        action.status = 'pending'
        console.warn(`⚠️ Retry ${action.retries}/${MAX_RETRIES}: ${action.type} ${action.entity}`, action.id)
      }
    }

    this.saveQueue()
  }

  /**
   * Actualizar IDs en el cache después de sincronizar
   */
  private async updateCacheIds(entity: string, tempId: string, realId: string, userId: string): Promise<void> {
    try {
      const { offlineCache } = await import('./offline-cache')
      
      // Obtener el item con ID temporal del cache
      const items = await offlineCache.getAll(entity, userId)
      const item = items.find((i: any) => i.id === tempId)
      
      if (item) {
        // Eliminar el item con ID temporal
        // Nota: IndexedDB no tiene un método directo para actualizar keys,
        // así que eliminamos y recreamos con el nuevo ID
        const db = await this.openDB()
        const tx = db.transaction(entity, 'readwrite')
        const store = tx.objectStore(entity)
        
        // Eliminar item con ID temporal
        await store.delete(tempId)
        
        // Crear nuevo item con ID real
        const newItem = { ...item, id: realId }
        await store.put(newItem)
        
        await tx.done
        
        console.log(`✅ Updated cache: ${tempId} → ${realId}`)
      }
    } catch (error) {
      console.error('Error updating cache IDs:', error)
    }
  }

  private async openDB(): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('concretebill_offline', 2)
      request.onsuccess = () => { resolve(request.result) }
      request.onerror = () => { reject(request.error) }
    })
  }

  /**
   * Obtener endpoint para la acción
   */
  private getEndpoint(action: PendingAction): string {
    const base = '/api'
    
    switch (action.entity) {
      case 'invoice':
        return action.type === 'create' ? `${base}/invoices` : `${base}/invoices/${action.data.id}`
      case 'client':
        return action.type === 'create' ? `${base}/clients` : `${base}/clients/${action.data.id}`
      case 'product':
        return action.type === 'create' ? `${base}/products` : `${base}/products/${action.data.id}`
      case 'service':
        return action.type === 'create' ? `${base}/services` : `${base}/services/${action.data.id}`
      case 'expense':
        return action.type === 'create' ? `${base}/expenses` : `${base}/expenses/${action.data.id}`
      case 'stock':
        return `${base}/inventory/stock`
      default:
        throw new Error(`Unknown entity: ${action.entity}`)
    }
  }

  /**
   * Obtener método HTTP para el tipo de acción
   */
  private getMethod(type: PendingAction['type']): string {
    switch (type) {
      case 'create': return 'POST'
      case 'update': return 'PUT'
      case 'delete': return 'DELETE'
      default: return 'POST'
    }
  }

  /**
   * Eliminar una acción específica
   */
  remove(id: string): void {
    this.queue = this.queue.filter(action => action.id !== id)
    this.saveQueue()
    console.log(`🗑️ Removed action from queue: ${id}`)
  }

  /**
   * Limpiar acciones completadas (mantener solo últimas 10)
   */
  private cleanCompleted(): void {
    const completed = this.queue.filter(action => action.status === 'completed')
    
    if (completed.length > 10) {
      // Ordenar por timestamp y mantener solo las últimas 10
      completed.sort((a, b) => b.timestamp - a.timestamp)
      const toRemove = completed.slice(10)
      
      this.queue = this.queue.filter(
        action => !toRemove.find(removed => removed.id === action.id)
      )
      
      this.saveQueue()
      console.log(`🧹 Cleaned ${toRemove.length} completed actions`)
    }
  }

  /**
   * Limpiar acciones fallidas permanentemente
   */
  clearFailed(): void {
    const failedCount = this.queue.filter(action => action.status === 'failed').length
    this.queue = this.queue.filter(action => action.status !== 'failed')
    this.saveQueue()
    console.log(`🗑️ Cleared ${failedCount} failed actions`)
  }

  /**
   * Reintentar acciones fallidas
   */
  retryFailed(): void {
    this.queue.forEach(action => {
      if (action.status === 'failed') {
        action.status = 'pending'
        action.retries = 0
        action.error = undefined
      }
    })
    this.saveQueue()
    
    if (navigator.onLine) {
      this.syncAll()
    }
  }

  /**
   * Limpiar toda la cola
   */
  clearAll(): void {
    this.queue = []
    this.saveQueue()
    console.log('🗑️ Sync queue cleared')
  }

  /**
   * Suscribirse a cambios en la cola
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Notificar a los listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener())
  }

  /**
   * Obtener estadísticas
   */
  getStats() {
    return {
      total: this.queue.length,
      pending: this.getByStatus('pending').length,
      syncing: this.getByStatus('syncing').length,
      completed: this.getByStatus('completed').length,
      failed: this.getByStatus('failed').length,
      isSyncing: this.isSyncing
    }
  }
}

// Singleton instance
export const syncQueue = new SyncQueue()
