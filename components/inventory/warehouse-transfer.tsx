"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ArrowRight, Package, Warehouse, Loader2, CheckCircle } from 'lucide-react'

interface Product {
  id: string
  name: string
  unit: string
  current_stock: number
}

interface WarehouseStock {
  id: string
  current_stock: number
  product: Product
  warehouse: {
    id: string
    name: string
  }
}

interface WarehouseInfo {
  id: string
  name: string
  is_active: boolean
}

export function WarehouseTransfer({ onTransferComplete }: { onTransferComplete?: () => void }) {
  const [warehouses, setWarehouses] = useState<WarehouseInfo[]>([])
  const [sourceWarehouse, setSourceWarehouse] = useState<string>('')
  const [targetWarehouse, setTargetWarehouse] = useState<string>('')
  const [availableProducts, setAvailableProducts] = useState<WarehouseStock[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [transferQuantity, setTransferQuantity] = useState<number>(0)
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchWarehouses()
  }, [])

  useEffect(() => {
    if (sourceWarehouse) {
      fetchProductsInWarehouse(sourceWarehouse)
    } else {
      setAvailableProducts([])
    }
    setSelectedProduct('')
    setTransferQuantity(0)
  }, [sourceWarehouse])

  const fetchWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('name')

      if (error) {
        throw error
      }

      setWarehouses(data || [])
    } catch (error: any) {
      console.error('Error fetching warehouses:', error)
      setError('Error al cargar almacenes')
    }
  }

  const fetchProductsInWarehouse = async (warehouseId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      const { data, error } = await supabase
        .from('product_warehouse_stock')
        .select(`
          id,
          current_stock,
          product:products!inner (
            id,
            name,
            unit,
            current_stock,
            user_id
          ),
          warehouse:warehouses!inner (
            id,
            name
          )
        `)
        .eq('warehouse_id', warehouseId)
        .eq('product.user_id', user.id)
        .gt('current_stock', 0)
        .order('product(name)')

      if (error) {
        throw error
      }

      setAvailableProducts(data || [])
    } catch (error: any) {
      console.error('Error fetching products:', error)
      setError('Error al cargar productos del almacén')
    }
  }

  const validateTransfer = (): string[] => {
    const errors: string[] = []

    if (!sourceWarehouse) {
      errors.push('Selecciona el almacén de origen')
    }
    if (!targetWarehouse) {
      errors.push('Selecciona el almacén de destino')
    }
    if (sourceWarehouse === targetWarehouse) {
      errors.push('El almacén de origen y destino deben ser diferentes')
    }
    if (!selectedProduct) {
      errors.push('Selecciona un producto para transferir')
    }
    if (transferQuantity <= 0) {
      errors.push('La cantidad debe ser mayor a 0')
    }

    const selectedProductData = availableProducts.find(p => p.id === selectedProduct)
    if (selectedProductData && transferQuantity > selectedProductData.current_stock) {
      errors.push(`Stock insuficiente. Disponible: ${selectedProductData.current_stock}`)
    }

    return errors
  }

  const executeTransfer = async () => {
    const validationErrors = validateTransfer()
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '))
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      const selectedProductData = availableProducts.find(p => p.id === selectedProduct)
      if (!selectedProductData) {
        throw new Error('Producto no encontrado')
      }

      // 1. Reducir stock en almacén de origen
      const newSourceStock = selectedProductData.current_stock - transferQuantity
      const { error: updateSourceError } = await supabase
        .from('product_warehouse_stock')
        .update({
          current_stock: newSourceStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedProduct)

      if (updateSourceError) {
        throw updateSourceError
      }

      // 2. Buscar si ya existe el producto en el almacén de destino
      const { data: existingTargetStock, error: targetCheckError } = await supabase
        .from('product_warehouse_stock')
        .select('id, current_stock')
        .eq('product_id', selectedProductData.product.id)
        .eq('warehouse_id', targetWarehouse)
        .single()

      if (targetCheckError && targetCheckError.code !== 'PGRST116') {
        throw targetCheckError
      }

      if (existingTargetStock) {
        // 3a. Actualizar stock existente en destino
        const { error: updateTargetError } = await supabase
          .from('product_warehouse_stock')
          .update({
            current_stock: existingTargetStock.current_stock + transferQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingTargetStock.id)

        if (updateTargetError) {
          throw updateTargetError
        }
      } else {
        // 3b. Crear nuevo registro en destino
        const { error: createTargetError } = await supabase
          .from('product_warehouse_stock')
          .insert({
            product_id: selectedProductData.product.id,
            warehouse_id: targetWarehouse,
            current_stock: transferQuantity,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (createTargetError) {
          throw createTargetError
        }
      }

      // 4. Registrar movimiento de salida (origen)
      const sourceWarehouseName = warehouses.find(w => w.id === sourceWarehouse)?.name || 'Desconocido'
      const targetWarehouseName = warehouses.find(w => w.id === targetWarehouse)?.name || 'Desconocido'

      await supabase
        .from('stock_movements')
        .insert({
          product_id: selectedProductData.product.id,
          warehouse_id: sourceWarehouse,
          movement_type: 'transfer_out',
          quantity_change: -transferQuantity,
          notes: `Transferencia a ${targetWarehouseName}. ${notes}`.trim(),
          movement_date: new Date().toISOString(),
          user_id: user.id
        })

      // 5. Registrar movimiento de entrada (destino)
      await supabase
        .from('stock_movements')
        .insert({
          product_id: selectedProductData.product.id,
          warehouse_id: targetWarehouse,
          movement_type: 'transfer_in',
          quantity_change: transferQuantity,
          notes: `Transferencia desde ${sourceWarehouseName}. ${notes}`.trim(),
          movement_date: new Date().toISOString(),
          user_id: user.id
        })

      setSuccess(`Transferencia exitosa: ${transferQuantity} ${selectedProductData.product.unit} de ${selectedProductData.product.name}`)
      
      // Limpiar formulario
      setSelectedProduct('')
      setTransferQuantity(0)
      setNotes('')
      
      // Recargar productos
      fetchProductsInWarehouse(sourceWarehouse)
      
      if (onTransferComplete) {
        onTransferComplete()
      }

    } catch (error: any) {
      console.error('Error en transferencia:', error)
      setError(`Error en la transferencia: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const selectedProductData = availableProducts.find(p => p.id === selectedProduct)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Transferir Productos Entre Almacenes
          </CardTitle>
          <p className="text-sm text-gray-600">
            Mueve productos de un almacén a otro sin duplicar registros
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selección de almacenes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div>
              <Label htmlFor="source-warehouse">Almacén de Origen</Label>
              <Select value={sourceWarehouse} onValueChange={setSourceWarehouse}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar origen..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(warehouse => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      <div className="flex items-center gap-2">
                        <Warehouse className="w-4 h-4" />
                        {warehouse.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-8 h-8 text-gray-400" />
            </div>

            <div>
              <Label htmlFor="target-warehouse">Almacén de Destino</Label>
              <Select value={targetWarehouse} onValueChange={setTargetWarehouse}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar destino..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses
                    .filter(w => w.id !== sourceWarehouse)
                    .map(warehouse => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        <div className="flex items-center gap-2">
                          <Warehouse className="w-4 h-4" />
                          {warehouse.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selección de producto */}
          {sourceWarehouse && (
            <div>
              <Label htmlFor="product">Producto a Transferir</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto..." />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{item.product.name}</span>
                        <Badge variant="secondary" className="ml-2">
                          {item.current_stock} {item.product.unit}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {availableProducts.length === 0 && sourceWarehouse && (
                <p className="text-sm text-gray-500 mt-1">
                  No hay productos con stock en este almacén
                </p>
              )}
            </div>
          )}

          {/* Cantidad y notas */}
          {selectedProductData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Cantidad a Transferir</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={selectedProductData.current_stock}
                  value={transferQuantity || ''}
                  onChange={(e) => setTransferQuantity(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Disponible: {selectedProductData.current_stock} {selectedProductData.product.unit}
                </p>
              </div>

              <div>
                <Label htmlFor="notes">Notas (Opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Motivo de la transferencia..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Botón de transferencia */}
          {selectedProductData && transferQuantity > 0 && targetWarehouse && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Resumen de Transferencia:</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Producto:</strong> {selectedProductData.product.name}</p>
                <p><strong>Cantidad:</strong> {transferQuantity} {selectedProductData.product.unit}</p>
                <p><strong>Desde:</strong> {warehouses.find(w => w.id === sourceWarehouse)?.name}</p>
                <p><strong>Hacia:</strong> {warehouses.find(w => w.id === targetWarehouse)?.name}</p>
                {notes && <p><strong>Notas:</strong> {notes}</p>}
              </div>
              
              <Button 
                onClick={executeTransfer}
                disabled={loading}
                className="w-full mt-4"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Transfiriendo...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Ejecutar Transferencia
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Alertas */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}