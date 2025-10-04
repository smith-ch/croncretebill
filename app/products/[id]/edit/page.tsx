"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import Link from "next/link"

interface Product {
  id: string
  name: string
  description?: string
  unit_price: number
  unit: string
  category?: string
  brand?: string
  sku?: string
  barcode?: string
  stock_quantity?: number
  min_stock?: number
  reorder_point?: number
  user_id: string
  created_at: string
  updated_at: string
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    unit_price: "",
    unit: "",
    category: "",
    brand: "",
    sku: "",
    barcode: "",
    stock_quantity: "",
    min_stock: "",
    reorder_point: ""
  })

  const fetchProduct = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("user_id", user.id)
        .single()

      if (error) {
        console.error("Error fetching product:", error)
        setError("Error al cargar el producto")
        return
      }

      if (!data) {
        setError("Producto no encontrado")
        return
      }

      setProduct(data)
      setFormData({
        name: data.name || "",
        description: data.description || "",
        unit_price: data.unit_price?.toString() || "",
        unit: data.unit || "",
        category: data.category || "",
        brand: data.brand || "",
        sku: data.sku || "",
        barcode: data.barcode || "",
        stock_quantity: data.stock_quantity?.toString() || "",
        min_stock: data.min_stock?.toString() || "",
        reorder_point: data.reorder_point?.toString() || ""
      })
    } catch (error) {
      console.error("Error:", error)
      setError("Error al cargar el producto")
    } finally {
      setLoading(false)
    }
  }, [productId, router])

  useEffect(() => {
    fetchProduct()
  }, [fetchProduct])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("Usuario no autenticado")
      }

      const stockQuantity = parseInt(formData.stock_quantity) || 0;
      
      const updateData = {
        name: formData.name,
        description: formData.description || null,
        unit_price: parseFloat(formData.unit_price) || 0,
        unit: formData.unit,
        category: formData.category || null,
        brand: formData.brand || null,
        sku: formData.sku || null,
        barcode: formData.barcode || null,
        stock_quantity: stockQuantity,
        current_stock: stockQuantity, // Sincronizar current_stock con stock_quantity
        min_stock: parseInt(formData.min_stock) || 0,
        reorder_point: parseInt(formData.reorder_point) || 0,
        updated_at: new Date().toISOString()
      }

      // Actualizar productos
      const { error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", productId)
        .eq("user_id", user.id)

      if (error) {
        throw error
      }

      // Sincronizar con product_warehouse_stock
      const { error: warehouseError } = await supabase
        .from("product_warehouse_stock")
        .update({ 
          current_stock: stockQuantity,
          updated_at: new Date().toISOString()
        })
        .eq("product_id", productId)

      // Si no existe warehouse stock, crearlo
      if (warehouseError?.code === 'PGRST116') {
        // Buscar almacén principal
        const { data: warehouse } = await supabase
          .from("warehouses")
          .select("id")
          .eq("is_active", true)
          .limit(1)
          .single()

        if (warehouse) {
          await supabase
            .from("product_warehouse_stock")
            .insert({
              product_id: productId,
              warehouse_id: warehouse.id,
              current_stock: stockQuantity,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
        }
      }

      setSuccess(true)
      setTimeout(() => {
        router.push("/products")
      }, 2000)
    } catch (error) {
      console.error("Error updating product:", error)
      setError("Error al actualizar el producto")
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (error && !product) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button asChild className="mt-4">
          <Link href="/products">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Productos
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" asChild>
            <Link href="/products">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Editar Producto</h1>
            <p className="text-gray-600">Modifica la información del producto</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>
            Producto actualizado exitosamente. Redirigiendo...
          </AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Producto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre del Producto *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required
                    placeholder="Nombre del producto"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Descripción del producto"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => handleInputChange("category", e.target.value)}
                    placeholder="Categoría del producto"
                  />
                </div>

                <div>
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => handleInputChange("brand", e.target.value)}
                    placeholder="Marca del producto"
                  />
                </div>
              </div>

              {/* Pricing and Units */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="unit_price">Precio Unitario *</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unit_price}
                    onChange={(e) => handleInputChange("unit_price", e.target.value)}
                    required
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="unit">Unidad de Medida *</Label>
                  <Select value={formData.unit} onValueChange={(value) => handleInputChange("unit", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar unidad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unidad">Unidad</SelectItem>
                      <SelectItem value="kg">Kilogramo</SelectItem>
                      <SelectItem value="g">Gramo</SelectItem>
                      <SelectItem value="l">Litro</SelectItem>
                      <SelectItem value="ml">Mililitro</SelectItem>
                      <SelectItem value="m">Metro</SelectItem>
                      <SelectItem value="cm">Centímetro</SelectItem>
                      <SelectItem value="m2">Metro cuadrado</SelectItem>
                      <SelectItem value="m3">Metro cúbico</SelectItem>
                      <SelectItem value="caja">Caja</SelectItem>
                      <SelectItem value="bolsa">Bolsa</SelectItem>
                      <SelectItem value="paquete">Paquete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => handleInputChange("sku", e.target.value)}
                    placeholder="Código SKU"
                  />
                </div>

                <div>
                  <Label htmlFor="barcode">Código de Barras</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => handleInputChange("barcode", e.target.value)}
                    placeholder="Código de barras"
                  />
                </div>
              </div>
            </div>

            {/* Inventory Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Información de Inventario</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="stock_quantity">Cantidad en Stock</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => handleInputChange("stock_quantity", e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="min_stock">Stock Mínimo</Label>
                  <Input
                    id="min_stock"
                    type="number"
                    min="0"
                    value={formData.min_stock}
                    onChange={(e) => handleInputChange("min_stock", e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="reorder_point">Punto de Reorden</Label>
                  <Input
                    id="reorder_point"
                    type="number"
                    min="0"
                    value={formData.reorder_point}
                    onChange={(e) => handleInputChange("reorder_point", e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6">
              <Button type="button" variant="outline" asChild>
                <Link href="/products">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}