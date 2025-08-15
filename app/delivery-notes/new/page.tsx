"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

export default function NewDeliveryNotePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deliveryNumber, setDeliveryNumber] = useState("")
  const [clients, setClients] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState("")
  const [items, setItems] = useState([{ product_id: "", quantity: 1 }])

  useEffect(() => {
    fetchInitialData()
    generateDeliveryNumber()
  }, [])

  const fetchInitialData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const [clientsRes, projectsRes, driversRes, vehiclesRes, productsRes] = await Promise.all([
        supabase.from("clients").select("id, name").eq("user_id", user.id),
        supabase.from("projects").select("id, name, client_id").eq("user_id", user.id),
        supabase.from("drivers").select("id, name").eq("user_id", user.id),
        supabase.from("vehicles").select("id, model, plate").eq("user_id", user.id),
        supabase.from("products").select("id, name, unit").eq("user_id", user.id),
      ])

      setClients(clientsRes.data || [])
      setProjects(projectsRes.data || [])
      setDrivers(driversRes.data || [])
      setVehicles(vehiclesRes.data || [])
      setProducts(productsRes.data || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    }
  }

  const generateDeliveryNumber = async () => {
    try {
      const { data, error } = await supabase.rpc("get_next_delivery_number")
      if (error) throw error
      setDeliveryNumber(data)
    } catch (error) {
      console.error("Error generating delivery number:", error)
      // Fallback to manual number
      setDeliveryNumber(`CON-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      // Validate required fields
      const clientId = formData.get("client_id") as string
      const deliveryDate = formData.get("delivery_date") as string

      if (!clientId) throw new Error("Cliente es requerido")
      if (!deliveryDate) throw new Error("Fecha de entrega es requerida")
      if (items.length === 0 || !items[0].product_id) throw new Error("Debe agregar al menos un producto")

      const deliveryData = {
        user_id: user.id,
        delivery_number: deliveryNumber,
        client_id: clientId,
        project_id: (formData.get("project_id") as string) || null,
        driver_id: (formData.get("driver_id") as string) || null,
        vehicle_id: (formData.get("vehicle_id") as string) || null,
        delivery_date: deliveryDate,
        departure_time: (formData.get("departure_time") as string) || null,
        arrival_time: null,
        delivery_address: (formData.get("delivery_address") as string) || null,
        pump_info: (formData.get("pump_info") as string) || null,
        plant_info: (formData.get("plant_info") as string) || null,
        plant_manager: (formData.get("plant_manager") as string) || null,
        resistance: (formData.get("resistance") as string) || null,
        slump: (formData.get("slump") as string) || null,
        trip_number: (formData.get("trip_number") as string) || "1",
        direct_delivery: formData.get("direct_delivery") === "on",
        fiber: formData.get("fiber") === "on",
        status: formData.get("status") as string,
        notes: (formData.get("notes") as string) || null,
        dispatcher_signature: null,
        client_signature: null,
      }

      console.log("Creating delivery note with data:", deliveryData)

      const { data: deliveryNote, error: deliveryError } = await supabase
        .from("delivery_notes")
        .insert(deliveryData)
        .select()
        .single()

      if (deliveryError) {
        console.error("Delivery note creation error:", deliveryError)
        throw deliveryError
      }

      // Insert delivery items
      const deliveryItems = items
        .filter((item) => item.product_id && item.quantity > 0)
        .map((item) => {
          const product = products.find((p) => p.id === item.product_id)
          return {
            delivery_note_id: deliveryNote.id,
            product_id: item.product_id,
            description: product?.name || "",
            quantity: item.quantity,
            unit: product?.unit || "m³",
          }
        })

      if (deliveryItems.length > 0) {
        const { error: itemsError } = await supabase.from("delivery_items").insert(deliveryItems)
        if (itemsError) {
          console.error("Delivery items creation error:", itemsError)
          throw itemsError
        }
      }

      router.push("/delivery-notes")
    } catch (error: any) {
      console.error("Full error:", error)
      setError(error.message || "Error al crear el conduce")
    } finally {
      setLoading(false)
    }
  }

  const addItem = () => {
    setItems([...items, { product_id: "", quantity: 1 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const filteredProjects = projects.filter((p) => p.client_id === selectedClient)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nuevo Conduce</h1>
        <p className="text-gray-600 dark:text-gray-400">Crear un nuevo conduce de entrega</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Número de Conduce</Label>
                <Input value={deliveryNumber} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery_date">Fecha de Entrega *</Label>
                <Input
                  id="delivery_date"
                  name="delivery_date"
                  type="date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trip_number">N° Viaje</Label>
                <Input id="trip_number" name="trip_number" type="number" defaultValue="1" min="1" />
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
                <Select name="project_id">
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
                <Select name="driver_id">
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
                <Label htmlFor="vehicle_id">Vehículo/Camión</Label>
                <Select name="vehicle_id">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="departure_time">Hora de Salida</Label>
                <Input id="departure_time" name="departure_time" type="time" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery_address">Dirección de Entrega</Label>
                <Input id="delivery_address" name="delivery_address" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select name="status" defaultValue="pendiente">
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Productos a Entregar</CardTitle>
              <Button type="button" onClick={addItem} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Producto
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label>Producto *</Label>
                  <Select value={item.product_id} onValueChange={(value) => updateItem(index, "product_id", value)}>
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
                  <Label>Volumen/Cantidad *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", Number.parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Acciones</Label>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información Técnica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="resistance">Resistencia</Label>
                <Input id="resistance" name="resistance" placeholder="ej: 210" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slump">Revenimiento (Pulg)</Label>
                <Input id="slump" name="slump" placeholder="ej: 4" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plant_manager">Encargado de Planta</Label>
                <Input id="plant_manager" name="plant_manager" />
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="direct_delivery" name="direct_delivery" />
                  <Label htmlFor="direct_delivery">Directo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="fiber" name="fiber" />
                  <Label htmlFor="fiber">Fibra</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información Adicional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pump_info">Información de Bomba</Label>
                <Input id="pump_info" name="pump_info" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plant_info">Información de Planta</Label>
                <Input id="plant_info" name="plant_info" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observaciones</Label>
              <Textarea id="notes" name="notes" placeholder="Observaciones adicionales..." rows={3} />
            </div>
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
            Crear Conduce
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
