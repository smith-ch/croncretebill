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

const inter = Inter({ subsets: ["latin"] })

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Configurar auto-logout cuando hay un usuario logueado
  useAutoLogout({
    timeoutMinutes: 30 // Cerrar sesión después de 30 minutos de inactividad
  })

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
          <div className="pwa-container min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 sm:h-24 sm:w-24 lg:h-32 lg:w-32 border-b-2 border-blue-600"></div>
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
                    {children}
                  </RouteProtection>
                </div>
              </main>
            </div>
            {/* Indicador de sesión flotante */}
            <SessionIndicator timeoutMinutes={30} />
            {/* Notificación de actualización PWA */}
            <PWAUpdateNotification />
            <Toaster />
            <SonnerToaster />
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
