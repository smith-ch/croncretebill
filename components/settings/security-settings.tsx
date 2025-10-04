"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading"
import { 
  Shield, 
  Key, 
  Smartphone,
  Lock,
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Save, 
  CheckCircle
} from "lucide-react"
import { supabase } from "@/lib/supabase"

interface SecuritySettings {
  current_password: string
  new_password: string
  confirm_password: string
  two_factor_enabled: boolean
  login_alerts: boolean
  session_timeout: number
  password_expires: boolean
  password_expiry_days: number
  require_password_change: boolean
  login_attempts_limit: number
  account_lockout_duration: number
}



export function SecuritySettingsComponent() {
  const [loading, setLoading] = React.useState(false)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false)
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  
  const [settings, setSettings] = React.useState<SecuritySettings>({
    current_password: "",
    new_password: "",
    confirm_password: "",
    two_factor_enabled: false,
    login_alerts: true,
    session_timeout: 30,
    password_expires: false,
    password_expiry_days: 90,
    require_password_change: false,
    login_attempts_limit: 5,
    account_lockout_duration: 15,
  })

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        setError("Error de autenticación")
        return
      }

      // Validaciones
      if (settings.new_password && settings.new_password !== settings.confirm_password) {
        setError("Las contraseñas no coinciden")
        setLoading(false)
        return
      }

      if (settings.new_password && settings.new_password.length < 8) {
        setError("La nueva contraseña debe tener al menos 8 caracteres")
        setLoading(false)
        return
      }

      // Cambiar contraseña si se proporciona una nueva
      if (settings.new_password && settings.current_password) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: settings.new_password
        })

        if (passwordError) {
          throw passwordError
        }
      }

      // Guardar configuraciones de seguridad en user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          security_settings: {
            two_factor_enabled: settings.two_factor_enabled,
            login_alerts: settings.login_alerts,
            session_timeout: settings.session_timeout,
            password_expires: settings.password_expires,
            password_expiry_days: settings.password_expiry_days,
            require_password_change: settings.require_password_change,
            login_attempts_limit: settings.login_attempts_limit,
            account_lockout_duration: settings.account_lockout_duration,
          }
        }
      })

      if (updateError) {
        throw updateError
      }

      setSuccess("Configuración de seguridad actualizada exitosamente")
      
      // Limpiar campos de contraseña
      setSettings(prev => ({
        ...prev,
        current_password: "",
        new_password: "",
        confirm_password: ""
      }))
    } catch (error: any) {
      console.error('Error:', error)
      setError(error.message || "Error al actualizar la configuración de seguridad")
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = <K extends keyof SecuritySettings>(
    key: K, 
    value: SecuritySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const fetchSecuritySettings = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        setError("Error de autenticación")
        return
      }

      const securitySettings = user.user_metadata?.security_settings
      if (securitySettings) {
        setSettings(prev => ({
          ...prev,
          two_factor_enabled: securitySettings.two_factor_enabled ?? false,
          login_alerts: securitySettings.login_alerts ?? true,
          session_timeout: securitySettings.session_timeout ?? 30,
          password_expires: securitySettings.password_expires ?? false,
          password_expiry_days: securitySettings.password_expiry_days ?? 90,
          require_password_change: securitySettings.require_password_change ?? false,
          login_attempts_limit: securitySettings.login_attempts_limit ?? 5,
          account_lockout_duration: securitySettings.account_lockout_duration ?? 15,
        }))
      }
    } catch (err) {
      console.error('Error loading security settings:', err)
      setError("Error al cargar la configuración de seguridad")
    }
  }

  React.useEffect(() => {
    fetchSecuritySettings()
  }, [])



  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Configuración de Seguridad</h2>
          <p className="text-slate-600">Administra la seguridad de tu cuenta y sesiones activas</p>
        </div>
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <Shield className="h-3 w-3 mr-1" />
          Configuración de Seguridad
        </Badge>
      </div>

      {/* Password Change */}
      <Card variant="elevated" className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-red-600" />
            Cambiar Contraseña
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="current_password" className="text-slate-700">Contraseña Actual</Label>
              <div className="relative">
                <Input
                  id="current_password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={settings.current_password}
                  onChange={(e) => updateSetting('current_password', e.target.value)}
                  variant="modern"
                  placeholder="••••••••"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password" className="text-slate-700">Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showNewPassword ? "text" : "password"}
                  value={settings.new_password}
                  onChange={(e) => updateSetting('new_password', e.target.value)}
                  variant="modern"
                  placeholder="••••••••"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password" className="text-slate-700">Confirmar Contraseña</Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={settings.confirm_password}
                  onChange={(e) => updateSetting('confirm_password', e.target.value)}
                  variant="modern"
                  placeholder="••••••••"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>Requisitos de contraseña:</strong> Mínimo 8 caracteres, incluir mayúsculas, minúsculas, números y símbolos.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card variant="glass" className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-blue-600" />
            Autenticación de Dos Factores (2FA)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Protección Adicional</h4>
                <p className="text-sm text-blue-700">
                  {settings.two_factor_enabled 
                    ? "La autenticación de dos factores está activa" 
                    : "Mejora la seguridad de tu cuenta con 2FA"
                  }
                </p>
              </div>
            </div>
            <Switch
              checked={settings.two_factor_enabled}
              onCheckedChange={(checked) => updateSetting('two_factor_enabled', checked)}
            />
          </div>

          {!settings.two_factor_enabled && (
            <Button variant="outline" className="w-full bg-white hover:bg-blue-50 border-blue-200">
              <Smartphone className="h-4 w-4 mr-2" />
              Configurar Autenticación de Dos Factores
            </Button>
          )}

          {settings.two_factor_enabled && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">2FA configurado correctamente</span>
              </div>
              <Button variant="outline" className="w-full bg-white hover:bg-red-50 border-red-200 text-red-700">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Desactivar 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Policies */}
      <div className="grid gap-8 lg:grid-cols-2">
        <Card variant="elevated" className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-orange-600" />
              Políticas de Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-slate-700">Alertas de Inicio de Sesión</Label>
                <p className="text-sm text-slate-500">Notificar cuando se inicie sesión desde un nuevo dispositivo</p>
              </div>
              <Switch
                checked={settings.login_alerts}
                onCheckedChange={(checked) => updateSetting('login_alerts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-slate-700">Expiración de Contraseña</Label>
                <p className="text-sm text-slate-500">Requerir cambio de contraseña periódicamente</p>
              </div>
              <Switch
                checked={settings.password_expires}
                onCheckedChange={(checked) => updateSetting('password_expires', checked)}
              />
            </div>

            {settings.password_expires && (
              <div className="space-y-2 ml-4">
                <Label className="text-slate-700">Días para expiración</Label>
                <Input
                  type="number"
                  value={settings.password_expiry_days}
                  onChange={(e) => updateSetting('password_expiry_days', parseInt(e.target.value))}
                  variant="modern"
                  min={30}
                  max={365}
                  className="w-24"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-slate-700">Cambio de Contraseña Obligatorio</Label>
                <p className="text-sm text-slate-500">Requerir cambio en el próximo inicio de sesión</p>
              </div>
              <Switch
                checked={settings.require_password_change}
                onCheckedChange={(checked) => updateSetting('require_password_change', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Control de Acceso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-700">Tiempo de Sesión (minutos)</Label>
              <Input
                type="number"
                value={settings.session_timeout}
                onChange={(e) => updateSetting('session_timeout', parseInt(e.target.value))}
                variant="modern"
                min={5}
                max={480}
                className="w-24"
              />
              <p className="text-xs text-slate-500">Cerrar sesión automáticamente por inactividad</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">Límite de Intentos de Inicio</Label>
              <Input
                type="number"
                value={settings.login_attempts_limit}
                onChange={(e) => updateSetting('login_attempts_limit', parseInt(e.target.value))}
                variant="modern"
                min={3}
                max={10}
                className="w-24"
              />
              <p className="text-xs text-slate-500">Bloquear cuenta después de intentos fallidos</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">Duración de Bloqueo (minutos)</Label>
              <Input
                type="number"
                value={settings.account_lockout_duration}
                onChange={(e) => updateSetting('account_lockout_duration', parseInt(e.target.value))}
                variant="modern"
                min={5}
                max={60}
                className="w-24"
              />
              <p className="text-xs text-slate-500">Tiempo de bloqueo después de exceder intentos</p>
            </div>
          </CardContent>
        </Card>
      </div>



      {/* Alerts */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-gradient-to-r from-red-600 to-orange-600 shadow-lg hover:shadow-xl px-8"
          size="lg"
        >
          {loading ? (
            <LoadingSpinner variant="default" size="sm" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar Configuración
        </Button>
      </div>
    </div>
  )
}