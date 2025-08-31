"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { supabase } from "../lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Search, UserCheck, Edit, Trash2, Phone, CreditCard, Loader2 } from "lucide-react"

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingDriver, setEditingDriver] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDrivers()
  }, [])

  const fetchDrivers = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setDrivers(data || [])
    } catch (error) {
      console.error("Error fetching drivers:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const driverData = {
      name: formData.get("name") as string,
      cedula: formData.get("cedula") as string,
      phone: formData.get("phone") as string,
      license_number: formData.get("license_number") as string,
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      if (editingDriver) {
        const { error } = await supabase.from("drivers").update(driverData).eq("id", editingDriver.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("drivers").insert({
          ...driverData,
          user_id: user.id,
        })
        if (error) throw error
      }

      setShowForm(false)
      setEditingDriver(null)
      fetchDrivers()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este conductor?")) return

    try {
      const { error } = await supabase.from("drivers").delete().eq("id", id)
      if (error) throw error
      fetchDrivers()
    } catch (error) {
      console.error("Error deleting driver:", error)
    }
  }

  const filteredDrivers = drivers.filter(
    (driver) =>
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.cedula?.toLowerCase().includes(searchTerm.toLowerCase()),
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Conductores</h1>
          <p className="text-gray-600 dark:text-gray-400">Gestiona tu equipo de conductores</p>
        </div>
        <Dialog
          open={showForm}
          onOpenChange={(open) => {
            setShowForm(open)
            if (!open) {
              setEditingDriver(null)
              setError(null)
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Conductor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDriver ? "Editar Conductor" : "Nuevo Conductor"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo *</Label>
                  <Input id="name" name="name" defaultValue={editingDriver?.name} placeholder="Juan Pérez" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cedula">Cédula</Label>
                  <Input id="cedula" name="cedula" defaultValue={editingDriver?.cedula} placeholder="001-1234567-8" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" name="phone" defaultValue={editingDriver?.phone} placeholder="(809) 123-4567" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="license_number">Número de Licencia</Label>
                  <Input
                    id="license_number"
                    name="license_number"
                    defaultValue={editingDriver?.license_number}
                    placeholder="LIC123456"
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
                  {editingDriver ? "Actualizar" : "Crear"} Conductor
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
                placeholder="Buscar conductores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDrivers.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No hay conductores</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Comienza agregando tu primer conductor</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Conductor
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDrivers.map((driver, index) => (
                <motion.div
                  key={driver.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{driver.name}</h3>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingDriver(driver)
                              setShowForm(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(driver.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        {driver.cedula && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <CreditCard className="h-4 w-4" />
                            <span>{driver.cedula}</span>
                          </div>
                        )}
                        {driver.phone && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Phone className="h-4 w-4" />
                            <span>{driver.phone}</span>
                          </div>
                        )}
                        {driver.license_number && (
                          <p className="text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Licencia:</span> {driver.license_number}
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
