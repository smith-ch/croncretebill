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
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      const user = session?.user

      if (authError || !user) {
        setError("Error de autenticación")
        return
      }

      // Validaciones para cambio de contraseña
      if (settings.new_password || settings.current_password || settings.confirm_password) {
        // Si algún campo de contraseña tiene valor, se requieren todos
        if (!settings.current_password) {
          setError("Debes ingresar tu contraseña actual para cambiar la contraseña")
          setLoading(false)
          return
        }

        if (!settings.new_password) {
          setError("Debes ingresar una nueva contraseña")
          setLoading(false)
          return
        }

        if (!settings.confirm_password) {
          setError("Debes confirmar la nueva contraseña")
          setLoading(false)
          return
        }

        if (settings.new_password !== settings.confirm_password) {
          setError("Las contraseñas no coinciden")
          setLoading(false)
          return
        }

        if (settings.new_password.length < 8) {
          setError("La nueva contraseña debe tener al menos 8 caracteres")
          setLoading(false)
          return
        }

        // Validar que la nueva contraseña sea diferente a la actual
        if (settings.current_password === settings.new_password) {
          setError("La nueva contraseña debe ser diferente a la actual")
          setLoading(false)
          return
        }

        // Verificar contraseña actual intentando re-autenticarse
        if (user.email) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: settings.current_password,
          })

          if (signInError) {
            setError("La contraseña actual es incorrecta")
            setLoading(false)
            return
          }

          // Cambiar contraseña
          const { error: passwordError } = await supabase.auth.updateUser({
            password: settings.new_password
          })

          if (passwordError) {
            throw passwordError
          }

          // Limpiar campos de contraseña después del cambio exitoso
          setSettings(prev => ({
            ...prev,
            current_password: "",
            new_password: "",
            confirm_password: ""
          }))
        } else {
          setError("No se pudo verificar tu identidad. Email no disponible.")
          setLoading(false)
          return
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
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      const user = session?.user

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
          <h2 className="text-2xl font-bold text-slate-200 dark:text-slate-200">Configuración de Seguridad</h2>
          <p className="text-slate-400 dark:text-slate-400">Administra la seguridad de tu cuenta y sesiones activas</p>
        </div>
        <Badge variant="outline" className="bg-red-900/30 text-red-400 border-red-800 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700">
          <Shield className="h-3 w-3 mr-1" />
          Configuración de Seguridad
        </Badge>
      </div>

      {/* Password Change */}
      <Card variant="elevated" className="border-0 shadow-xl dark:bg-slate-800/80 dark:backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-slate-200">
            <Key className="h-5 w-5 text-red-600 dark:text-red-400" />
            Cambiar Contraseña
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="current_password" className="text-slate-300 dark:text-slate-300">Contraseña Actual</Label>
              <div className="relative">
                <Input
                  id="current_password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={settings.current_password}
                  onChange={(e) => updateSetting('current_password', e.target.value)}
                  variant="modern"
                  placeholder="••••••••"
                  className="dark:border-slate-600 dark:text-slate-100 dark:bg-slate-800 dark:placeholder:text-slate-500"
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
              <Label htmlFor="new_password" className="text-slate-300 dark:text-slate-300">Nueva Contraseña</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showNewPassword ? "text" : "password"}
                  value={settings.new_password}
                  onChange={(e) => updateSetting('new_password', e.target.value)}
                  variant="modern"
                  placeholder="••••••••"
                  className="dark:border-slate-600 dark:text-slate-100 dark:bg-slate-800 dark:placeholder:text-slate-500"
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
              <Label htmlFor="confirm_password" className="text-slate-300 dark:text-slate-300">Confirmar Contraseña</Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={settings.confirm_password}
                  onChange={(e) => updateSetting('confirm_password', e.target.value)}
                  variant="modern"
                  placeholder="••••••••"
                  className="dark:border-slate-600 dark:text-slate-100 dark:bg-slate-800 dark:placeholder:text-slate-500"
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

          <div className="p-4 bg-amber-900/30 rounded-lg border border-amber-800 dark:bg-amber-900/20 dark:border-amber-800">
            <p className="text-sm text-amber-300 dark:text-amber-300">
              <strong>Requisitos de contraseña:</strong> Mínimo 8 caracteres, incluir mayúsculas, minúsculas, números y símbolos.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card variant="glass" className="border-0 shadow-xl dark:bg-slate-800/80 dark:backdrop-blur-xl opacity-75">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-slate-200">
            <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Autenticación de Dos Factores (2FA)
            <Badge variant="outline" className="ml-auto bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-600">
              Próximamente
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-700 dark:bg-blue-900/20 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-full dark:bg-blue-900/30">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-200">Protección Adicional</h4>
                <p className="text-sm text-blue-400 dark:text-blue-300">
                  Mejora la seguridad de tu cuenta con 2FA (función en desarrollo)
                </p>
              </div>
            </div>
            <Switch
              checked={false}
              disabled
            />
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              <strong>Nota:</strong> La autenticación de dos factores estará disponible en una próxima actualización. Esta función agregará una capa extra de seguridad a tu cuenta.
            </p>
          </div>

          <Button variant="outline" className="w-full bg-slate-900 hover:bg-slate-900 border-slate-700 dark:bg-slate-800 dark:hover:bg-blue-900/30 dark:border-blue-600" disabled>
            <Smartphone className="h-4 w-4 mr-2" />
            Configurar Autenticación de Dos Factores
          </Button>
        </CardContent>
      </Card>

      {/* Security Policies */}
      <div className="grid gap-8 lg:grid-cols-2">
        <Card variant="elevated" className="border-0 shadow-xl dark:bg-slate-800/80 dark:backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-slate-200">
              <Lock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              Políticas de Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-slate-300 dark:text-slate-300">Alertas de Inicio de Sesión</Label>
                <p className="text-sm text-slate-500 dark:text-slate-400">Notificar cuando se inicie sesión desde un nuevo dispositivo</p>
              </div>
              <Switch
                checked={settings.login_alerts}
                onCheckedChange={(checked) => updateSetting('login_alerts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-slate-300 dark:text-slate-300">Expiración de Contraseña</Label>
                <p className="text-sm text-slate-500 dark:text-slate-400">Requerir cambio de contraseña periódicamente</p>
              </div>
              <Switch
                checked={settings.password_expires}
                onCheckedChange={(checked) => updateSetting('password_expires', checked)}
              />
            </div>

            {settings.password_expires && (
              <div className="space-y-2 ml-4">
                <Label className="text-slate-300 dark:text-slate-300">Días para expiración</Label>
                <Input
                  type="number"
                  value={settings.password_expiry_days}
                  onChange={(e) => updateSetting('password_expiry_days', parseInt(e.target.value))}
                  variant="modern"
                  min={30}
                  max={365}
                  className="w-24 dark:border-slate-600 dark:text-slate-100 dark:bg-slate-800 dark:placeholder:text-slate-500"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-slate-300 dark:text-slate-300">Cambio de Contraseña Obligatorio</Label>
                <p className="text-sm text-slate-500 dark:text-slate-400">Requerir cambio en el próximo inicio de sesión</p>
              </div>
              <Switch
                checked={settings.require_password_change}
                onCheckedChange={(checked) => updateSetting('require_password_change', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" className="border-0 shadow-xl dark:bg-slate-800/80 dark:backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-slate-200">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              Control de Acceso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-300 dark:text-slate-300">Tiempo de Sesión (minutos)</Label>
              <Input
                type="number"
                value={settings.session_timeout}
                onChange={(e) => updateSetting('session_timeout', parseInt(e.target.value))}
                variant="modern"
                min={5}
                max={480}
                className="w-24 dark:border-slate-600 dark:text-slate-100 dark:bg-slate-800 dark:placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">Cerrar sesión automáticamente por inactividad</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 dark:text-slate-300">Límite de Intentos de Inicio</Label>
              <Input
                type="number"
                value={settings.login_attempts_limit}
                onChange={(e) => updateSetting('login_attempts_limit', parseInt(e.target.value))}
                variant="modern"
                min={3}
                max={10}
                className="w-24 dark:border-slate-600 dark:text-slate-100 dark:bg-slate-800 dark:placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">Bloquear cuenta después de intentos fallidos</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 dark:text-slate-300">Duración de Bloqueo (minutos)</Label>
              <Input
                type="number"
                value={settings.account_lockout_duration}
                onChange={(e) => updateSetting('account_lockout_duration', parseInt(e.target.value))}
                variant="modern"
                min={5}
                max={60}
                className="w-24 dark:border-slate-600 dark:text-slate-100 dark:bg-slate-800 dark:placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">Tiempo de bloqueo después de exceder intentos</p>
            </div>
          </CardContent>
        </Card>
      </div>



      {/* Alerts */}
      {error && (
        <Alert className="border-red-800 bg-red-900/30 dark:bg-red-900/20 dark:border-red-800">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-300 dark:text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-800 bg-green-900/30 dark:bg-green-900/20 dark:border-green-800">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-300 dark:text-green-300">{success}</AlertDescription>
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