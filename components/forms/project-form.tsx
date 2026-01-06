"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { useToast } from "@/hooks/use-toast"
import { useDataUserId } from "@/hooks/use-data-user-id"

interface ProjectFormProps {
  project?: any
  onSuccess?: () => void
}

export function ProjectForm({ project, onSuccess }: ProjectFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clients, setClients] = useState<any[]>([])
  const { toast } = useToast()
  const { dataUserId, loading: userIdLoading } = useDataUserId()

  useEffect(() => {
    if (!userIdLoading && dataUserId) {
      fetchClients()
    }
  }, [dataUserId, userIdLoading])

  const fetchClients = async () => {
    try {
      if (!dataUserId) {
        return
      }

      const { data, error } = await supabase.from("clients").select("id, name").eq("user_id", dataUserId)

      if (error) {
        throw error
      }
      setClients(data || [])
    } catch (error) {
      console.error("Error fetching clients:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    // Validación: Nombre del proyecto es obligatorio
    const name = formData.get("name") as string
    if (!name || name.trim() === "") {
      toast({
        variant: "destructive",
        title: "❌ Campo requerido",
        description: "El nombre del proyecto es obligatorio",
      })
      setLoading(false)
      return
    }

    // Validación: Cliente es obligatorio
    const clientId = formData.get("client_id") as string
    if (!clientId) {
      toast({
        variant: "destructive",
        title: "❌ Cliente requerido",
        description: "Debe seleccionar un cliente para el proyecto",
      })
      setLoading(false)
      return
    }

    // Validación: Fechas
    const startDate = formData.get("start_date") as string
    const endDate = formData.get("end_date") as string
    
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      toast({
        variant: "destructive",
        title: "❌ Fechas inválidas",
        description: "La fecha de inicio debe ser anterior a la fecha de finalización",
      })
      setLoading(false)
      return
    }

    const projectData = {
      name: name.trim(),
      description: formData.get("description") as string,
      client_id: clientId,
      address: formData.get("address") as string,
      start_date: startDate,
      end_date: endDate,
      status: formData.get("status") as string,
    }

    try {
      if (!dataUserId) {
        throw new Error("Usuario no autenticado")
      }

      if (project) {
        // Update existing project
        const { error } = await supabase.from("projects").update(projectData).eq("id", project.id)
        if (error) {
          throw error
        }
        
        toast({
          title: "✅ Proyecto actualizado",
          description: `${projectData.name} ha sido actualizado correctamente`,
        })
      } else {
        // Create new project
        const { error } = await supabase.from("projects").insert({
          ...projectData,
          user_id: dataUserId,
        })
        if (error) {
          throw error
        }
        
        toast({
          title: "✅ Proyecto creado exitosamente",
          description: `${projectData.name} ha sido agregado`,
        })
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push("/projects")
      }
    } catch (error: any) {
      const errorMsg = error.message || "Error al guardar el proyecto"
      setError(errorMsg)
      toast({
        variant: "destructive",
        title: "Error al guardar proyecto",
        description: errorMsg,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
        <CardTitle className="text-white">{project ? "Editar Proyecto" : "Nuevo Proyecto"}</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Proyecto *</Label>
              <Input id="name" name="name" defaultValue={project?.name} placeholder="Torre Residencial ABC" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_id">Cliente *</Label>
              <Select name="client_id" defaultValue={project?.client_id} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={project?.description}
              placeholder="Descripción detallada del proyecto"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección del Proyecto</Label>
            <Textarea
              id="address"
              name="address"
              defaultValue={project?.address}
              placeholder="Dirección completa donde se ejecuta el proyecto"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Fecha de Inicio</Label>
              <Input id="start_date" name="start_date" type="date" defaultValue={project?.start_date} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Fecha de Finalización</Label>
              <Input id="end_date" name="end_date" type="date" defaultValue={project?.end_date} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select name="status" defaultValue={project?.status || "activo"}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado del proyecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-500 to-blue-600">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {project ? "Actualizar" : "Crear"} Proyecto
            </Button>
            <Button type="button" variant="outline" onClick={() => onSuccess?.()}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
