"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Download } from 'lucide-react'

export function PWAUpdateNotification() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const wb = navigator.serviceWorker

      const showSkipWaitingPrompt = (event: any) => {
        setWaitingWorker(event.detail.waiting)
        setShowUpdatePrompt(true)
      }

      wb.addEventListener('message', showSkipWaitingPrompt)

      // Check if there's a waiting service worker
      wb.ready.then((registration) => {
        if (registration.waiting) {
          setWaitingWorker(registration.waiting)
          setShowUpdatePrompt(true)
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker)
                setShowUpdatePrompt(true)
              }
            })
          }
        })
      })

      // Force update check on load
      wb.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.update()
        })
      })

      return () => {
        wb.removeEventListener('message', showSkipWaitingPrompt)
      }
    }
  }, [])

  const updateApp = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
      setShowUpdatePrompt(false)
      
      // Force refresh after service worker activates
      waitingWorker.addEventListener('statechange', () => {
        if (waitingWorker.state === 'activated') {
          window.location.reload()
        }
      })
    }
  }

  const dismissUpdate = () => {
    setShowUpdatePrompt(false)
  }

  if (!showUpdatePrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Download className="h-6 w-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            Nueva versión disponible
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
            Se ha actualizado ConcreteBill con nuevas funciones y mejoras.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={updateApp}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Actualizar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={dismissUpdate}
              className="px-3 py-1 text-xs"
            >
              Más tarde
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}