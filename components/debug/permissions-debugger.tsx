"use client"

import { useEffect, useState } from 'react'
import { useUserPermissions } from '@/hooks/use-user-permissions-simple'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

/**
 * Componente de Depuración de Permisos
 * 
 * Usa este componente para verificar exactamente qué permisos tiene un usuario
 * y compararlo con los datos de la base de datos
 */
export function PermissionsDebugger() {
  const { permissions, loading } = useUserPermissions()
  const [dbProfile, setDbProfile] = useState<any>(null)
  const [rpcResult, setRpcResult] = useState<any>(null)
  const [localStorage_data, setLocalStorageData] = useState<any>({})

  const loadDebugInfo = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user

    if (!user) return

    // Obtener perfil directo de la DB
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    setDbProfile(profile)

    // Obtener resultado del RPC
    const { data: rpcData } = await supabase
      .rpc('get_user_permissions_simple', { user_uuid: user.id })
    
    setRpcResult(rpcData)

    // Obtener localStorage
    setLocalStorageData({
      'was-originally-owner': localStorage.getItem('was-originally-owner'),
      'employee-view-mode': localStorage.getItem('employee-view-mode'),
      'is-real-employee': localStorage.getItem('is-real-employee'),
      'cached-permissions': localStorage.getItem('cached-permissions'),
      'permissions-cache-time': localStorage.getItem('permissions-cache-time')
    })
  }

  useEffect(() => {
    loadDebugInfo()
  }, [])

  const clearCache = () => {
    const keys = [
      'cached-permissions',
      'permissions-cache-time',
      'was-originally-owner',
      'employee-view-mode',
      'is-real-employee'
    ]
    keys.forEach(key => localStorage.removeItem(key))
    alert('Caché limpiado. Recarga la página.')
    window.location.reload()
  }

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Depurador de Permisos</CardTitle>
          <CardDescription>Información detallada sobre los permisos del usuario actual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={loadDebugInfo}>🔄 Recargar Info</Button>
          <Button onClick={clearCache} variant="destructive">🧹 Limpiar Caché</Button>

          {/* Permisos del Hook */}
          <div>
            <h3 className="font-bold text-lg mb-2">📦 Permisos del Hook (Frontend)</h3>
            <div className="bg-slate-800 p-4 rounded text-sm font-mono">
              <p><strong>isOwner:</strong> <Badge variant={permissions.isOwner ? "default" : "secondary"}>{String(permissions.isOwner)}</Badge></p>
              <p><strong>role:</strong> <Badge>{permissions.role}</Badge></p>
              <p><strong>wasOriginallyOwner:</strong> {String(permissions.wasOriginallyOwner)}</p>
              <p><strong>isRealEmployee:</strong> {String(permissions.isRealEmployee)}</p>
              <p><strong>canViewFinances:</strong> {String(permissions.canViewFinances)}</p>
              <p><strong>canEditInvoices:</strong> {String(permissions.canEditInvoices)}</p>
              <p><strong>canDeleteInvoices:</strong> {String(permissions.canDeleteInvoices)}</p>
            </div>
          </div>

          {/* Perfil de DB */}
          <div>
            <h3 className="font-bold text-lg mb-2">🗄️ Perfil de Base de Datos</h3>
            {dbProfile ? (
              <div className="bg-slate-800 p-4 rounded text-sm font-mono">
                <p><strong>user_id:</strong> {dbProfile.user_id}</p>
                <p><strong>parent_user_id:</strong> {dbProfile.parent_user_id || 'NULL (ES OWNER)'}</p>
                <p><strong>display_name:</strong> {dbProfile.display_name}</p>
                <p><strong>is_active:</strong> {String(dbProfile.is_active)}</p>
                <p><strong>can_view_finances:</strong> {String(dbProfile.can_view_finances)}</p>
                <p><strong>Tipo:</strong> <Badge variant={dbProfile.parent_user_id ? "secondary" : "default"}>
                  {dbProfile.parent_user_id ? '👨‍💼 EMPLEADO' : '👑 OWNER'}
                </Badge></p>
              </div>
            ) : (
              <p>No se encontró perfil en la DB (es owner nuevo)</p>
            )}
          </div>

          {/* Resultado RPC */}
          <div>
            <h3 className="font-bold text-lg mb-2">⚡ Resultado del RPC</h3>
            {rpcResult ? (
              <div className="bg-slate-800 p-4 rounded text-sm font-mono">
                <pre>{JSON.stringify(rpcResult, null, 2)}</pre>
              </div>
            ) : (
              <p>Cargando...</p>
            )}
          </div>

          {/* LocalStorage */}
          <div>
            <h3 className="font-bold text-lg mb-2">💾 LocalStorage</h3>
            <div className="bg-slate-800 p-4 rounded text-sm font-mono">
              {Object.entries(localStorage_data).map(([key, value]) => (
                <p key={key}><strong>{key}:</strong> {value || 'null'}</p>
              ))}
            </div>
          </div>

          {/* Análisis */}
          <div>
            <h3 className="font-bold text-lg mb-2">🎯 Análisis</h3>
            <div className="space-y-2">
              {dbProfile?.parent_user_id && permissions.isOwner && (
                <div className="bg-red-900/30 border border-red-400 text-red-400 p-4 rounded">
                  <p className="font-bold">❌ ERROR DETECTADO</p>
                  <p>Este usuario tiene parent_user_id (es empleado) pero isOwner es TRUE</p>
                  <p>Esto indica que hay un problema de caché o lógica.</p>
                </div>
              )}
              {dbProfile?.parent_user_id && !permissions.isOwner && (
                <div className="bg-green-900/30 border border-green-400 text-green-400 p-4 rounded">
                  <p className="font-bold">✅ CORRECTO</p>
                  <p>Este es un empleado y los permisos están correctos (isOwner: false)</p>
                </div>
              )}
              {!dbProfile?.parent_user_id && permissions.isOwner && (
                <div className="bg-green-900/30 border border-green-400 text-green-400 p-4 rounded">
                  <p className="font-bold">✅ CORRECTO</p>
                  <p>Este es un owner y los permisos están correctos (isOwner: true)</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
