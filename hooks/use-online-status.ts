"use client"

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Estado inicial
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      
      if (wasOffline) {
        // Se reconectó después de estar offline
        toast({
          title: "✅ Conexión restaurada",
          description: "Sincronizando datos pendientes...",
          duration: 3000,
        })
        
        // Disparar evento para sincronización
        window.dispatchEvent(new CustomEvent('app:reconnected'))
      }
      
      setWasOffline(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
      
      toast({
        title: "🔴 Sin conexión",
        description: "Trabajando en modo offline. Los cambios se sincronizarán cuando vuelva la conexión.",
        duration: 5000,
        variant: "destructive"
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Verificación periódica adicional (por si los eventos fallan)
    const interval = setInterval(() => {
      const currentStatus = navigator.onLine
      if (currentStatus !== isOnline) {
        if (currentStatus) {
          handleOnline()
        } else {
          handleOffline()
        }
      }
    }, 10000) // Check cada 10 segundos

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [isOnline, wasOffline, toast])

  return { isOnline, wasOffline }
}
