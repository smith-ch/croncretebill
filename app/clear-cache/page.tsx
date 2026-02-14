"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function ClearCachePage() {
  const [cleared, setCleared] = useState(false)
  const router = useRouter()

  const clearAllCache = () => {
    // Limpiar localStorage
    const keysToRemove = [
      'cached-permissions',
      'permissions-cache-time',
      'was-originally-owner',
      'employee-view-mode',
      'is-real-employee',
      'emergency-override'
    ]

    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
    })

    // Limpiar cualquier otra clave relacionada
    Object.keys(localStorage).forEach(key => {
      if (key.toLowerCase().includes('permission') || 
          key.toLowerCase().includes('owner') ||
          key.toLowerCase().includes('employee')) {
        localStorage.removeItem(key)
      }
    })

    // Limpiar sessionStorage también
    sessionStorage.clear()

    setCleared(true)
  }

  useEffect(() => {
    // Auto-limpiar al cargar la página
    clearAllCache()
  }, [])

  const handleLogout = async () => {
    const { supabase } = await import('@/lib/supabase')
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>🧹 Caché Limpiado</CardTitle>
          <CardDescription>
            Se ha limpiado completamente el caché de permisos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cleared && (
            <div className="bg-green-900/30 border border-green-800 text-green-300 p-4 rounded">
              <p className="font-semibold">✅ Caché limpiado exitosamente</p>
              <p className="text-sm mt-2">
                Todos los datos de permisos en caché han sido eliminados.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="font-semibold">Siguiente paso:</h3>
            <p className="text-sm text-slate-400">
              Para que los cambios tengan efecto completo, debes cerrar sesión y volver a iniciar sesión.
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleLogout} className="flex-1">
              🚪 Cerrar Sesión
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline" className="flex-1">
              🔄 Recargar
            </Button>
          </div>

          <div className="text-xs text-gray-500 border-t pt-4">
            <p className="font-semibold mb-1">¿Qué se limpió?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>cached-permissions</li>
              <li>was-originally-owner</li>
              <li>employee-view-mode</li>
              <li>is-real-employee</li>
              <li>Todas las claves relacionadas con permisos</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
