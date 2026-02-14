"use client"

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { syncQueue, PendingAction } from '@/lib/sync-queue'
import { Wifi, WifiOff, RefreshCw, Trash2, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export function OfflineIndicator() {
  const { isOnline } = useOnlineStatus()
  const [stats, setStats] = useState(syncQueue.getStats())
  const [actions, setActions] = useState<PendingAction[]>([])

  useEffect(() => {
    // Actualizar stats cada segundo
    const interval = setInterval(() => {
      setStats(syncQueue.getStats())
      setActions(syncQueue.getAll())
    }, 1000)

    // Suscribirse a cambios en la cola
    const unsubscribe = syncQueue.subscribe(() => {
      setStats(syncQueue.getStats())
      setActions(syncQueue.getAll())
    })

    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  }, [])

  const handleSync = () => {
    syncQueue.syncAll()
  }

  const handleRetryFailed = () => {
    syncQueue.retryFailed()
  }

  const handleClearFailed = () => {
    syncQueue.clearFailed()
  }

  const getStatusColor = () => {
    if (!isOnline) { return 'destructive' }
    if (stats.failed > 0) { return 'destructive' }
    if (stats.pending > 0 || stats.syncing > 0) { return 'default' }
    return 'secondary'
  }

  const getStatusText = () => {
    if (!isOnline) { return 'Sin conexión' }
    if (stats.syncing > 0) { return 'Sincronizando...' }
    if (stats.pending > 0) { return `${stats.pending} pendiente${stats.pending > 1 ? 's' : ''}` }
    if (stats.failed > 0) { return `${stats.failed} fallida${stats.failed > 1 ? 's' : ''}` }
    return 'Conectado'
  }

  const getStatusIcon = () => {
    if (!isOnline) { return <WifiOff className="h-3 w-3" /> }
    if (stats.syncing > 0) { return <RefreshCw className="h-3 w-3 animate-spin" /> }
    if (stats.pending > 0) { return <Clock className="h-3 w-3" /> }
    if (stats.failed > 0) { return <AlertCircle className="h-3 w-3" /> }
    return <Wifi className="h-3 w-3" />
  }

  const getActionIcon = (status: PendingAction['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-3 w-3 text-amber-500" />
      case 'syncing': return <RefreshCw className="h-3 w-3 text-blue-500 animate-spin" />
      case 'completed': return <CheckCircle2 className="h-3 w-3 text-green-500" />
      case 'failed': return <AlertCircle className="h-3 w-3 text-red-500" />
    }
  }

  const getActionLabel = (action: PendingAction) => {
    const entity = {
      invoice: 'Factura',
      client: 'Cliente',
      product: 'Producto',
      service: 'Servicio',
      expense: 'Gasto',
      stock: 'Stock'
    }[action.entity] || action.entity

    const type = {
      create: 'Crear',
      update: 'Actualizar',
      delete: 'Eliminar'
    }[action.type] || action.type

    return `${type} ${entity}`
  }

  // No mostrar si todo está bien y online
  if (isOnline && stats.total === 0) {
    return null
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge 
          variant={getStatusColor()}
          className={cn(
            "cursor-pointer hover:opacity-80 transition-all gap-1.5",
            !isOnline && "animate-pulse"
          )}
        >
          {getStatusIcon()}
          <span className="text-xs font-medium">{getStatusText()}</span>
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <h4 className="font-semibold text-sm">
                {isOnline ? 'Conectado' : 'Sin conexión'}
              </h4>
            </div>
            {isOnline && stats.pending > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSync}
                disabled={stats.syncing > 0}
                className="h-7 text-xs"
              >
                <RefreshCw className={cn(
                  "h-3 w-3 mr-1",
                  stats.syncing > 0 && "animate-spin"
                )} />
                Sincronizar
              </Button>
            )}
          </div>

          {/* Stats */}
          {stats.total > 0 && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 rounded p-2">
                <div className="text-slate-400">Pendientes</div>
                <div className="font-bold text-amber-600">{stats.pending}</div>
              </div>
              <div className="bg-slate-50 rounded p-2">
                <div className="text-slate-400">Completadas</div>
                <div className="font-bold text-green-600">{stats.completed}</div>
              </div>
              {stats.failed > 0 && (
                <div className="bg-red-900/30 rounded p-2 col-span-2">
                  <div className="text-red-600">Fallidas</div>
                  <div className="font-bold text-red-600">{stats.failed}</div>
                </div>
              )}
            </div>
          )}

          {/* Lista de acciones */}
          {actions.length > 0 && (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              <div className="text-xs font-semibold text-slate-400 mb-2">
                Acciones recientes:
              </div>
              {actions.slice(0, 10).map((action) => (
                <div 
                  key={action.id}
                  className="flex items-center gap-2 text-xs p-2 bg-slate-50 rounded"
                >
                  {getActionIcon(action.status)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {getActionLabel(action)}
                    </div>
                    {action.error && (
                      <div className="text-red-500 text-[10px] truncate">
                        {action.error}
                      </div>
                    )}
                  </div>
                  {action.retries > 0 && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1">
                      Intento {action.retries}/3
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Acciones */}
          {stats.failed > 0 && (
            <div className="flex gap-2 pt-2 border-t">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetryFailed}
                className="flex-1 h-8 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reintentar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearFailed}
                className="flex-1 h-8 text-xs text-red-600"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Limpiar
              </Button>
            </div>
          )}

          {/* Mensaje offline */}
          {!isOnline && (
            <div className="bg-amber-900/30 border border-amber-800 rounded p-3 text-xs text-amber-300">
              <div className="font-semibold mb-1">Modo Offline</div>
              <div>
                Puedes seguir trabajando. Los cambios se sincronizarán automáticamente cuando vuelva la conexión.
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
