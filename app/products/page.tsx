"use client"

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { ProductForm } from "@/components/forms/product-form"
import { Plus, Search, Package, Edit, Trash2, Calculator } from "lucide-react"
import Link from "next/link"
import { useCurrency } from "@/hooks/use-currency"

interface Product {
  id: string
  name: string
  description?: string
  unit_price: number
  unit: string
  mix_type?: string
  resistance?: string
  created_at: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showForm, setShowForm] = useState(false)
  const { formatCurrency } = useCurrency()

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este producto?")) return

    try {
      const { error } = await supabase.from("products").delete().eq("id", id)
      if (error) throw error
      fetchProducts()
    } catch (error) {
      console.error("Error deleting product:", error)
    }
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-slate-800 bg-clip-text text-transparent">
              Catálogo de Productos
            </h1>
            <p className="text-slate-600">Gestiona tu catálogo de productos y presupuestos</p>
          </div>
          <div className="flex gap-3">
            <Link href="/products/budgets">
              <Button
                variant="outline"
                className="bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 border-emerald-300 text-emerald-700 hover:text-emerald-800 shadow-md hover:shadow-lg transition-all duration-300"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Presupuestos
              </Button>
            </Link>
            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Producto
                </Button>
              </DialogTrigger>
              <DialogContent className="w-full max-w-[95vw] sm:max-w-lg md:max-w-2xl p-4 overflow-y-auto max-h-[90vh]">
                <ProductForm
                  product={editingProduct}
                  onSuccess={() => {
                    setShowForm(false)
                    setEditingProduct(null)
                    fetchProducts()
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70 h-4 w-4" />
                <Input
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/70 focus:bg-white/30"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Package className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No hay productos</h3>
                <p className="text-slate-600 mb-4">Comienza agregando tu primer producto</p>
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Producto
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="group hover:shadow-xl transition-all duration-300 hover:scale-105 bg-white border-0 shadow-md hover:bg-gradient-to-br hover:from-blue-50 hover:to-slate-50"
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-semibold text-slate-900 group-hover:text-blue-900 transition-colors">
                          {product.name}
                        </h3>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingProduct(product)
                              setShowForm(true)
                            }}
                            className="hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors"
                            aria-label={`Editar producto ${product.name}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                            aria-label={`Eliminar producto ${product.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {product.description && <p className="text-sm text-slate-600 mb-4">{product.description}</p>}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-700">Precio:</span>
                          <span className="font-bold text-blue-600 text-lg">
                            {formatCurrency(product.unit_price)}/{product.unit}
                          </span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {product.mix_type && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                              {product.mix_type}
                            </Badge>
                          )}
                          {product.resistance && (
                            <Badge variant="outline" className="border-slate-300 text-slate-700">
                              {product.resistance}
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
      </div>
    </div>
  )
}
