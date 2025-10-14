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

import { Loader2 } from "lucide-react"

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const productData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      product_code: formData.get("product_code") as string,
      unit_price: Number.parseFloat(formData.get("unit_price") as string),
      cost_price: Number.parseFloat(formData.get("cost_price") as string) || Number.parseFloat(formData.get("unit_price") as string),
      unit: formData.get("unit") as string,
      category: formData.get("category") as string, // Mantener compatibilidad hacia atrás
      category_id: selectedCategoryId || null,
      brand: formData.get("brand") as string,
      sku: formData.get("sku") as string,
      stock_quantity: Number.parseInt(formData.get("stock_quantity") as string) || 0,
      min_stock: Number.parseInt(formData.get("min_stock") as string) || 0,
      reorder_point: Number.parseInt(formData.get("min_stock") as string) || 0,
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error("Usuario no autenticado")
      }

      // Verificar que el usuario tiene un ID válido
      if (!user.id || user.id.length === 0) {
        throw new Error("ID de usuario inválido")
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
      } else {
        // Create new product
        const { data: newProduct, error } = await supabase
          .from("products")
          .insert({
            ...productData,
            user_id: user.id,
            current_stock: productData.stock_quantity,
          })
          .select()
          .single()

        if (error) {
          throw error
        }

        // Create stock movement for initial stock if quantity > 0
        if (newProduct && productData.stock_quantity > 0) {
          // Get or create default warehouse
          let { data: warehouse, error: warehouseError } = await supabase
            .from("warehouses")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_default", true)
            .single()

          if (warehouseError && warehouseError.code === 'PGRST116') {
            // Create default warehouse if it doesn't exist
            const { data: newWarehouse, error: createWarehouseError } = await supabase
              .from("warehouses")
              .insert({
                user_id: user.id,
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
          }

          if (warehouse) {
            // Create warehouse stock entry
            await supabase
              .from("product_warehouse_stock")
              .insert({
                product_id: newProduct.id,
                warehouse_id: warehouse.id,
                current_stock: productData.stock_quantity,
                available_stock: productData.stock_quantity
              })

            // Create initial stock movement
            await supabase
              .from("stock_movements")
              .insert({
                user_id: user.id,
                product_id: newProduct.id,
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
    } finally {
      setLoading(false)
    }
  }

  const renderFormContent = () => (
    <>
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
            <p className="text-xs text-gray-500">
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
            <p className="text-xs text-gray-500">Si no se especifica, se usará el precio de venta</p>
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