"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Clock, Shield, RefreshCw } from "lucide-react"
import { useAutoLogout } from "@/hooks/use-auto-logout"

interface SessionIndicatorProps {
  timeoutMinutes?: number
  className?: string
}

export const SessionIndicator = ({ 
  timeoutMinutes = 30, 
  className = "" 
}: SessionIndicatorProps) => {
  const [sessionTime, setSessionTime] = useState(0)
  const [showIndicator, setShowIndicator] = useState(false)
  const { extendSession } = useAutoLogout({ enabled: false }) // Solo usar para extender

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now()
      const lastActivity = localStorage.getItem('lastActivity')
      
      if (lastActivity) {
        const elapsed = now - parseInt(lastActivity)
        const elapsedMinutes = elapsed / (1000 * 60)
        const remaining = Math.max(0, timeoutMinutes - elapsedMinutes)
        
        setSessionTime(remaining)
        setShowIndicator(remaining < 10) // Mostrar cuando quedan menos de 10 minutos
      } else {
        // Primera vez, establecer actividad actual
        localStorage.setItem('lastActivity', now.toString())
        setSessionTime(timeoutMinutes)
      }
    }

    // Actualizar cada 30 segundos
    const interval = setInterval(updateTimer, 30000)
    updateTimer() // Llamar inmediatamente

    // Actualizar la última actividad en eventos de usuario
    const updateActivity = () => {
      localStorage.setItem('lastActivity', Date.now().toString())
      setSessionTime(timeoutMinutes)
      setShowIndicator(false)
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, updateActivity)
    })

    return () => {
      clearInterval(interval)
      events.forEach(event => {
        document.removeEventListener(event, updateActivity)
      })
    }
  }, [timeoutMinutes])

  const handleExtendSession = () => {
    localStorage.setItem('lastActivity', Date.now().toString())
    setSessionTime(timeoutMinutes)
    setShowIndicator(false)
    extendSession()
  }

  const progressValue = (sessionTime / timeoutMinutes) * 100
  const isUrgent = sessionTime < 5

  if (!showIndicator) {
    return null
  }

  return (
    <Card className={`fixed bottom-4 right-4 z-50 w-80 ${className} ${
      isUrgent ? 'border-red-500 shadow-red-500/25' : 'border-amber-500 shadow-amber-500/25'
    } shadow-lg backdrop-blur-sm bg-white/95 dark:bg-gray-900/95`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-full ${
            isUrgent ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
          }`}>
            <Clock className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Sesión Activa
            </h4>
            <p className="text-xs text-muted-foreground">
              {isUrgent 
                ? '¡Sesión expirando pronto!' 
                : 'Tu sesión expirará pronto'
              }
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Tiempo restante:</span>
            <span className={`font-semibold ${
              isUrgent ? 'text-red-600' : 'text-amber-600'
            }`}>
              {Math.floor(sessionTime)} min
            </span>
          </div>

          <Progress 
            value={progressValue} 
            className={`h-2 ${
              isUrgent ? 'bg-red-100' : 'bg-amber-100'
            }`}
          />

          <div className="flex gap-2">
            <Button
              onClick={handleExtendSession}
              size="sm"
              className="flex-1 h-8 text-xs bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Extender Sesión
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}