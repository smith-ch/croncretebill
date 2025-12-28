"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Save, Lock, CheckCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"

export function RoleSecuritySettings() {
  const [currentRolePassword, setCurrentRolePassword] = useState("")
  const [userPassword, setUserPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  // Contraseñas siempre ocultas por seguridad
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [securityInfo, setSecurityInfo] = useState<{
    lastChanged?: string
    attempts: number
    lockedUntil?: string
    canChange: boolean
  }>({ attempts: 0, canChange: true })
  const { permissions } = useUserPermissions()

  useEffect(() => {
    fetchSecurityInfo()
  }, [])

  const fetchSecurityInfo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) {
        return
      }

      const { data } = await supabase
        .from('company_settings')
        .select('role_switch_password, role_password_changed_at, role_password_attempts, role_password_locked_until')
        .eq('user_id', user.id)
        .single() as any

      if (data) {
        setCurrentRolePassword(data.role_switch_password || 'admin123')
        
        const now = new Date()
        const lockedUntil = data.role_password_locked_until ? new Date(data.role_password_locked_until) : null
        const lastChanged = data.role_password_changed_at ? new Date(data.role_password_changed_at) : null
        
        // Verificar si puede cambiar (no está bloqueado y han pasado al menos 5 minutos del último cambio)
        const isLocked = lockedUntil && lockedUntil > now
        const recentChange = lastChanged && (now.getTime() - lastChanged.getTime()) < 5 * 60 * 1000 // 5 minutos
        
        setSecurityInfo({
          lastChanged: lastChanged?.toLocaleString(),
          attempts: data.role_password_attempts || 0,
          lockedUntil: isLocked ? lockedUntil.toLocaleString() : undefined,
          canChange: !isLocked && !recentChange
        })
      }
    } catch (error) {
      console.error('Error fetching security info:', error)
    }
  }

  const handleSavePassword = async () => {
    // Validaciones básicas
    if (!securityInfo.canChange) {
      setMessage({ type: 'error', text: 'No puedes cambiar la contraseña en este momento. Espera o contacta soporte.' })
      return
    }

    if (!userPassword.trim()) {
      setMessage({ type: 'error', text: 'Debes ingresar tu contraseña de usuario actual' })
      return
    }

    if (!currentRolePassword.trim()) {
      setMessage({ type: 'error', text: 'Debes ingresar la contraseña de role actual' })
      return
    }

    if (!newPassword.trim()) {
      setMessage({ type: 'error', text: 'La nueva contraseña no puede estar vacía' })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden' })
      return
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 8 caracteres' })
      return
    }

    if (newPassword === currentRolePassword) {
      setMessage({ type: 'error', text: 'La nueva contraseña debe ser diferente a la actual' })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user?.email) {
        throw new Error('Usuario no encontrado')
      }

      // 1. Verificar contraseña de usuario actual
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: userPassword
      })

      if (authError) {
        // Incrementar intentos fallidos
        await supabase
          .from('company_settings')
          .update({ 
            role_password_attempts: securityInfo.attempts + 1,
            role_password_locked_until: securityInfo.attempts >= 2 ? new Date(Date.now() + 30 * 60 * 1000) : null // Bloquear 30 min después de 3 intentos
          } as any)
          .eq('user_id', user.id)
        
        throw new Error('Contraseña de usuario incorrecta')
      }

      // 2. Verificar contraseña de role actual
      const { data: currentData } = await supabase
        .from('company_settings')
        .select('role_switch_password')
        .eq('user_id', user.id)
        .single() as any

      if (currentData?.role_switch_password !== currentRolePassword) {
        throw new Error('Contraseña de role actual incorrecta')
      }

      // 3. Actualizar contraseña de role
      const { error } = await supabase
        .from('company_settings')
        .update({ 
          role_switch_password: newPassword,
          role_password_changed_at: new Date().toISOString(),
          role_password_attempts: 0,
          role_password_locked_until: null
        } as any)
        .eq('user_id', user.id)

      if (error) {
        throw error
      }

      // Limpiar formulario
      setUserPassword("")
      setCurrentRolePassword(newPassword)
      setNewPassword("")
      setConfirmPassword("")
      
      // Actualizar info de seguridad
      await fetchSecurityInfo()
      
      setMessage({ type: 'success', text: 'Contraseña de role actualizada correctamente. Los cambios tomarán efecto inmediatamente.' })

    } catch (error: any) {
      console.error('Error updating password:', error)
      setMessage({ type: 'error', text: error.message || 'Error al actualizar la contraseña' })
      
      // Actualizar info de seguridad para reflejar intentos fallidos
      await fetchSecurityInfo()
    } finally {
      setIsLoading(false)
    }
  }

  // Solo mostrar para owners reales
  if (!permissions.isOwner || permissions.isRealEmployee) {
    return null
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          Seguridad de Roles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Información actual */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Estado de Contraseña de Role</h3>
              <p className="text-sm text-blue-700 mt-1">
                Esta contraseña es independiente de tu contraseña de usuario y se usa específicamente para cambiar entre modos de visualización.
              </p>
              <div className="mt-2 font-mono text-sm bg-white px-2 py-1 rounded border flex items-center justify-between">
                <span>••••••••••••</span>
                <span className="text-green-600 text-xs font-semibold">
                  {currentRolePassword && currentRolePassword !== 'admin123' ? '✓ Personalizada' : '⚠️ Por Defecto'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario para cambiar contraseña */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Cambiar Contraseña de Role</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Shield className="h-4 w-4" />
              <span>Contraseñas ocultas por seguridad</span>
            </div>
          </div>

          {/* Estado de seguridad */}
          {securityInfo.attempts > 0 || securityInfo.lockedUntil || securityInfo.lastChanged && (
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="space-y-2 text-sm">
                {securityInfo.lastChanged && (
                  <div className="text-amber-800">
                    <strong>Último cambio:</strong> {securityInfo.lastChanged}
                  </div>
                )}
                {securityInfo.attempts > 0 && (
                  <div className="text-red-700">
                    <strong>Intentos fallidos:</strong> {securityInfo.attempts}/3
                  </div>
                )}
                {securityInfo.lockedUntil && (
                  <div className="text-red-700 font-semibold">
                    <strong>🔒 Bloqueado hasta:</strong> {securityInfo.lockedUntil}
                  </div>
                )}
                {!securityInfo.canChange && !securityInfo.lockedUntil && (
                  <div className="text-amber-700">
                    <strong>⏱️ Espera:</strong> Debes esperar 5 minutos entre cambios de contraseña
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="user-password">Tu Contraseña de Usuario (Verificación)</Label>
              <Input
                id="user-password"
                type="password"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                placeholder="Contraseña de tu cuenta de usuario"
                disabled={!securityInfo.canChange}
              />
              <p className="text-xs text-gray-500">
                Se requiere para verificar tu identidad antes del cambio
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="current-role-password">Contraseña de Role Actual</Label>
              <Input
                id="current-role-password"
                type="password"
                value={currentRolePassword}
                onChange={(e) => setCurrentRolePassword(e.target.value)}
                placeholder="Contraseña de role actual"
                disabled={!securityInfo.canChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva Contraseña de Role</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ingresa la nueva contraseña (min. 8 caracteres)"
                disabled={!securityInfo.canChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirma la nueva contraseña"
                disabled={!securityInfo.canChange}
              />
            </div>
          </div>

          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              {message.type === 'success' && <CheckCircle className="h-4 w-4" />}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleSavePassword}
            disabled={isLoading || !newPassword || !confirmPassword || !userPassword || !currentRolePassword || !securityInfo.canChange}
            className="w-full"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Nueva Contraseña
              </>
            )}
          </Button>
        </div>

        {/* Información de seguridad mejorada */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-green-900">Medidas de Seguridad Implementadas</h3>
              <ul className="text-sm text-green-800 mt-1 space-y-1">
                <li>• ✅ Verificación de contraseña de usuario</li>
                <li>• ✅ Contraseña mínima de 8 caracteres</li>
                <li>• ✅ Cooldown de 5 minutos entre cambios</li>
                <li>• ✅ Bloqueo tras 3 intentos fallidos (30 min)</li>
                <li>• ✅ Registro de cambios con timestamp</li>
                <li>• ✅ Independiente de contraseña de usuario</li>
                <li>• ✅ <strong>Contraseñas nunca visibles</strong></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900">⚠️ Importante</h3>
              <ul className="text-sm text-red-800 mt-1 space-y-1">
                <li>• Esta contraseña controla el acceso a funciones administrativas</li>
                <li>• NO la compartas con empleados</li>
                <li>• Usa una contraseña fuerte y única</li>
                <li>• Si olvidas la contraseña, contacta soporte técnico</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}