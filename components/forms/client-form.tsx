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
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useDataUserId } from "@/hooks/use-data-user-id"

interface ClientFormProps {
  client?: any
  onSuccess?: () => void
  inModal?: boolean // Nueva prop para saber si está en modal
}

export function ClientForm({ client, onSuccess }: ClientFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const { dataUserId, loading: userIdLoading } = useDataUserId()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    
    // Validación: Nombre es obligatorio
    const name = formData.get("name") as string
    if (!name || name.trim() === "") {
      toast({
        variant: "destructive",
        title: "❌ Campo requerido",
        description: "El nombre de la empresa es obligatorio",
      })
      setLoading(false)
      return
    }

    const rnc = formData.get("rnc") as string
    
    // Validar RNC si se proporciona
    if (rnc && (!/^\d{9}$/.test(rnc))) {
      toast({
        variant: "destructive",
        title: "❌ RNC inválido",
        description: "El RNC debe contener exactamente 9 dígitos numéricos",
      })
      setError("El RNC debe contener exactamente 9 dígitos")
      setLoading(false)
      return
    }

    // Validación: Cédula si se proporciona
    const cedula = formData.get("cedula") as string
    if (cedula && cedula.trim() !== "") {
      // Validar formato de cédula dominicana: 11 dígitos con guiones (000-0000000-0) o sin guiones
      const cedulaNumeros = cedula.replace(/[-\s]/g, '')
      if (!/^\d{11}$/.test(cedulaNumeros)) {
        toast({
          variant: "destructive",
          title: "❌ Cédula inválida",
          description: "La cédula debe contener 11 dígitos (ej: 001-1234567-8)",
        })
        setLoading(false)
        return
      }
    }

    // Validación: Email si se proporciona
    const email = formData.get("email") as string
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        variant: "destructive",
        title: "❌ Email inválido",
        description: "Por favor ingrese un correo electrónico válido",
      })
      setLoading(false)
      return
    }

    // Validación: Teléfono debe tener formato válido si se proporciona
    const phone = formData.get("phone") as string
    if (phone && phone.replace(/\D/g, '').length < 10) {
      toast({
        variant: "destructive",
        title: "⚠️ Teléfono incompleto",
        description: "El teléfono debe tener al menos 10 dígitos",
      })
      setLoading(false)
      return
    }

    const clientData = {
      name: name.trim(),
      rnc: rnc,
      cedula: cedula ? cedula.trim() : null,
      contact_person: formData.get("contact_person") as string,
      email: email,
      phone: phone,
      address: formData.get("address") as string,
    }

    try {
      if (!dataUserId) {
        throw new Error("Usuario no autenticado")
      }

      if (client) {
        // Update existing client
        // @ts-ignore - Supabase type issue
        const { error } = await supabase.from("clients").update(clientData).eq("id", client.id)
        if (error) { throw error }
        
        toast({
          title: "✅ Cliente actualizado",
          description: `${clientData.name} ha sido actualizado correctamente`,
        })
      } else {
        // Create new client
        // @ts-ignore - Supabase type issue
        const { error } = await supabase.from("clients").insert({
          ...clientData,
          user_id: dataUserId,
        })
        if (error) { throw error }
        
        toast({
          title: "✅ Cliente creado exitosamente",
          description: `${clientData.name} ha sido agregado a tu lista de clientes`,
        })
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
      } else if (error.message?.includes('check_cedula_format')) {
        userFriendlyMessage = "Por favor, ingrese una cédula válida de 11 dígitos"
      } else if (error.message?.includes('clients_user_id_fkey') || error.message?.includes('foreign key constraint')) {
        userFriendlyMessage = "Error de permisos. Por favor, cierre sesión y vuelva a iniciar sesión."
      } else if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        userFriendlyMessage = "Ya existe un cliente con este RNC, cédula o información"
      } else if (error.message?.includes('not null')) {
        userFriendlyMessage = "Por favor, complete todos los campos requeridos"
      } else if (error.message?.includes('permission denied') || error.message?.includes('insufficient_privilege')) {
        userFriendlyMessage = "No tiene permisos para realizar esta acción"
      } else if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        userFriendlyMessage = "Error de base de datos. Contacte al administrador."
      } else if (error.message === "Usuario no autenticado") {
        userFriendlyMessage = "Su sesión ha expirado. Por favor, inicie sesión nuevamente."
      }
      
      setError(userFriendlyMessage)
      toast({
        variant: "destructive",
        title: "Error al guardar cliente",
        description: userFriendlyMessage,
      })
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
              <Label htmlFor="cedula">Cédula de Identidad</Label>
              <Input 
                id="cedula" 
                name="cedula" 
                defaultValue={client?.cedula} 
                placeholder="001-1234567-8" 
                maxLength={15}
                title="Ingrese la cédula (11 dígitos)"
                onInput={(e) => {
                  // Formatear automáticamente la cédula con guiones
                  const target = e.target as HTMLInputElement
                  let value = target.value.replace(/[^0-9]/g, '')
                  
                  if (value.length > 11) {
                    value = value.substring(0, 11)
                  }
                  
                  // Formato: 000-0000000-0
                  if (value.length >= 3) {
                    value = value.substring(0, 3) + '-' + value.substring(3)
                  }
                  if (value.length >= 11) {
                    value = value.substring(0, 11) + '-' + value.substring(11)
                  }
                  
                  target.value = value
                }}
              />
              <p className="text-xs text-slate-400">Formato: 001-1234567-8 (11 dígitos)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_person">Persona de Contacto</Label>
              <Input
                id="contact_person"
                name="contact_person"
                defaultValue={client?.contact_person}
                placeholder="Juan Pérez"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" name="phone" defaultValue={client?.phone} placeholder="(809) 123-4567" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <Alert className="border-red-800 bg-red-900/30">
              <AlertDescription className="text-red-300">{error}</AlertDescription>
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
