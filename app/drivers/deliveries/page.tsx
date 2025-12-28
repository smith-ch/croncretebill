"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, Truck, User, MapPin, Clock, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/hooks/use-toast"

export default function DriverDeliveriesPage() {
  const [loading, setLoading] = useState(true)
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [filteredDeliveries, setFilteredDeliveries] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [driverFilter, setDriverFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")
  const [editingDelivery, setEditingDelivery] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string | null }>({ show: false, id: null })
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    filterDeliveries()
  }, [deliveries, searchTerm, statusFilter, driverFilter, dateFilter])

  const fetchData = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      const [deliveriesRes, driversRes] = await Promise.all([
        supabase
          .from("driver_deliveries")
          .select(`
            *,
            drivers (name),
            vehicles (model, plate),
            delivery_notes (
              delivery_number,
              clients (name),
              projects (name),
              delivery_address
            )
          `)
          .eq("user_id", user.id)
          .order("delivery_date", { ascending: false }),
        supabase.from("drivers").select("id, name").eq("user_id", user.id),
      ])

      if (deliveriesRes.error) throw deliveriesRes.error
      if (driversRes.error) throw driversRes.error

      setDeliveries(deliveriesRes.data || [])
      setDrivers(driversRes.data || [])
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const filterDeliveries = () => {
    let filtered = deliveries

    if (searchTerm) {
      filtered = filtered.filter(
        (delivery) =>
          delivery.delivery_notes?.delivery_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          delivery.drivers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          delivery.delivery_notes?.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((delivery) => delivery.status === statusFilter)
    }

    if (driverFilter !== "all") {
      filtered = filtered.filter((delivery) => delivery.driver_id === driverFilter)
    }

    if (dateFilter) {
      filtered = filtered.filter((delivery) => delivery.delivery_date === dateFilter)
    }

    setFilteredDeliveries(filtered)
  }

  const updateDeliveryStatus = async (deliveryId: string, newStatus: string, arrivalTime?: string) => {
    try {
      const updateData: any = { status: newStatus }
      if (arrivalTime) {
        updateData.arrival_time = arrivalTime
      }

      const { error } = await supabase.from("driver_deliveries").update(updateData).eq("id", deliveryId)

      if (error) throw error

      // Also update the delivery note status
      const delivery = deliveries.find((d) => d.id === deliveryId)
      if (delivery?.delivery_note_id) {
        await supabase.from("delivery_notes").update({ status: newStatus }).eq("id", delivery.delivery_note_id)
      }

      fetchData()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const deleteDelivery = async (deliveryId: string) => {
    setDeleteConfirm({ show: true, id: deliveryId })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return

    setIsDeleting(true)
    try {
      const { error } = await supabase.from("driver_deliveries").delete().eq("id", deleteConfirm.id)

      if (error) throw error

      toast({
        title: "Entrega eliminada",
        description: "La entrega ha sido eliminada exitosamente",
      })
      
      setDeleteConfirm({ show: false, id: null })
      fetchData()
    } catch (error: any) {
      setError(error.message)
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendiente: { color: "bg-yellow-100 text-yellow-800", label: "Pendiente" },
      en_transito: { color: "bg-blue-100 text-blue-800", label: "En Tránsito" },
      entregado: { color: "bg-green-100 text-green-800", label: "Entregado" },
      cancelado: { color: "bg-red-100 text-red-800", label: "Cancelado" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendiente
    return <Badge className={config.color}>{config.label}</Badge>
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return "N/A"
    return timeString.substring(0, 5)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Entregas de Conductores</h1>
        <p className="text-gray-600 dark:text-gray-400">Gestiona las entregas asignadas a conductores</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Buscar por número, conductor o cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="en_transito">En Tránsito</SelectItem>
                  <SelectItem value="entregado">Entregado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver">Conductor</Label>
              <Select value={driverFilter} onValueChange={setDriverFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los conductores</SelectItem>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Deliveries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDeliveries.map((delivery) => (
          <Card key={delivery.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{delivery.delivery_notes?.delivery_number || "N/A"}</CardTitle>
                  <p className="text-sm text-gray-600">
                    {new Date(delivery.delivery_date).toLocaleDateString("es-ES")}
                  </p>
                </div>
                {getStatusBadge(delivery.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>{delivery.drivers?.name || "Sin conductor"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-gray-400" />
                  <span>
                    {delivery.vehicles ? `${delivery.vehicles.model} - ${delivery.vehicles.plate}` : "Sin vehículo"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="truncate">
                    {delivery.delivery_notes?.clients?.name || "Cliente no especificado"}
                  </span>
                </div>
                {delivery.delivery_notes?.delivery_address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{delivery.delivery_notes.delivery_address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>
                    Salida: {formatTime(delivery.departure_time)} | Llegada: {formatTime(delivery.arrival_time)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {delivery.status === "pendiente" && (
                  <Button size="sm" onClick={() => updateDeliveryStatus(delivery.id, "en_transito")} className="flex-1">
                    Iniciar
                  </Button>
                )}
                {delivery.status === "en_transito" && (
                  <Button
                    size="sm"
                    onClick={() =>
                      updateDeliveryStatus(delivery.id, "entregado", new Date().toTimeString().slice(0, 5))
                    }
                    className="flex-1"
                  >
                    Entregar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteDelivery(delivery.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDeliveries.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay entregas</h3>
            <p className="text-gray-600">No se encontraron entregas con los filtros aplicados.</p>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={deleteConfirm.show}
        onOpenChange={(open) => !open && setDeleteConfirm({ show: false, id: null })}
        title="Eliminar Entrega"
        description="¿Estás seguro de que deseas eliminar esta entrega? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
