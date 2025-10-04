"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface NotificationContextType {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [recentNotifications, setRecentNotifications] = useState<Set<string>>(new Set())
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set())
  const [idCounter, setIdCounter] = useState(0)

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    // Create a unique key for this notification to prevent duplicates
    const notificationKey = `${notification.type}-${notification.title}-${notification.message}`
    
    // Check if this notification was recently shown or dismissed
    if (recentNotifications.has(notificationKey) || dismissedNotifications.has(notificationKey)) {
      return
    }

    // Use timestamp + counter for truly unique ID generation
    const id = `notification-${Date.now()}-${idCounter}`
    setIdCounter(prev => prev + 1)
    
    const newNotification = { ...notification, id }
    
    // Limit the number of notifications shown at once (max 5)
    setNotifications(prev => {
      const newNotifications = [newNotification, ...prev]
      return newNotifications.slice(0, 5)
    })

    // Add to recent notifications to prevent duplicates
    setRecentNotifications(prev => new Set(prev).add(notificationKey))

    // Remove from recent notifications after 10 seconds
    setTimeout(() => {
      setRecentNotifications(prev => {
        const newSet = new Set(prev)
        newSet.delete(notificationKey)
        return newSet
      })
    }, 10000)

    if (notification.duration !== 0) {
      setTimeout(() => {
        removeNotification(id)
      }, notification.duration || 5000)
    }
  }

  const removeNotification = (id: string) => {
    // Find the notification being removed and mark it as dismissed
    const notification = notifications.find(n => n.id === id)
    if (notification) {
      const notificationKey = `${notification.type}-${notification.title}-${notification.message}`
      setDismissedNotifications(prev => new Set(prev).add(notificationKey))
    }
    
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }

  const clearAll = () => {
    // Mark all current notifications as dismissed
    notifications.forEach(notification => {
      const notificationKey = `${notification.type}-${notification.title}-${notification.message}`
      setDismissedNotifications(prev => new Set(prev).add(notificationKey))
    })
    
    setNotifications([])
  }

  // Reset dismissed notifications when component unmounts or page changes
  useEffect(() => {
    return () => {
      setDismissedNotifications(new Set())
    }
  }, [])


  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearAll }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  )
}

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification, clearAll } = useNotifications()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Only render notifications on the client to avoid hydration issues
  if (!isClient) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full">
      {notifications.length > 3 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={clearAll}
          className="w-full bg-gray-900/90 backdrop-blur-sm text-white text-sm py-2 px-4 rounded-xl hover:bg-gray-800/90 transition-colors flex items-center justify-center gap-2"
        >
          <X className="h-4 w-4" />
          Limpiar todas ({notifications.length})
        </motion.button>
      )}
      <AnimatePresence>
        {notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onRemove={() => removeNotification(notification.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

interface NotificationCardProps {
  notification: Notification
  onRemove: () => void
}

const NotificationCard: React.FC<NotificationCardProps> = ({ notification, onRemove }) => {
  const getNotificationConfig = (type: string) => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          colors: 'from-emerald-500 to-green-600',
          bgColors: 'from-emerald-50 to-green-50',
          textColors: 'text-emerald-900',
          borderColors: 'border-emerald-200',
        }
      case 'error':
        return {
          icon: AlertCircle,
          colors: 'from-red-500 to-pink-600',
          bgColors: 'from-red-50 to-pink-50',
          textColors: 'text-red-900',
          borderColors: 'border-red-200',
        }
      case 'warning':
        return {
          icon: AlertCircle,
          colors: 'from-amber-500 to-orange-600',
          bgColors: 'from-amber-50 to-orange-50',
          textColors: 'text-amber-900',
          borderColors: 'border-amber-200',
        }
      default:
        return {
          icon: Info,
          colors: 'from-blue-500 to-indigo-600',
          bgColors: 'from-blue-50 to-indigo-50',
          textColors: 'text-blue-900',
          borderColors: 'border-blue-200',
        }
    }
  }

  const config = getNotificationConfig(notification.type)
  const IconComponent = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.3 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.5, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`bg-gradient-to-r ${config.bgColors} border ${config.borderColors} rounded-2xl shadow-2xl overflow-hidden relative`}
    >
      <div className={`absolute inset-0 bg-gradient-to-r ${config.colors}/5`}></div>
      <div className="relative p-4">
        <div className="flex items-start gap-3">
          <motion.div 
            className={`p-2 bg-gradient-to-r ${config.colors} rounded-xl shadow-lg flex-shrink-0`}
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
          >
            <IconComponent className="h-5 w-5 text-white" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <motion.h4 
              className={`font-bold ${config.textColors} text-sm mb-1`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {notification.title}
            </motion.h4>
            <motion.p 
              className={`${config.textColors} text-sm leading-relaxed`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {notification.message}
            </motion.p>
            {notification.action && (
              <motion.button
                onClick={notification.action.onClick}
                className={`mt-2 text-xs font-semibold ${config.textColors} hover:underline`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {notification.action.label}
              </motion.button>
            )}
          </div>
          <motion.button
            onClick={onRemove}
            className={`${config.textColors} hover:bg-white/50 p-1 rounded-lg transition-colors flex-shrink-0`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

// Hook for business intelligence notifications
export const useBusinessNotifications = () => {
  const { addNotification } = useNotifications()

  const notifyTargetAchievement = (percentage: number) => {
    if (percentage >= 100) {
      addNotification({
        type: 'success',
        title: '🎉 ¡Meta alcanzada!',
        message: `Has superado tu meta mensual del ${percentage.toFixed(1)}%. ¡Excelente trabajo!`,
        duration: 8000,
      })
    } else if (percentage >= 75) {
      addNotification({
        type: 'info',
        title: '🎯 Cerca de la meta',
        message: `Estás al ${percentage.toFixed(1)}% de tu meta mensual. ¡Sigue así!`,
        duration: 6000,
      })
    }
  }

  const notifyRevenueGrowth = (growth: number) => {
    if (growth > 20) {
      addNotification({
        type: 'success',
        title: '📈 Crecimiento excepcional',
        message: `Tus ingresos han crecido un ${growth.toFixed(1)}% respecto al mes anterior.`,
        duration: 7000,
      })
    } else if (growth < -15) {
      addNotification({
        type: 'warning',
        title: '📉 Ingresos en descenso',
        message: `Tus ingresos han bajado un ${Math.abs(growth).toFixed(1)}%. Considera revisar tu estrategia.`,
        duration: 8000,
        action: {
          label: 'Ver análisis detallado',
          onClick: () => window.location.href = '/monthly-reports'
        }
      })
    }
  }

  const notifyOverdueInvoices = (count: number) => {
    if (count > 0) {
      addNotification({
        type: 'warning',
        title: '⚠️ Facturas vencidas',
        message: `Tienes ${count} facturas vencidas que requieren seguimiento.`,
        duration: 10000,
        action: {
          label: 'Ver facturas',
          onClick: () => window.location.href = '/invoices'
        }
      })
    }
  }

  const notifyLowCashFlow = (margin: number) => {
    if (margin < 20) {
      addNotification({
        type: 'warning',
        title: '💰 Margen de ganancia bajo',
        message: `Tu margen de ganancia es del ${margin.toFixed(1)}%. Considera optimizar gastos.`,
        duration: 8000,
        action: {
          label: 'Analizar gastos',
          onClick: () => window.location.href = '/expenses'
        }
      })
    }
  }

  const notifyNewInvoice = () => {
    addNotification({
      type: 'success',
      title: '✅ Factura creada',
      message: 'Nueva factura generada exitosamente.',
      duration: 4000,
    })
  }

  const notifyDataRefresh = () => {
    addNotification({
      type: 'info',
      title: '🔄 Datos actualizados',
      message: 'Los datos del dashboard han sido actualizados.',
      duration: 3000,
    })
  }

  return {
    notifyTargetAchievement,
    notifyRevenueGrowth,
    notifyOverdueInvoices,
    notifyLowCashFlow,
    notifyNewInvoice,
    notifyDataRefresh,
  }
}