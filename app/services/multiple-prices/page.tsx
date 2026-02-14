"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Search, ArrowLeft, DollarSign, Wrench } from "lucide-react"
import Link from 'next/link'
import { ServicePricesManager } from '@/components/services/service-prices-manager'
import { supabase } from '@/lib/supabase'
import { useCurrency } from '@/hooks/use-currency'

interface Service {
  id: string
  name: string
  service_code: string
  description: string | null
  price: number
  user_id: string
  created_at: string
  updated_at: string
}

export default function ServiceMultiplePricesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { formatCurrency } = useCurrency()

  useEffect(() => {
    async function fetchServices() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        
        if (!user) {
          throw new Error('Usuario no autenticado')
        }

        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('user_id', user.id)
          .order('service_code', { ascending: true })
        
        if (error) {
          throw error
        }
        setServices(data || [])
      } catch (error) {
        console.error('Error fetching services:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchServices()
  }, [])

  // Filtrar servicios por término de búsqueda
  const filteredServices = services.filter((service: Service) => 
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.service_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service)
  }

  const handleBackToList = () => {
    setSelectedService(null)
  }

  if (selectedService) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="container mx-auto px-4 py-8">
          <Button 
            variant="outline" 
            onClick={handleBackToList}
            className="mb-6 bg-slate-900 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a la lista
          </Button>
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 bg-slate-900 rounded-full px-6 py-3 shadow-lg mb-4">
              <Wrench className="w-6 h-6 text-blue-500" />
              <span className="font-semibold text-slate-300">{selectedService.name}</span>
            </div>
            <h1 className="text-4xl font-bold text-slate-200 mb-2">
              Gestión de Precios
            </h1>
            <p className="text-slate-400">
              Código: {selectedService.service_code} | 
              {selectedService.price && selectedService.price > 0 ? (
                ` Precio base: ${formatCurrency(selectedService.price)}`
              ) : (
                <span className="ml-1">
                  <Badge variant="outline" className="text-xs bg-orange-900/30 text-orange-600 border-orange-800">
                    Servicio Personalizado
                  </Badge>
                </span>
              )}
            </p>
          </div>

          <ServicePricesManager serviceId={selectedService.id} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header con diseño mejorado */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-slate-900 rounded-full px-6 py-3 shadow-lg mb-4">
            <Wrench className="w-6 h-6 text-blue-500" />
            <span className="font-semibold text-slate-300">Gestión de Precios</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-200 mb-2">
            Precios Múltiples de Servicios
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Busca servicios y gestiona sus precios múltiples
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Panel de búsqueda y selección */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-50">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Buscar Servicio
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label htmlFor="search">Buscar por nombre o código</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Buscar servicio por código o nombre..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {isLoading ? (
                    <div className="text-center py-8 text-slate-500">Cargando servicios...</div>
                  ) : filteredServices.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      {searchTerm ? "No se encontraron servicios" : "No hay servicios disponibles"}
                    </div>
                  ) : (
                    filteredServices.map(service => (
                      <div
                        key={service.id}
                        onClick={() => handleServiceSelect(service)}
                        className="p-4 border rounded-lg cursor-pointer hover:bg-slate-900 hover:border-slate-700 transition-all duration-200 bg-slate-900 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-xs font-mono">
                                {service.service_code}
                              </Badge>
                            </div>
                            <h3 className="font-semibold text-sm text-slate-200 truncate">
                              {service.name}
                            </h3>
                            {service.description && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                {service.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            {service.price && service.price > 0 ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <DollarSign className="w-4 h-4" />
                                <span className="font-bold text-sm">
                                  {formatCurrency(service.price)}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-orange-500">
                                <Badge variant="outline" className="text-xs bg-orange-900/30 text-orange-600 border-orange-800">
                                  Personalizado
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panel de información */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-50 h-full">
              <CardContent className="p-8 flex items-center justify-center h-full">
                <div className="text-center text-slate-500">
                  <Wrench className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-semibold mb-2">Selecciona un servicio</h3>
                  <p className="text-sm max-w-md">
                    Busca y selecciona un servicio de la lista para gestionar sus precios múltiples.
                    Puedes crear precios especiales por cantidad, tipo de cliente, fechas y más.
                  </p>
                  {!isLoading && services.length === 0 && (
                    <div className="mt-6">
                      <p className="text-sm text-slate-400 mb-4">No tienes servicios creados aún</p>
                      <Link href="/services" className="inline-flex">
                        <Button variant="outline" size="sm">
                          Crear tu primer servicio
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats card si hay servicios */}
        {!isLoading && services.length > 0 && (
          <div className="mt-8">
            <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">Servicios disponibles</h3>
                    <p className="text-blue-100 text-sm">
                      Gestiona precios para todos tus servicios
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{services.length}</div>
                    <div className="text-blue-100 text-sm">servicios</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}