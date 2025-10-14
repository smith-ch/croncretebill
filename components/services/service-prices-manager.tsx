"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Edit, Trash2, Star, StarOff, DollarSign, Calendar, Wrench } from 'lucide-react'
import { useServicePrices, type ServicePrice } from '@/hooks/use-service-prices'
import { useCurrency } from '@/hooks/use-currency'

interface ServicePricesManagerProps {
  serviceId: string
  serviceName?: string
  onPriceChange?: (price: number) => void
}

export function ServicePricesManager({ serviceId, serviceName, onPriceChange }: ServicePricesManagerProps) {
  const { prices, loading, createPrice, updatePrice, deletePrice, setAsDefault } = useServicePrices(serviceId)
  const { formatCurrency } = useCurrency()
  const [showForm, setShowForm] = useState(false)
  const [editingPrice, setEditingPrice] = useState<ServicePrice | null>(null)
  const [formData, setFormData] = useState({
    price_name: '',
    price: '',
    min_quantity: '1',
    max_quantity: '',
    description: '',
    valid_from: '',
    valid_until: '',
    customer_type: '',
    customer_id: ''
  })

  const resetForm = () => {
    setFormData({
      price_name: '',
      price: '',
      min_quantity: '1',
      max_quantity: '',
      description: '',
      valid_from: '',
      valid_until: '',
      customer_type: '',
      customer_id: ''
    })
    setEditingPrice(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const priceData = {
        price_name: formData.price_name,
        price: parseFloat(formData.price),
        min_quantity: parseInt(formData.min_quantity) || 1,
        max_quantity: formData.max_quantity ? parseInt(formData.max_quantity) : null,
        description: formData.description || null,
        valid_from: formData.valid_from || null,
        valid_until: formData.valid_until || null,
        customer_type: formData.customer_type || null,
        customer_id: formData.customer_id || null
      }

      if (editingPrice) {
        await updatePrice(editingPrice.id, priceData)
      } else {
        await createPrice(priceData)
      }

      setShowForm(false)
      resetForm()
    } catch (error) {
      console.error('Error saving price:', error)
    }
  }

  const handleEdit = (price: ServicePrice) => {
    setEditingPrice(price)
    setFormData({
      price_name: price.price_name || '',
      price: price.price.toString(),
      min_quantity: price.min_quantity?.toString() || '1',
      max_quantity: price.max_quantity?.toString() || '',
      description: price.description || '',
      valid_from: price.valid_from || '',
      valid_until: price.valid_until || '',
      customer_type: price.customer_type || '',
      customer_id: price.customer_id || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (priceId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este precio?')) {
      await deletePrice(priceId)
    }
  }

  const handleSetAsDefault = async (price: ServicePrice) => {
    await setAsDefault(price.id)
    if (onPriceChange) {
      onPriceChange(price.price)
    }
  }

  const formatValidityPeriod = (validFrom: string | null, validUntil: string | null) => {
    if (!validFrom && !validUntil) return 'Siempre válido'
    if (validFrom && !validUntil) return `Desde ${new Date(validFrom).toLocaleDateString()}`
    if (!validFrom && validUntil) return `Hasta ${new Date(validUntil).toLocaleDateString()}`
    return `${new Date(validFrom).toLocaleDateString()} - ${new Date(validUntil).toLocaleDateString()}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando precios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wrench className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Precios del Servicio{serviceName && `: ${serviceName}`}
            </h3>
            <p className="text-sm text-gray-600">
              Gestiona diferentes precios para este servicio
            </p>
          </div>
        </div>
        
        <Dialog open={showForm} onOpenChange={(open) => {
          setShowForm(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Precio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPrice ? 'Editar Precio' : 'Nuevo Precio'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price_name">Nombre del Precio *</Label>
                  <Input
                    id="price_name"
                    value={formData.price_name}
                    onChange={(e) => setFormData({ ...formData, price_name: e.target.value })}
                    placeholder="Ej: Precio por Horas, Precio VIP"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="price">Precio *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_quantity">Cantidad Mínima</Label>
                  <Input
                    id="min_quantity"
                    type="number"
                    min="1"
                    value={formData.min_quantity}
                    onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label htmlFor="max_quantity">Cantidad Máxima (Opcional)</Label>
                  <Input
                    id="max_quantity"
                    type="number"
                    value={formData.max_quantity}
                    onChange={(e) => setFormData({ ...formData, max_quantity: e.target.value })}
                    placeholder="Ilimitado"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valid_from">Válido Desde</Label>
                  <Input
                    id="valid_from"
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="valid_until">Válido Hasta</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="customer_type">Tipo de Cliente</Label>
                <Input
                  id="customer_type"
                  value={formData.customer_type}
                  onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
                  placeholder="Ej: VIP, Mayorista, Regular"
                />
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción opcional del precio..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingPrice ? 'Actualizar' : 'Crear'} Precio
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {prices.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              No hay precios configurados
            </h4>
            <p className="text-gray-600 mb-4">
              Crea diferentes precios para este servicio para ofrecer opciones flexibles
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Precio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {prices.map((price) => (
            <Card key={price.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">
                          {price.price_name}
                        </h4>
                        {price.is_default && (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <Star className="h-3 w-3 mr-1" />
                            Por defecto
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="font-medium text-lg text-blue-600">
                          {formatCurrency(price.price)}
                        </span>
                        
                        {(price.min_quantity && price.min_quantity > 1) || price.max_quantity ? (
                          <span>
                            Cantidad: {price.min_quantity || 1}
                            {price.max_quantity && ` - ${price.max_quantity}`}
                          </span>
                        ) : null}
                        
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatValidityPeriod(price.valid_from, price.valid_until)}
                        </span>
                      </div>

                      {price.customer_type && (
                        <div className="mt-1">
                          <Badge variant="outline" className="text-xs">
                            {price.customer_type}
                          </Badge>
                        </div>
                      )}

                      {price.description && (
                        <p className="text-sm text-gray-600 mt-2">
                          {price.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!price.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetAsDefault(price)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <StarOff className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(price)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(price.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}