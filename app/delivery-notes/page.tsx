"use client"

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Search, FileText, Edit, Trash2, Download } from "lucide-react"
import Link from "next/link"

export default function DeliveryNotesPage() {
  const [deliveryNotes, setDeliveryNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchDeliveryNotes()
  }, [])

  const fetchDeliveryNotes = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
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
    if (!confirm("¿Estás seguro de que quieres eliminar este conduce?")) return

    try {
      const { error } = await supabase.from("delivery_notes").delete().eq("id", id)
      if (error) throw error
      fetchDeliveryNotes()
    } catch (error) {
      console.error("Error deleting delivery note:", error)
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
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Conduces de Entrega</h1>
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
              {filteredDeliveryNotes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/delivery-notes/${note.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => downloadDeliveryNotePDF(note.id)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(note.id)}
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
    </div>
  )
}
