"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Package, Receipt, AlertCircle, Info, CheckCircle2, ShoppingCart } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useCurrency } from "@/hooks/use-currency"
import { useDataUserId } from "@/hooks/use-data-user-id"

interface PurchaseFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

const EXPENSE_CATEGORIES = [
  { value: 'empaque', label: 'Empaque y Embalaje' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'transporte', label: 'Transporte y Logística' },
  { value: 'publicidad', label: 'Publicidad y Marketing' },
  { value: 'insumos', label: 'Insumos Operativos' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'oficina', label: 'Material de Oficina' },
  { value: 'servicios_profesionales', label: 'Servicios Profesionales' },
  { value: 'combustible', label: 'Combustible' },
  { value: 'otros', label: 'Otros Gastos' },
]

export function PurchaseClassificationForm({ onSuccess, onCancel }: PurchaseFormProps) {
  const [loading, setLoading] = useState(false)
  const [purchaseType, setPurchaseType] = useState<'inventory' | 'expense'>('inventory')
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    quantity: '1',
    unit: 'unidad',
    supplier: '',
    receipt_number: '',
    purchase_date: new Date().toISOString().split('T')[0],
    notes: '',
    expense_category: '',
    product_code: '',
  })
  const { toast } = useToast()
  const { formatCurrency } = useCurrency()
  const { dataUserId, loading: userIdLoading } = useDataUserId()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!dataUserId) {
      toast({
        title: "Error",
        description: "Usuario no identificado",
        variant: "destructive"
      })
      return
    }

    // Validaciones
    if (!formData.description.trim()) {
      toast({
        title: "Error de validación",
        description: "La descripción es obligatoria",
        variant: "destructive"
      })
      return
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: "Error de validación",
        description: "El monto debe ser mayor a 0",
        variant: "destructive"
      })
      return
    }

    if (purchaseType === 'expense' && !formData.expense_category) {
      toast({
        title: "Error de validación",
        description: "Debe seleccionar una categoría de gasto",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      const amount = parseFloat(formData.amount)
      const quantity = parseFloat(formData.quantity) || 1

      if (purchaseType === 'inventory') {
        // REGISTRAR COMO INVENTARIO
        
        // 1. Buscar si el producto ya existe
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id, current_stock, available_stock, cost_price')
          .eq('user_id', dataUserId)
          .eq('name', formData.description.trim())
          .maybeSingle()

        let productId = existingProduct?.id
        const unitCost = amount / quantity

        if (existingProduct) {
          // Actualizar producto existente con costo promedio ponderado
          const currentStock = existingProduct.current_stock || 0
          const newStock = currentStock + quantity
          const currentCost = existingProduct.cost_price || 0
          const newCostPrice = currentStock > 0 
            ? ((currentCost * currentStock) + (unitCost * quantity)) / newStock
            : unitCost

          const { error: updateError } = await supabase
            .from('products')
            .update({
              current_stock: newStock,
              available_stock: (existingProduct.available_stock || 0) + quantity,
              cost_price: newCostPrice,
              updated_at: new Date().toISOString()
            })
            .eq('id', productId)

          if (updateError) throw updateError

          // Actualizar en product_warehouse_stock también
          const { data: warehouse } = await supabase
            .from('warehouses')
            .select('id')
            .eq('user_id', dataUserId)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle()

          if (warehouse) {
            const { data: warehouseStock } = await supabase
              .from('product_warehouse_stock')
              .select('id, current_stock')
              .eq('product_id', productId)
              .eq('warehouse_id', warehouse.id)
              .maybeSingle()

            if (warehouseStock) {
              await supabase
                .from('product_warehouse_stock')
                .update({
                  current_stock: (warehouseStock.current_stock || 0) + quantity,
                  updated_at: new Date().toISOString()
                })
                .eq('id', warehouseStock.id)
            } else {
              await supabase
                .from('product_warehouse_stock')
                .insert({
                  product_id: productId,
                  warehouse_id: warehouse.id,
                  current_stock: quantity,
                  user_id: dataUserId
                })
            }
          }

          toast({
            title: "Inventario actualizado",
            description: `Stock de "${formData.description}" incrementado en ${quantity} unidades`,
          })
        } else {
          // Crear nuevo producto
          const { data: newProduct, error: productError } = await supabase
            .from('products')
            .insert({
              user_id: dataUserId,
              name: formData.description.trim(),
              description: formData.notes || '',
              product_code: formData.product_code || null,
              unit: formData.unit,
              unit_price: unitCost * 1.3, // Margen del 30% por defecto
              cost_price: unitCost,
              current_stock: quantity,
              available_stock: quantity,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()

          if (productError) throw productError
          productId = newProduct.id

          // Crear entrada en product_warehouse_stock
          const { data: warehouse } = await supabase
            .from('warehouses')
            .select('id')
            .eq('user_id', dataUserId)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle()

          if (warehouse) {
            await supabase
              .from('product_warehouse_stock')
              .insert({
                product_id: productId,
                warehouse_id: warehouse.id,
                current_stock: quantity,
                user_id: dataUserId
              })
          }

          toast({
            title: "Producto creado",
            description: `"${formData.description}" agregado al inventario con ${quantity} unidades`,
          })
        }

        // 2. Registrar la compra en historial
        await supabase
          .from('purchase_history')
          .insert({
            user_id: dataUserId,
            product_id: productId,
            purchase_type: 'inventory',
            description: formData.description,
            amount: amount,
            quantity: quantity,
            unit_cost: unitCost,
            supplier: formData.supplier || null,
            receipt_number: formData.receipt_number || null,
            purchase_date: formData.purchase_date,
            notes: formData.notes || null,
            created_at: new Date().toISOString()
          })

        // 3. Crear movimiento de stock
        const { data: warehouse } = await supabase
          .from('warehouses')
          .select('id')
          .eq('user_id', dataUserId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()

        if (warehouse) {
          await supabase
            .from('stock_movements')
            .insert({
              product_id: productId,
              warehouse_id: warehouse.id,
              movement_type: 'entrada',
              quantity_change: quantity,
              notes: `Compra: ${formData.description}${formData.supplier ? ` - Proveedor: ${formData.supplier}` : ''}`,
              movement_date: formData.purchase_date,
              user_id: dataUserId
            })
        }

      } else {
        // REGISTRAR COMO GASTO
        await supabase
          .from('expenses')
          .insert({
            user_id: dataUserId,
            description: formData.description,
            amount: amount,
            category: formData.expense_category,
            expense_date: formData.purchase_date,
            receipt_number: formData.receipt_number || null,
            notes: `${formData.notes || ''}${formData.supplier ? `\nProveedor: ${formData.supplier}` : ''}`.trim(),
            created_at: new Date().toISOString()
          })

        // Registrar en historial
        await supabase
          .from('purchase_history')
          .insert({
            user_id: dataUserId,
            purchase_type: 'expense',
            description: formData.description,
            amount: amount,
            quantity: quantity,
            expense_category: formData.expense_category,
            supplier: formData.supplier || null,
            receipt_number: formData.receipt_number || null,
            purchase_date: formData.purchase_date,
            notes: formData.notes || null,
            created_at: new Date().toISOString()
          })

        toast({
          title: "Gasto registrado",
          description: `Gasto de ${formatCurrency(amount)} registrado en categoría "${EXPENSE_CATEGORIES.find(c => c.value === formData.expense_category)?.label}"`,
        })
      }

      // Limpiar formulario
      setFormData({
        description: '',
        amount: '',
        quantity: '1',
        unit: 'unidad',
        supplier: '',
        receipt_number: '',
        purchase_date: new Date().toISOString().split('T')[0],
        notes: '',
        expense_category: '',
        product_code: '',
      })
      setPurchaseType('inventory')

      if (onSuccess) onSuccess()

    } catch (error: any) {
      console.error('Error registrando compra:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar la compra",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Clasificación del tipo de compra */}
      <Card className="border-2 border-slate-700 bg-slate-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <AlertCircle className="h-5 w-5" />
            Clasificación de la Compra
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={purchaseType} onValueChange={(value: any) => setPurchaseType(value)}>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-4 border-2 border-green-300 bg-slate-900 rounded-lg cursor-pointer hover:bg-green-900/30">
                <RadioGroupItem value="inventory" id="inventory" />
                <Label htmlFor="inventory" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-semibold text-green-900">Producto para la Venta</div>
                      <div className="text-sm text-green-400">Se registra en inventario • El gasto se reconoce al vender</div>
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-4 border-2 border-orange-300 bg-slate-900 rounded-lg cursor-pointer hover:bg-orange-900/30">
                <RadioGroupItem value="expense" id="expense" />
                <Label htmlFor="expense" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-orange-600" />
                    <div>
                      <div className="font-semibold text-orange-900">Uso Interno / Operación</div>
                      <div className="text-sm text-orange-400">Se registra como gasto inmediato</div>
                    </div>
                  </div>
                </Label>
              </div>
            </div>
          </RadioGroup>

          {purchaseType === 'inventory' && (
            <Alert className="mt-4 border-green-300 bg-green-900/30">
              <Info className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-300">
                <strong>Importante:</strong> La mercancía para venta se registra como inventario y solo se convierte en gasto (costo de venta) cuando se vende.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Información de la compra */}
      <Card>
        <CardHeader>
          <CardTitle>Detalles de la Compra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="description">
                Descripción *
                {purchaseType === 'inventory' && <span className="text-sm text-slate-400 ml-2">(Nombre del producto)</span>}
              </Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={purchaseType === 'inventory' ? "Ej: Cemento Portland 50kg" : "Ej: Renta de oficina"}
                required
              />
            </div>

            {purchaseType === 'inventory' && (
              <div>
                <Label htmlFor="product_code">Código de Producto</Label>
                <Input
                  id="product_code"
                  value={formData.product_code}
                  onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            )}

            <div>
              <Label htmlFor="amount">Monto Total *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            {purchaseType === 'inventory' && (
              <>
                <div>
                  <Label htmlFor="quantity">Cantidad *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="unit">Unidad</Label>
                  <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unidad">Unidad</SelectItem>
                      <SelectItem value="kg">Kilogramo (kg)</SelectItem>
                      <SelectItem value="m³">Metro cúbico (m³)</SelectItem>
                      <SelectItem value="litro">Litro</SelectItem>
                      <SelectItem value="caja">Caja</SelectItem>
                      <SelectItem value="saco">Saco</SelectItem>
                      <SelectItem value="metro">Metro</SelectItem>
                      <SelectItem value="galón">Galón</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.amount && formData.quantity && parseFloat(formData.quantity) > 0 && (
                  <div className="md:col-span-2">
                    <Alert className="border-blue-300 bg-slate-900">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-300">
                        <strong>Costo unitario:</strong> {formatCurrency(parseFloat(formData.amount) / parseFloat(formData.quantity))} por {formData.unit}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </>
            )}

            {purchaseType === 'expense' && (
              <div className="md:col-span-2">
                <Label htmlFor="expense_category">Categoría de Gasto *</Label>
                <Select value={formData.expense_category} onValueChange={(value) => setFormData({ ...formData, expense_category: value })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="supplier">Proveedor</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Opcional"
              />
            </div>

            <div>
              <Label htmlFor="receipt_number">No. de Factura/Recibo</Label>
              <Input
                id="receipt_number"
                value={formData.receipt_number}
                onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                placeholder="Opcional"
              />
            </div>

            <div>
              <Label htmlFor="purchase_date">Fecha de Compra *</Label>
              <Input
                id="purchase_date"
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                required
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Información adicional sobre la compra"
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botones de acción */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading} className="min-w-[150px]">
          {loading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Registrando...
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Registrar Compra
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
