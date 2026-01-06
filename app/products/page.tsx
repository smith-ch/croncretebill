"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { ProductForm } from "@/components/forms/product-form"
import { CategoryFilter } from "@/components/ui/category-filter"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Plus, Search, Package, Edit, Trash2, Calculator, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useCurrency } from "@/hooks/use-currency"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import { useCategories } from "@/hooks/use-categories"
import { useToast } from "@/hooks/use-toast"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { offlineCache } from "@/lib/offline-cache"
import { useDataUserId } from "@/hooks/use-data-user-id"
import { useSubscriptionLimits } from "@/hooks/use-subscription-limits"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Product {
  id: string
  name: string
  description?: string
  product_code?: string
  unit_price: number
  cost_price?: number
  unit: string
  mix_type?: string
  resistance?: string
  slump?: string
  stock_quantity?: number
  category_id?: string
  categories?: {
    name: string
  }
  created_at: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, id: string | null}>({show: false, id: null})
  const [isDeleting, setIsDeleting] = useState(false)
  const { formatCurrency } = useCurrency()
  const { canDelete, canEdit, permissions } = useUserPermissions()
  const { toast } = useToast()
  const { dataUserId, loading: userIdLoading } = useDataUserId()
  const { limits, canAddProducts, remainingProducts, refreshUsage } = useSubscriptionLimits()
  // const { categories } = useCategories('product')

  useEffect(() => {
    if (!userIdLoading && dataUserId) {
      fetchProducts()
    }
  }, [dataUserId, userIdLoading])

  const fetchProducts = async () => {
    try {
      if (!dataUserId) return

      try {
        // Intentar cargar desde el servidor
        const { data, error } = await supabase
          .from("products")
          .select(`
            *,
            categories!products_category_id_fkey (
              name,
              color
            )
          `)
          .eq("user_id", dataUserId)
          .order("created_at", { ascending: false })

        if (error) throw error
        
        // Guardar en cache para uso offline
        if (data) {
          for (const product of data) {
            await offlineCache.set('products', dataUserId, product, 'VERY_LONG')
          }
        }
        
        setProducts(data || [])
        refreshUsage()
      } catch (error) {
        // Si falla (sin internet o error), cargar desde cache
        console.log("📦 Loading products from cache (offline mode)")
        const cachedProducts = await offlineCache.getAll('products', dataUserId)
        setProducts(cachedProducts)
        
        if (cachedProducts.length === 0) {
          toast({
            title: "📦 Modo offline",
            description: "No hay productos en cache. Los productos se cargarán cuando vuelva la conexión.",
            variant: "default"
          })
        }
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!canDelete('products')) {
      toast({
        title: "Permiso denegado",
        description: "No tienes permisos para eliminar productos",
        variant: "destructive"
      })
      return
    }
    
    setDeleteConfirm({show: true, id})
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return

    setIsDeleting(true)
    try {
      const { error } = await supabase.from("products").delete().eq("id", deleteConfirm.id)
      if (error) throw error
      
      toast({
        title: "Producto eliminado",
        description: "El producto ha sido eliminado exitosamente"
      })
      fetchProducts()
    } catch (error) {
      console.error("Error deleting product:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
      setDeleteConfirm({show: false, id: null})
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.product_code?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategoryId === null || product.category_id === selectedCategoryId
    
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header skeleton */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="space-y-2">
              <div className="h-10 w-64 bg-gray-200 rounded-lg skeleton"></div>
              <div className="h-4 w-80 bg-gray-200 rounded skeleton"></div>
            </div>
            <div className="flex gap-2 w-full lg:w-auto">
              <div className="h-10 flex-1 lg:w-40 bg-gray-200 rounded-lg skeleton"></div>
              <div className="h-10 flex-1 lg:w-40 bg-gray-200 rounded-lg skeleton"></div>
              <div className="h-10 flex-1 lg:w-40 bg-gray-200 rounded-lg skeleton"></div>
            </div>
          </div>

          {/* Search and filter skeleton */}
          <Card className="border-0 shadow-lg skeleton">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="h-10 flex-1 bg-gray-200 rounded"></div>
                <div className="h-10 w-full lg:w-48 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>

          {/* Product cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border-0 shadow-lg skeleton animate-scale-in" style={{animationDelay: `${i * 0.1}s`}}>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="h-6 w-40 bg-gray-200 rounded"></div>
                      <div className="flex gap-2">
                        <div className="h-9 w-9 bg-gray-200 rounded"></div>
                        <div className="h-9 w-9 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                    <div className="h-4 w-24 bg-gray-200 rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-gray-200 rounded"></div>
                      <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                    </div>
                    <div className="h-8 w-32 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
        <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0 gap-4 lg:gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-slate-800 bg-clip-text text-transparent">
              Catálogo de Productos
            </h1>
            <p className="text-sm lg:text-base text-slate-600">Gestiona tu catálogo de productos y presupuestos</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 lg:gap-3 w-full sm:w-auto">
            <Link href="/products/budgets" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 border-emerald-300 text-emerald-700 hover:text-emerald-800 shadow-md hover:shadow-lg transition-all duration-300"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Presupuestos
              </Button>
            </Link>
            <Link href="/products/multiple-prices-demo" className="w-full sm:w-auto">
              <Button
                variant="outline" 
                className="w-full sm:w-auto bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-purple-300 text-purple-700 hover:text-purple-800 shadow-md hover:shadow-lg transition-all duration-300"
              >
                <Package className="h-4 w-4 mr-2" />
                Precios Múltiples
              </Button>
            </Link>
            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogTrigger asChild>
                <Button 
                  onClick={(e) => {
                    if (!canAddProducts()) {
                      e.preventDefault()
                      toast({
                        title: "Límite alcanzado",
                        description: `Has alcanzado el límite de ${limits.maxProducts} productos de tu ${limits.planDisplayName}. Actualiza tu plan para continuar.`,
                        variant: "destructive",
                      })
                    }
                  }}
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300"
                  disabled={!permissions.canManageInventory}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {canAddProducts() ? "Nuevo Producto" : "Límite Alcanzado"}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-full max-w-[95vw] sm:max-w-lg md:max-w-2xl overflow-y-auto max-h-[90vh] p-0">
                <div className="p-6 [&_.card]:border-0 [&_.card]:shadow-none [&_.card]:bg-transparent">
                  <ProductForm
                    product={editingProduct}
                    onSuccess={() => {
                      setShowForm(false)
                      setEditingProduct(null)
                      fetchProducts()
                    }}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!limits.isLoading && remainingProducts <= 5 && (
          <Alert className={remainingProducts === 0 ? "border-red-500 bg-red-50" : "border-amber-500 bg-amber-50"}>
            <AlertCircle className={remainingProducts === 0 ? "h-4 w-4 text-red-600" : "h-4 w-4 text-amber-600"} />
            <AlertDescription className={remainingProducts === 0 ? "text-red-800" : "text-amber-800"}>
              {remainingProducts === 0 ? (
                <span>
                  <strong>Límite alcanzado:</strong> Has usado todos los {limits.maxProducts} productos de tu {limits.planDisplayName}. 
                  <Link href="/subscriptions/my-subscription" className="underline font-semibold ml-1">Actualiza tu plan</Link>
                </span>
              ) : (
                <span>
                  <strong>Atención:</strong> Te quedan solo {remainingProducts} producto(s) de {limits.maxProducts} en tu {limits.planDisplayName}. 
                  <Link href="/subscriptions/my-subscription" className="underline font-semibold ml-1">Ver planes</Link>
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70 h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre, código o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/70 focus:bg-white/30"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-6">
              <CategoryFilter
                selectedCategoryId={selectedCategoryId}
                onCategoryChange={setSelectedCategoryId}
                type="product"
              />
            </div>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Package className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No hay productos</h3>
                <p className="text-slate-600 mb-4">Comienza agregando tu primer producto</p>
                <Button
                  onClick={() => {
                    if (canAddProducts()) {
                      setShowForm(true)
                    } else {
                      toast({
                        title: "Límite alcanzado",
                        description: `Has alcanzado el límite de ${limits.maxProducts} productos de tu ${limits.planDisplayName}. Actualiza tu plan para continuar.`,
                        variant: "destructive",
                      })
                    }
                  }}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                  disabled={!permissions.canManageInventory}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {canAddProducts() ? "Nuevo Producto" : "Límite Alcanzado"}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product, index) => (
                  <Card
                    key={product.id}
                    className="group card-hover transition-all duration-300 bg-white border-0 shadow-lg hover:bg-gradient-to-br hover:from-blue-50 hover:to-slate-50 animate-scale-in"
                    style={{animationDelay: `${index * 0.05}s`}}
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 group-hover:text-blue-900 transition-colors truncate">
                            {product.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">                            {product.id.startsWith('temp_') && (
                              <Badge variant="outline" className="text-xs border-orange-400 text-orange-600 bg-orange-50">
                                ⏳ Pendiente
                              </Badge>
                            )}                            {product.product_code && (
                              <Badge variant="secondary" className="text-xs font-mono bg-blue-100 text-blue-700">
                                {product.product_code}
                              </Badge>
                            )}
                            {product.categories?.name && (
                              <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">
                                {product.categories.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingProduct(product)
                              setShowForm(true)
                            }}
                            className="hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-all duration-200 hover:scale-110 active:scale-95 tap-target"
                            aria-label={`Editar producto ${product.name}`}
                            title="Editar producto"
                            disabled={!canEdit('products')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {canDelete('products') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(product.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 hover:scale-110 active:scale-95 tap-target"
                              aria-label={`Eliminar producto ${product.name}`}
                              title="Eliminar producto"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {product.description && (
                        <p className="text-sm text-slate-600 mb-3 line-clamp-2">{product.description}</p>
                      )}

                      <div className="space-y-3">
                        {/* Precios */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                            <div className="text-xs text-blue-700 font-semibold mb-1">Precio Venta</div>
                            <div className="font-bold text-blue-800 text-lg">
                              {formatCurrency(product.unit_price)}
                            </div>
                            <div className="text-xs text-blue-600">por {product.unit}</div>
                          </div>
                          {product.cost_price ? (
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200">
                              <div className="text-xs text-slate-700 font-semibold mb-1">Costo</div>
                              <div className="font-bold text-slate-800 text-sm">
                                {formatCurrency(product.cost_price)}
                              </div>
                              {product.cost_price > 0 && (
                                <div className="text-xs text-green-600 font-medium">
                                  {(((product.unit_price - product.cost_price) / product.cost_price) * 100).toFixed(0)}% ganancia
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200 flex items-center justify-center">
                              <div className="text-center">
                                <Calculator className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                                <div className="text-xs text-gray-500">Sin costo definido</div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Stock */}
                        {((product.current_stock !== undefined && product.current_stock !== null) || 
                          (product.stock_quantity !== undefined && product.stock_quantity !== null)) && (
                          <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-semibold text-gray-700">Stock Disponible:</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {(() => {
                                const stock = product.current_stock ?? product.stock_quantity ?? 0
                                return (
                                  <>
                                    <span className={`font-bold text-sm ${
                                      stock > 10 ? 'text-green-600' : 
                                      stock > 0 ? 'text-amber-600' : 
                                      'text-red-600'
                                    }`}>
                                      {stock} {product.unit}
                                    </span>
                                    {stock <= 5 && stock > 0 && (
                                      <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 bg-amber-50">
                                        Bajo
                                      </Badge>
                                    )}
                                    {stock === 0 && (
                                      <Badge variant="outline" className="text-xs border-red-400 text-red-700 bg-red-50">
                                        Agotado
                                      </Badge>
                                    )}
                                  </>
                                )
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Información técnica */}
                        {(product.mix_type || product.resistance || product.slump) && (
                          <div className="flex gap-2 flex-wrap">
                            {product.mix_type && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 text-xs">
                                🏗️ {product.mix_type}
                              </Badge>
                            )}
                            {product.resistance && (
                              <Badge variant="outline" className="border-orange-300 text-orange-700 text-xs">
                                💪 {product.resistance}
                              </Badge>
                            )}
                            {product.slump && (
                              <Badge variant="outline" className="border-purple-300 text-purple-700 text-xs">
                                📏 {product.slump}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteConfirm.show}
        onOpenChange={(isOpen) => setDeleteConfirm({show: isOpen, id: null})}
        title="Eliminar Producto"
        description="¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
