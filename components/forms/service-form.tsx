"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { CategorySelector } from "@/components/ui/category-selector"
import { Loader2, Info } from "lucide-react"

interface ServiceFormProps {
  service?: any
  onSuccess?: () => void
  inModal?: boolean
}

export function ServiceForm({ service, onSuccess, inModal = false }: ServiceFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCustomPricing, setIsCustomPricing] = useState(service?.price === null || service?.price === undefined)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(service?.category_id || "")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const priceValue = formData.get("price") as string
    const serviceData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      service_code: formData.get("service_code") as string,
      price: isCustomPricing ? null : priceValue ? Number.parseFloat(priceValue) : 0,
      production_cost: formData.get("production_cost") ? Number.parseFloat(formData.get("production_cost") as string) : 0,
      unit: formData.get("unit") as string,
      category: formData.get("category") as string, // Mantener compatibilidad hacia atrás
      category_id: selectedCategoryId || null,
      duration: formData.get("duration") as string,
      requirements: formData.get("requirements") as string,
      includes: formData.get("includes") as string,
      warranty_months: formData.get("warranty_months")
        ? Number.parseInt(formData.get("warranty_months") as string)
        : null,
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("Usuario no autenticado")
      }

      if (service) {
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", service.id)
        if (error) {
          throw error
        }
      } else {
        const { error } = await supabase
          .from("services")
          .insert({
            ...serviceData,
            user_id: user.id,
          })
        if (error) {
          throw error
        }
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push("/services")
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{service ? "Editar Servicio" : "Nuevo Servicio"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Información Básica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Servicio *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={service?.name}
                  placeholder="Ej: Instalación de concreto, Consultoría, etc."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service_code">Código del Servicio</Label>
                <Input 
                  id="service_code" 
                  name="service_code" 
                  defaultValue={service?.service_code} 
                  placeholder="Se generará automáticamente si se deja vacío" 
                />
                <p className="text-xs text-gray-500">
                  Si no especifica un código, se generará automáticamente (ej: SERV0001)
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <CategorySelector
                  value={selectedCategoryId}
                  onValueChange={setSelectedCategoryId}
                  type="service"
                  placeholder="Seleccionar categoría"
                />
                {/* Hidden input for backward compatibility */}
                <input type="hidden" name="category" value={selectedCategoryId} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={service?.description}
                placeholder="Descripción detallada del servicio"
                rows={3}
              />
            </div>
          </div>

          {/* Pricing and Duration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Precio y Duración</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="custom_pricing"
                  checked={isCustomPricing}
                  onCheckedChange={(checked) => setIsCustomPricing(checked as boolean)}
                  className="border-blue-300"
                />
                <Label htmlFor="custom_pricing" className="text-blue-800 font-medium">
                  Servicio personalizado (precio se define en factura)
                </Label>
              </div>
              <div className="flex items-start gap-2 text-sm text-blue-700">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  Si activas esta opción, el precio se definirá manualmente al crear cada factura. Útil para servicios
                  que varían según el proyecto o cliente.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Precio {!isCustomPricing && "*"}</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  defaultValue={service?.price || ""}
                  placeholder={isCustomPricing ? "Se define en factura" : "0.00"}
                  required={!isCustomPricing}
                  disabled={isCustomPricing}
                  className={isCustomPricing ? "bg-gray-100 text-gray-500" : ""}
                />
                {isCustomPricing && <p className="text-xs text-gray-600">El precio se definirá al crear la factura</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="production_cost">Precio de Producción</Label>
                <Input
                  id="production_cost"
                  name="production_cost"
                  type="number"
                  step="0.01"
                  defaultValue={service?.production_cost || ""}
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-600">Costo interno para calcular margen de ganancia</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unidad</Label>
                <Input
                  id="unit"
                  name="unit"
                  defaultValue={service?.unit || "servicio"}
                  placeholder="servicio"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duración Estimada</Label>
                <Input
                  id="duration"
                  name="duration"
                  defaultValue={service?.duration}
                  placeholder="Ej: 2 horas, 1 día, etc."
                />
              </div>
            </div>
          </div>

          {/* Service Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detalles del Servicio</h3>

            <div className="space-y-2">
              <Label htmlFor="includes">¿Qué Incluye?</Label>
              <Textarea
                id="includes"
                name="includes"
                defaultValue={service?.includes}
                placeholder="Describe qué incluye el servicio (materiales, mano de obra, etc.)"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements">Requisitos</Label>
              <Textarea
                id="requirements"
                name="requirements"
                defaultValue={service?.requirements}
                placeholder="Requisitos previos o condiciones necesarias"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="warranty_months">Garantía (meses)</Label>
              <Input
                id="warranty_months"
                name="warranty_months"
                type="number"
                defaultValue={service?.warranty_months}
                placeholder="12"
              />
            </div>
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {service ? "Actualizar" : "Crear"} Servicio
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
