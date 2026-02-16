"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useDataUserId } from "@/hooks/use-data-user-id"
import { DollarSign, TrendingUp, Package, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval } from "date-fns"
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
  product_code?: string
  type?: 'product' | 'service'
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
  last_sale_date: string
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

  // State for month filter
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'))
  const [availableMonths, setAvailableMonths] = useState<Date[]>([])

  useEffect(() => {
    if (dataUserId && !userLoading) {
      fetchAvailableMonths()
      fetchData(selectedMonth)
    }
  }, [dataUserId, userLoading, selectedMonth])

  const fetchAvailableMonths = async () => {
    try {
      // Get earliest date from Invoices
      const { data: invoiceMin } = await supabase
        .from('invoices')
        .select('invoice_date')
        .eq('user_id', dataUserId)
        .neq('status', 'cancelled')
        .order('invoice_date', { ascending: true })
        .limit(1)
        .single()

      // Get earliest date from Thermal Receipts
      const { data: thermalMin } = await supabase
        .from('thermal_receipts')
        .select('created_at')
        .eq('user_id', dataUserId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      let minDate = new Date()
      if (invoiceMin?.invoice_date) {
        minDate = new Date(invoiceMin.invoice_date)
      }
      if (thermalMin?.created_at) {
        const thermalDate = new Date(thermalMin.created_at)
        if (thermalDate < minDate) minDate = thermalDate
      }

      // If no data found, default to 1 month ago
      if (!invoiceMin && !thermalMin) {
        minDate = subMonths(new Date(), 1)
      }

      const months = eachMonthOfInterval({
        start: startOfMonth(minDate),
        end: new Date()
      }).reverse()

      setAvailableMonths(months)
    } catch (error) {
      console.error('Error fetching available months:', error)
    }
  }

  const fetchData = async (month: string) => {
    try {
      setLoading(true)

      let startDate: string | null = null
      let endDate: string | null = null

      if (month !== 'all') {
        const [year, m] = month.split('-')
        const date = new Date(parseInt(year), parseInt(m) - 1, 1)

        startDate = startOfMonth(date).toISOString()
        endDate = endOfMonth(date).toISOString()
      }

      // 1. Fetch Products & Services for Costs
      const { data: products } = await supabase
        .from('products')
        .select('id, name, product_code, cost_price')
        .eq('user_id', dataUserId)

      const { data: services } = await supabase
        .from('services')
        .select('id, name, service_code, production_cost')
        .eq('user_id', dataUserId)

      const costMap = new Map<string, { cost: number, name: string, code: string, type: 'product' | 'service' }>()

      products?.forEach(p => {
        costMap.set(p.id, {
          cost: p.cost_price || 0,
          name: p.name,
          code: p.product_code || '-',
          type: 'product'
        })
      })

      services?.forEach(s => {
        costMap.set(s.id, {
          cost: s.production_cost || 0,
          name: s.name,
          code: s.service_code || '-',
          type: 'service'
        })
      })

      // 2. Fetch Invoice Items (Live)
      let invoiceQuery = supabase
        .from('invoice_items')
        .select(`
          *,
          invoices!invoice_items_invoice_id_fkey!inner(invoice_date, status)
        `)
        .neq('invoices.status', 'cancelled')
        .eq('invoices.user_id', dataUserId)

      if (startDate && endDate) {
        invoiceQuery = invoiceQuery
          .gte('invoices.invoice_date', startDate)
          .lte('invoices.invoice_date', endDate)
      }

      const { data: invoiceItems, error: invoiceError } = await invoiceQuery
      if (invoiceError) throw invoiceError

      // 3. Fetch Thermal Receipt Items (Live)
      let thermalQuery = supabase
        .from('thermal_receipt_items')
        .select(`
          *,
          thermal_receipts!inner(created_at, status)
        `)
        .neq('thermal_receipts.status', 'cancelled')
        .eq('thermal_receipts.user_id', dataUserId)

      if (startDate && endDate) {
        thermalQuery = thermalQuery
          .gte('thermal_receipts.created_at', startDate)
          .lte('thermal_receipts.created_at', endDate)
      }

      const { data: thermalItems, error: thermalError } = await thermalQuery
      if (thermalError) console.error('Error fetching thermal items:', thermalError)

      // 4. Transform & Combine
      const invoiceData = invoiceItems?.map((item: any) => {
        const id = item.product_id || item.service_id
        const ref = costMap.get(id)

        // If not in map, try to use item name/desc fallback logic later? 
        // For now, if no ref, assume it's ad-hoc or deleted item.
        // If it's ad-hoc service (no ID), cost is 0.

        const quantity = item.quantity || 0
        const salePrice = item.unit_price || 0
        const totalSale = item.total || (quantity * salePrice)
        const unitCost = ref?.cost || 0
        const totalCost = quantity * unitCost
        const grossProfit = totalSale - totalCost
        const margin = totalSale > 0 ? (grossProfit / totalSale) * 100 : 0

        return {
          id: item.id,
          product_id: id || 'adhoc',
          product_name: ref?.name || item.description || 'Item desconocido',
          product_code: ref?.code || '-',
          type: ref?.type || (item.service_id ? 'service' : 'product'),
          quantity_sold: quantity,
          sale_price: salePrice,
          total_sale: totalSale,
          unit_cost: unitCost,
          total_cost: totalCost,
          gross_profit: grossProfit,
          profit_margin: margin,
          sale_date: item.invoices?.invoice_date
        } as COGSData
      }) || []

      const thermalData = thermalItems?.map((item: any) => {
        const id = item.product_id || item.service_id
        const ref = costMap.get(id)

        const quantity = item.quantity || 0
        const salePrice = item.unit_price || 0
        const totalSale = item.line_total || (quantity * salePrice)
        const unitCost = ref?.cost || 0
        const totalCost = quantity * unitCost
        const grossProfit = totalSale - totalCost
        const margin = totalSale > 0 ? (grossProfit / totalSale) * 100 : 0

        return {
          id: item.id,
          product_id: id || 'adhoc',
          product_name: ref?.name || item.item_name || 'Ítem rápido',
          product_code: ref?.code || '-',
          type: item.service_id ? 'service' : (ref?.type || 'product'),
          quantity_sold: quantity,
          sale_price: salePrice,
          total_sale: totalSale,
          unit_cost: unitCost,
          total_cost: totalCost,
          gross_profit: grossProfit,
          profit_margin: margin,
          sale_date: item.thermal_receipts?.created_at
        } as COGSData
      }) || []

      const combinedData = [...invoiceData, ...thermalData].sort((a, b) =>
        new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
      )

      setCogsData(combinedData)

      // Calculate product/service profitability
      const itemMap = new Map<string, ProductProfitability>()

      // combinedData is sorted by date DESC, so the first item we encounter for a product is the latest one
      combinedData.forEach(item => {
        const id = item.product_id

        let existing = itemMap.get(id)

        if (!existing) {
          existing = {
            product_id: id,
            product_name: item.product_name || 'Sin nombre',
            product_code: item.product_code || '-',
            total_sales: 0,
            total_quantity_sold: 0,
            total_revenue: 0,
            total_cogs: 0,
            total_profit: 0,
            avg_profit_margin: 0,
            last_sale_date: item.sale_date
          }
          itemMap.set(id, existing)
        }

        existing.total_sales += 1
        existing.total_quantity_sold += item.quantity_sold
        existing.total_revenue += item.total_sale
        existing.total_cogs += item.total_cost
        existing.total_profit += item.gross_profit
      })

      const profitability = Array.from(itemMap.values())
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

      combinedData.forEach(item => {
        const monthKey = format(new Date(item.sale_date), 'yyyy-MM', { locale: es })
        const existing = monthMap.get(monthKey) || {
          month: monthKey,
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

        monthMap.set(monthKey, existing)
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
      const totalRevenue = combinedData.reduce((sum, item) => sum + item.total_sale, 0)
      const totalCOGS = combinedData.reduce((sum, item) => sum + item.total_cost, 0)
      const totalProfit = totalRevenue - totalCOGS
      const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

      setTotalStats({ totalRevenue, totalCOGS, totalProfit, avgMargin })

    } catch (error) {
      console.error('Error fetching profitability data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Use availableMonths or fallback to default
  const monthList = availableMonths.length > 0 ? availableMonths : eachMonthOfInterval({
    start: subMonths(new Date(), 2),
    end: new Date()
  }).reverse()

  if (loading && availableMonths.length === 0) {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reportes de Rentabilidad</h1>
          <p className="text-muted-foreground">
            Análisis de costos, ingresos y utilidades reales (Productos y Servicios)
          </p>
        </div>
        <div className="w-[200px]">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el historial</SelectItem>
              {monthList.map(month => {
                const value = format(month, 'yyyy-MM')
                const label = format(month, 'MMMM yyyy', { locale: es })
                return (
                  <SelectItem key={value} value={value}>
                    {label.charAt(0).toUpperCase() + label.slice(1)}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
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
          <TabsTrigger value="products">Por Item</TabsTrigger>
          <TabsTrigger value="monthly">Resumen Mensual</TabsTrigger>
          <TabsTrigger value="details">Detalle de Ventas</TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rentabilidad por Item</CardTitle>
              <CardDescription>
                Análisis de utilidades por cada producto o servicio vendido
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
                          <p className="text-xs text-blue-500 mt-1">
                            Última venta: {format(new Date(product.last_sale_date), 'dd/MM/yyyy', { locale: es })}
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
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${item.type === 'service'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            }`}>
                            {item.type === 'service' ? 'L' : 'P'}
                          </span>
                          <span className="text-xs font-mono text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1 rounded">
                            {item.product_code || 'N/A'}
                          </span>
                          <p className="font-medium">{item.product_name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-10">
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
