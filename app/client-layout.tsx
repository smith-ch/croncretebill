"use client"

import React, { useEffect, useState } from "react"
import { Inter } from "next/font/google"
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

const inter = Inter({ subsets: ["latin"] })

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Configurar auto-logout cuando hay un usuario logueado (solo si hay usuario)
  useAutoLogout({
    timeoutMinutes: 45 // Más tiempo para mejor UX
  })

  // Activar atajos de teclado cuando el usuario está logueado
  useKeyboardShortcuts()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
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

  if (!user) {
    return (
      <html lang="es">
        <body className={inter.className}>
          <ThemeProvider attribute="class" defaultTheme="light">
            <NotificationProvider>
              <div className="pwa-container">
                <ModernAuthForm />
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
            <Toaster />
            <SonnerToaster />
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
