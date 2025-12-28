"use client"

import { useState, useCallback } from 'react'
import { useOnlineStatus } from './use-online-status'
import { offlineCache, CACHE_DURATION } from '@/lib/offline-cache'
import { syncQueue } from '@/lib/sync-queue'
import { useToast } from './use-toast'

interface UseOfflineOperationOptions {
  entity: 'invoice' | 'client' | 'product' | 'service' | 'expense' | 'stock'
  cacheDuration?: number
  showOfflineToast?: boolean
}

/**
 * Hook para manejar operaciones con soporte offline
 * Usa caché para lecturas y cola de sincronización para escrituras
 */
export function useOfflineOperation<T = any>(
  userId: string,
  options: UseOfflineOperationOptions
) {
  const { isOnline } = useOnlineStatus()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Obtener datos con soporte offline
   * Intenta primero desde el servidor, si falla usa caché
   */
  const fetchWithCache = useCallback(async (
    fetcher: () => Promise<T>,
    cacheKey: string
  ): Promise<T | null> => {
    setLoading(true)
    setError(null)

    try {
      if (isOnline) {
        // Intentar obtener del servidor
        try {
          const data = await fetcher()
          
          // Guardar en caché para uso offline
          await offlineCache.set(
            options.entity + 's', // pluralize
            cacheKey,
            data,
            userId,
            options.cacheDuration || CACHE_DURATION.MEDIUM
          )
          
          setLoading(false)
          return data
        } catch (fetchError) {
          console.warn('Fetch failed, trying cache:', fetchError)
          // Si falla, intentar caché
        }
      }

      // Si no hay conexión o falló el fetch, usar caché
      const cached = await offlineCache.get<T>(options.entity + 's', cacheKey)
      
      if (cached) {
        if (options.showOfflineToast) {
          toast({
            title: "📦 Usando datos offline",
            description: "Mostrando última versión disponible",
            duration: 3000,
          })
        }
        setLoading(false)
        return cached
      }

      // No hay datos en caché
      throw new Error('No hay datos disponibles offline')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMsg)
      setLoading(false)
      return null
    }
  }, [isOnline, userId, options, toast])

  /**
   * Obtener lista completa con soporte offline
   */
  const fetchListWithCache = useCallback(async (
    fetcher: () => Promise<T[]>
  ): Promise<T[]> => {
    setLoading(true)
    setError(null)

    try {
      if (isOnline) {
        try {
          const data = await fetcher()
          
          // Guardar cada item en caché
          for (const item of data) {
            const itemId = (item as any).id
            if (itemId) {
              await offlineCache.set(
                options.entity + 's',
                itemId,
                item,
                userId,
                options.cacheDuration || CACHE_DURATION.MEDIUM
              )
            }
          }
          
          setLoading(false)
          return data
        } catch (fetchError) {
          console.warn('Fetch failed, trying cache:', fetchError)
        }
      }

      // Usar caché
      const cached = await offlineCache.getAll<T>(options.entity + 's', userId)
      
      if (cached.length > 0) {
        if (options.showOfflineToast) {
          toast({
            title: "📦 Usando datos offline",
            description: `${cached.length} registros disponibles`,
            duration: 3000,
          })
        }
        setLoading(false)
        return cached
      }

      throw new Error('No hay datos disponibles offline')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMsg)
      setLoading(false)
      return []
    }
  }, [isOnline, userId, options, toast])

  /**
   * Crear con soporte offline
   * Si no hay conexión, agrega a la cola de sincronización
   */
  const createWithQueue = useCallback(async (
    creator: () => Promise<T>,
    data: any
  ): Promise<T | string> => {
    setLoading(true)
    setError(null)

    try {
      if (isOnline) {
        // Intentar crear directamente
        const result = await creator()
        setLoading(false)
        return result
      }

      // Sin conexión: generar ID temporal y guardar en cache
      const tempId = `temp_${options.entity}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const tempData = { ...data, id: tempId }
      
      // Guardar en caché local para uso inmediato
      await offlineCache.set(
        options.entity + 's',
        tempId,
        tempData,
        userId,
        CACHE_DURATION.VERY_LONG // Mantener hasta que se sincronice
      )

      // Agregar a cola de sincronización
      const queueId = syncQueue.add({
        type: 'create',
        entity: options.entity,
        data,
        userId,
        tempId // Guardar el ID temporal para mapeo posterior
      })

      toast({
        title: "📝 Guardado localmente",
        description: "Se sincronizará cuando vuelva la conexión",
        duration: 4000,
      })

      setLoading(false)
      return tempId // Retornar ID temporal para uso inmediato
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMsg)
      
      toast({
        title: "❌ Error",
        description: errorMsg,
        variant: "destructive",
        duration: 5000,
      })
      
      setLoading(false)
      throw err
    }
  }, [isOnline, userId, options, toast])

  /**
   * Actualizar con soporte offline
   */
  const updateWithQueue = useCallback(async (
    updater: () => Promise<T>,
    id: string,
    data: any
  ): Promise<T | string> => {
    setLoading(true)
    setError(null)

    try {
      if (isOnline) {
        const result = await updater()
        
        // Actualizar caché
        await offlineCache.set(
          options.entity + 's',
          id,
          result,
          userId,
          options.cacheDuration || CACHE_DURATION.MEDIUM
        )
        
        setLoading(false)
        return result
      }

      // Sin conexión: agregar a cola
      const queueId = syncQueue.add({
        type: 'update',
        entity: options.entity,
        data: { ...data, id },
        userId
      })

      toast({
        title: "📝 Actualizado localmente",
        description: "Se sincronizará cuando vuelva la conexión",
        duration: 4000,
      })

      setLoading(false)
      return queueId
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMsg)
      
      toast({
        title: "❌ Error",
        description: errorMsg,
        variant: "destructive",
        duration: 5000,
      })
      
      setLoading(false)
      throw err
    }
  }, [isOnline, userId, options, toast])

  /**
   * Eliminar con soporte offline
   */
  const deleteWithQueue = useCallback(async (
    deleter: () => Promise<void>,
    id: string
  ): Promise<void | string> => {
    setLoading(true)
    setError(null)

    try {
      if (isOnline) {
        await deleter()
        
        // Eliminar de caché
        await offlineCache.delete(options.entity + 's', id)
        
        setLoading(false)
        return
      }

      // Sin conexión: agregar a cola
      const queueId = syncQueue.add({
        type: 'delete',
        entity: options.entity,
        data: { id },
        userId
      })

      toast({
        title: "🗑️ Eliminado localmente",
        description: "Se sincronizará cuando vuelva la conexión",
        duration: 4000,
      })

      setLoading(false)
      return queueId
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMsg)
      
      toast({
        title: "❌ Error",
        description: errorMsg,
        variant: "destructive",
        duration: 5000,
      })
      
      setLoading(false)
      throw err
    }
  }, [isOnline, userId, options, toast])

  return {
    isOnline,
    loading,
    error,
    fetchWithCache,
    fetchListWithCache,
    createWithQueue,
    updateWithQueue,
    deleteWithQueue,
  }
}
