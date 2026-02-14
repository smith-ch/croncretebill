"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProductPricesManager } from '@/components/products/product-prices-manager'
import { Package, Search, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCurrency } from '@/hooks/use-currency'

interface Product {
  id: string
  name: string
  unit_price: number
  description: string
  category: string
  brand: string
  sku: string
}

export default function MultiplePricesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const { formatCurrency } = useCurrency()

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    let filtered = products

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(product => product.category === categoryFilter)
    }

    setFilteredProducts(filtered)
  }, [products, searchTerm, categoryFilter])

  const loadProducts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) {
        return
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (error) {
        throw error
      }
      setProducts(data || [])
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Cargando productos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-200 dark:text-white">Gestión de Precios Múltiples</h1>
        <p className="text-slate-400 dark:text-gray-400 mt-2">
          Configura diferentes precios para tus productos según cantidad, fechas y clientes específicos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Productos */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Productos ({filteredProducts.length})
              </CardTitle>
              
              {/* Filtros */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      <SelectValue placeholder="Todas las categorías" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No se encontraron productos
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className={`p-4 border-b cursor-pointer hover:bg-slate-950 dark:hover:bg-gray-800 transition-colors ${
                        selectedProduct?.id === product.id ? 'bg-slate-900 dark:bg-blue-950 border-slate-700' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">{product.name}</h3>
                          <p className="text-xs text-gray-500 mt-1">{product.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {product.sku && (
                              <span className="text-xs bg-slate-800 px-2 py-1 rounded">
                                {product.sku}
                              </span>
                            )}
                            {product.category && (
                              <span className="text-xs bg-slate-800 text-blue-400 px-2 py-1 rounded">
                                {product.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-green-600">
                            {formatCurrency(product.unit_price)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gestión de Precios */}
        <div className="lg:col-span-2">
          {selectedProduct ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  Precios para: {selectedProduct.name}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <span>Precio base: {formatCurrency(selectedProduct.unit_price)}</span>
                  {selectedProduct.sku && <span>SKU: {selectedProduct.sku}</span>}
                  {selectedProduct.category && <span>Categoría: {selectedProduct.category}</span>}
                </div>
              </CardHeader>
              <CardContent>
                <ProductPricesManager
                  productId={selectedProduct.id}
                  productName={selectedProduct.name}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-slate-400 mb-2">
                  Selecciona un producto
                </h3>
                <p className="text-gray-500">
                  Elige un producto de la lista para gestionar sus precios múltiples
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}