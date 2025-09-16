"use client"

import React, { useEffect, useState } from "react"
import { Inter } from "next/font/google"
import { supabase } from "@/lib/supabase"
import { AuthForm } from "@/components/auth/auth-form"
import { Sidebar } from "@/components/layout/sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { NotificationProvider } from "@/components/notifications/notification-provider"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { useAutoLogout } from "@/hooks/use-auto-logout"
import { SessionIndicator } from "@/components/auth/session-indicator"
import { RouteProtection } from "@/components/auth/route-protection"

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
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
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
              <AuthForm />
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
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
              <Sidebar />
              <main className="flex-1 overflow-auto lg:ml-0 pt-16 lg:pt-0">
                <div className="p-6">
                  <NotificationCenter className="mb-6" />
                  <RouteProtection>
                    {children}
                  </RouteProtection>
                </div>
              </main>
            </div>
            {/* Indicador de sesión flotante */}
            <SessionIndicator timeoutMinutes={30} />
            <Toaster />
            <SonnerToaster />
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
