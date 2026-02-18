"use client"

import React, { useEffect, useState } from "react"
import { Inter } from "next/font/google"
import { usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ModernAuthForm } from "@/components/auth/modern-auth-form"
import { Sidebar } from "@/components/layout/sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { NotificationProvider } from "@/components/notifications/notification-provider"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { Toaster } from "@/components/ui/toaster"
import { useAutoLogout } from "@/hooks/use-auto-logout"
import { SessionIndicator } from "@/components/auth/session-indicator"
import { RouteProtection } from "@/components/auth/route-protection"
import { PWAUpdateNotification } from "@/components/pwa/pwa-update-notification"
import { MobileNav } from "@/components/layout/mobile-nav"
import { RoutePreloader } from "@/hooks/use-route-preloader"
import { MiniChat } from "@/components/support/mini-chat"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { KeyboardShortcutsHelper } from "@/components/layout/keyboard-shortcuts-helper"
import { NavigationProgress } from "@/components/layout/navigation-progress"
import { NetworkStatusIndicator } from "@/components/pwa/network-status"
import { OfflineIndicator } from "@/components/offline-indicator"

const inter = Inter({ subsets: ["latin"] })

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null)
  const pathname = usePathname()

  // Función para verificar suscripción usando la nueva función mejorada
  const checkSubscription = async (userId: string) => {
    try {
      console.log('🔍 Verificando acceso de suscripción para userId:', userId)

      // Usar la nueva función que maneja empleados y owners correctamente
      const { data: accessCheck, error: accessError } = await supabase
        .rpc('check_user_subscription_access', { p_user_id: userId })

      console.log('🔍 Resultado check_user_subscription_access:', { accessCheck, accessError })

      if (accessError) {
        console.error('❌ Error verificando acceso:', accessError)
        // Si hay error técnico, permitir acceso para evitar bloqueos
        console.log('⚠️ Permitiendo acceso debido a error técnico')
        setSubscriptionError(null)
        return true
      }

      // accessCheck es un array con un solo elemento
      const access = Array.isArray(accessCheck) ? accessCheck[0] : accessCheck

      if (!access) {
        console.log('⚠️ No se pudo obtener información de acceso, permitiendo por defecto')
        setSubscriptionError(null)
        return true // Permitir en caso de duda
      }

      console.log('📊 Resultado del acceso:', {
        hasAccess: access.has_access,
        status: access.subscription_status,
        isEmployee: access.is_employee,
        message: access.message
      })

      // Verificar si tiene acceso
      if (access.has_access) {
        console.log('✅ Usuario tiene acceso:', access.message)
        setSubscriptionError(null)
        return true
      } else {
        console.log('❌ Usuario sin acceso:', access.message)
        setSubscriptionError(access.message || 'No tienes acceso activo')
        return false // Solo bloquear cuando definitivamente no tiene acceso
      }
    } catch (error) {
      console.error('❌ Error inesperado verificando acceso:', error)
      // Permitir acceso si hay error verificando (evitar bloqueos por errores técnicos)
      setSubscriptionError(null)
      return true
    }
  }

  // Configurar auto-logout cuando hay un usuario logueado (solo si hay usuario)
  useAutoLogout({
    timeoutMinutes: 45 // Más tiempo para mejor UX
  })

  // Activar atajos de teclado cuando el usuario está logueado
  useKeyboardShortcuts()

  useEffect(() => {
    // Get initial session - simplificado
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'SIGNED_OUT') {
        setSubscriptionError(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fix: Revalidate session when app becomes visible to prevent "freeze" on resume
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('🔄 App resumed - revalidating session...')
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          console.log('⚠️ Session invalid on resume, refreshing...')
          // Optional: Force a router refresh if critical
          // router.refresh() 
        } else {
          console.log('✅ Session valid on resume')
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  if (loading) {
    return (
      <html lang="es">
        <body className={inter.className}>
          <div className="pwa-container min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-sm text-slate-300">Cargando ConcreteBill...</p>
            </div>
          </div>
        </body>
      </html>
    )
  }

  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/reset-password']
  const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route))

  if (!user && !isPublicRoute) {
    return (
      <html lang="es">
        <body className={inter.className}>
          <ThemeProvider attribute="class" defaultTheme="light">
            <NotificationProvider>
              <div className="pwa-container">
                <ModernAuthForm />
                {subscriptionError && (
                  <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-900/30 border border-red-800 text-red-300 px-6 py-3 rounded-lg shadow-lg max-w-md text-center z-50">
                    <p className="font-semibold mb-1">⚠️ Suscripción Requerida</p>
                    <p className="text-sm">{subscriptionError}</p>
                  </div>
                )}
              </div>
              <Toaster />
            </NotificationProvider>
          </ThemeProvider>
        </body>
      </html>
    )
  }

  // Si es ruta pública, renderizar sin sidebar ni protección
  if (isPublicRoute) {
    return (
      <html lang="es">
        <body className={inter.className}>
          <ThemeProvider attribute="class" defaultTheme="light">
            <NotificationProvider>
              <div className="pwa-container">
                {children}
              </div>
              <Toaster />
            </NotificationProvider>
          </ThemeProvider>
        </body>
      </html>
    )
  }

  return (
    <html lang="es">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <NotificationProvider>
            {/* Barra de progreso de navegación */}
            <NavigationProgress />
            <div className="pwa-container flex h-screen bg-slate-950 dark:bg-slate-950">
              {/* Desktop Sidebar - Hidden on mobile */}
              <div className="hidden lg:block">
                <Sidebar />
              </div>
              {/* Mobile Navigation - Hidden on desktop */}
              <div className="lg:hidden">
                <MobileNav />
              </div>
              <main className="flex-1 overflow-auto pt-16 lg:pt-0">
                <div className="container-responsive spacing-responsive">
                  <NotificationCenter className="mb-4 sm:mb-6" />
                  <RouteProtection>
                    <React.Suspense
                      fallback={
                        <div className="flex items-center justify-center min-h-[400px]">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-sm text-gray-600">Cargando página...</p>
                          </div>
                        </div>
                      }
                    >
                      {children}
                    </React.Suspense>
                  </RouteProtection>
                </div>
              </main>
            </div>
            {/* Indicador de sesión flotante */}
            <SessionIndicator timeoutMinutes={30} />
            {/* Notificación de actualización PWA */}
            <PWAUpdateNotification />
            {/* Pre-carga de rutas comunes */}
            <RoutePreloader />
            {/* Mini Chat de Ayuda */}
            <MiniChat />
            {/* Helper de Atajos de Teclado */}
            <KeyboardShortcutsHelper />
            {/* Indicador de Estado de Red */}
            <NetworkStatusIndicator />
            {/* Indicador de Modo Offline */}
            <div className="fixed top-4 right-4 z-50">
              <OfflineIndicator />
            </div>
            <Toaster />
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
