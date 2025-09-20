"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Warehouse, 
  DollarSign,
  Activity,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Download,
  Settings,
  Edit
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useCurrency } from "@/hooks/use-currency"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import { WarehouseTransfer } from "@/components/inventory/warehouse-transfer"

// Types
interface InventorySummary {
  total_products: number
  total_stock_value: number
  low_stock_items: number
  out_of_stock_items: number
  total_items_in_stock: number
}

export default function UnifiedInventoryPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [showMovementForm, setShowMovementForm] = useState(false)
  const [showWarehouseForm, setShowWarehouseForm] = useState(false)
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [stockItems, setStockItems] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterWarehouse, setFilterWarehouse] = useState<string>("all")
  const { formatCurrency } = useCurrency()
  const { permissions } = useUserPermissions()

  const fetchAllData = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      fetchSummary(),
      fetchStockItems(),
      fetchMovements(),
      fetchWarehouses()
    ])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // Check if user has permission to manage inventory
  if (!permissions.canManageInventory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-2 border-red-200 bg-red-50">
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <Warehouse className="h-16 w-16 text-red-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-red-800 mb-2">Acceso Restringido</h2>
                <p className="text-red-600">
                  No tienes permisos para acceder al inventario. Esta función requiere permisos de gestión de inventario.
                </p>
              </div>
              <Button 
                onClick={() => window.history.back()} 
                className="bg-red-600 hover:bg-red-700"
              >
                Volver
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const fetchSummary = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      // Calcular resumen manualmente en lugar de usar RPC
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, current_stock, unit_price')
        .eq('user_id', user.id)

      if (productsError) {
        console.error('Error fetching products for summary:', productsError)
        return
      }

      const totalProducts = products?.length || 0
      const totalValue = products?.reduce((sum, p) => sum + ((p.current_stock || 0) * (p.unit_price || 0)), 0) || 0
      const lowStockCount = products?.filter(p => (p.current_stock || 0) <= 5).length || 0
      const outOfStockCount = products?.filter(p => (p.current_stock || 0) === 0).length || 0

      setSummary({
        total_products: totalProducts,
        total_stock_value: totalValue,
        low_stock_items: lowStockCount,
        out_of_stock_items: outOfStockCount,
        total_items_in_stock: products?.reduce((sum, p) => sum + (p.current_stock || 0), 0) || 0
      })
    } catch (error) {
      console.error('Error fetching summary:', error)
    }
  }

  const fetchStockItems = async () => {
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
          reserved_stock,
          available_stock,
          location,
          product:products!inner (
            id,
            name,
            unit,
            unit_price,
            cost_price,
            reorder_point,
            max_stock,
            category,
            barcode,
            is_trackable,
            user_id
          ),
          warehouse:warehouses!inner (
            id,
            name
          )
        `)
        .eq('warehouse.is_active', true)
        .eq('product.user_id', user.id)
        .order('id')

      if (error) {
        console.error('Error fetching stock items:', error)
        return
      }

      const processedItems = data?.map((item: any) => ({
        ...item,
        stock_value: item.current_stock * (item.product?.cost_price || 0),
        is_low_stock: item.current_stock <= (item.product?.reorder_point || 0) && item.current_stock > 0,
        is_out_of_stock: item.current_stock === 0,
        stock_status: item.current_stock === 0 ? 'out_of_stock' 
          : item.current_stock <= (item.product?.reorder_point || 0) ? 'low_stock' 
          : 'in_stock'
      })) || []

      setStockItems(processedItems)
    } catch (error) {
      console.error('Error fetching stock items:', error)
    }
  }

  const fetchMovements = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          id,
          movement_type,
          quantity_change,
          movement_date,
          notes,
          product:products!inner (name, user_id),
          warehouse:warehouses!inner (name),
          user:profiles (email)
        `)
        .eq('product.user_id', user.id)
        .order('movement_date', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Error fetching movements:', error)
        return
      }
      setMovements(data || [])
    } catch (error) {
      console.error('Error fetching movements:', error)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      // Obtener almacenes del usuario actual
      const { data, error } = await supabase
        .from('warehouses')
        .select(`
          id,
          name,
          is_active,
          address,
          description,
          created_at,
          user_id
        `)
        .eq('user_id', user.id)
        .order('created_at')

      if (error) {
        console.error('Error fetching warehouses:', error)
        return
      }

      // Calcular datos adicionales para cada almacén
      const processedWarehouses = await Promise.all(data?.map(async (warehouse: any) => {
        const { data: stockData } = await supabase
          .from('product_warehouse_stock')
          .select(`
            current_stock,
            product:products!inner (cost_price)
          `)
          .eq('warehouse_id', warehouse.id)
          .eq('product.user_id', user.id)

        return {
          ...warehouse,
          product_count: stockData?.length || 0,
          total_stock_value: stockData?.reduce((sum: number, stock: any) => 
            sum + (stock.current_stock * (stock.product?.cost_price || 0)), 0) || 0
        }
      }) || [])

      setWarehouses(processedWarehouses)
    } catch (error) {
      console.error('Error fetching warehouses:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <Badge className="bg-green-100 text-green-800">En Stock</Badge>
      case 'low_stock':
        return <Badge className="bg-yellow-100 text-yellow-800">Stock Bajo</Badge>
      case 'out_of_stock':
        return <Badge className="bg-red-100 text-red-800">Sin Stock</Badge>
      default:
        return <Badge variant="outline">Desconocido</Badge>
    }
  }

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'entrada': return 'bg-green-100 text-green-800'
      case 'salida': return 'bg-red-100 text-red-800'
      case 'ajuste': return 'bg-blue-100 text-blue-800'
      case 'transferencia': return 'bg-purple-100 text-purple-800'
      case 'venta': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'entrada': return <TrendingUp className="w-4 h-4" />
      case 'salida': return <TrendingDown className="w-4 h-4" />
      case 'ajuste': return <Activity className="w-4 h-4" />
      default: return <Package className="w-4 h-4" />
    }
  }

  const filteredStockItems = stockItems.filter(item => {
    const matchesSearch = item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.product?.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.warehouse?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || item.stock_status === filterStatus
    const matchesWarehouse = filterWarehouse === 'all' || item.warehouse?.id === filterWarehouse
    
    return matchesSearch && matchesStatus && matchesWarehouse
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventario Unificado</h1>
          <p className="text-gray-600">Gestión completa de inventario, stock, movimientos y almacenes</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowMovementForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Movimiento
          </Button>
          <Button variant="outline" onClick={fetchAllData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_products || 0}</div>
            <p className="text-xs text-muted-foreground">
              En {warehouses.length} almacén{warehouses.length !== 1 ? 'es' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.total_stock_value || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor del inventario
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items en Stock</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_items_in_stock || 0}</div>
            <p className="text-xs text-muted-foreground">
              Unidades totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {summary?.low_stock_items || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Productos con stock bajo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summary?.out_of_stock_items || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Productos agotados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="movements">Movimientos</TabsTrigger>
          <TabsTrigger value="warehouses">Almacenes</TabsTrigger>
          <TabsTrigger value="transfers">Transferencias</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Alerts Section */}
          {(summary?.low_stock_items || 0) > 0 || (summary?.out_of_stock_items || 0) > 0 ? (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center text-yellow-800">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Alertas de Inventario
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(summary?.low_stock_items || 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-800">
                        {summary?.low_stock_items} producto{(summary?.low_stock_items || 0) !== 1 ? 's' : ''} con stock bajo
                      </span>
                      <Button size="sm" variant="outline" onClick={() => {
                        setFilterStatus('low_stock')
                        setActiveTab('stock')
                      }}>
                        Ver Productos
                      </Button>
                    </div>
                  )}
                  {(summary?.out_of_stock_items || 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-red-800">
                        {summary?.out_of_stock_items} producto{(summary?.out_of_stock_items || 0) !== 1 ? 's' : ''} sin stock
                      </span>
                      <Button size="sm" variant="outline" onClick={() => {
                        setFilterStatus('out_of_stock')
                        setActiveTab('stock')
                      }}>
                        Ver Productos
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Recent Movements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Movimientos Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {movements.slice(0, 5).map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${getMovementTypeColor(movement.movement_type)}`}>
                        {getMovementIcon(movement.movement_type)}
                      </div>
                      <div>
                        <p className="font-medium">{movement.product?.name}</p>
                        <p className="text-sm text-gray-600">
                          {movement.warehouse?.name} • {new Date(movement.movement_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${movement.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
                      </p>
                      <Badge className={getMovementTypeColor(movement.movement_type)}>
                        {movement.movement_type}
                      </Badge>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full" onClick={() => setActiveTab('movements')}>
                  Ver Todos los Movimientos
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Tab */}
        <TabsContent value="stock" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Nombre, categoría..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status">Estado</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="in_stock">En Stock</SelectItem>
                      <SelectItem value="low_stock">Stock Bajo</SelectItem>
                      <SelectItem value="out_of_stock">Sin Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="warehouse">Almacén</Label>
                  <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => {
                    setSearchTerm('')
                    setFilterStatus('all')
                    setFilterWarehouse('all')
                  }}>
                    Limpiar Filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Stock de Productos ({filteredStockItems.length})
                </span>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Producto</th>
                      <th className="text-left p-2">Almacén</th>
                      <th className="text-right p-2">Stock</th>
                      <th className="text-right p-2">Reservado</th>
                      <th className="text-right p-2">Disponible</th>
                      <th className="text-right p-2">Valor</th>
                      <th className="text-center p-2">Estado</th>
                      <th className="text-center p-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStockItems.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <div>
                            <p className="font-medium">{item.product?.name}</p>
                            <p className="text-sm text-gray-600">{item.product?.category}</p>
                          </div>
                        </td>
                        <td className="p-2">{item.warehouse?.name}</td>
                        <td className="p-2 text-right">{item.current_stock} {item.product?.unit}</td>
                        <td className="p-2 text-right">{item.reserved_stock || 0}</td>
                        <td className="p-2 text-right">{item.available_stock || item.current_stock}</td>
                        <td className="p-2 text-right">{formatCurrency(item.stock_value)}</td>
                        <td className="p-2 text-center">{getStatusBadge(item.stock_status)}</td>
                        <td className="p-2 text-center">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movements Tab */}
        <TabsContent value="movements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Historial de Movimientos
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Fecha</th>
                      <th className="text-left p-2">Producto</th>
                      <th className="text-left p-2">Almacén</th>
                      <th className="text-center p-2">Tipo</th>
                      <th className="text-right p-2">Cantidad</th>
                      <th className="text-left p-2">Notas</th>
                      <th className="text-left p-2">Usuario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => (
                      <tr key={movement.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          {new Date(movement.movement_date).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="p-2">{movement.product?.name}</td>
                        <td className="p-2">{movement.warehouse?.name}</td>
                        <td className="p-2 text-center">
                          <Badge className={getMovementTypeColor(movement.movement_type)}>
                            {movement.movement_type}
                          </Badge>
                        </td>
                        <td className={`p-2 text-right font-semibold ${movement.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
                        </td>
                        <td className="p-2">{movement.notes || '-'}</td>
                        <td className="p-2">{movement.user?.email || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warehouses Tab */}
        <TabsContent value="warehouses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Warehouse className="w-5 h-5 mr-2" />
                  Gestión de Almacenes
                </span>
                <Button onClick={() => setShowWarehouseForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Almacén
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {warehouses.map((warehouse) => (
                  <Card key={warehouse.id} className={`${warehouse.is_active ? 'border-green-200' : 'border-gray-200'}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{warehouse.name}</span>
                        <Badge variant={warehouse.is_active ? "default" : "secondary"}>
                          {warehouse.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Productos:</span>
                          <span className="font-semibold">{warehouse.product_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Valor Total:</span>
                          <span className="font-semibold">{formatCurrency(warehouse.total_stock_value)}</span>
                        </div>
                        {warehouse.address && (
                          <div>
                            <span className="text-sm text-gray-600">Dirección:</span>
                            <p className="text-sm">{warehouse.address}</p>
                          </div>
                        )}
                        {warehouse.description && (
                          <div>
                            <span className="text-sm text-gray-600">Descripción:</span>
                            <p className="text-sm">{warehouse.description}</p>
                          </div>
                        )}
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Settings className="w-4 h-4 mr-2" />
                            Configurar
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => {
                            setFilterWarehouse(warehouse.id)
                            setActiveTab('stock')
                          }}>
                            <Package className="w-4 h-4 mr-2" />
                            Ver Stock
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transfers Tab */}
        <TabsContent value="transfers" className="space-y-6">
          <WarehouseTransfer onTransferComplete={fetchAllData} />
        </TabsContent>
      </Tabs>

      {/* Modal para Nuevo Movimiento */}
      <Dialog open={showMovementForm} onOpenChange={setShowMovementForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Movimiento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Esta funcionalidad estará disponible próximamente. 
              Por ahora puedes gestionar movimientos desde la sección de transferencias.
            </p>
            <Button 
              onClick={() => {
                setShowMovementForm(false)
                setActiveTab("transfers")
              }}
              className="w-full"
            >
              Ir a Transferencias
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para Nuevo Almacén */}
      <Dialog open={showWarehouseForm} onOpenChange={setShowWarehouseForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Almacén</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="warehouse-name">Nombre del Almacén</Label>
              <Input id="warehouse-name" placeholder="Almacén Principal" />
            </div>
            <div>
              <Label htmlFor="warehouse-description">Descripción</Label>
              <Input id="warehouse-description" placeholder="Descripción del almacén" />
            </div>
            <div>
              <Label htmlFor="warehouse-address">Dirección</Label>
              <Input id="warehouse-address" placeholder="Dirección física" />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowWarehouseForm(false)}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => {
                  // Aquí iría la lógica para crear el almacén
                  setShowWarehouseForm(false)
                }}
                className="flex-1"
              >
                Crear Almacén
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}