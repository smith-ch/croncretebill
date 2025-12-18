"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Plus, Search, UserCheck, Edit, Trash2, Phone, CreditCard, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingDriver, setEditingDriver] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, id: string | null}>({show: false, id: null})
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchDrivers()
  }, [])

  const fetchDrivers = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user
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
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user
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
    setDeleteConfirm({show: true, id})
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return

    setIsDeleting(true)
    try {
      const { error } = await supabase.from("drivers").delete().eq("id", deleteConfirm.id)
      if (error) throw error
      
      toast({
        title: "Conductor eliminado",
        description: "El conductor ha sido eliminado exitosamente"
      })
      fetchDrivers()
    } catch (error) {
      console.error("Error deleting driver:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el conductor",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
      setDeleteConfirm({show: false, id: null})
    }
  }

  const filteredDrivers = drivers.filter(
    (driver) =>
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.cedula?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header skeleton */}
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-gray-200 rounded-lg skeleton"></div>
              <div className="h-4 w-64 bg-gray-200 rounded skeleton"></div>
            </div>
            <div className="h-10 w-40 bg-gray-200 rounded-lg skeleton"></div>
          </div>

          {/* Search skeleton */}
          <Card className="border-0 shadow-lg skeleton">
            <CardContent className="p-6">
              <div className="h-10 w-full bg-gray-200 rounded"></div>
            </CardContent>
          </Card>

          {/* Driver cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map((i) => (
              <Card key={i} className="border-0 shadow-lg skeleton animate-scale-in" style={{animationDelay: `${i * 0.1}s`}}>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="h-6 w-40 bg-gray-200 rounded"></div>
                      <div className="flex gap-2">
                        <div className="h-9 w-9 bg-gray-200 rounded"></div>
                        <div className="h-9 w-9 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-gray-200 rounded"></div>
                      <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                      <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
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
                  <Card className="card-hover border-0 shadow-lg bg-gradient-to-br from-white to-blue-50/30 animate-scale-in" style={{animationDelay: `${index * 0.05}s`}}>
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
                            className="hover:bg-blue-100 hover:text-blue-700 transition-all duration-200 hover:scale-110 active:scale-95 tap-target"
                            title="Editar conductor"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(driver.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 hover:scale-110 active:scale-95 tap-target"
                            title="Eliminar conductor"
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

      <ConfirmDialog
        open={deleteConfirm.show}
        onOpenChange={(isOpen) => setDeleteConfirm({show: isOpen, id: null})}
        title="Eliminar Conductor"
        description="¿Estás seguro de que quieres eliminar este conductor? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
