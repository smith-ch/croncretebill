"use client"

import * as React from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { 
  Building2, 
  Upload, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  FileText,
  DollarSign,
  Save,
  AlertCircle,
  CheckCircle,
  Camera,
  Trash2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { LoadingSpinner } from "@/components/ui/loading"
import { useToast } from "@/hooks/use-toast"

interface CompanySettingsData {
  id?: string
  user_id?: string
  company_name: string
  company_address: string
  company_phone: string
  company_email: string
  company_website: string
  tax_id: string
  company_logo?: string
  currency_code: string
  currency_symbol: string
  business_type: string
  foundation_year?: string
  employee_count?: string
  industry?: string
}

const CURRENCIES = [
  { code: "DOP", symbol: "RD$", name: "Peso Dominicano" },
  { code: "USD", symbol: "$", name: "Dólar Estadounidense" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "Libra Esterlina" },
  { code: "CAD", symbol: "C$", name: "Dólar Canadiense" },
  { code: "MXN", symbol: "$", name: "Peso Mexicano" },
  { code: "COP", symbol: "$", name: "Peso Colombiano" },
]

const BUSINESS_TYPES = [
  "Empresa Individual",
  "Sociedad de Responsabilidad Limitada (SRL)",
  "Sociedad Anónima (SA)",
  "Cooperativa",
  "Fundación",
  "Organización Sin Fines de Lucro",
  "Otro"
]

const INDUSTRIES = [
  "Construcción",
  "Tecnología",
  "Comercio",
  "Servicios",
  "Manufactura",
  "Consultoría",
  "Educación",
  "Salud",
  "Turismo",
  "Agricultura",
  "Otro"
]

export function CompanySettings() {
  const [loading, setLoading] = React.useState(false)
  const [fetchLoading, setFetchLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const { toast } = useToast()
  
  const [settings, setSettings] = React.useState<CompanySettingsData>({
    company_name: "",
    company_address: "",
    company_phone: "",
    company_email: "",
    company_website: "",
    tax_id: "",
    company_logo: "",
    currency_code: "DOP",
    currency_symbol: "RD$",
    business_type: "",
    foundation_year: "",
    employee_count: "",
    industry: ""
  })

  const [logoFile, setLogoFile] = React.useState<File | null>(null)
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null)
  const [dragOver, setDragOver] = React.useState(false)

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processLogoFile(file)
    }
  }

  const processLogoFile = (file: File) => {
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      processLogoFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    setSettings(prev => ({ ...prev, company_logo: "" }))
  }

  const handleCurrencyChange = (currencyCode: string) => {
    const currency = CURRENCIES.find((c) => c.code === currencyCode)
    if (currency) {
      setSettings((prev) => ({
        ...prev,
        currency_code: currency.code,
        currency_symbol: currency.symbol,
      }))
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    // Validación: Nombre de empresa es obligatorio
    if (!settings.company_name || settings.company_name.trim() === "") {
      toast({
        variant: "destructive",
        title: "❌ Campo requerido",
        description: "El nombre de la empresa es obligatorio",
      })
      setLoading(false)
      return
    }

    // Validación: RNC/Tax ID debe tener 9 dígitos si se proporciona
    if (settings.tax_id && !/^\d{9}$/.test(settings.tax_id)) {
      toast({
        variant: "destructive",
        title: "❌ RNC inválido",
        description: "El RNC debe contener exactamente 9 dígitos",
      })
      setLoading(false)
      return
    }

    // Validación: Email debe ser válido
    if (settings.company_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.company_email)) {
      toast({
        variant: "destructive",
        title: "❌ Email inválido",
        description: "Por favor ingrese un correo electrónico válido",
      })
      setLoading(false)
      return
    }

    // Validación: Teléfono debe tener formato válido
    if (settings.company_phone && settings.company_phone.replace(/\D/g, '').length < 10) {
      toast({
        variant: "destructive",
        title: "⚠️ Teléfono incompleto",
        description: "El teléfono debe tener al menos 10 dígitos",
      })
      setLoading(false)
      return
    }

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        toast({
          variant: "destructive",
          title: "Error de autenticación",
          description: "Su sesión ha expirado. Por favor, inicie sesión nuevamente.",
        })
        setError("Error de autenticación")
        return
      }

      // Upload logo if there's a new file
      let logoUrl = settings.company_logo
      if (logoFile) {
        console.log('Logo file to upload:', logoFile.name)
        const fileName = `logo-${user.id}-${Date.now()}.${logoFile.name.split(".").pop()}`
        const { error: uploadError } = await supabase.storage
          .from("company-assets")
          .upload(fileName, logoFile, {
            cacheControl: "3600",
            upsert: false,
          })

        if (uploadError) {
          throw uploadError
        }

        const { data: { publicUrl } } = supabase.storage
          .from("company-assets")
          .getPublicUrl(fileName)
        
        logoUrl = publicUrl
      }

      const settingsData = {
        user_id: user.id,
        company_name: settings.company_name.trim(),
        company_address: settings.company_address,
        company_phone: settings.company_phone,
        company_email: settings.company_email,
        company_website: settings.company_website,
        tax_id: settings.tax_id,
        company_logo: logoUrl,
        currency_code: settings.currency_code,
        currency_symbol: settings.currency_symbol,
        business_type: settings.business_type,
        foundation_year: settings.foundation_year,
        employee_count: settings.employee_count,
        industry: settings.industry,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("company_settings")
        .upsert(settingsData, {
          onConflict: "user_id",
        })

      if (error) {
        throw error
      }

      setSuccess("Configuración de empresa guardada exitosamente")
      toast({
        title: "✅ Configuración guardada",
        description: "La configuración de la empresa ha sido actualizada correctamente",
      })
      setLogoFile(null)
    } catch (error) {
      console.error('Error:', error)
      const errorMsg = "Error al guardar la configuración de empresa"
      setError(errorMsg)
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: errorMsg,
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        setError("Error de autenticación")
        return
      }

      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (error && error.code !== "PGRST116") {
        console.error('Error fetching settings:', error)
        setError("Error al cargar la configuración")
        return
      }

      if (data) {
        setSettings({
          company_name: data.company_name || "",
          company_address: data.company_address || "",
          company_phone: data.company_phone || "",
          company_email: data.company_email || "",
          company_website: data.company_website || "",
          tax_id: data.tax_id || "",
          company_logo: data.company_logo || "",
          currency_code: data.currency_code || "DOP",
          currency_symbol: data.currency_symbol || "RD$",
          business_type: data.business_type || "",
          foundation_year: data.foundation_year || "",
          employee_count: data.employee_count || "",
          industry: data.industry || ""
        })
        
        if (data.company_logo) {
          setLogoPreview(data.company_logo)
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError("Error inesperado al cargar la configuración")
    } finally {
      setFetchLoading(false)
    }
  }

  React.useEffect(() => {
    fetchSettings()
  }, [])

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner variant="gradient" size="lg" text="Cargando configuración..." />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Configuración de Empresa</h2>
          <p className="text-slate-600">Administra la información de tu empresa</p>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Building2 className="h-3 w-3 mr-1" />
          Configuración Empresarial
        </Badge>
      </div>

      {/* Logo Section */}
      <Card variant="elevated" className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-600" />
            Logo de la Empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300",
              dragOver ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {logoPreview ? (
              <div className="space-y-4">
                <div className="relative inline-block">
                  <Image
                    src={logoPreview}
                    alt="Logo preview"
                    width={200}
                    height={128}
                    className="max-h-32 object-contain rounded-lg shadow-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-8 w-8 rounded-full shadow-lg"
                    onClick={removeLogo}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Logo cargado correctamente</p>
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    className="bg-white hover:bg-slate-50"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Cambiar Logo
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
                  <Upload className="h-8 w-8 text-slate-400" />
                </div>
                <div>
                  <p className="text-lg font-medium text-slate-700">Sube el logo de tu empresa</p>
                  <p className="text-sm text-slate-500">Arrastra y suelta una imagen o haz clic para seleccionar</p>
                  <p className="text-xs text-slate-400 mt-2">PNG, JPG, GIF hasta 5MB</p>
                </div>
                <Button
                  variant="gradient"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                  className="shadow-lg"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Seleccionar Archivo
                </Button>
              </div>
            )}
            
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Company Information */}
      <div className="grid gap-8 lg:grid-cols-2">
        <Card variant="glass" className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Información General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="company_name" className="text-slate-700">Nombre de la Empresa *</Label>
              <Input
                id="company_name"
                value={settings.company_name}
                onChange={(e) => setSettings(prev => ({ ...prev, company_name: e.target.value }))}
                variant="modern"
                placeholder="Mi Empresa S.A."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_id" className="text-slate-700">RNC/NIT *</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  id="tax_id"
                  value={settings.tax_id}
                  onChange={(e) => setSettings(prev => ({ ...prev, tax_id: e.target.value }))}
                  variant="modern"
                  className="pl-10"
                  placeholder="123-456789-1"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_type" className="text-slate-700">Tipo de Negocio</Label>
              <Select
                value={settings.business_type}
                onValueChange={(value) => setSettings(prev => ({ ...prev, business_type: value }))}
              >
                <SelectTrigger className="bg-white border-slate-300">
                  <SelectValue placeholder="Seleccionar tipo de negocio" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry" className="text-slate-700">Industria</Label>
              <Select
                value={settings.industry}
                onValueChange={(value) => setSettings(prev => ({ ...prev, industry: value }))}
              >
                <SelectTrigger className="bg-white border-slate-300">
                  <SelectValue placeholder="Seleccionar industria" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((industry) => (
                    <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="foundation_year" className="text-slate-700">Año de Fundación</Label>
                <Input
                  id="foundation_year"
                  type="number"
                  value={settings.foundation_year}
                  onChange={(e) => setSettings(prev => ({ ...prev, foundation_year: e.target.value }))}
                  variant="modern"
                  placeholder="2024"
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee_count" className="text-slate-700">Número de Empleados</Label>
                <Input
                  id="employee_count"
                  value={settings.employee_count}
                  onChange={(e) => setSettings(prev => ({ ...prev, employee_count: e.target.value }))}
                  variant="modern"
                  placeholder="1-10"
                />
              </div>
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
              <Label htmlFor="company_address" className="text-slate-700">Dirección *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-slate-400 h-4 w-4" />
                <Textarea
                  id="company_address"
                  value={settings.company_address}
                  onChange={(e) => setSettings(prev => ({ ...prev, company_address: e.target.value }))}
                  className="pl-10 bg-white border-slate-300"
                  placeholder="Av. Principal #123, Santo Domingo"
                  rows={3}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_phone" className="text-slate-700">Teléfono *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  id="company_phone"
                  type="tel"
                  value={settings.company_phone}
                  onChange={(e) => setSettings(prev => ({ ...prev, company_phone: e.target.value }))}
                  variant="modern"
                  className="pl-10"
                  placeholder="+1 (809) 123-4567"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_email" className="text-slate-700">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  id="company_email"
                  type="email"
                  value={settings.company_email}
                  onChange={(e) => setSettings(prev => ({ ...prev, company_email: e.target.value }))}
                  variant="modern"
                  className="pl-10"
                  placeholder="contacto@miempresa.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_website" className="text-slate-700">Sitio Web</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  id="company_website"
                  type="url"
                  value={settings.company_website}
                  onChange={(e) => setSettings(prev => ({ ...prev, company_website: e.target.value }))}
                  variant="modern"
                  className="pl-10"
                  placeholder="https://www.miempresa.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Currency Configuration */}
      <Card variant="elevated" className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            Configuración de Moneda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="currency" className="text-slate-700">Moneda *</Label>
              <Select value={settings.currency_code} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="bg-white border-slate-300">
                  <SelectValue placeholder="Seleccionar moneda" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.symbol} - {currency.name} ({currency.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Símbolo de Moneda</Label>
              <Input 
                value={settings.currency_symbol} 
                disabled 
                className="bg-slate-50 text-slate-600"
              />
            </div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Ejemplo:</strong> {settings.currency_symbol}1,234.56
            </p>
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
          className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg hover:shadow-xl px-8"
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