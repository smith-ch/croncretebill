'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRefresh = () => {
    if (isOnline) {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 dark:bg-gray-900">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-900/30 dark:bg-red-900/20 mb-4">
            {isOnline ? (
              <Wifi className="h-8 w-8 text-green-600 dark:text-green-400" />
            ) : (
              <WifiOff className="h-8 w-8 text-red-600 dark:text-red-400" />
            )}
          </div>
          
          <h1 className="text-2xl font-bold text-slate-200 dark:text-white mb-2">
            {isOnline ? 'Reconectando...' : 'Sin conexión'}
          </h1>
          
          <p className="text-slate-400 dark:text-gray-400 mb-6">
            {isOnline 
              ? 'Se ha restaurado la conexión. Actualizando...'
              : 'No hay conexión a internet. Algunas funciones pueden no estar disponibles.'
            }
          </p>

          {isOnline && (
            <div className="mb-6">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-blue-600" />
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleRefresh}
              disabled={!isOnline}
              className={`w-full py-2 px-4 rounded-md font-medium ${
                isOnline
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              {isOnline ? 'Actualizar página' : 'Esperando conexión...'}
            </button>
            
            <button
              onClick={() => window.history.back()}
              className="w-full py-2 px-4 rounded-md font-medium bg-gray-200 dark:bg-gray-800 text-slate-300 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
            >
              Volver
            </button>
          </div>

          <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
            <p>ConcreteBill funciona offline con datos almacenados localmente.</p>
          </div>
        </div>
      </div>
    </div>
  )
}