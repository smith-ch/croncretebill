"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading"
import { 
  Settings, 
  Monitor, 
  Moon, 
  Sun, 
  Clock, 
  Bell,
  Shield,
  Save,
  CheckCircle,
  AlertCircle,
  Palette,
  Languages,
  Volume2,
  Smartphone
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useTheme } from "@/contexts/theme-context"
import { useLanguage } from "@/contexts/language-context"

interface SystemSettingsData {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  dateFormat: string
  timeFormat: '12h' | '24h'
  currency_format: 'symbol' | 'code'
  notifications_enabled: boolean
  email_notifications: boolean
  sound_notifications: boolean
  desktop_notifications: boolean
  session_timeout: number
  two_factor_enabled: boolean
  login_alerts: boolean
}

const LANGUAGES = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
]

const TIMEZONES = [
  { value: 'America/Santo_Domingo', label: 'Santo Domingo (UTC-4)' },
  { value: 'America/New_York', label: 'Nueva York (UTC-5)' },
  { value: 'America/Los_Angeles', label: 'Los Ángeles (UTC-8)' },
  { value: 'Europe/Madrid', label: 'Madrid (UTC+1)' },
  { value: 'Europe/London', label: 'Londres (UTC+0)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (UTC-6)' },
  { value: 'America/Bogota', label: 'Bogotá (UTC-5)' },
]

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: '31/12/2024' },
  { value: 'MM/DD/YYYY', label: '12/31/2024' },
  { value: 'YYYY-MM-DD', label: '2024-12-31' },
  { value: 'DD-MM-YYYY', label: '31-12-2024' },
]

export function SystemSettings() {
  const [loading, setLoading] = React.useState(false)
  const [fetchLoading, setFetchLoading] = React.useState(true)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  
  // Use theme and language contexts
  const { theme: currentTheme, setTheme } = useTheme()
  const { language: currentLanguage, setLanguage } = useLanguage()
  
  const [settings, setSettings] = React.useState<SystemSettingsData>({
    theme: 'system',
    language: 'es',
    timezone: 'America/Santo_Domingo',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency_format: 'symbol',
    notifications_enabled: true,
    email_notifications: true,
    sound_notifications: true,
    desktop_notifications: true,
    session_timeout: 30,
    two_factor_enabled: false,
    login_alerts: true,
  })

  // Sync contexts with local state on mount
  React.useEffect(() => {
    setSettings(prev => ({
      ...prev,
      theme: currentTheme,
      language: currentLanguage
    }))
  }, [currentTheme, currentLanguage])

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    setSettings(prev => ({ ...prev, theme: newTheme }))
  }

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage as any)
    setSettings(prev => ({ ...prev, language: newLanguage }))
  }

  const handleSave = async () => {
    setLoading(true)
    setSuccess(null)
    setError(null)

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        setError("Error de autenticación")
        return
      }

      // Guardar configuraciones del sistema en user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          system_settings: {
            theme: settings.theme,
            language: settings.language,
            timezone: settings.timezone,
            dateFormat: settings.dateFormat,
            timeFormat: settings.timeFormat,
            currency_format: settings.currency_format,
            notifications_enabled: settings.notifications_enabled,
            email_notifications: settings.email_notifications,
            sound_notifications: settings.sound_notifications,
            desktop_notifications: settings.desktop_notifications,
            session_timeout: settings.session_timeout,
            two_factor_enabled: settings.two_factor_enabled,
            login_alerts: settings.login_alerts,
          }
        }
      })

      if (updateError) {
        throw updateError
      }

      setSuccess("Configuración del sistema guardada exitosamente")
    } catch (error: any) {
      console.error('Error saving settings:', error)
      setError(error.message || "Error al guardar la configuración del sistema")
    } finally {
      setLoading(false)
    }
  }

  const fetchSystemSettings = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        setError("Error de autenticación")
        return
      }

      const systemSettings = user.user_metadata?.system_settings
      if (systemSettings) {
        setSettings(prev => ({
          ...prev,
          theme: systemSettings.theme ?? 'system',
          language: systemSettings.language ?? 'es',
          timezone: systemSettings.timezone ?? 'America/Santo_Domingo',
          dateFormat: systemSettings.dateFormat ?? 'DD/MM/YYYY',
          timeFormat: systemSettings.timeFormat ?? '24h',
          currency_format: systemSettings.currency_format ?? 'symbol',
          notifications_enabled: systemSettings.notifications_enabled ?? true,
          email_notifications: systemSettings.email_notifications ?? true,
          sound_notifications: systemSettings.sound_notifications ?? true,
          desktop_notifications: systemSettings.desktop_notifications ?? true,
          session_timeout: systemSettings.session_timeout ?? 30,
          two_factor_enabled: systemSettings.two_factor_enabled ?? false,
          login_alerts: systemSettings.login_alerts ?? true,
        }))
      }
    } catch (err) {
      console.error('Error loading system settings:', err)
      setError("Error al cargar la configuración del sistema")
    } finally {
      setFetchLoading(false)
    }
  }

  React.useEffect(() => {
    fetchSystemSettings()
  }, [])

  const updateSetting = <K extends keyof SystemSettingsData>(
    key: K, 
    value: SystemSettingsData[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner variant="gradient" size="lg" text="Cargando configuración del sistema..." />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Configuración del Sistema</h2>
          <p className="text-slate-600">Personaliza la apariencia y comportamiento de la aplicación</p>
        </div>
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          <Settings className="h-3 w-3 mr-1" />
          Configuración de Sistema
        </Badge>
      </div>

      {/* Theme and Appearance */}
      <Card variant="glass" className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-purple-600" />
            Apariencia y Tema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="text-slate-700">Tema de la Aplicación</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'light', label: 'Claro', icon: Sun },
                { value: 'dark', label: 'Oscuro', icon: Moon },
                { value: 'system', label: 'Sistema', icon: Monitor },
              ].map((theme) => {
                const Icon = theme.icon
                return (
                  <button
                    key={theme.value}
                    onClick={() => handleThemeChange(theme.value as 'light' | 'dark' | 'system')}
                    className={`
                      relative p-4 rounded-xl border-2 transition-all duration-200
                      ${settings.theme === theme.value 
                        ? 'border-purple-500 bg-purple-50 text-purple-700' 
                        : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                      }
                    `}
                  >
                    <Icon className="h-6 w-6 mx-auto mb-2" />
                    <p className="text-sm font-medium">{theme.label}</p>
                    {settings.theme === theme.value && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="h-4 w-4 text-purple-600" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language and Region */}
      <div className="grid gap-8 lg:grid-cols-2">
        <Card variant="elevated" className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-blue-600" />
              Idioma y Región
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-700">Idioma de la Interfaz</Label>
              <Select value={settings.language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="bg-white border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">Zona Horaria</Label>
              <Select value={settings.timezone} onValueChange={(value) => updateSetting('timezone', value)}>
                <SelectTrigger className="bg-white border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              Formato de Fecha y Hora
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-700">Formato de Fecha</Label>
              <Select value={settings.dateFormat} onValueChange={(value) => updateSetting('dateFormat', value)}>
                <SelectTrigger className="bg-white border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-slate-700">Formato de Hora</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: '12h', label: '12 horas (2:30 PM)' },
                  { value: '24h', label: '24 horas (14:30)' },
                ].map((format) => (
                  <button
                    key={format.value}
                    onClick={() => updateSetting('timeFormat', format.value as '12h' | '24h')}
                    className={`
                      p-3 rounded-lg border-2 text-sm transition-all duration-200
                      ${settings.timeFormat === format.value 
                        ? 'border-green-500 bg-green-50 text-green-700' 
                        : 'border-slate-200 hover:border-green-300 hover:bg-slate-50'
                      }
                    `}
                  >
                    {format.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications */}
      <Card variant="glass" className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-600" />
            Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-slate-700">Notificaciones Generales</Label>
                  <p className="text-sm text-slate-500">Activar o desactivar todas las notificaciones</p>
                </div>
                <Switch
                  checked={settings.notifications_enabled}
                  onCheckedChange={(checked: boolean) => updateSetting('notifications_enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-slate-700">Notificaciones por Email</Label>
                  <p className="text-sm text-slate-500">Recibir notificaciones importantes por correo</p>
                </div>
                <Switch
                  checked={settings.email_notifications}
                  onCheckedChange={(checked: boolean) => updateSetting('email_notifications', checked)}
                  disabled={!settings.notifications_enabled}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1 flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-slate-500" />
                  <div>
                    <Label className="text-slate-700">Sonidos</Label>
                    <p className="text-sm text-slate-500">Reproducir sonidos para notificaciones</p>
                  </div>
                </div>
                <Switch
                  checked={settings.sound_notifications}
                  onCheckedChange={(checked: boolean) => updateSetting('sound_notifications', checked)}
                  disabled={!settings.notifications_enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1 flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-slate-500" />
                  <div>
                    <Label className="text-slate-700">Notificaciones de Escritorio</Label>
                    <p className="text-sm text-slate-500">Mostrar notificaciones en el sistema</p>
                  </div>
                </div>
                <Switch
                  checked={settings.desktop_notifications}
                  onCheckedChange={(checked: boolean) => updateSetting('desktop_notifications', checked)}
                  disabled={!settings.notifications_enabled}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card variant="elevated" className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            Configuraciones de Seguridad
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-slate-700">Autenticación de Dos Factores</Label>
              <p className="text-sm text-slate-500">Agregar una capa extra de seguridad (próximamente)</p>
            </div>
            <Switch
              checked={settings.two_factor_enabled}
              onCheckedChange={(checked: boolean) => updateSetting('two_factor_enabled', checked)}
              disabled
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-slate-700">Alertas de Inicio de Sesión</Label>
              <p className="text-sm text-slate-500">Notificar cuando se inicie sesión</p>
            </div>
            <Switch
              checked={settings.login_alerts}
              onCheckedChange={(checked: boolean) => updateSetting('login_alerts', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700">Tiempo de Sesión (minutos)</Label>
            <Select 
              value={settings.session_timeout.toString()} 
              onValueChange={(value) => updateSetting('session_timeout', parseInt(value))}
            >
              <SelectTrigger className="bg-white border-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutos</SelectItem>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="120">2 horas</SelectItem>
                <SelectItem value="480">8 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
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
          className="bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg hover:shadow-xl px-8"
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