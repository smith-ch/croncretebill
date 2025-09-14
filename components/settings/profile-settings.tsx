"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  User, 
  Camera, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Clock,
  Star,
  Edit2,
  Save,
  X,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

interface UserProfile {
  id?: string
  user_id?: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  avatar_url?: string
  bio?: string
  location?: string
  website?: string
  timezone: string
  language: string
  notifications_enabled: boolean
  email_notifications: boolean
  marketing_emails: boolean
  created_at?: string
  updated_at?: string
}

export function ProfileSettings() {
  const [loading, setLoading] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [profile, setProfile] = React.useState<UserProfile>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    bio: "",
    location: "",
    website: "",
    timezone: "America/Santo_Domingo",
    language: "es",
    notifications_enabled: true,
    email_notifications: true,
    marketing_emails: false
  })

  const [avatarFile, setAvatarFile] = React.useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

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

      // Upload avatar if there's a new file
      let avatarUrl = profile.avatar_url
      if (avatarFile) {
        console.log('Avatar file to upload:', avatarFile.name)
        const fileName = `avatar-${user.id}-${Date.now()}.${avatarFile.name.split(".").pop()}`
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatarFile, {
            cacheControl: "3600",
            upsert: false,
          })

        if (uploadError) {
          throw uploadError
        }

        const { data: { publicUrl } } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName)
        
        avatarUrl = publicUrl
      }

      // Update auth user metadata
      const { error: updateUserError } = await supabase.auth.updateUser({
        data: {
          first_name: profile.first_name,
          last_name: profile.last_name,
          avatar_url: avatarUrl,
          phone: profile.phone,
          bio: profile.bio,
          language: profile.language,
          timezone: profile.timezone,
          notifications_enabled: profile.notifications_enabled,
          email_notifications: profile.email_notifications,
          marketing_emails: profile.marketing_emails
        }
      })

      if (updateUserError) {
        throw updateUserError
      }

      setSuccess("Perfil actualizado exitosamente")
      setAvatarFile(null)
      setEditing(false)
    } catch (error) {
      console.error('Error:', error)
      setError("Error al actualizar el perfil")
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        setError("Error de autenticación")
        return
      }

      setProfile({
        first_name: user.user_metadata?.first_name || "",
        last_name: user.user_metadata?.last_name || "",
        email: user.email || "",
        phone: user.user_metadata?.phone || "",
        bio: user.user_metadata?.bio || "",
        location: user.user_metadata?.location || "",
        website: user.user_metadata?.website || "",
        avatar_url: user.user_metadata?.avatar_url || "",
        language: user.user_metadata?.language || "es",
        timezone: user.user_metadata?.timezone || "America/Santo_Domingo",
        notifications_enabled: user.user_metadata?.notifications_enabled ?? true,
        email_notifications: user.user_metadata?.email_notifications ?? true,
        marketing_emails: user.user_metadata?.marketing_emails ?? false
      })

      if (user.user_metadata?.avatar_url) {
        setAvatarPreview(user.user_metadata.avatar_url)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError("Error inesperado al cargar el perfil")
    }
  }

  React.useEffect(() => {
    fetchUserProfile()
  }, [])

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  return (
    <div className="space-y-8">
      {/* Header with Avatar */}
      <Card variant="elevated" className="border-0 shadow-2xl bg-gradient-to-r from-white to-blue-50">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative group">
              <Avatar className="h-32 w-32 border-4 border-white shadow-xl">
                <AvatarImage src={avatarPreview || profile.avatar_url} />
                <AvatarFallback className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  {getInitials(profile.first_name || "U", profile.last_name || "S")}
                </AvatarFallback>
              </Avatar>
              
              <motion.div
                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                whileHover={{ scale: 1.05 }}
                onClick={() => document.getElementById('avatar-upload')?.click()}
              >
                <Camera className="h-8 w-8 text-white" />
              </motion.div>
              
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div className="flex-1 text-center md:text-left space-y-4">
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  {profile.first_name} {profile.last_name}
                </h2>
                <p className="text-slate-600 text-lg">{profile.email}</p>
                {profile.bio && (
                  <p className="text-slate-500 mt-2 max-w-md">{profile.bio}</p>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  <User className="h-3 w-3 mr-1" />
                  Administrador
                </Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <Star className="h-3 w-3 mr-1" />
                  Plan Pro
                </Badge>
                {profile.location && (
                  <Badge variant="outline" className="bg-white/80">
                    <MapPin className="h-3 w-3 mr-1" />
                    {profile.location}
                  </Badge>
                )}
              </div>

              <div className="flex gap-3 justify-center md:justify-start">
                <Button
                  variant={editing ? "outline" : "gradient"}
                  onClick={() => editing ? setEditing(false) : setEditing(true)}
                  className="shadow-lg"
                >
                  {editing ? (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </>
                  ) : (
                    <>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Editar Perfil
                    </>
                  )}
                </Button>
                
                {editing && (
                  <Button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-gradient-to-r from-green-600 to-green-700 shadow-lg"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <div className="grid gap-8 md:grid-cols-2">
        <Card variant="glass" className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-slate-700">Nombre</Label>
                <Input
                  id="first_name"
                  value={profile.first_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, first_name: e.target.value }))}
                  disabled={!editing}
                  variant={editing ? "modern" : "default"}
                  className={cn(!editing && "bg-slate-50")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-slate-700">Apellido</Label>
                <Input
                  id="last_name"
                  value={profile.last_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, last_name: e.target.value }))}
                  disabled={!editing}
                  variant={editing ? "modern" : "default"}
                  className={cn(!editing && "bg-slate-50")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="text-slate-700">Biografía</Label>
              <Textarea
                id="bio"
                value={profile.bio}
                onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                disabled={!editing}
                className={cn(!editing && "bg-slate-50")}
                placeholder="Cuéntanos algo sobre ti..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Información de Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                  disabled={!editing}
                  variant={editing ? "modern" : "default"}
                  className={cn("pl-10", !editing && "bg-slate-50")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-700">Teléfono</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                  disabled={!editing}
                  variant={editing ? "modern" : "default"}
                  className={cn("pl-10", !editing && "bg-slate-50")}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-slate-700">Ubicación</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  id="location"
                  value={profile.location}
                  onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                  disabled={!editing}
                  variant={editing ? "modern" : "default"}
                  className={cn("pl-10", !editing && "bg-slate-50")}
                  placeholder="Santo Domingo, República Dominicana"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="text-slate-700">Sitio Web</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  id="website"
                  type="url"
                  value={profile.website}
                  onChange={(e) => setProfile(prev => ({ ...prev, website: e.target.value }))}
                  disabled={!editing}
                  variant={editing ? "modern" : "default"}
                  className={cn("pl-10", !editing && "bg-slate-50")}
                  placeholder="https://www.ejemplo.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preferences */}
      <Card variant="elevated" className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Preferencias de Notificación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="space-y-1">
              <h4 className="font-medium text-slate-900">Notificaciones por Email</h4>
              <p className="text-sm text-slate-600">Recibir notificaciones importantes por correo electrónico</p>
            </div>
            <Switch
              checked={profile.email_notifications}
              onCheckedChange={(checked) => setProfile(prev => ({ ...prev, email_notifications: checked }))}
              disabled={!editing}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="space-y-1">
              <h4 className="font-medium text-slate-900">Emails de Marketing</h4>
              <p className="text-sm text-slate-600">Recibir noticias, actualizaciones y ofertas especiales</p>
            </div>
            <Switch
              checked={profile.marketing_emails}
              onCheckedChange={(checked) => setProfile(prev => ({ ...prev, marketing_emails: checked }))}
              disabled={!editing}
            />
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
    </div>
  )
}