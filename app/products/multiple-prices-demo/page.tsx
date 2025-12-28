"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Package, ArrowLeft, Search, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { useCurrency } from '@/hooks/use-currency'
import { ProductPricesManager } from '@/components/products/product-prices-manager'

interface Product {
  id: string
  name: string
  product_code?: string
  unit_price: number
  unit: string
  description?: string
}

export default function MultiplePricesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const { formatCurrency } = useCurrency()

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) {
        return
      }

      const { data, error } = await supabase
        .from("products")
        .select("id, name, product_code, unit_price, unit, description")
        .eq("user_id", user.id)
        .order("name")

      if (error) {
        throw error
      }
      setProducts(data || [])
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.product_code?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0">
          <div className="space-y-2">
            <Link href="/products">
              <Button variant="ghost" className="mb-4 hover:bg-blue-50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a Productos
              </Button>
            </Link>
            <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-slate-800 bg-clip-text text-transparent">
              Gestión de Precios Múltiples
            </h1>
            <p className="text-sm lg:text-base text-slate-600">
              Busca productos y gestiona sus precios múltiples
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Panel de búsqueda y selección */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Buscar Producto
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label htmlFor="search">Buscar por nombre o código</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Buscar producto por código o nombre..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="text-center py-8 text-slate-500">Cargando productos...</div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      {searchTerm ? "No se encontraron productos" : "No hay productos disponibles"}
                    </div>
                  ) : (
                    filteredProducts.map(product => (
                      <div
                        key={product.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedProduct?.id === product.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
                        }`}
                        onClick={() => setSelectedProduct(product)}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {product.product_code && (
                              <Badge variant="outline" className="text-xs">
                                {product.product_code}
                              </Badge>
                            )}
                            <span className="font-medium">{product.name}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            Precio base: {formatCurrency(product.unit_price)} / {product.unit}
                          </div>
                          {product.description && (
                            <div className="text-xs text-gray-500 truncate">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panel de gestión de precios */}
          <div className="lg:col-span-3">
            {selectedProduct ? (
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Precios de: {selectedProduct.name}
                    {selectedProduct.product_code && (
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                        {selectedProduct.product_code}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ProductPricesManager
                    productId={selectedProduct.id}
                    productName={selectedProduct.name}
                    onPriceChange={() => {
                      // Opcional: actualizar el precio base en la lista si es necesario
                      fetchProducts()
                    }}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-lg bg-white">
                <CardContent className="p-12 text-center">
                  <div className="space-y-4">
                    <Package className="w-16 h-16 mx-auto text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900">
                      Selecciona un producto
                    </h3>
                    <p className="text-gray-500">
                      Busca y selecciona un producto de la lista para gestionar sus precios múltiples
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}