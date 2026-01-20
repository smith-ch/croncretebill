"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Package, Receipt, Calendar, Search, Filter, TrendingUp, DollarSign, ShoppingBag, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useCurrency } from "@/hooks/use-currency"
import { useDataUserId } from "@/hooks/use-data-user-id"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface PurchaseRecord {
  id: string
  purchase_type: 'inventory' | 'expense'
  description: string
  amount: number
  quantity?: number
  unit_cost?: number
  expense_category?: string
  supplier?: string
  receipt_number?: string
  purchase_date: string
  notes?: string
  created_at: string
}

interface Stats {
  totalInventory: number
  totalExpenses: number
  totalPurchases: number
  inventoryCount: number
  expenseCount: number
}

export default function PurchaseHistoryPage() {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([])
  const [filteredPurchases, setFilteredPurchases] = useState<PurchaseRecord[]>([])
  const [stats, setStats] = useState<Stats>({
    totalInventory: 0,
    totalExpenses: 0,
    totalPurchases: 0,
    inventoryCount: 0,
    expenseCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterMonth, setFilterMonth] = useState<string>("all")
  
  const router = useRouter()
  const { toast } = useToast()
  const { formatCurrency } = useCurrency()
  const { dataUserId, loading: userIdLoading } = useDataUserId()

  useEffect(() => {
    if (dataUserId) {
      fetchPurchases()
    }
  }, [dataUserId])

  useEffect(() => {
    applyFilters()
  }, [purchases, searchTerm, filterType, filterMonth])

  const fetchPurchases = async () => {
    if (!dataUserId) return

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('purchase_history')
        .select('*')
        .eq('user_id', dataUserId)
        .order('purchase_date', { ascending: false })

      if (error) throw error

      setPurchases(data || [])
      calculateStats(data || [])
    } catch (error: any) {
      console.error('Error fetching purchases:', error)
      toast({
        title: "Error",
        description: "No se pudo cargar el historial de compras",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data: PurchaseRecord[]) => {
    const inventoryPurchases = data.filter(p => p.purchase_type === 'inventory')
    const expensePurchases = data.filter(p => p.purchase_type === 'expense')

    setStats({
      totalInventory: inventoryPurchases.reduce((sum, p) => sum + p.amount, 0),
      totalExpenses: expensePurchases.reduce((sum, p) => sum + p.amount, 0),
      totalPurchases: data.reduce((sum, p) => sum + p.amount, 0),
      inventoryCount: inventoryPurchases.length,
      expenseCount: expensePurchases.length
    })
  }

  const applyFilters = () => {
    let filtered = [...purchases]

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtrar por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(p => p.purchase_type === filterType)
    }

    // Filtrar por mes
    if (filterMonth !== 'all') {
      const [year, month] = filterMonth.split('-')
      filtered = filtered.filter(p => {
        const purchaseDate = new Date(p.purchase_date)
        return purchaseDate.getFullYear() === parseInt(year) &&
               purchaseDate.getMonth() === parseInt(month) - 1
      })
    }

    setFilteredPurchases(filtered)
  }

  const getTypeDisplay = (type: string) => {
    return type === 'inventory' 
      ? { label: 'Inventario', color: 'bg-green-100 text-green-800', icon: Package }
      : { label: 'Gasto', color: 'bg-orange-100 text-orange-800', icon: Receipt }
  }

  const getCategoryLabel = (category?: string) => {
    const categories: Record<string, string> = {
      'empaque': 'Empaque y Embalaje',
      'servicios': 'Servicios',
      'transporte': 'Transporte y Logística',
      'publicidad': 'Publicidad y Marketing',
      'insumos': 'Insumos Operativos',
      'mantenimiento': 'Mantenimiento',
      'oficina': 'Material de Oficina',
      'servicios_profesionales': 'Servicios Profesionales',
      'combustible': 'Combustible',
      'otros': 'Otros Gastos',
    }
    return category ? categories[category] || category : ''
  }

  if (userIdLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando historial...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Historial de Compras</h1>
            <p className="text-gray-600 mt-1">Registro completo de inventario y gastos</p>
          </div>
          <Button onClick={() => router.push('/purchases/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Compra
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.totalPurchases)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Package className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Inventario</p>
                  <p className="text-lg font-bold text-green-700">{formatCurrency(stats.totalInventory)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Gastos</p>
                  <p className="text-lg font-bold text-orange-700">{formatCurrency(stats.totalExpenses)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Compras Inventario</p>
                  <p className="text-lg font-bold text-purple-700">{stats.inventoryCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Compras Gastos</p>
                  <p className="text-lg font-bold text-red-700">{stats.expenseCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por descripción, proveedor o factura..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="inventory">Solo Inventario</SelectItem>
                  <SelectItem value="expense">Solo Gastos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por mes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los meses</SelectItem>
                  <SelectItem value={format(new Date(), 'yyyy-MM')}>Mes actual</SelectItem>
                  <SelectItem value={format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM')}>Mes pasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Purchase List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Registro de Compras ({filteredPurchases.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPurchases.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No se encontraron compras</p>
                <Button 
                  onClick={() => router.push('/purchases/new')} 
                  className="mt-4"
                  variant="outline"
                >
                  Registrar Primera Compra
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPurchases.map((purchase) => {
                  const typeInfo = getTypeDisplay(purchase.purchase_type)
                  const TypeIcon = typeInfo.icon

                  return (
                    <div
                      key={purchase.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`h-10 w-10 rounded-lg ${typeInfo.color.replace('text', 'bg').replace('800', '100')} flex items-center justify-center`}>
                              <TypeIcon className={`h-5 w-5 ${typeInfo.color.split(' ')[1]}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900">{purchase.description}</h3>
                                <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>{format(new Date(purchase.purchase_date), "d 'de' MMMM, yyyy", { locale: es })}</span>
                                {purchase.supplier && <span>• {purchase.supplier}</span>}
                                {purchase.receipt_number && <span>• #{purchase.receipt_number}</span>}
                              </div>
                            </div>
                          </div>

                          {purchase.purchase_type === 'expense' && purchase.expense_category && (
                            <div className="ml-13 text-sm text-gray-600">
                              <span className="font-medium">Categoría:</span> {getCategoryLabel(purchase.expense_category)}
                            </div>
                          )}

                          {purchase.purchase_type === 'inventory' && purchase.quantity && (
                            <div className="ml-13 text-sm text-gray-600">
                              <span className="font-medium">Cantidad:</span> {purchase.quantity} unidades • 
                              <span className="ml-1">Costo unitario:</span> {formatCurrency(purchase.unit_cost || 0)}
                            </div>
                          )}

                          {purchase.notes && (
                            <div className="ml-13 mt-2 text-sm text-gray-500 italic">
                              {purchase.notes}
                            </div>
                          )}
                        </div>

                        <div className="text-right ml-4">
                          <p className="text-2xl font-bold text-gray-900">{formatCurrency(purchase.amount)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
