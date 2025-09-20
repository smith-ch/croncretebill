"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

interface ClientFormProps {
  client?: any
  onSuccess?: () => void
  inModal?: boolean // Nueva prop para saber si está en modal
}

export function ClientForm({ client, onSuccess, inModal = false }: ClientFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const rnc = formData.get("rnc") as string
    
    // Validar RNC si se proporciona
    if (rnc && (!/^\d{9}$/.test(rnc))) {
      setError("El RNC debe contener exactamente 9 dígitos")
      setLoading(false)
      return
    }

    const clientData = {
      name: formData.get("name") as string,
      rnc: rnc,
      contact_person: formData.get("contact_person") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      address: formData.get("address") as string,
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error("Usuario no autenticado")
      }

      // Verificar que el usuario tiene un ID válido
      if (!user.id || user.id.length === 0) {
        throw new Error("ID de usuario inválido")
      }

      if (client) {
        // Update existing client
        const { error } = await supabase.from("clients").update(clientData).eq("id", client.id)
        if (error) throw error
      } else {
        // Create new client
        const { error } = await supabase.from("clients").insert({
          ...clientData,
          user_id: user.id,
        })
        if (error) throw error
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push("/clients")
      }
    } catch (error: any) {
      // Mejorar mensajes de error para el usuario
      let userFriendlyMessage = error.message
      
      if (error.message?.includes('check_rnc_valid')) {
        userFriendlyMessage = "Por favor, ingrese un RNC válido de 9 dígitos"
      } else if (error.message?.includes('clients_user_id_fkey') || error.message?.includes('foreign key constraint')) {
        userFriendlyMessage = "Error de permisos. Por favor, cierre sesión y vuelva a iniciar sesión. Si el problema persiste, contacte al administrador."
      } else if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        userFriendlyMessage = "Ya existe un cliente con este RNC o información"
      } else if (error.message?.includes('not null')) {
        userFriendlyMessage = "Por favor, complete todos los campos requeridos"
      } else if (error.message?.includes('permission denied') || error.message?.includes('insufficient_privilege')) {
        userFriendlyMessage = "No tiene permisos para realizar esta acción. Verifique que su cuenta esté correctamente configurada."
      } else if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        userFriendlyMessage = "La base de datos no está configurada correctamente. Contacte al administrador."
      } else if (error.message === "Usuario no autenticado") {
        userFriendlyMessage = "Su sesión ha expirado. Por favor, inicie sesión nuevamente."
      }
      
      setError(userFriendlyMessage)
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
              <Input 
                id="rnc" 
                name="rnc" 
                defaultValue={client?.rnc} 
                placeholder="123456789" 
                maxLength={9}
                pattern="[0-9]{9}"
                title="Ingrese exactamente 9 dígitos"
                onInput={(e) => {
                  // Solo permitir números
                  const target = e.target as HTMLInputElement
                  target.value = target.value.replace(/[^0-9]/g, '')
                }}
              />
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

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

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
