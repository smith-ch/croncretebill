"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Search, FileText, Edit, Trash2, Download } from "lucide-react"
import Link from "next/link"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { usePlanAccess } from "@/hooks/use-plan-access"
import { useToast } from "@/hooks/use-toast"

export default function DeliveryNotesPage() {
  const [deliveryNotes, setDeliveryNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string | null }>({ show: false, id: null })
  const [isDeleting, setIsDeleting] = useState(false)
  const { hasAccessToDeliveryNotes, requireAccess, isLoading: planLoading } = usePlanAccess()
  const { toast } = useToast()

  // Check plan access
  useEffect(() => {
    if (!planLoading) {
      requireAccess('Módulo de Notas de Entrega', hasAccessToDeliveryNotes())
    }
  }, [planLoading, hasAccessToDeliveryNotes])

  useEffect(() => {
    fetchDeliveryNotes()
  }, [])

  const fetchDeliveryNotes = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      const { data, error } = await supabase
        .from("delivery_notes")
        .select(`
          *,
          clients(name),
          projects(name),
          drivers(name),
          vehicles(model, plate)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setDeliveryNotes(data || [])
    } catch (error) {
      console.error("Error fetching delivery notes:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDeliveryNotes = deliveryNotes.filter(
    (note) =>
      (note.delivery_note_number || note.delivery_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.clients?.name || "").toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendiente":
        return "bg-yellow-100 text-yellow-800"
      case "en_transito":
        return "bg-blue-100 text-blue-800"
      case "entregado":
        return "bg-green-100 text-green-800"
      case "cancelado":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleDelete = async (id: string) => {
    setDeleteConfirm({ show: true, id })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return

    setIsDeleting(true)
    try {
      const { error } = await supabase.from("delivery_notes").delete().eq("id", deleteConfirm.id)
      if (error) throw error
      
      toast({
        title: "Conduce eliminado",
        description: "El conduce ha sido eliminado exitosamente",
      })
      
      setDeleteConfirm({ show: false, id: null })
      fetchDeliveryNotes()
    } catch (error) {
      console.error("Error deleting delivery note:", error)
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el conduce",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const downloadDeliveryNotePDF = async (deliveryNoteId: string) => {
    try {
      const response = await fetch(`/api/delivery-notes/${deliveryNoteId}/pdf`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error generating PDF")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `conduce-${deliveryNoteId}.html`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading PDF:", error)
      alert("Error al descargar el PDF: " + (error instanceof Error ? error.message : "Error desconocido"))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header skeleton */}
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-gray-200 rounded-lg skeleton"></div>
              <div className="h-4 w-80 bg-gray-200 rounded skeleton"></div>
            </div>
            <div className="h-10 w-40 bg-gray-200 rounded-lg skeleton"></div>
          </div>

          {/* Search card skeleton */}
          <Card className="border-0 shadow-lg skeleton">
            <CardContent className="p-6">
              <div className="h-10 w-full max-w-sm bg-gray-200 rounded"></div>
            </CardContent>
          </Card>

          {/* Delivery notes skeleton */}
          <div className="space-y-4">
            {[1,2,3,4,5].map((i) => (
              <Card key={i} className="border-0 shadow-lg skeleton animate-slide-up" style={{animationDelay: `${i * 0.1}s`}}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-5 w-32 bg-gray-200 rounded"></div>
                        <div className="h-5 w-24 bg-gray-200 rounded-full"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 w-48 bg-gray-200 rounded"></div>
                        <div className="h-4 w-40 bg-gray-200 rounded"></div>
                        <div className="h-4 w-56 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                    <div className="mr-4">
                      <div className="h-6 w-24 bg-gray-300 rounded"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-9 w-9 bg-gray-200 rounded"></div>
                      <div className="h-9 w-9 bg-gray-200 rounded"></div>
                      <div className="h-9 w-9 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Conduces de Entrega</h1>
          <p className="text-gray-600 dark:text-gray-400">Gestiona todos tus conduces de entrega</p>
        </div>
        <Button asChild>
          <Link href="/delivery-notes/new">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Conduce
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar conduces..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDeliveryNotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No hay conduces</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Comienza creando tu primer conduce</p>
              <Button asChild>
                <Link href="/delivery-notes/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Conduce
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDeliveryNotes.map((note, index) => (
                <div
                  key={note.id}
                  className="flex items-center justify-between p-4 border-0 shadow-lg rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-slate-50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 card-hover bg-white animate-slide-up"
                  style={{animationDelay: `${index * 0.05}s`}}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {note.delivery_note_number || note.delivery_number || "Sin número"}
                      </h3>
                      <Badge className={getStatusColor(note.status || "pendiente")}>{note.status || "pendiente"}</Badge>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p>Cliente: {note.clients?.name || "Sin cliente"}</p>
                      <p>Fecha: {new Date(note.delivery_date).toLocaleDateString()}</p>
                      {note.projects?.name && <p>Proyecto: {note.projects.name}</p>}
                      {note.drivers?.name && <p>Conductor: {note.drivers.name}</p>}
                      {note.vehicles && (
                        <p>
                          Vehículo: {note.vehicles.model} - {note.vehicles.plate}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      ${(note.total || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild className="hover:bg-blue-100 hover:text-blue-700 transition-all duration-200 hover:scale-110 active:scale-95 tap-target" title="Editar conduce">
                      <Link href={`/delivery-notes/${note.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => downloadDeliveryNotePDF(note.id)} className="hover:bg-emerald-100 hover:text-emerald-700 transition-all duration-200 hover:scale-110 active:scale-95 tap-target" title="Descargar PDF">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 hover:scale-110 active:scale-95 tap-target"
                      onClick={() => handleDelete(note.id)}
                      title="Eliminar conduce"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteConfirm.show}
        onOpenChange={(open) => !open && setDeleteConfirm({ show: false, id: null })}
        title="Eliminar Conduce"
        description="¿Estás seguro de que deseas eliminar este conduce? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
