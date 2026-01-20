"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { useDataUserId } from "@/hooks/use-data-user-id"
import { DollarSign, TrendingUp, Package, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface COGSData {
  id: string
  product_id: string
  quantity_sold: number
  sale_price: number
  total_sale: number
  unit_cost: number
  total_cost: number
  gross_profit: number
  profit_margin: number
  sale_date: string
  product_name?: string
}

interface ProductProfitability {
  product_id: string
  product_name: string
  product_code: string
  total_sales: number
  total_quantity_sold: number
  total_revenue: number
  total_cogs: number
  total_profit: number
  avg_profit_margin: number
}

interface MonthlySummary {
  month: string
  total_invoices: number
  total_units_sold: number
  total_revenue: number
  total_cogs: number
  gross_profit: number
  profit_margin: number
}

export default function ProfitabilityReportsPage() {
  const router = useRouter()
  const { dataUserId, loading: userLoading } = useDataUserId()
  const [loading, setLoading] = useState(true)
  const [cogsData, setCogsData] = useState<COGSData[]>([])
  const [productProfitability, setProductProfitability] = useState<ProductProfitability[]>([])
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary[]>([])
  const [totalStats, setTotalStats] = useState({
    totalRevenue: 0,
    totalCOGS: 0,
    totalProfit: 0,
    avgMargin: 0
  })

  useEffect(() => {
    if (dataUserId && !userLoading) {
      fetchData()
    }
  }, [dataUserId, userLoading])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch COGS data with product names
      const { data: cogs, error: cogsError } = await supabase
        .from('cost_of_goods_sold')
        .select(`
          *,
          products!inner(name)
        `)
        .eq('user_id', dataUserId)
        .order('sale_date', { ascending: false })
        .limit(100)

      if (cogsError) throw cogsError

      const cogsWithNames = cogs?.map(item => ({
        ...item,
        product_name: item.products?.name || 'Producto desconocido'
      })) || []

      setCogsData(cogsWithNames)

      // Calculate product profitability
      const productMap = new Map<string, ProductProfitability>()
      
      cogsWithNames.forEach(item => {
        const existing = productMap.get(item.product_id) || {
          product_id: item.product_id,
          product_name: item.product_name || 'Sin nombre',
          product_code: '',
          total_sales: 0,
          total_quantity_sold: 0,
          total_revenue: 0,
          total_cogs: 0,
          total_profit: 0,
          avg_profit_margin: 0
        }

        existing.total_sales += 1
        existing.total_quantity_sold += item.quantity_sold
        existing.total_revenue += item.total_sale
        existing.total_cogs += item.total_cost
        existing.total_profit += item.gross_profit

        productMap.set(item.product_id, existing)
      })

      const profitability = Array.from(productMap.values())
        .map(item => ({
          ...item,
          avg_profit_margin: item.total_revenue > 0 
            ? (item.total_profit / item.total_revenue) * 100 
            : 0
        }))
        .sort((a, b) => b.total_profit - a.total_profit)

      setProductProfitability(profitability)

      // Calculate monthly summary
      const monthMap = new Map<string, MonthlySummary>()
      
      cogsWithNames.forEach(item => {
        const month = format(new Date(item.sale_date), 'yyyy-MM', { locale: es })
        const existing = monthMap.get(month) || {
          month,
          total_invoices: 0,
          total_units_sold: 0,
          total_revenue: 0,
          total_cogs: 0,
          gross_profit: 0,
          profit_margin: 0
        }

        existing.total_invoices += 1
        existing.total_units_sold += item.quantity_sold
        existing.total_revenue += item.total_sale
        existing.total_cogs += item.total_cost
        existing.gross_profit += item.gross_profit

        monthMap.set(month, existing)
      })

      const monthly = Array.from(monthMap.values())
        .map(item => ({
          ...item,
          profit_margin: item.total_revenue > 0 
            ? (item.gross_profit / item.total_revenue) * 100 
            : 0
        }))
        .sort((a, b) => b.month.localeCompare(a.month))

      setMonthlySummary(monthly)

      // Calculate total stats
      const totalRevenue = cogsWithNames.reduce((sum, item) => sum + item.total_sale, 0)
      const totalCOGS = cogsWithNames.reduce((sum, item) => sum + item.total_cost, 0)
      const totalProfit = cogsWithNames.reduce((sum, item) => sum + item.gross_profit, 0)
      const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

      setTotalStats({ totalRevenue, totalCOGS, totalProfit, avgMargin })

    } catch (error) {
      console.error('Error fetching profitability data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reportes de Rentabilidad</h1>
          <p className="text-muted-foreground">
            Análisis de costos, ingresos y utilidades reales
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalStats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de ventas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo de Ventas</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalStats.totalCOGS)}
            </div>
            <p className="text-xs text-muted-foreground">
              COGS (Costo de lo vendido)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilidad Bruta</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalStats.totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Ingresos - Costos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen Promedio</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {totalStats.avgMargin.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Margen de ganancia
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Por Producto</TabsTrigger>
          <TabsTrigger value="monthly">Resumen Mensual</TabsTrigger>
          <TabsTrigger value="details">Detalle de Ventas</TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rentabilidad por Producto</CardTitle>
              <CardDescription>
                Análisis de utilidades por cada producto vendido
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productProfitability.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hay datos de ventas disponibles
                  </p>
                ) : (
                  productProfitability.map(product => (
                    <div key={product.product_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Package className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{product.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.total_sales} ventas • {product.total_quantity_sold} unidades
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Ventas: {formatCurrency(product.total_revenue)}
                        </p>
                        <p className="text-sm text-red-600">
                          Costo: {formatCurrency(product.total_cogs)}
                        </p>
                        <p className="font-bold text-green-600">
                          Utilidad: {formatCurrency(product.total_profit)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Margen: {product.avg_profit_margin.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Tab */}
        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumen Mensual</CardTitle>
              <CardDescription>
                Utilidades y márgenes por mes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthlySummary.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hay datos mensuales disponibles
                  </p>
                ) : (
                  monthlySummary.map(month => (
                    <div key={month.month} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Calendar className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {format(new Date(month.month + '-01'), 'MMMM yyyy', { locale: es })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {month.total_invoices} facturas • {month.total_units_sold} unidades
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm text-green-600">
                          Ingresos: {formatCurrency(month.total_revenue)}
                        </p>
                        <p className="text-sm text-red-600">
                          COGS: {formatCurrency(month.total_cogs)}
                        </p>
                        <p className="font-bold text-blue-600">
                          Utilidad: {formatCurrency(month.gross_profit)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Margen: {month.profit_margin.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Ventas</CardTitle>
              <CardDescription>
                Historial completo con costos y utilidades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cogsData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hay ventas registradas
                  </p>
                ) : (
                  cogsData.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded text-sm">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.sale_date), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs">
                          {item.quantity_sold} × {formatCurrency(item.sale_price)} = 
                          <span className="text-green-600 font-medium ml-1">
                            {formatCurrency(item.total_sale)}
                          </span>
                        </p>
                        <p className="text-xs text-red-600">
                          Costo: {formatCurrency(item.total_cost)}
                        </p>
                        <p className="text-xs font-medium text-blue-600">
                          Utilidad: {formatCurrency(item.gross_profit)} ({item.profit_margin.toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
