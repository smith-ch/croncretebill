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
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
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

  // Función para verificar suscripción
  const checkSubscription = async (userId: string) => {
    try {
      console.log('🔍 Verificando suscripción para userId:', userId)
      
      // Verificar si el usuario es subscription_manager (siempre tiene acceso)
      const { data: isManager, error: managerError } = await supabase
        .rpc('is_subscription_manager', { p_user_id: userId })
      
      console.log('🔍 Resultado subscription_manager:', { userId, isManager, managerError })
      
      if (managerError) {
        console.error('❌ Error verificando rol de manager:', managerError)
        // Si hay error verificando el rol, permitir acceso temporalmente
        console.log('⚠️ Permitiendo acceso debido a error en verificación de rol')
        setSubscriptionError(null)
        return true
      } else if (isManager) {
        console.log('✅ Usuario es subscription_manager - acceso garantizado')
        setSubscriptionError(null)
        return true // Subscription managers siempre tienen acceso
      }

      console.log('🔍 Usuario no es manager, verificando suscripción...')
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('status, end_date, plan:plan_id(display_name)')
        .eq('user_id', userId)
        .maybeSingle()

      console.log('🔍 Resultado suscripción:', { subscription, subError })

      if (subError && subError.code !== 'PGRST116') {
        console.error('❌ Error verificando suscripción:', subError)
        // Permitir acceso si hay error técnico
        console.log('⚠️ Permitiendo acceso debido a error en verificación de suscripción')
        setSubscriptionError(null)
        return true
      }

      // Si no tiene suscripción o está inactiva
      if (!subscription || subscription.status !== 'active') {
        console.log('❌ Sin suscripción activa:', subscription?.status)
        setSubscriptionError(
          subscription 
            ? `Tu suscripción está ${subscription.status === 'expired' ? 'expirada' : 'inactiva'}. Contacta al administrador.`
            : "No tienes una suscripción activa. Contacta al administrador para activar tu cuenta."
        )
        // No cerrar sesión automáticamente, solo mostrar error
        return false
      }
      
      console.log('✅ Suscripción activa encontrada')
      setSubscriptionError(null)
      return true
    } catch (error) {
      console.error('❌ Error inesperado verificando suscripción:', error)
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
    // Get initial session - SIN verificar suscripción aquí
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // La verificación de suscripción se hace en modern-auth-form.tsx
        setUser(session.user)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setSubscriptionError(null)
      } else {
        setUser(session?.user ?? null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <html lang="es">
        <body className={inter.className}>
          <div className="pwa-container min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Cargando ConcreteBill...</p>
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
                  <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-50 border border-red-200 text-red-800 px-6 py-3 rounded-lg shadow-lg max-w-md text-center z-50">
                    <p className="font-semibold mb-1">⚠️ Suscripción Requerida</p>
                    <p className="text-sm">{subscriptionError}</p>
                  </div>
                )}
              </div>
              <Toaster />
              <SonnerToaster />
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
              <SonnerToaster />
            </NotificationProvider>
          </ThemeProvider>
        </body>
      </html>
    )
  }

  return (
    <html lang="es">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <NotificationProvider>
            {/* Barra de progreso de navegación */}
            <NavigationProgress />
            <div className="pwa-container flex h-screen bg-gray-50 dark:bg-gray-900">
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
            <SonnerToaster />
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
