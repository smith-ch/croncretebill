"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Plus, Trash2 } from "lucide-react"

export default function EditDeliveryNotePage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deliveryNote, setDeliveryNote] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState("")
  const [items, setItems] = useState([{ product_id: "", quantity: 1, unit_price: 0 }])

  useEffect(() => {
    fetchDeliveryNoteData()
  }, [])

  const fetchDeliveryNoteData = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      // Fetch delivery note with items
      const { data: deliveryNoteData, error: deliveryNoteError } = await supabase
        .from("delivery_notes")
        .select(`
          *,
          delivery_note_items(*)
        `)
        .eq("id", params.id)
        .eq("user_id", user.id)
        .single()

      if (deliveryNoteError) throw deliveryNoteError
      setDeliveryNote(deliveryNoteData)
      setSelectedClient(deliveryNoteData.client_id)

      // Set items from delivery_note_items
      if (deliveryNoteData.delivery_note_items && deliveryNoteData.delivery_note_items.length > 0) {
        setItems(
          deliveryNoteData.delivery_note_items.map((item: any) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
        )
      }

      // Fetch related data
      const [clientsRes, projectsRes, driversRes, vehiclesRes, productsRes] = await Promise.all([
        supabase.from("clients").select("id, name").eq("user_id", user.id),
        supabase.from("projects").select("id, name, client_id").eq("user_id", user.id),
        supabase.from("drivers").select("id, name").eq("user_id", user.id),
        supabase.from("vehicles").select("id, model, plate").eq("user_id", user.id),
        supabase.from("products").select("id, name, unit, unit_price").eq("user_id", user.id),
      ])

      setClients(clientsRes.data || [])
      setProjects(projectsRes.data || [])
      setDrivers(driversRes.data || [])
      setVehicles(vehiclesRes.data || [])
      setProducts(productsRes.data || [])
    } catch (error) {
      console.error("Error fetching delivery note:", error)
      setError("Error al cargar el conduce")
    } finally {
      setFetchLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) throw new Error("Usuario no autenticado")

      const deliveryNoteData = {
        client_id: formData.get("client_id") as string,
        project_id: (formData.get("project_id") as string) || null,
        driver_id: (formData.get("driver_id") as string) || null,
        vehicle_id: (formData.get("vehicle_id") as string) || null,
        delivery_date: formData.get("delivery_date") as string,
        departure_time: (formData.get("departure_time") as string) || null,
        arrival_time: (formData.get("arrival_time") as string) || null,
        delivery_address: (formData.get("delivery_address") as string) || null,
        status: formData.get("status") as string,
        notes: (formData.get("notes") as string) || null,
        plant_manager: (formData.get("plant_manager") as string) || null,
        resistance: (formData.get("resistance") as string) || null,
        slump: (formData.get("slump") as string) || null,
        trip_number: (formData.get("trip_number") as string) || "1",
        direct_delivery: formData.get("direct_delivery") === "on",
        fiber: formData.get("fiber") === "on",
      }

      // Update delivery note
      const { error: deliveryNoteError } = await supabase
        .from("delivery_notes")
        .update(deliveryNoteData)
        .eq("id", params.id)

      if (deliveryNoteError) throw deliveryNoteError

      // Delete existing items
      await supabase.from("delivery_note_items").delete().eq("delivery_note_id", params.id)

      // Insert new items
      const deliveryNoteItems = items.map((item) => {
        const product = products.find((p) => p.id === item.product_id)
        return {
          delivery_note_id: params.id,
          product_id: item.product_id,
          description: product?.name || "",
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price,
          unit: product?.unit || "m³",
        }
      })

      const { error: itemsError } = await supabase.from("delivery_note_items").insert(deliveryNoteItems)
      if (itemsError) throw itemsError

      router.push("/delivery-notes")
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const addItem = () => {
    setItems([...items, { product_id: "", quantity: 1, unit_price: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!deliveryNote) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Conduce no encontrado</p>
      </div>
    )
  }

  const filteredProjects = projects.filter((p) => p.client_id === selectedClient)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Editar Conduce</h1>
        <p className="text-gray-600 dark:text-gray-400">Conduce: {deliveryNote.delivery_number}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número de Conduce</Label>
                <Input value={deliveryNote.delivery_number} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery_date">Fecha de Entrega *</Label>
                <Input
                  id="delivery_date"
                  name="delivery_date"
                  type="date"
                  defaultValue={deliveryNote.delivery_date}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="departure_time">Hora de Salida</Label>
                <Input
                  id="departure_time"
                  name="departure_time"
                  type="time"
                  defaultValue={deliveryNote.departure_time || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="arrival_time">Hora de Llegada</Label>
                <Input
                  id="arrival_time"
                  name="arrival_time"
                  type="time"
                  defaultValue={deliveryNote.arrival_time || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trip_number">N° Viaje</Label>
                <Input id="trip_number" name="trip_number" type="text" defaultValue={deliveryNote.trip_number || "1"} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_id">Cliente *</Label>
                <Select name="client_id" value={selectedClient} onValueChange={setSelectedClient} required>
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
              <div className="space-y-2">
                <Label htmlFor="project_id">Proyecto</Label>
                <Select name="project_id" defaultValue={deliveryNote.project_id || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proyecto" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="driver_id">Conductor</Label>
                <Select name="driver_id" defaultValue={deliveryNote.driver_id || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar conductor" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle_id">Vehículo</Label>
                <Select name="vehicle_id" defaultValue={deliveryNote.vehicle_id || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar vehículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.model} - {vehicle.plate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery_address">Dirección de Entrega</Label>
              <Input
                id="delivery_address"
                name="delivery_address"
                defaultValue={deliveryNote.delivery_address || ""}
                placeholder="Dirección donde se realizará la entrega"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select name="status" defaultValue={deliveryNote.status}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="en_transito">En Tránsito</SelectItem>
                  <SelectItem value="entregado">Entregado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información Técnica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plant_manager">Encargado de Planta</Label>
                <Input
                  id="plant_manager"
                  name="plant_manager"
                  defaultValue={deliveryNote.plant_manager || ""}
                  placeholder="Nombre del encargado"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resistance">Resistencia (KG/CM²)</Label>
                <Input
                  id="resistance"
                  name="resistance"
                  defaultValue={deliveryNote.resistance || ""}
                  placeholder="Ej: 210"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slump">Revenimiento (PULG)</Label>
                <Input id="slump" name="slump" defaultValue={deliveryNote.slump || ""} placeholder="Ej: 4-6" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="direct_delivery"
                    name="direct_delivery"
                    defaultChecked={deliveryNote.direct_delivery || false}
                  />
                  <Label htmlFor="direct_delivery">Directo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="fiber" name="fiber" defaultChecked={deliveryNote.fiber || false} />
                  <Label htmlFor="fiber">Fibra</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Productos/Servicios</CardTitle>
              <Button type="button" onClick={addItem} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Producto
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label>Producto</Label>
                  <Select
                    value={item.product_id}
                    onValueChange={(value) => {
                      updateItem(index, "product_id", value)
                      const product = products.find((p) => p.id === value)
                      if (product) {
                        updateItem(index, "unit_price", product.unit_price || 0)
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", Number.parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Precio Unitario</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, "unit_price", Number.parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total</Label>
                  <div className="flex items-center gap-2">
                    <Input value={(item.quantity * item.unit_price).toFixed(2)} disabled className="bg-gray-50" />
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notas Adicionales</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea id="notes" name="notes" defaultValue={deliveryNote.notes || ""} rows={3} />
          </CardContent>
        </Card>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Actualizar Conduce
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
