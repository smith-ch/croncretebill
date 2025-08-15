"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

interface ServiceFormProps {
  service?: any
  onSuccess?: () => void
}

export function ServiceForm({ service, onSuccess }: ServiceFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const serviceData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      price: Number.parseFloat(formData.get("price") as string),
      unit: formData.get("unit") as string,
      category: formData.get("category") as string,
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
      if (!user) throw new Error("Usuario no autenticado")

      if (service) {
        // Update existing service
        const { error } = await supabase.from("services").update(serviceData).eq("id", service.id)
        if (error) throw error
      } else {
        // Create new service
        const { error } = await supabase.from("services").insert({
          ...serviceData,
          user_id: user.id,
        })
        if (error) throw error
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
                <Label htmlFor="category">Categoría</Label>
                <Select name="category" defaultValue={service?.category}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Construcción">Construcción</SelectItem>
                    <SelectItem value="Instalación">Instalación</SelectItem>
                    <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                    <SelectItem value="Consultoría">Consultoría</SelectItem>
                    <SelectItem value="Diseño">Diseño</SelectItem>
                    <SelectItem value="Transporte">Transporte</SelectItem>
                    <SelectItem value="Reparación">Reparación</SelectItem>
                    <SelectItem value="Otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Precio *</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  defaultValue={service?.price}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unidad de Cobro</Label>
                <Select name="unit" defaultValue={service?.unit || "servicio"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="servicio">Por Servicio</SelectItem>
                    <SelectItem value="hora">Por Hora</SelectItem>
                    <SelectItem value="día">Por Día</SelectItem>
                    <SelectItem value="semana">Por Semana</SelectItem>
                    <SelectItem value="mes">Por Mes</SelectItem>
                    <SelectItem value="m²">Por Metro Cuadrado</SelectItem>
                    <SelectItem value="m³">Por Metro Cúbico</SelectItem>
                    <SelectItem value="proyecto">Por Proyecto</SelectItem>
                  </SelectContent>
                </Select>
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
