"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

interface CompanySettings {
  id?: string
  company_name: string
  company_address: string
  company_phone: string
  company_email: string
  company_website: string
  tax_id: string
  company_logo?: string
  currency_code: string
  currency_symbol: string
}

const CURRENCIES = [
  { code: "DOP", symbol: "RD$", name: "Peso Dominicano" },
  { code: "USD", symbol: "$", name: "Dólar Estadounidense" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "Libra Esterlina" },
  { code: "CAD", symbol: "C$", name: "Dólar Canadiense" },
  { code: "AUD", symbol: "A$", name: "Dólar Australiano" },
  { code: "JPY", symbol: "¥", name: "Yen Japonés" },
  { code: "CHF", symbol: "CHF", name: "Franco Suizo" },
  { code: "CNY", symbol: "¥", name: "Yuan Chino" },
  { code: "MXN", symbol: "$", name: "Peso Mexicano" },
  { code: "BRL", symbol: "R$", name: "Real Brasileño" },
  { code: "ARS", symbol: "$", name: "Peso Argentino" },
  { code: "COP", symbol: "$", name: "Peso Colombiano" },
  { code: "CLP", symbol: "$", name: "Peso Chileno" },
  { code: "PEN", symbol: "S/", name: "Sol Peruano" },
  { code: "UYU", symbol: "$U", name: "Peso Uruguayo" },
  { code: "GTQ", symbol: "Q", name: "Quetzal Guatemalteco" },
  { code: "CRC", symbol: "₡", name: "Colón Costarricense" },
  { code: "HNL", symbol: "L", name: "Lempira Hondureño" },
  { code: "NIO", symbol: "C$", name: "Córdoba Nicaragüense" },
  { code: "PAB", symbol: "B/.", name: "Balboa Panameño" },
]

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [settings, setSettings] = useState<CompanySettings>({
    company_name: "",
    company_address: "",
    company_phone: "",
    company_email: "",
    company_website: "",
    tax_id: "",
    company_logo: "",
    currency_code: "DOP",
    currency_symbol: "RD$",
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError("Usuario no autenticado")
        return
      }

      const { data, error } = await supabase.from("company_settings").select("*").eq("user_id", user.id).single()

      if (error && error.code !== "PGRST116") {
        throw error
      }

      if (data) {
        setSettings({
          ...data,
          currency_code: data.currency_code || "DOP",
          currency_symbol: data.currency_symbol || "RD$",
        })
        if (data.company_logo) {
          setLogoPreview(data.company_logo)
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
      setError("Error al cargar la configuración")
    } finally {
      setFetchLoading(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return null

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      const fileExt = logoFile.name.split(".").pop()
      const fileName = `${user.id}/logo.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(fileName, logoFile, { upsert: true })

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from("company-assets").getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error("Error uploading logo:", error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      console.log("Starting settings save process...")

      let logoUrl = settings.company_logo

      // Upload logo if a new file was selected
      if (logoFile) {
        console.log("Uploading new logo...")
        logoUrl = await uploadLogo()
        console.log("Logo uploaded:", logoUrl)
      }

      const settingsData: any = {
        user_id: user.id,
        company_name: settings.company_name,
        company_address: settings.company_address,
        company_phone: settings.company_phone,
        company_email: settings.company_email,
        company_website: settings.company_website,
        tax_id: settings.tax_id,
        currency_code: settings.currency_code,
        currency_symbol: settings.currency_symbol,
      }

      // Only add company_logo if it has a value
      if (logoUrl) {
        settingsData.company_logo = logoUrl
      }

      console.log("Settings data to save:", settingsData)

      const { data, error } = await supabase
        .from("company_settings")
        .upsert(settingsData, {
          onConflict: "user_id",
        })
        .select()
        .single()

      if (error) {
        console.error("Database error:", error)
        throw error
      }

      console.log("Settings saved successfully:", data)
      setSuccess("Configuración guardada exitosamente")
      setSettings(data)
      setLogoFile(null)
    } catch (error: any) {
      console.error("Error saving settings:", error)
      setError(error.message || "Error al guardar la configuración")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof CompanySettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
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

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configuración de la Empresa</h1>
        <p className="text-gray-600 dark:text-gray-400">Configura la información de tu empresa</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Nombre de la Empresa *</Label>
                <Input
                  id="company_name"
                  value={settings.company_name}
                  onChange={(e) => handleInputChange("company_name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_id">RUC/NIT *</Label>
                <Input
                  id="tax_id"
                  value={settings.tax_id}
                  onChange={(e) => handleInputChange("tax_id", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_address">Dirección *</Label>
              <Textarea
                id="company_address"
                value={settings.company_address}
                onChange={(e) => handleInputChange("company_address", e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_phone">Teléfono *</Label>
                <Input
                  id="company_phone"
                  type="tel"
                  value={settings.company_phone}
                  onChange={(e) => handleInputChange("company_phone", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_email">Email *</Label>
                <Input
                  id="company_email"
                  type="email"
                  value={settings.company_email}
                  onChange={(e) => handleInputChange("company_email", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_website">Sitio Web</Label>
              <Input
                id="company_website"
                type="url"
                value={settings.company_website}
                onChange={(e) => handleInputChange("company_website", e.target.value)}
                placeholder="https://www.ejemplo.com"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuración de Moneda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda *</Label>
                <Select value={settings.currency_code} onValueChange={handleCurrencyChange}>
                  <SelectTrigger>
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
                <Label>Símbolo de Moneda</Label>
                <Input value={settings.currency_symbol} disabled className="bg-gray-50" />
              </div>
            </div>
            <div className="text-sm text-gray-600">Ejemplo: {settings.currency_symbol}1,234.56</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logo de la Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="logo">Logo</Label>
              <Input id="logo" type="file" accept="image/*" onChange={handleLogoChange} />
            </div>

            {logoPreview && (
              <div className="space-y-2">
                <Label>Vista Previa</Label>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <img src={logoPreview || "/placeholder.svg"} alt="Logo preview" className="max-h-32 object-contain" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Configuración
          </Button>
        </div>
      </form>
    </div>
  )
}
