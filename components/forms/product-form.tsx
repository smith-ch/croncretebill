"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, Plus } from "lucide-react"

interface ProductFormProps {
  product?: any
  onSuccess?: () => void
}

export function ProductForm({ product, onSuccess, inModal = false }: ProductFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([
    "Materiales",
    "Herramientas", 
    "Equipos",
    "Servicios",
    "Otros"
  ])
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [savingCategory, setSavingCategory] = useState(false)

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    
    setSavingCategory(true)
    try {
      // Agregar la nueva categoría a la lista
      const newCategory = newCategoryName.trim()
      if (!categories.includes(newCategory)) {
        setCategories(prev => [...prev, newCategory])
      }
      
      setNewCategoryName("")
      setShowNewCategoryDialog(false)
    } catch (error) {
      console.error("Error al agregar categoría:", error)
    } finally {
      setSavingCategory(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const productData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      unit_price: Number.parseFloat(formData.get("unit_price") as string),
      cost_price: Number.parseFloat(formData.get("cost_price") as string) || Number.parseFloat(formData.get("unit_price") as string),
      unit: formData.get("unit") as string,
      category: formData.get("category") as string,
      brand: formData.get("brand") as string,
      sku: formData.get("sku") as string,
      stock_quantity: Number.parseInt(formData.get("stock_quantity") as string) || 0,
      min_stock: Number.parseInt(formData.get("min_stock") as string) || 0,
      reorder_point: Number.parseInt(formData.get("min_stock") as string) || 0,
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error("Usuario no autenticado")
      }

      // Verificar que el usuario tiene un ID válido
      if (!user.id || user.id.length === 0) {
        throw new Error("ID de usuario inválido")
      }

      if (product) {
        // Update existing product
        const { error } = await supabase.from("products").update(productData).eq("id", product.id)
        if (error) {
          throw error
        }
      } else {
        // Create new product
        const { data: newProduct, error } = await supabase.from("products").insert({
          ...productData,
          current_stock: productData.stock_quantity, // Sincronizar current_stock
          available_stock: productData.stock_quantity, // También available_stock
          user_id: user.id,
        }).select().single()
        
        if (error) {
          throw error
        }

        // Crear warehouse stock para el nuevo producto
        if (newProduct && productData.stock_quantity > 0) {
          // Buscar almacén principal
          const { data: warehouse } = await supabase
            .from("warehouses")
            .select("id")
            .eq("is_active", true)
            .limit(1)
            .single()

          if (warehouse) {
            // Intentar crear warehouse stock, pero no fallar si ya existe
            const { error: warehouseError } = await supabase
              .from("product_warehouse_stock")
              .insert({
                product_id: newProduct.id,
                warehouse_id: warehouse.id,
                current_stock: productData.stock_quantity,
                available_stock: productData.stock_quantity,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })

            // Si ya existe el registro, actualizarlo en su lugar
            if (warehouseError?.code === '23505') {
              await supabase
                .from("product_warehouse_stock")
                .update({
                  current_stock: productData.stock_quantity,
                  available_stock: productData.stock_quantity,
                  updated_at: new Date().toISOString()
                })
                .eq("product_id", newProduct.id)
                .eq("warehouse_id", warehouse.id)
            }

            // Crear movimiento inicial de stock si hay cantidad
            if (productData.stock_quantity > 0) {
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
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push("/products")
      }
    } catch (error: any) {
      // Mejorar mensajes de error para el usuario
      let userFriendlyMessage = error.message
      
      if (error.message?.includes('products_user_id_fkey') || error.message?.includes('foreign key constraint')) {
        userFriendlyMessage = "Error de permisos. Por favor, cierre sesión y vuelva a iniciar sesión. Si el problema persiste, contacte al administrador."
      } else if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        userFriendlyMessage = "Ya existe un producto con este nombre o código"
      } else if (error.message?.includes('not null')) {
        userFriendlyMessage = "Por favor, complete todos los campos requeridos"
      } else if (error.message?.includes('permission denied') || error.message?.includes('insufficient_privilege')) {
        userFriendlyMessage = "No tiene permisos para realizar esta acción. Verifique que su cuenta esté correctamente configurada."
      } else if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        userFriendlyMessage = "La base de datos no está configurada correctamente. Contacte al administrador."
      } else if (error.message === "Usuario no autenticado") {
        userFriendlyMessage = "Su sesión ha expirado. Por favor, inicie sesión nuevamente."
      } else if (error.message?.includes('check constraint')) {
        userFriendlyMessage = "Los datos ingresados no cumplen con los requisitos. Verifique que los precios y cantidades sean válidos."
      }
      
      setError(userFriendlyMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {inModal ? (
        // Versión para modal sin Card externo
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {product ? "Editar Producto" : "Nuevo Producto"}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* El resto del contenido del formulario se mantiene igual */}
            {renderFormContent()}
          </form>
        </div>
      ) : (
        // Versión normal con Card
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

  function renderFormContent() {
    return (
      <>
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Información Básica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Producto *</Label>
                <Input id="name" name="name" defaultValue={product?.name} placeholder="Nombre del producto" required />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="category">Categoría</Label>
                  <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="h-6 px-2">
                        <Plus className="h-3 w-3 mr-1" />
                        Agregar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Agregar Nueva Categoría</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="new-category">Nombre de la categoría</Label>
                          <Input
                            id="new-category"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Ingrese el nombre de la categoría"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddCategory()
                              }
                            }}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowNewCategoryDialog(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            onClick={handleAddCategory}
                            disabled={!newCategoryName.trim() || savingCategory}
                          >
                            {savingCategory && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Agregar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <Select name="category" defaultValue={product?.category}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Select name="unit" defaultValue={product?.unit || "unidad"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unidad">Unidad</SelectItem>
                    <SelectItem value="kg">Kilogramo (kg)</SelectItem>
                    <SelectItem value="m">Metro (m)</SelectItem>
                    <SelectItem value="m²">Metro Cuadrado (m²)</SelectItem>
                    <SelectItem value="m³">Metro Cúbico (m³)</SelectItem>
                    <SelectItem value="lt">Litro</SelectItem>
                    <SelectItem value="gal">Galón</SelectItem>
                    <SelectItem value="caja">Caja</SelectItem>
                    <SelectItem value="paquete">Paquete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detalles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Marca</Label>
                <Input id="brand" name="brand" defaultValue={product?.brand} placeholder="Marca del producto" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU/Código</Label>
                <Input id="sku" name="sku" defaultValue={product?.sku} placeholder="Código del producto" />
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Inventario</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock_quantity">Cantidad Inicial en Stock</Label>
                <Input
                  id="stock_quantity"
                  name="stock_quantity"
                  type="number"
                  defaultValue={product?.stock_quantity || product?.current_stock || 0}
                  placeholder="0"
                />
                <p className="text-xs text-gray-500">Esta cantidad se agregará al inventario inicial</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_stock">Stock Mínimo (Punto de Reorden)</Label>
                <Input
                  id="min_stock"
                  name="min_stock"
                  type="number"
                  defaultValue={product?.min_stock || product?.reorder_point || 0}
                  placeholder="0"
                />
                <p className="text-xs text-gray-500">Alerta cuando el stock llegue a este nivel</p>
              </div>
            </div>
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {product ? "Actualizar" : "Crear"} Producto
            </Button>
            <Button type="button" variant="outline" onClick={() => inModal ? onSuccess() : router.back()}>
              Cancelar
            </Button>
          </div>
        </>
      )
    }
  }
