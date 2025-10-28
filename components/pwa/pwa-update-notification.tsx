"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Download, X } from 'lucide-react'

interface PWAUpdateEvent extends CustomEvent {
  detail: {
    registration: ServiceWorkerRegistration
    newWorker: ServiceWorker
  }
}

export function PWAUpdateNotification() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    // Listen for PWA update events from our optimized script
    const handlePWAUpdate = (event: PWAUpdateEvent) => {
      console.log('PWA update available')
      setWaitingWorker(event.detail.newWorker)
      setShowUpdatePrompt(true)
    }

    // Listen for cache update events
    const handleCacheUpdate = (event: CustomEvent) => {
      console.log('PWA cache updated:', event.detail.message)
    }

    window.addEventListener('pwa-update-available', handlePWAUpdate as any)
    window.addEventListener('pwa-cache-updated', handleCacheUpdate as any)

    return () => {
      window.removeEventListener('pwa-update-available', handlePWAUpdate as any)
      window.removeEventListener('pwa-cache-updated', handleCacheUpdate as any)
    }
  }, [])

  const handleUpdate = async () => {
    if (waitingWorker) {
      // Tell the waiting service worker to skip waiting
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
      
      // Reload the page to activate the new service worker
      setTimeout(() => {
        window.location.reload()
      }, 500)
    }
  }

  const dismissUpdate = () => {
    setShowUpdatePrompt(false)
    setWaitingWorker(null)
  }

  if (!showUpdatePrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4 border border-blue-500">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Download className="h-5 w-5 text-blue-200" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">
              Nueva versión disponible
            </h3>
            <p className="text-xs text-blue-100 mb-3">
              Hay una actualización de ConcreteBill lista para instalar.
            </p>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="secondary"
                onClick={handleUpdate}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Actualizar
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={dismissUpdate}
                className="text-xs text-blue-100 hover:text-white hover:bg-blue-700"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}