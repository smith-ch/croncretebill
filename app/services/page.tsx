"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { ServiceForm } from "@/components/forms/service-form"
import { CategoryFilter } from "@/components/ui/category-filter"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Plus, Search, Wrench, Edit, Trash2, DollarSign, Calculator } from "lucide-react"
import { useCurrency } from "@/hooks/use-currency"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import { useCategories } from "@/hooks/use-categories"
import { useToast } from "@/hooks/use-toast"

interface Service {
  id: string
  name: string
  description?: string
  service_code?: string
  price: number | null
  production_cost?: number
  unit: string
  category?: string
  categories?: {
    name: string
    color?: string
  }
  duration?: string
  warranty_months?: number
  requirements?: string
  includes?: string
  created_at: string
}

export default function ServicesPage() {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, id: string | null}>({show: false, id: null})
  const [isDeleting, setIsDeleting] = useState(false)
  const { formatCurrency } = useCurrency()
  const { canDelete, canEdit, canAccessModule } = useUserPermissions()
  const { toast } = useToast()
  // const { categories } = useCategories('service')

  useEffect(() => {
    fetchServices()
  }, [])

  // Check if user has permission to access services
  if (!canAccessModule('services')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-2 border-red-200 bg-red-50">
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-red-800 mb-2">Acceso Restringido</h2>
                <p className="text-red-600">
                  No tienes permisos para acceder a los servicios. Esta función requiere permisos de gestión de inventario.
                </p>
              </div>
              <Button 
                onClick={() => window.history.back()} 
                className="bg-red-600 hover:bg-red-700"
              >
                Volver
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const fetchServices = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      const { data, error } = await supabase
        .from("services")
        .select(`
          *,
          categories!services_category_id_fkey (
            name,
            color
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {throw error}
      setServices(data || [])
    } catch (error) {
      console.error("Error fetching services:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!canDelete('services')) {
      toast({
        title: "Permiso denegado",
        description: "No tienes permisos para eliminar servicios",
        variant: "destructive"
      })
      return
    }
    
    setDeleteConfirm({show: true, id})
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return

    setIsDeleting(true)
    try {
      const { error } = await supabase.from("services").delete().eq("id", deleteConfirm.id)
      if (error) throw error
      
      toast({
        title: "Servicio eliminado",
        description: "El servicio ha sido eliminado exitosamente"
      })
      fetchServices()
    } catch (error) {
      console.error("Error deleting service:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el servicio",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
      setDeleteConfirm({show: false, id: null})
    }
  }

  const filteredServices = services.filter((service) => {
    const matchesSearch = 
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.service_code?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategoryId === null || service.category === selectedCategoryId
    
    return matchesSearch && matchesCategory
  })

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
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl xl:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Servicios
          </h1>
          <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">Gestiona tu catálogo de servicios</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={() => router.push('/services/multiple-prices')}
            variant="outline"
            className="border-blue-200 hover:bg-blue-50 w-full sm:w-auto"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Precios Múltiples</span>
            <span className="sm:hidden">Precios</span>
          </Button>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Servicio
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-[95vw] sm:max-w-lg md:max-w-2xl p-4 overflow-y-auto max-h-[90vh]">
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
      </div>

      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg p-4 lg:p-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70 h-4 w-4" />
              <Input
                placeholder="Buscar servicios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/70 focus:bg-white/30 text-sm lg:text-base"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-6">
            <CategoryFilter
              selectedCategoryId={selectedCategoryId}
              onCategoryChange={setSelectedCategoryId}
              type="service"
            />
          </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              {filteredServices.map((service) => (
                <Card
                  key={service.id}
                  className="hover:shadow-lg transition-all duration-300 lg:hover:scale-105 bg-white border-0 shadow-md"
                >
                  <CardContent className="p-3 lg:p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm lg:text-base text-gray-900 dark:text-white truncate">{service.name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {service.service_code && (
                            <Badge variant="secondary" className="text-xs font-mono bg-blue-100 text-blue-700">
                              {service.service_code}
                            </Badge>
                          )}
                          {service.categories?.name && (
                            <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">
                              {service.categories.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0 self-end sm:self-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingService(service)
                            setShowForm(true)
                          }}
                          className="hover:bg-blue-50 text-blue-600"
                          aria-label={`Editar servicio ${service.name}`}
                          disabled={!canEdit('services')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {canDelete('services') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(service.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            aria-label={`Eliminar servicio ${service.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {service.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{service.description}</p>
                    )}
                    
                    <div className="space-y-3">
                      {/* Precios */}
                      {service.price !== null ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                            <div className="text-xs text-blue-700 font-semibold mb-1">Precio Venta</div>
                            <div className="font-bold text-blue-800 text-lg">
                              {formatCurrency(service.price)}
                            </div>
                            <div className="text-xs text-blue-600">por {service.unit}</div>
                          </div>
                          {service.production_cost ? (
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200">
                              <div className="text-xs text-slate-700 font-semibold mb-1">Costo Producción</div>
                              <div className="font-bold text-slate-800 text-sm">
                                {formatCurrency(service.production_cost)}
                              </div>
                              {service.production_cost > 0 && (
                                <div className="text-xs text-green-600 font-medium">
                                  {(((service.price - service.production_cost) / service.production_cost) * 100).toFixed(0)}% ganancia
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200 flex items-center justify-center">
                              <div className="text-center">
                                <Calculator className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                                <div className="text-xs text-gray-500">Sin costo definido</div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-3 border border-amber-200">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="h-4 w-4 text-amber-700" />
                            <div className="text-xs text-amber-700 font-semibold">Precio Personalizado</div>
                          </div>
                          <div className="text-sm text-amber-800">Se define en cada factura</div>
                        </div>
                      )}

                      {/* Duración y Garantía */}
                      <div className="grid grid-cols-2 gap-3">
                        {service.duration && (
                          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                            <div className="flex items-center gap-2 mb-1">
                              <Wrench className="h-4 w-4 text-green-700" />
                              <div className="text-xs text-green-700 font-semibold">Duración</div>
                            </div>
                            <div className="text-sm text-green-800 font-medium">{service.duration}</div>
                          </div>
                        )}
                        {service.warranty_months && service.warranty_months > 0 && (
                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
                            <div className="text-xs text-purple-700 font-semibold mb-1">Garantía</div>
                            <div className="text-sm text-purple-800 font-medium">
                              {service.warranty_months} {service.warranty_months === 1 ? 'mes' : 'meses'}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Información adicional */}
                      <div className="space-y-2">
                        {service.requirements && (
                          <div className="text-xs text-gray-600">
                            <span className="font-medium">Requisitos:</span> {service.requirements}
                          </div>
                        )}
                        {service.includes && (
                          <div className="text-xs text-gray-600">
                            <span className="font-medium">Incluye:</span> {service.includes}
                          </div>
                        )}
                      </div>

                      {/* Badges adicionales */}
                      <div className="flex gap-2 flex-wrap">
                        {service.duration && (
                          <Badge variant="outline" className="border-green-300 text-green-700 text-xs">
                            ⏱️ {service.duration}
                          </Badge>
                        )}
                        {service.warranty_months && service.warranty_months > 0 && (
                          <Badge variant="outline" className="border-purple-300 text-purple-700 text-xs">
                            🛡️ {service.warranty_months}m garantía
                          </Badge>
                        )}
                        {service.price === null && (
                          <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 text-xs">
                            💰 Precio personalizado
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
      
      <ConfirmDialog
        open={deleteConfirm.show}
        onOpenChange={(isOpen) => setDeleteConfirm({show: isOpen, id: null})}
        title="Eliminar Servicio"
        description="¿Estás seguro de que quieres eliminar este servicio? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
