"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  AreaChart,
} from "recharts"
import { supabase } from "@/lib/supabase"
import { useCurrency } from "@/hooks/use-currency"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import { usePlanAccess } from "@/hooks/use-plan-access"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar,
  Zap,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  AlertTriangle,
  Lightbulb,
} from "lucide-react"
import { format, subMonths, eachMonthOfInterval, startOfMonth, endOfMonth, isSameMonth } from "date-fns"
import { es } from "date-fns/locale"
import { cn, formatCurrency } from "@/lib/utils"

interface MonthlyData {
  monthKey: string // YYYY-MM
  monthName: string
  year: number

  // Metrics
  totalRevenue: number
  totalCOGS: number
  grossProfit: number // Revenue - COGS
  totalExpenses: number // Operational Expenses
  netProfit: number // Gross Profit - Expenses

  // Counts
  invoiceCount: number
  receiptCount: number
  expenseCount: number

  // Ratios
  profitMargin: number // (Net Profit / Revenue) * 100
  expenseRatio: number // (Expenses / Revenue) * 100
}

export default function MonthlyReportsPage() {
  const { hasAccessToMonthlyReports, requireAccess, isLoading: planLoading } = usePlanAccess()
  const { permissions } = useUserPermissions()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<MonthlyData[]>([])
  const [monthsToView, setMonthsToView] = useState(12)

  // Check plan access
  useEffect(() => {
    if (!planLoading) {
      requireAccess('Módulo de Reportes Mensuales', hasAccessToMonthlyReports())
    }
  }, [planLoading, hasAccessToMonthlyReports])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const startDate = startOfMonth(subMonths(new Date(), monthsToView - 1))
      const endDate = endOfMonth(new Date())

      // 1. Fetch Cost Map (Products & Services)
      const { data: products } = await supabase.from('products').select('id, cost_price').eq('user_id', user.id)
      const { data: services } = await supabase.from('services').select('id, production_cost').eq('user_id', user.id)

      const costMap = new Map<string, number>()
      products?.forEach(p => costMap.set(p.id, p.cost_price || 0))
      services?.forEach(s => costMap.set(s.id, s.production_cost || 0))

      // 2. Fetch Invoices & Items
      const { data: invoiceItems } = await supabase
        .from('invoice_items')
        .select(`
          quantity, 
          unit_price, 
          product_id, 
          service_id, 
          total,
          invoices!inner (invoice_date, status)
        `)
        .eq('invoices.user_id', user.id)
        .neq('invoices.status', 'cancelled')
        .gte('invoices.invoice_date', startDate.toISOString())
        .lte('invoices.invoice_date', endDate.toISOString())

      // 3. Fetch Thermal Receipts & Items
      const { data: thermalItems } = await supabase
        .from('thermal_receipt_items')
        .select(`
          quantity, 
          unit_price, 
          product_id, 
          service_id,
          line_total,
          thermal_receipts!inner (created_at, status)
        `)
        .eq('thermal_receipts.user_id', user.id)
        .neq('thermal_receipts.status', 'cancelled')
        .gte('thermal_receipts.created_at', startDate.toISOString())
        .lte('thermal_receipts.created_at', endDate.toISOString())

      // 4. Fetch Expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, date, created_at')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString())

      // 5. Aggregate Data by Month
      const monthlyMap = new Map<string, MonthlyData>()
      const interval = eachMonthOfInterval({ start: startDate, end: endDate })

      // Initialize all months
      interval.forEach(date => {
        const key = format(date, 'yyyy-MM')
        monthlyMap.set(key, {
          monthKey: key,
          monthName: format(date, 'MMMM', { locale: es }),
          year: date.getFullYear(),
          totalRevenue: 0,
          totalCOGS: 0,
          grossProfit: 0,
          totalExpenses: 0,
          netProfit: 0,
          invoiceCount: 0,
          receiptCount: 0,
          expenseCount: 0,
          profitMargin: 0,
          expenseRatio: 0
        })
      })

      // Process Invoices
      invoiceItems?.forEach((item: any) => {
        const date = new Date(item.invoices.invoice_date)
        const key = format(date, 'yyyy-MM')
        const stats = monthlyMap.get(key)
        if (stats) {
          const revenue = item.total || (item.quantity * item.unit_price)
          const cost = (item.quantity || 0) * (costMap.get(item.product_id || item.service_id) || 0)

          stats.totalRevenue += revenue
          stats.totalCOGS += cost
          stats.invoiceCount += 1 // Note: This counts line items as "activity", strict invoice count would need grouping
        }
      })

      // Process Thermal Receipts
      thermalItems?.forEach((item: any) => {
        const date = new Date(item.thermal_receipts.created_at)
        const key = format(date, 'yyyy-MM')
        const stats = monthlyMap.get(key)
        if (stats) {
          const revenue = item.line_total || (item.quantity * item.unit_price)
          const cost = (item.quantity || 0) * (costMap.get(item.product_id || item.service_id) || 0)

          stats.totalRevenue += revenue
          stats.totalCOGS += cost
          stats.receiptCount += 1
        }
      })

      // Process Expenses
      expenses?.forEach((exp: any) => {
        const date = new Date(exp.date || exp.created_at)
        const key = format(date, 'yyyy-MM')
        const stats = monthlyMap.get(key)
        if (stats) {
          stats.totalExpenses += exp.amount || 0
          stats.expenseCount += 1
        }
      })

      // Final Calculations
      const result = Array.from(monthlyMap.values()).map(m => {
        m.grossProfit = m.totalRevenue - m.totalCOGS
        m.netProfit = m.grossProfit - m.totalExpenses
        m.profitMargin = m.totalRevenue > 0 ? (m.netProfit / m.totalRevenue) * 100 : 0
        m.expenseRatio = m.totalRevenue > 0 ? (m.totalExpenses / m.totalRevenue) * 100 : 0
        return m
      }).sort((a, b) => a.monthKey.localeCompare(b.monthKey))

      setData(result)

    } catch (error) {
      console.error('Error fetching monthly report:', error)
    } finally {
      setLoading(false)
    }
  }, [monthsToView])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totals = useMemo(() => {
    return data.reduce((acc, curr) => ({
      revenue: acc.revenue + curr.totalRevenue,
      cogs: acc.cogs + curr.totalCOGS,
      expenses: acc.expenses + curr.totalExpenses,
      netProfit: acc.netProfit + curr.netProfit
    }), { revenue: 0, cogs: 0, expenses: 0, netProfit: 0 })
  }, [data])

  const overallMargin = totals.revenue > 0 ? (totals.netProfit / totals.revenue) * 100 : 0

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reporte Mensual</h1>
          <p className="text-muted-foreground">
            Visión general del desempeño financiero de los últimos {monthsToView} meses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm px-3 py-1">
            <Calendar className="w-3 h-3 mr-2" />
            Últimos {monthsToView} Meses
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.revenue)}
            </div>
            <p className="text-xs text-muted-foreground">Ventas + Recibos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Operativos</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {formatCurrency(totals.expenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              {((totals.expenses / totals.revenue) * 100 || 0).toFixed(1)}% de los ingresos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo de Ventas (COGS)</CardTitle>
            <Activity className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">
              {formatCurrency(totals.cogs)}
            </div>
            <p className="text-xs text-muted-foreground">Costos directos de productos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancia Neta</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totals.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Margen Neto: {overallMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Area */}
      <div className="grid gap-4 md:grid-cols-2 h-[400px]">
        {/* Revenue vs Profit Chart */}
        <Card className="col-span-2 md:col-span-1">
          <CardHeader>
            <CardTitle>Tendencia de Ingresos y Ganancias</CardTitle>
            <CardDescription>Comparativa mensual de ingresos brutos vs ganancia neta.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="monthName"
                  tickFormatter={(val) => val.slice(0, 3)}
                  className="text-xs"
                />
                <YAxis
                  className="text-xs"
                  tickFormatter={(val) => `$${val / 1000}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  formatter={(val: number) => formatCurrency(val)}
                />
                <Area
                  type="monotone"
                  dataKey="totalRevenue"
                  stroke="#16a34a"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  name="Ingresos"
                />
                <Area
                  type="monotone"
                  dataKey="netProfit"
                  stroke="#2563eb"
                  fillOpacity={1}
                  fill="url(#colorProfit)"
                  name="Ganancia Neta"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Breakdown Chart */}
        <Card className="col-span-2 md:col-span-1">
          <CardHeader>
            <CardTitle>Estructura de Costos</CardTitle>
            <CardDescription>Relación entre Costos de Venta (COGS) y Gastos Operativos.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="monthName" tickFormatter={(val) => val.slice(0, 3)} className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(val) => `$${val / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  formatter={(val: number) => formatCurrency(val)}
                />
                <Bar dataKey="totalCOGS" name="Costo Productos" stackId="a" fill="#f59e0b" radius={[0, 0, 4, 4]} />
                <Bar dataKey="totalExpenses" name="Gastos Operativos" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="totalRevenue" name="Ingresos" stroke="#16a34a" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Desglose Mensual Detallado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-7 border-b bg-muted/50 p-3 text-xs font-medium">
              <div className="col-span-1">Mes</div>
              <div className="col-span-1 text-right text-green-600">Ingresos</div>
              <div className="col-span-1 text-right text-amber-600">COGS</div>
              <div className="col-span-1 text-right text-blue-600">Utilidad Bruta</div>
              <div className="col-span-1 text-right text-red-500">Gastos Op.</div>
              <div className="col-span-1 text-right font-bold">Utilidad Neta</div>
              <div className="col-span-1 text-right">Margen</div>
            </div>
            {data.map((row) => (
              <div key={row.monthKey} className="grid grid-cols-7 items-center border-b p-3 last:border-0 hover:bg-muted/30 transition-colors">
                <div className="col-span-1 font-medium text-sm flex flex-col">
                  <span className="capitalize">{row.monthName}</span>
                  <span className="text-xs text-muted-foreground">{row.year}</span>
                </div>
                <div className="col-span-1 text-right text-sm">{formatCurrency(row.totalRevenue)}</div>
                <div className="col-span-1 text-right text-sm">{formatCurrency(row.totalCOGS)}</div>
                <div className="col-span-1 text-right text-sm font-medium">{formatCurrency(row.grossProfit)}</div>
                <div className="col-span-1 text-right text-sm">{formatCurrency(row.totalExpenses)}</div>
                <div className={cn(
                  "col-span-1 text-right text-sm font-bold",
                  row.netProfit >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(row.netProfit)}
                </div>
                <div className="col-span-1 text-right text-sm">
                  <Badge variant={row.profitMargin > 20 ? "default" : row.profitMargin > 0 ? "secondary" : "destructive"}>
                    {row.profitMargin.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 border-blue-200 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Lightbulb className="w-5 h-5" /> Insights Financieros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Rentabilidad Operativa</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Tu margen neto promedio es del <span className="font-bold text-foreground">{overallMargin.toFixed(1)}%</span>.
                  {overallMargin > 20 ? " Tu negocio es altamente rentable." : " Considera revisar tus costos operativos."}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Relación Gastos/Ingresos</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Los gastos operativos representan el <span className="font-bold text-foreground">{((totals.expenses / totals.revenue) * 100 || 0).toFixed(1)}%</span> de tus ingresos totales.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}