"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useNotificationHelpers } from "@/hooks/use-notifications"

interface ClientFormProps {
  client?: any
  onSuccess?: () => void
}

export function ClientForm({ client, onSuccess }: ClientFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { notifyFormSuccess, notifyFormError } = useNotificationHelpers()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const clientData = {
      name: formData.get("name") as string,
      rnc: formData.get("rnc") as string,
      contact_person: formData.get("contact_person") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      address: formData.get("address") as string,
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      if (client) {
        // Update existing client
        const { error } = await supabase.from("clients").update(clientData).eq("id", client.id)
        if (error) throw error
        notifyFormSuccess("Cliente actualizado")
      } else {
        // Create new client
        const { error } = await supabase.from("clients").insert({
          ...clientData,
          user_id: user.id,
        })
        if (error) throw error
        notifyFormSuccess("Cliente creado")
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push("/clients")
      }
    } catch (error: any) {
      notifyFormError(client ? "actualizar el cliente" : "crear el cliente", error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{client ? "Editar Cliente" : "Nuevo Cliente"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Empresa *</Label>
              <Input id="name" name="name" defaultValue={client?.name} placeholder="Constructora ABC" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rnc">RNC</Label>
              <Input id="rnc" name="rnc" defaultValue={client?.rnc} placeholder="123456789" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_person">Persona de Contacto</Label>
              <Input
                id="contact_person"
                name="contact_person"
                defaultValue={client?.contact_person}
                placeholder="Juan Pérez"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={client?.email}
                placeholder="contacto@empresa.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" name="phone" defaultValue={client?.phone} placeholder="(809) 123-4567" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Textarea
                id="address"
                name="address"
                defaultValue={client?.address}
                placeholder="Dirección completa"
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {client ? "Actualizar" : "Crear"} Cliente
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
