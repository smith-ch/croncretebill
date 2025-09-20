"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Search, Car, Edit, Trash2, Loader2 } from "lucide-react"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const { canDelete } = useUserPermissions()
  const [editingVehicle, setEditingVehicle] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchVehicles()
  }, [])

  const fetchVehicles = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setVehicles(data || [])
    } catch (error) {
      console.error("Error fetching vehicles:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const vehicleData = {
      model: formData.get("model") as string,
      type: formData.get("type") as string,
      plate: formData.get("plate") as string,
      capacity: Number.parseFloat(formData.get("capacity") as string) || null,
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      if (editingVehicle) {
        const { error } = await supabase.from("vehicles").update(vehicleData).eq("id", editingVehicle.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("vehicles").insert({
          ...vehicleData,
          user_id: user.id,
        })
        if (error) throw error
      }

      setShowForm(false)
      setEditingVehicle(null)
      fetchVehicles()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!canDelete('vehicles')) {
      alert("No tienes permisos para eliminar vehículos")
      return
    }
    
    if (!confirm("¿Estás seguro de que quieres eliminar este vehículo?")) return

    try {
      const { error } = await supabase.from("vehicles").delete().eq("id", id)
      if (error) throw error
      fetchVehicles()
    } catch (error) {
      console.error("Error deleting vehicle:", error)
    }
  }

  const filteredVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.type?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="p-6">
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
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Vehículos</h1>
          <p className="text-gray-600 dark:text-gray-400">Gestiona tu flota de vehículos</p>
        </div>
        <Dialog
          open={showForm}
          onOpenChange={(open) => {
            setShowForm(open)
            if (!open) {
              setEditingVehicle(null)
              setError(null)
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Vehículo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingVehicle ? "Editar Vehículo" : "Nuevo Vehículo"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Modelo *</Label>
                  <Input
                    id="model"
                    name="model"
                    defaultValue={editingVehicle?.model}
                    placeholder="Mack Granite"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plate">Placa *</Label>
                  <Input id="plate" name="plate" defaultValue={editingVehicle?.plate} placeholder="A123456" required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Vehículo</Label>
                  <Select name="type" defaultValue={editingVehicle?.type}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mixer">Mixer</SelectItem>
                      <SelectItem value="Camión">Camión</SelectItem>
                      <SelectItem value="Volqueta">Volqueta</SelectItem>
                      <SelectItem value="Bomba">Bomba</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacidad (m³)</Label>
                  <Input
                    id="capacity"
                    name="capacity"
                    type="number"
                    step="0.1"
                    defaultValue={editingVehicle?.capacity}
                    placeholder="8.0"
                  />
                </div>
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button type="submit" disabled={formLoading}>
                  {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingVehicle ? "Actualizar" : "Crear"} Vehículo
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar vehículos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredVehicles.length === 0 ? (
            <div className="text-center py-12">
              <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No hay vehículos</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Comienza agregando tu primer vehículo</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Vehículo
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVehicles.map((vehicle, index) => (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{vehicle.model}</h3>
                          <p className="text-lg font-bold text-blue-600">{vehicle.plate}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingVehicle(vehicle)
                              setShowForm(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {canDelete('vehicles') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(vehicle.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        {vehicle.type && (
                          <p className="text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Tipo:</span> {vehicle.type}
                          </p>
                        )}
                        {vehicle.capacity && (
                          <p className="text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Capacidad:</span> {vehicle.capacity} m³
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
