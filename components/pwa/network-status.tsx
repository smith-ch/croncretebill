"use client"

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, CloudOff } from 'lucide-react'

export function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showNotification, setShowNotification] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine
      setIsOnline(online)

      if (!online) {
        setWasOffline(true)
        setShowNotification(true)
      } else if (wasOffline) {
        // Mostrar mensaje de reconexión
        setShowNotification(true)
        setTimeout(() => {
          setShowNotification(false)
          setWasOffline(false)
        }, 3000)
      }
    }

    // Estado inicial
    setIsOnline(navigator.onLine)

    // Escuchar cambios
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [wasOffline])

  // Solo mostrar cuando hay cambios
  if (!showNotification) return null

  return (
    <AnimatePresence>
      {showNotification && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
        >
          <motion.div
            animate={!isOnline ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 2, repeat: !isOnline ? Infinity : 0 }}
            className={`
              flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl backdrop-blur-md
              ${isOnline 
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                : 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
              }
            `}
          >
            <motion.div
              animate={{ rotate: isOnline ? [0, 360] : 0 }}
              transition={{ duration: 0.5 }}
            >
              {isOnline ? (
                <Wifi className="h-5 w-5" />
              ) : (
                <WifiOff className="h-5 w-5" />
              )}
            </motion.div>

            <div className="flex flex-col">
              <span className="font-semibold text-sm">
                {isOnline ? '¡Conectado!' : 'Sin conexión'}
              </span>
              <span className="text-xs opacity-90">
                {isOnline 
                  ? 'La conexión se ha restablecido' 
                  : 'Trabajando en modo offline'
                }
              </span>
            </div>

            {/* Indicador de pulso para offline */}
            {!isOnline && (
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -right-1 -top-1 w-3 h-3 bg-yellow-400 rounded-full"
              />
            )}
          </motion.div>

          {/* Sombra dinámica */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`
              absolute inset-0 rounded-full blur-xl -z-10
              ${isOnline ? 'bg-green-500' : 'bg-red-500'}
            `}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Componente persistente para mostrar estado en sidebar (opcional)
export function NetworkStatusBadge() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine)
    setIsOnline(navigator.onLine)

    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)

    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
    }
  }, [])

  return (
    <motion.div
      animate={!isOnline ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 1.5, repeat: !isOnline ? Infinity : 0 }}
      className="flex items-center gap-2"
    >
      <div className={`
        w-2 h-2 rounded-full
        ${isOnline ? 'bg-green-500' : 'bg-red-500'}
      `}>
        {!isOnline && (
          <motion.div
            animate={{ scale: [1, 2, 1], opacity: [1, 0, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-full h-full bg-red-400 rounded-full"
          />
        )}
      </div>
      <span className={`text-xs ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
        {isOnline ? 'En línea' : 'Offline'}
      </span>
    </motion.div>
  )
}
