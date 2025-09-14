"use client"

import { useEffect, useRef, useCallback } from "react"
import { getSupabaseClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface UseAutoLogoutOptions {
  timeoutMinutes?: number
  warningMinutes?: number
  enabled?: boolean
}

export const useAutoLogout = (options: UseAutoLogoutOptions = {}) => {
  const {
    timeoutMinutes = 30, // 30 minutos por defecto
    warningMinutes = 5,  // Aviso 5 minutos antes
    enabled = true
  } = options

  const { toast } = useToast()
  const supabase = getSupabaseClient()
  const timeoutRef = useRef<number>()
  const warningTimeoutRef = useRef<number>()
  const warningShownRef = useRef(false)

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
    }
    warningShownRef.current = false
  }, [])

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      toast({
        title: "Sesión cerrada",
        description: "Tu sesión se cerró automáticamente por inactividad",
        variant: "destructive",
      })
      // Recargar la página para ir al login
      window.location.reload()
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
    }
  }, [supabase, toast])

  const showWarning = useCallback(() => {
    if (!warningShownRef.current) {
      warningShownRef.current = true
      toast({
        title: "⚠️ Sesión expirando",
        description: `Tu sesión se cerrará en ${warningMinutes} minutos por inactividad. Mueve el mouse o presiona cualquier tecla para continuar.`,
        variant: "destructive",
        duration: 10000, // Mostrar por 10 segundos
      })
    }
  }, [warningMinutes, toast])

  const resetTimer = useCallback(() => {
    if (!enabled) {
      return
    }

    clearTimeouts()
    warningShownRef.current = false

    // Configurar aviso de advertencia
    const warningMs = (timeoutMinutes - warningMinutes) * 60 * 1000
    if (warningMs > 0) {
      warningTimeoutRef.current = window.setTimeout(showWarning, warningMs)
    }

    // Configurar logout automático
    const timeoutMs = timeoutMinutes * 60 * 1000
    timeoutRef.current = window.setTimeout(logout, timeoutMs)
  }, [enabled, timeoutMinutes, warningMinutes, logout, showWarning, clearTimeouts])

  const extendSession = useCallback(() => {
    if (warningShownRef.current) {
      toast({
        title: "✅ Sesión extendida",
        description: "Tu sesión ha sido extendida exitosamente",
        variant: "default",
        duration: 3000,
      })
    }
    resetTimer()
  }, [resetTimer, toast])

  useEffect(() => {
    if (!enabled) {
      return
    }

    // Eventos que indican actividad del usuario
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown'
    ]

    // Throttle para evitar resetear el timer demasiado frecuentemente
    let throttleTimeout: number
    const throttledResetTimer = () => {
      if (throttleTimeout) {
        return
      }
      
      throttleTimeout = window.setTimeout(() => {
        extendSession()
        throttleTimeout = 0
      }, 1000) // Throttle de 1 segundo
    }

    // Agregar event listeners
    events.forEach(event => {
      document.addEventListener(event, throttledResetTimer, true)
    })

    // Inicializar timer
    resetTimer()

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledResetTimer, true)
      })
      clearTimeouts()
      if (throttleTimeout) {
        clearTimeout(throttleTimeout)
      }
    }
  }, [enabled, extendSession, resetTimer, clearTimeouts])

  // Verificar si hay una sesión activa
  useEffect(() => {
    if (!enabled) {
      return
    }

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        clearTimeouts()
      }
    }

    checkSession()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        clearTimeouts()
      } else if (event === 'SIGNED_IN') {
        resetTimer()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [enabled, supabase, clearTimeouts, resetTimer])

  return {
    extendSession,
    resetTimer,
    clearTimeouts
  }
}