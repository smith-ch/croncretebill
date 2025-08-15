"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { ServiceForm } from "@/components/forms/service-form"
import { Plus, Search, Wrench, Edit, Trash2 } from "lucide-react"
import { useCurrency } from "@/hooks/use-currency"

interface Service {
  id: string
  name: string
  description?: string
  price: number
  unit: string
  category?: string
  duration?: string
  created_at: string
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [showForm, setShowForm] = useState(false)
  const { formatCurrency } = useCurrency()

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setServices(data || [])
    } catch (error) {
      console.error("Error fetching services:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este servicio?")) return

    try {
      const { error } = await supabase.from("services").delete().eq("id", id)
      if (error) throw error
      fetchServices()
    } catch (error) {
      console.error("Error deleting service:", error)
    }
  }

  const filteredServices = services.filter(
    (service) =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Servicios
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Gestiona tu catálogo de servicios</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Servicio
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w[95vw] sm:max-w-lg md:max-w-2xl p-4 overflow-y-auto max-h-[90vh]">
            <ServiceForm
              service={editingService}
              onSuccess={() => {
                setShowForm(false)
                setEditingService(null)
                fetchServices()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70 h-4 w-4" />
              <Input
                placeholder="Buscar servicios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/70 focus:bg-white/30"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {filteredServices.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No hay servicios</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Comienza agregando tu primer servicio</p>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Servicio
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map((service) => (
                <Card
                  key={service.id}
                  className="hover:shadow-lg transition-all duration-300 hover:scale-105 bg-white border-0 shadow-md"
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{service.name}</h3>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingService(service)
                            setShowForm(true)
                          }}
                          className="hover:bg-blue-50 text-blue-600"
                          aria-label={`Editar servicio ${service.name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(service.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          aria-label={`Eliminar servicio ${service.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {service.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{service.description}</p>
                    )}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Precio:</span>
                        <span className="font-medium text-blue-600">
                          {formatCurrency(service.price)}/{service.unit}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {service.category && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            {service.category}
                          </Badge>
                        )}
                        {service.duration && (
                          <Badge variant="outline" className="border-blue-300 text-blue-700">
                            {service.duration}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
