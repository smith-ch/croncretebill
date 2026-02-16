"use client"

import { useEffect, useState } from 'react'
import { useUserPermissions } from '@/hooks/use-user-permissions-simple'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Crown, User } from 'lucide-react'

/**
 * Indicador Visual de Tipo de Usuario
 * Muestra claramente si el usuario actual es Owner o Empleado
 */
export function UserTypeIndicator() {
  const { permissions } = useUserPermissions()
  const [dbCheck, setDbCheck] = useState<{ hasParent: boolean | null, parentId: string | null }>({
    hasParent: null,
    parentId: null
  })

  useEffect(() => {
    const checkDB = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('parent_user_id')
        .eq('user_id', session.user.id)
        .single()

      setDbCheck({
        hasParent: profile?.parent_user_id !== null,
        parentId: profile?.parent_user_id
      })
    }

    checkDB()
  }, [])

  // Detectar inconsistencia
  const isInconsistent =
    dbCheck.hasParent !== null &&
    ((dbCheck.hasParent && permissions.isOwner) || (!dbCheck.hasParent && !permissions.isOwner))

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {/* Badge principal */}
      <Badge
        variant={permissions.isOwner ? "default" : "secondary"}
        className="text-lg px-4 py-2"
      >
        {permissions.isOwner ? (
          <span className="flex items-center gap-1"><Crown className="h-3 w-3" /> Owner</span>
        ) : (
          <span className="flex items-center gap-1"><User className="h-3 w-3" /> Empleado</span>
        )}
      </Badge>

      {/* Badge de verificación de DB */}
      {dbCheck.hasParent !== null && (
        <Badge
          variant="outline"
          className="text-xs"
        >
          DB: {dbCheck.hasParent ? 'Empleado' : 'Owner'}
        </Badge>
      )}

      {/* Alerta de inconsistencia */}
      {isInconsistent && (
        <div className="bg-red-900/30 border border-red-400 text-red-400 px-3 py-2 rounded text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <div>
            <div className="font-bold">ERROR DE PERMISOS</div>
            <div>Frontend y DB no coinciden</div>
            <div className="mt-1">
              <button
                onClick={() => {
                  localStorage.clear()
                  window.location.reload()
                }}
                className="underline font-bold"
              >
                Limpiar Caché
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info adicional para depuración */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-xs font-mono">
          <div>role: {permissions.role}</div>
          <div>canViewFinances: {String(permissions.canViewFinances)}</div>
          <div>canEdit: {String(permissions.canEditInvoices)}</div>
        </div>
      )}
    </div>
  )
}
