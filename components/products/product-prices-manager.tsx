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
import { Plus, Edit, Trash2, Star, StarOff, DollarSign, Calendar, Package } from 'lucide-react'
import { useProductPrices, type ProductPrice } from '@/hooks/use-product-prices'
import { useCurrency } from '@/hooks/use-currency'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/hooks/use-toast'

interface ProductPricesManagerProps {
  productId: string
  productName?: string
  onPriceChange?: (price: number) => void
}

export function ProductPricesManager({ productId, productName, onPriceChange }: ProductPricesManagerProps) {
  const { prices, loading, createPrice, updatePrice, deletePrice, setAsDefault } = useProductPrices(productId)
  const { formatCurrency } = useCurrency()
  const [showForm, setShowForm] = useState(false)
  const [editingPrice, setEditingPrice] = useState<ProductPrice | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string | null }>({ show: false, id: null })
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
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
    
    const priceData = {
      product_id: productId,
      price_name: formData.price_name,
      price: parseFloat(formData.price),
      min_quantity: parseInt(formData.min_quantity) || 1,
      max_quantity: formData.max_quantity ? parseInt(formData.max_quantity) : null,
      description: formData.description || null,
      valid_from: formData.valid_from || null,
      valid_until: formData.valid_until || null,
      customer_type: formData.customer_type || null,
      customer_id: formData.customer_id?.trim() || null,
      is_default: prices.length === 0, // First price is default
      is_active: true
    }

    let success = false
    if (editingPrice) {
      success = await updatePrice(editingPrice.id, priceData)
    } else {
      const newPrice = await createPrice(priceData)
      success = newPrice !== null
    }

    if (success) {
      setShowForm(false)
      resetForm()
      
      // Notify parent of price change if it's the default price
      if (priceData.is_default && onPriceChange) {
        onPriceChange(priceData.price)
      }
    }
  }

  const handleEdit = (price: ProductPrice) => {
    setEditingPrice(price)
    setFormData({
      price_name: price.price_name,
      price: price.price.toString(),
      min_quantity: price.min_quantity.toString(),
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
    setDeleteConfirm({ show: true, id: priceId })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return

    setIsDeleting(true)
    try {
      await deletePrice(deleteConfirm.id)
      toast({
        title: "Precio eliminado",
        description: "El precio ha sido eliminado exitosamente",
      })
      setDeleteConfirm({ show: false, id: null })
    } catch (error) {
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el precio",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSetDefault = async (priceId: string) => {
    const success = await setAsDefault(priceId, productId)
    if (success && onPriceChange) {
      const price = prices.find(p => p.id === priceId)
      if (price) {
        onPriceChange(price.price)
      }
    }
  }

  const getQuantityText = (minQty: number, maxQty?: number | null) => {
    if (maxQty === null || maxQty === undefined) {
      return minQty === 1 ? 'Cualquier cantidad' : `${minQty}+ unidades`
    }
    if (minQty === maxQty) {
      return `Exactamente ${minQty} unidades`
    }
    return `${minQty} - ${maxQty} unidades`
  }

  const getValidityText = (validFrom?: string | null, validUntil?: string | null) => {
    if (!validFrom && !validUntil) {
      return 'Siempre válido'
    }
    if (validFrom && !validUntil) {
      return `Válido desde ${validFrom}`
    }
    if (!validFrom && validUntil) {
      return `Válido hasta ${validUntil}`
    }
    return `${validFrom} - ${validUntil}`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Precios{productName && ` - ${productName}`}
          </CardTitle>
          <Dialog open={showForm} onOpenChange={(open) => {
            setShowForm(open)
            if (!open) {
              resetForm()
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Precio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingPrice ? 'Editar Precio' : 'Nuevo Precio'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="price_name">Nombre del Precio *</Label>
                  <Input
                    id="price_name"
                    value={formData.price_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, price_name: e.target.value }))}
                    placeholder="Ej: Precio Mayorista, VIP, Especial"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="price">Precio *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="min_quantity">Cantidad Mínima</Label>
                    <Input
                      id="min_quantity"
                      type="number"
                      min="1"
                      value={formData.min_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, min_quantity: e.target.value }))}
                      placeholder="1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="max_quantity">Cantidad Máxima (opcional)</Label>
                  <Input
                    id="max_quantity"
                    type="number"
                    min="1"
                    value={formData.max_quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_quantity: e.target.value }))}
                    placeholder="Dejar vacío para sin límite"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="valid_from">Válido Desde</Label>
                    <Input
                      id="valid_from"
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="valid_until">Válido Hasta</Label>
                    <Input
                      id="valid_until"
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer_type">Tipo de Cliente</Label>
                    <select
                      id="customer_type"
                      value={formData.customer_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_type: e.target.value, customer_id: '' }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Todos los clientes</option>
                      <option value="general">General</option>
                      <option value="vip">VIP</option>
                      <option value="wholesale">Mayorista</option>
                      <option value="retail">Minorista</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="customer_id">Cliente Específico (Opcional)</Label>
                    <Input
                      id="customer_id"
                      value={formData.customer_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
                      placeholder="ID o código del cliente específico"
                      disabled={!formData.customer_type || formData.customer_type === 'general'}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Ingresa un identificador del cliente específico. Déjalo vacío para aplicar a todos los clientes del tipo seleccionado.
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción opcional del precio"
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                    {editingPrice ? 'Actualizar' : 'Crear'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {prices.length === 0 ? (
          <Alert>
            <Package className="w-4 h-4" />
            <AlertDescription>
              No hay precios configurados. Agrega el primer precio para este producto.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {prices.map((price) => (
              <div
                key={price.id}
                className={`border rounded-lg p-4 ${
                  price.is_default ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{price.price_name}</h3>
                      {price.is_default && (
                        <Badge variant="default" className="text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Por Defecto
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-medium text-lg text-gray-900">
                          {formatCurrency(price.price)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        <span>{getQuantityText(price.min_quantity, price.max_quantity)}</span>
                      </div>
                      
                      {(price.customer_type || price.customer_id) && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {price.customer_id ? `Cliente: ${price.customer_id}` : 
                             price.customer_type === 'general' ? 'General' :
                             price.customer_type === 'vip' ? 'VIP' :
                             price.customer_type === 'wholesale' ? 'Mayorista' :
                             price.customer_type === 'retail' ? 'Minorista' :
                             price.customer_type}
                          </Badge>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{getValidityText(price.valid_from, price.valid_until)}</span>
                      </div>
                      
                      {price.description && (
                        <div className="text-xs text-gray-500 mt-2">
                          {price.description}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-4">
                    {!price.is_default && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSetDefault(price.id)}
                        title="Establecer como precio por defecto"
                      >
                        <StarOff className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(price)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(price.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    <ConfirmDialog
      open={deleteConfirm.show}
      onOpenChange={(open) => !open && setDeleteConfirm({ show: false, id: null })}
      title="Eliminar Precio"
      description="¿Estás seguro de que deseas eliminar este precio? Esta acción no se puede deshacer."
      confirmLabel="Eliminar"
      cancelLabel="Cancelar"
      onConfirm={confirmDelete}
      variant="danger"
      isLoading={isDeleting}
    />
    </>
  )
}