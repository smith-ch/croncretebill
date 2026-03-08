"use client"

import React, { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUserPermissions } from '@/hooks/use-user-permissions-simple'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, ArrowLeft } from 'lucide-react'

interface RouteProtectionProps {
  children: React.ReactNode
  requiredModule?: string
  fallbackPath?: string
}

export function RouteProtection({ 
  children, 
  requiredModule, 
  fallbackPath = '/dashboard' 
}: RouteProtectionProps) {
  const { permissions, loading, canAccessModule } = useUserPermissions()
  const router = useRouter()
  const pathname = usePathname()

  // Auto-detectar módulo basado en la ruta si no se especifica
  const getModuleFromPath = (path: string): string => {
    const segments = path.split('/').filter(Boolean)
    if (segments.length === 0) {
      return 'dashboard'
    }
    
    const firstSegment = segments[0]
    
    // Mapear rutas a módulos
    const routeModuleMap: Record<string, string> = {
      'dashboard': 'dashboard',
      'invoices': 'invoices',
      'clients': 'clients',
      'products': 'products',
      'inventory': 'inventory',
      'services': 'services',
      'projects': 'projects',
      'expenses': 'expenses',
      'gastos': 'expenses',
      'monthly-reports': 'reports',
      'dgii-reports': 'reports',
      'thermal-receipts': 'thermal-receipts',
      'payment-receipts': 'payment-receipts',
      'agenda': 'agenda',
      'users': 'users',
      'settings': 'settings',
      'faq': 'faq',
      'employee': 'employee',
      'routes': 'routes'
    }

    return routeModuleMap[firstSegment] || firstSegment
  }

  const moduleToCheck = requiredModule || getModuleFromPath(pathname)

  useEffect(() => {
    if (!loading && !canAccessModule(moduleToCheck)) {
      router.push(fallbackPath)
    }
  }, [loading, canAccessModule, moduleToCheck, router, fallbackPath])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Verificando permisos...</p>
        </div>
      </div>
    )
  }

  if (!canAccessModule(moduleToCheck)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <CardTitle className="text-red-600">Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-slate-400">
              No tienes permisos para acceder a esta sección.
            </p>
            <p className="text-sm text-slate-400">
              Tu rol: <span className="font-medium">{permissions.role}</span>
            </p>
            <p className="text-sm text-slate-400">
              Módulo requerido: <span className="font-medium">{moduleToCheck}</span>
            </p>
            <div className="flex gap-2 justify-center">
              <Button 
                variant="outline" 
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Button>
              <Button 
                onClick={() => router.push('/dashboard')}
              >
                Ir al Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

// Hook para verificar acceso en componentes
export function useRouteAccess(module: string) {
  const { canAccessModule } = useUserPermissions()
  return canAccessModule(module)
}