"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Trash2, Calendar, Clock, MapPin, FileText } from "lucide-react"
import { format } from "date-fns"

interface EventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: any
  selectedDate?: Date | null
  onSave: (eventData: any) => void
  onDelete?: (eventId: string) => void
}

export function EventDialog({ open, onOpenChange, event, selectedDate, onSave, onDelete }: EventDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    is_all_day: false,
    priority: "medium",
    event_type_id: "",
    client_id: "",
    project_id: "",
    reminder_minutes: [60, 15],
  })

  const [eventTypes] = useState([
    { id: "1", name: "Vencimiento de Factura", color: "#EF4444", icon: "receipt" },
    { id: "2", name: "Gasto Recurrente", color: "#F59E0B", icon: "credit-card" },
    { id: "3", name: "Reunión con Cliente", color: "#10B981", icon: "users" },
    { id: "4", name: "Cierre Contable", color: "#8B5CF6", icon: "calculator" },
    { id: "5", name: "Recordatorio", color: "#6B7280", icon: "bell" },
  ])

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || "",
        description: event.description || "",
        location: event.location || "",
        start_date: event.start_date || "",
        end_date: event.end_date || "",
        start_time: event.start_time || "",
        end_time: event.end_time || "",
        is_all_day: event.is_all_day || false,
        priority: event.priority || "medium",
        event_type_id: event.event_type_id || "",
        client_id: event.client_id || "",
        project_id: event.project_id || "",
        reminder_minutes: event.reminder_minutes || [60, 15],
      })
    } else if (selectedDate) {
      setFormData({
        ...formData,
        start_date: format(selectedDate, "yyyy-MM-dd"),
        end_date: format(selectedDate, "yyyy-MM-dd"),
      })
    }
  }, [event, selectedDate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const handleDelete = () => {
    if (event && onDelete) {
      onDelete(event.id)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {event ? "Editar Evento" : "Nuevo Evento"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Invoice Link Display */}
          {event?.invoice_number && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Relacionado con Factura: {event.invoice_number}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/invoices/${event.invoice_id}`, "_blank")}
                  className="text-blue-600 border-blue-300 hover:bg-blue-100"
                >
                  Ver Factura
                </Button>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Título del evento"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del evento"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="location">Ubicación</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ubicación del evento"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Date and Time */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="all-day"
                checked={formData.is_all_day}
                onCheckedChange={(checked) => setFormData({ ...formData, is_all_day: checked })}
              />
              <Label htmlFor="all-day">Todo el día</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date">Fecha de inicio *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="end-date">Fecha de fin</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            {!formData.is_all_day && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time">Hora de inicio</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="start-time"
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="end-time">Hora de fin</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="end-time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Event Type and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="event-type">Tipo de evento</Label>
              <Select
                value={formData.event_type_id}
                onValueChange={(value) => setFormData({ ...formData, event_type_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                        {type.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Prioridad</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <Badge variant="secondary">Baja</Badge>
                  </SelectItem>
                  <SelectItem value="medium">
                    <Badge variant="outline">Media</Badge>
                  </SelectItem>
                  <SelectItem value="high">
                    <Badge variant="destructive">Alta</Badge>
                  </SelectItem>
                  <SelectItem value="urgent">
                    <Badge className="bg-red-600">Urgente</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <div>
              {event && onDelete && (
                <Button type="button" variant="destructive" onClick={handleDelete} className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="gradient-brand">
                {event ? "Actualizar" : "Crear"} Evento
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
