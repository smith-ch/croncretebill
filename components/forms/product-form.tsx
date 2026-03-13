"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CategorySelector } from "@/components/ui/category-selector"
import { Loader2, WifiOff, Package } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { Checkbox } from "@/components/ui/checkbox"
import { offlineCache } from "@/lib/offline-cache"
import { syncQueue } from "@/lib/sync-queue"
import { useDataUserId } from "@/hooks/use-data-user-id"

interface ProductFormProps {
  product?: any
  onSuccess?: () => void
  inModal?: boolean
}

export function ProductForm({ product, onSuccess, inModal = false }: ProductFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(product?.category_id || "")
  const [isReturnable, setIsReturnable] = useState<boolean>(product?.is_returnable || false)
  const { toast } = useToast()
  const isOnline = useOnlineStatus()
  const { dataUserId, loading: userIdLoading } = useDataUserId()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    
    // Validación: Nombre es obligatorio
    const name = formData.get("name") as string
    if (!name || name.trim() === "") {
      toast({
        variant: "destructive",
        title: "❌ Campo requerido",
        description: "El nombre del producto es obligatorio",
      })
      setLoading(false)
      return
    }

    // Validación: Precio unitario debe ser válido
    const unitPriceStr = formData.get("unit_price") as string
    const unitPrice = Number.parseFloat(unitPriceStr)
    if (!unitPriceStr || isNaN(unitPrice) || unitPrice < 0) {
      toast({
        variant: "destructive",
        title: "❌ Precio inválido",
        description: "El precio unitario debe ser un número mayor o igual a 0",
      })
      setLoading(false)
      return
    }

    // Validación: Precio de costo (si se proporciona)
    const costPriceStr = formData.get("cost_price") as string
    const costPrice = costPriceStr ? Number.parseFloat(costPriceStr) : unitPrice
    if (costPriceStr && (isNaN(costPrice) || costPrice < 0)) {
      toast({
        variant: "destructive",
        title: "❌ Precio de costo inválido",
        description: "El precio de costo debe ser un número mayor o igual a 0",
      })
      setLoading(false)
      return
    }

    // Validación: Stock debe ser un número válido
    const stockStr = formData.get("stock_quantity") as string
    const stockQuantity = stockStr ? Number.parseInt(stockStr) : 0
    if (stockStr && (isNaN(stockQuantity) || stockQuantity < 0)) {
      toast({
        variant: "destructive",
        title: "❌ Stock inválido",
        description: "La cantidad en stock debe ser un número entero mayor o igual a 0",
      })
      setLoading(false)
      return
    }

    // Validación: Stock mínimo debe ser válido
    const minStockStr = formData.get("min_stock") as string
    const minStock = minStockStr ? Number.parseInt(minStockStr) : 0
    if (minStockStr && (isNaN(minStock) || minStock < 0)) {
      toast({
        variant: "destructive",
        title: "❌ Stock mínimo inválido",
        description: "El stock mínimo debe ser un número entero mayor o igual a 0",
      })
      setLoading(false)
      return
    }

    // Obtener valores de retornables
    const returnableDepositStr = formData.get("returnable_deposit") as string
    const returnableDeposit = returnableDepositStr ? Number.parseFloat(returnableDepositStr) : 0

    const productData = {
      name: name.trim(),
      description: formData.get("description") as string,
      product_code: formData.get("product_code") as string,
      unit_price: unitPrice,
      cost_price: costPrice,
      unit: formData.get("unit") as string,
      category: formData.get("category") as string,
      category_id: selectedCategoryId || null,
      brand: formData.get("brand") as string,
      sku: formData.get("sku") as string,
      stock_quantity: stockQuantity,
      min_stock: minStock,
      reorder_point: minStock,
      is_returnable: isReturnable,
      returnable_deposit: isReturnable ? returnableDeposit : 0,
    }

    try {
      if (!dataUserId) {
        toast({
          variant: "destructive",
          title: "❌ Sesión expirada",
          description: "Por favor, inicia sesión nuevamente",
        })
        setLoading(false)
        return
      }

      if (product) {
        // Update existing product
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", product.id)
        
        if (error) {
          throw error
        }
        
        toast({
          title: "✅ Producto actualizado",
          description: `${productData.name} ha sido actualizado correctamente`,
        })
      } else {
        // Create new product (works both online and offline)
        let newProductId: string

        if (isOnline) {
          // Online: Direct insert
          const { data: newProduct, error } = await supabase
            .from("products")
            .insert({
              ...productData,
              user_id: dataUserId,
              current_stock: productData.stock_quantity,
            })
            .select()
            .single()

          if (error) {
            throw error
          }
          
          newProductId = newProduct.id

          toast({
            title: "✅ Producto creado exitosamente",
            description: `${productData.name} ha sido agregado al catálogo`,
          })
        } else {
          // Offline: Create temp ID and queue for sync
          newProductId = `temp_product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          
          const tempProduct = {
            ...productData,
            id: newProductId,
            user_id: dataUserId,
            current_stock: productData.stock_quantity,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          
          // Save to cache for immediate use
          await offlineCache.set('products', newProductId, tempProduct, 'VERY_LONG')
          
          // Add to sync queue
          syncQueue.add({
            type: 'create',
            entity: 'product',
            data: {
              ...productData,
              user_id: dataUserId,
              current_stock: productData.stock_quantity,
            },
            userId: dataUserId,
            tempId: newProductId
          })

          toast({
            title: "📦 Producto guardado offline",
            description: `${productData.name} se sincronizará cuando vuelva la conexión`,
          })
        }

        // Create stock movement for initial stock if quantity > 0 (only when online)
        if (isOnline && newProductId && productData.stock_quantity > 0) {
          // Get or create default warehouse
          let warehouse: any = null
          const { data: warehouseData, error: warehouseError } = await supabase
            .from("warehouses")
            .select("*")
            .eq("user_id", dataUserId)
            .eq("is_default", true)
            .single()

          if (warehouseError && warehouseError.code === 'PGRST116') {
            // Create default warehouse if it doesn't exist
            const { data: newWarehouse, error: createWarehouseError } = await supabase
              .from("warehouses")
              .insert({
                user_id: dataUserId,
                name: 'Almacén Principal',
                description: 'Almacén principal del sistema',
                location: 'Principal',
                is_default: true,
                is_active: true
              })
              .select()
              .single()

            if (createWarehouseError) {
              console.warn('Error creating default warehouse:', createWarehouseError)
            } else {
              warehouse = newWarehouse
            }
          } else {
            warehouse = warehouseData
          }

          if (warehouse) {
            // Create warehouse stock entry
            await supabase
              .from("product_warehouse_stock")
              .insert({
                product_id: newProductId,
                warehouse_id: warehouse.id,
                current_stock: productData.stock_quantity,
                available_stock: productData.stock_quantity
              })

            // Create initial stock movement
            await supabase
              .from("stock_movements")
              .insert({
                user_id: dataUserId,
                product_id: newProductId,
                warehouse_id: warehouse.id,
                movement_type: 'entrada',
                quantity_change: productData.stock_quantity,
                quantity_before: 0,
                quantity_after: productData.stock_quantity,
                unit_cost: productData.cost_price,
                total_cost: productData.cost_price * productData.stock_quantity,
                notes: 'Stock inicial del producto'
              })
          }
        }
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push("/products")
      }
    } catch (error: any) {
      // Improve error messages for user
      let userFriendlyMessage = error.message
      
      if (error.message?.includes('products_user_id_fkey') || error.message?.includes('foreign key constraint')) {
        userFriendlyMessage = "Error de permisos. Por favor, cierre sesión y vuelva a iniciar sesión."
      } else if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        userFriendlyMessage = "Ya existe un producto con este nombre o código"
      } else if (error.message?.includes('not null')) {
        userFriendlyMessage = "Por favor, complete todos los campos requeridos"
      } else if (error.message?.includes('permission denied')) {
        userFriendlyMessage = "No tiene permisos para realizar esta acción."
      } else if (error.message === "Usuario no autenticado") {
        userFriendlyMessage = "Su sesión ha expirado. Por favor, inicie sesión nuevamente."
      }
      
      setError(userFriendlyMessage)
      toast({
        variant: "destructive",
        title: "Error al guardar producto",
        description: userFriendlyMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  const renderFormContent = () => (
    <>
      {/* Connection Status Indicator */}
      {!isOnline && (
        <Alert className="mb-4 bg-orange-900/30 border-orange-800">
          <WifiOff className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-300">
            Sin conexión. El producto se guardará localmente y se sincronizará automáticamente cuando vuelva la conexión.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Información Básica</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Producto *</Label>
            <Input 
              id="name" 
              name="name" 
              defaultValue={product?.name} 
              placeholder="Nombre del producto" 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product_code">Código del Producto</Label>
            <Input 
              id="product_code" 
              name="product_code" 
              defaultValue={product?.product_code} 
              placeholder="Se generará automáticamente si se deja vacío" 
            />
            <p className="text-xs text-slate-400">
              Si no especifica un código, se generará automáticamente (ej: PROD0001)
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <CategorySelector
              value={selectedCategoryId}
              onValueChange={setSelectedCategoryId}
              type="product"
              placeholder="Seleccionar categoría"
            />
            {/* Hidden input for backward compatibility */}
            <input type="hidden" name="category" value={selectedCategoryId} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={product?.description}
            placeholder="Descripción del producto"
            rows={3}
          />
        </div>
      </div>

      {/* Pricing and Units */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Precio y Unidades</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="unit_price">Precio de Venta *</Label>
            <Input
              id="unit_price"
              name="unit_price"
              type="number"
              step="0.01"
              defaultValue={product?.unit_price}
              placeholder="0.00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cost_price">Precio de Costo</Label>
            <Input
              id="cost_price"
              name="cost_price"
              type="number"
              step="0.01"
              defaultValue={product?.cost_price}
              placeholder="0.00"
            />
            <p className="text-xs text-slate-400">Si no se especifica, se usará el precio de venta</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="unit">Unidad de Medida</Label>
            <Input
              id="unit"
              name="unit"
              defaultValue={product?.unit || "unidad"}
              placeholder="unidad"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand">Marca</Label>
            <Input
              id="brand"
              name="brand"
              defaultValue={product?.brand}
              placeholder="Marca del producto"
            />
          </div>
        </div>
      </div>

      {/* Inventory */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Inventario</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sku">Código SKU</Label>
            <Input
              id="sku"
              name="sku"
              defaultValue={product?.sku}
              placeholder="Código único del producto"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock_quantity">Stock Inicial</Label>
            <Input
              id="stock_quantity"
              name="stock_quantity"
              type="number"
              min="0"
              defaultValue={product?.stock_quantity || 0}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="min_stock">Stock Mínimo</Label>
            <Input
              id="min_stock"
              name="min_stock"
              type="number"
              min="0"
              defaultValue={product?.min_stock || 0}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Materiales Retornables */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-500" />
          Material Retornable
        </h3>
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="is_returnable"
              checked={isReturnable}
              onCheckedChange={(checked) => setIsReturnable(checked === true)}
            />
            <div className="space-y-1">
              <Label htmlFor="is_returnable" className="text-sm font-medium cursor-pointer">
                Este producto incluye envase/material retornable
              </Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Activa esta opción si el producto viene con un envase que el cliente debe devolver
                (ej: botellones, pallets, cilindros, cajas).
              </p>
            </div>
          </div>
          
          {isReturnable && (
            <div className="mt-4 ml-7 space-y-2">
              <Label htmlFor="returnable_deposit">Valor del Depósito (opcional)</Label>
              <Input
                id="returnable_deposit"
                name="returnable_deposit"
                type="number"
                step="0.01"
                min="0"
                defaultValue={product?.returnable_deposit || 0}
                placeholder="0.00"
                className="max-w-xs"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Monto que se cobra como depósito por el envase (si aplica).
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => inModal ? onSuccess?.() : router.push("/products")}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {product ? "Actualizar" : "Crear"} Producto
        </Button>
      </div>
    </>
  )

  return (
    <>
      {error && (
        <Alert className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {inModal ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {renderFormContent()}
        </form>
      ) : (
        <Card className="w-full">
          <CardHeader className="p-4">
            <CardTitle>{product ? "Editar Producto" : "Nuevo Producto"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {renderFormContent()}
            </form>
          </CardContent>
        </Card>
      )}
    </>
  )
}