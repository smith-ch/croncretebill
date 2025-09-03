"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  PieChart,
  Pie,
  Cell,
  LineChart,
} from "recharts"
import { supabase } from "@/lib/supabase"
import { useCurrency } from "@/hooks/use-currency"
import {
  TrendingUp,
  FileText,
  DollarSign,
  BarChart3,
  Receipt,
  Download,
  Target,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PieChartIcon,
  RefreshCw,
  Loader2,
  LineChart as LineChartIcon,
} from "lucide-react"

interface MonthlyData {
  month: string
  year: number
  monthName: string
  totalInvoices: number
  totalExpenses: number
  totalRevenue: number
  expenseAmount: number
  netProfit: number
  growth: number
  profitMargin: number
  avgInvoiceValue: number
  avgExpenseValue: number
}

interface KPIData {
  totalRevenue: number
  totalInvoices: number
  totalExpenses: number
  totalExpenseAmount: number
  netProfit: number
  averageGrowth: number
  profitMargin: number
  avgInvoiceValue: number
  avgExpenseValue: number
  bestMonth: string
  worstMonth: string
  totalClients: number
  totalProducts: number
  revenueGrowthTrend: number
  expenseGrowthTrend: number
}

export default function MonthlyReportsPage() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [kpiData, setKpiData] = useState<KPIData>({
    totalRevenue: 0,
    totalInvoices: 0,
    totalExpenses: 0,
    totalExpenseAmount: 0,
    netProfit: 0,
    averageGrowth: 0,
    profitMargin: 0,
    avgInvoiceValue: 0,
    avgExpenseValue: 0,
    bestMonth: "",
    worstMonth: "",
    totalClients: 0,
    totalProducts: 0,
    revenueGrowthTrend: 0,
    expenseGrowthTrend: 0,
  })
  const [selectedPeriod, setSelectedPeriod] = useState("12")
  const { formatCurrency } = useCurrency()

  useEffect(() => {
    setIsClient(true)
    fetchMonthlyData()
    fetchAdditionalMetrics()
  }, [selectedPeriod])

  const fetchAdditionalMetrics = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const [clientsResult, productsResult] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ])

      return {
        totalClients: clientsResult.count || 0,
        totalProducts: productsResult.count || 0,
      }
    } catch (error) {
      console.error("Error fetching additional metrics:", error)
      return { totalClients: 0, totalProducts: 0 }
    }
  }

  const fetchMonthlyData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const monthsToFetch = Number.parseInt(selectedPeriod)
      const { data: monthlyStats } = await supabase
        .from("monthly_stats")
        .select("*")
        .eq("user_id", user.id)
        .order("year", { ascending: true })
        .order("month", { ascending: true })
        .limit(monthsToFetch)

      const additionalMetrics = await fetchAdditionalMetrics()

      if (monthlyStats) {
        const processedData = monthlyStats.map((stat, index) => {
          const monthNames = [
            "Enero",
            "Febrero",
            "Marzo",
            "Abril",
            "Mayo",
            "Junio",
            "Julio",
            "Agosto",
            "Septiembre",
            "Octubre",
            "Noviembre",
            "Diciembre",
          ]

          let growth = 0
          if (index > 0) {
            const previousRevenue = monthlyStats[index - 1].total_revenue || 0
            const currentRevenue = stat.total_revenue || 0
            if (previousRevenue > 0) {
              growth = ((currentRevenue - previousRevenue) / previousRevenue) * 100
            }
          }

          const revenue = stat.total_revenue || 0
          const expenseAmount = stat.total_expenses || 0
          const netProfit = revenue - expenseAmount
          const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0
          const avgInvoiceValue = stat.total_invoices > 0 ? revenue / stat.total_invoices : 0
          const avgExpenseValue = stat.expense_count > 0 ? expenseAmount / stat.expense_count : 0

          return {
            month: `${stat.month}/${stat.year}`,
            year: stat.year,
            monthName: monthNames[stat.month - 1],
            totalInvoices: stat.total_invoices || 0,
            totalExpenses: stat.expense_count || 0,
            totalRevenue: revenue,
            expenseAmount: expenseAmount,
            netProfit: netProfit,
            growth: Math.round(growth * 100) / 100,
            profitMargin: Math.round(profitMargin * 100) / 100,
            avgInvoiceValue: avgInvoiceValue,
            avgExpenseValue: avgExpenseValue,
          }
        })

        setMonthlyData(processedData)

        const totalRevenue = processedData.reduce((sum, data) => sum + data.totalRevenue, 0)
        const totalInvoices = processedData.reduce((sum, data) => sum + data.totalInvoices, 0)
        const totalExpenses = processedData.reduce((sum, data) => sum + data.totalExpenses, 0)
        const totalExpenseAmount = processedData.reduce((sum, data) => sum + data.expenseAmount, 0)
        const netProfit = totalRevenue - totalExpenseAmount
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
        const avgInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0
        const avgExpenseValue = totalExpenses > 0 ? totalExpenseAmount / totalExpenses : 0

        const averageGrowth =
          processedData.length > 1
            ? processedData.slice(1).reduce((sum, data) => sum + data.growth, 0) / (processedData.length - 1)
            : 0

        // Find best and worst performing months
        const bestMonth = processedData.reduce((best, current) => (current.netProfit > best.netProfit ? current : best))
        const worstMonth = processedData.reduce((worst, current) =>
          current.netProfit < worst.netProfit ? current : worst,
        )

        // Calculate growth trends
        const recentMonths = processedData.slice(-3)
        const olderMonths = processedData.slice(-6, -3)
        const recentAvgRevenue = recentMonths.reduce((sum, m) => sum + m.totalRevenue, 0) / recentMonths.length
        const olderAvgRevenue = olderMonths.reduce((sum, m) => sum + m.totalRevenue, 0) / olderMonths.length
        const revenueGrowthTrend =
          olderAvgRevenue > 0 ? ((recentAvgRevenue - olderAvgRevenue) / olderAvgRevenue) * 100 : 0

        const recentAvgExpenses = recentMonths.reduce((sum, m) => sum + m.expenseAmount, 0) / recentMonths.length
        const olderAvgExpenses = olderMonths.reduce((sum, m) => sum + m.expenseAmount, 0) / olderMonths.length
        const expenseGrowthTrend =
          olderAvgExpenses > 0 ? ((recentAvgExpenses - olderAvgExpenses) / olderAvgExpenses) * 100 : 0

        setKpiData({
          totalRevenue,
          totalInvoices,
          totalExpenses,
          totalExpenseAmount,
          netProfit,
          averageGrowth: Math.round(averageGrowth * 100) / 100,
          profitMargin: Math.round(profitMargin * 100) / 100,
          avgInvoiceValue,
          avgExpenseValue,
          bestMonth: bestMonth.monthName,
          worstMonth: worstMonth.monthName,
          totalClients: additionalMetrics?.totalClients || 0,
          totalProducts: additionalMetrics?.totalProducts || 0,
          revenueGrowthTrend: Math.round(revenueGrowthTrend * 100) / 100,
          expenseGrowthTrend: Math.round(expenseGrowthTrend * 100) / 100,
        })
      }
    } catch (error) {
      console.error("Error fetching monthly data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportReport = () => {
    const csvContent = [
      ["Mes", "Ingresos", "Gastos", "Ganancia Neta", "Margen de Ganancia", "Facturas", "Gastos Registrados"].join(","),
      ...monthlyData.map((data) =>
        [
          data.monthName,
          data.totalRevenue,
          data.expenseAmount,
          data.netProfit,
          `${data.profitMargin}%`,
          data.totalInvoices,
          data.totalExpenses,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `reporte-mensual-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const performanceData = monthlyData.map((data) => ({
    ...data,
    efficiency: data.totalRevenue > 0 ? (data.netProfit / data.totalRevenue) * 100 : 0,
    revenuePerInvoice: data.totalInvoices > 0 ? data.totalRevenue / data.totalInvoices : 0,
  }))

  const categoryData = [
    { name: "Ingresos", value: kpiData.totalRevenue, color: "#3B82F6", percentage: 100 },
    {
      name: "Gastos",
      value: kpiData.totalExpenseAmount,
      color: "#EF4444",
      percentage: (kpiData.totalExpenseAmount / kpiData.totalRevenue) * 100,
    },
    {
      name: "Ganancia",
      value: kpiData.netProfit,
      color: "#10B981",
      percentage: (kpiData.netProfit / kpiData.totalRevenue) * 100,
    },
  ]

  const kpiCards = [
    {
      title: "Margen de Ganancia",
      value: `${kpiData.profitMargin}%`,
      change: kpiData.profitMargin > 20 ? "positive" : kpiData.profitMargin > 10 ? "neutral" : "negative",
      icon: Target,
      color: "emerald",
    },
    {
      title: "Valor Promedio Factura",
      value: formatCurrency(kpiData.avgInvoiceValue),
      change: "neutral",
      icon: FileText,
      color: "blue",
    },
    {
      title: "Crecimiento Promedio",
      value: `${kpiData.averageGrowth}%`,
      change: kpiData.averageGrowth > 0 ? "positive" : "negative",
      icon: TrendingUp,
      color: "purple",
    },
    {
      title: "Tendencia Ingresos",
      value: `${kpiData.revenueGrowthTrend}%`,
      change: kpiData.revenueGrowthTrend > 0 ? "positive" : "negative",
      icon: Activity,
      color: "indigo",
    },
  ]

  const getQuarterlyData = () => {
    const quarters: { [key: string]: MonthlyData[] } = {}
    monthlyData.forEach((data) => {
      const monthNumber = parseInt(data.month.split("/")[0])
      const quarter = Math.ceil(monthNumber / 3)
      const year = data.year
      const key = `Q${quarter} ${year}`
      if (!quarters[key]) quarters[key] = []
      quarters[key].push(data)
    })

    return Object.entries(quarters).map(([quarter, data]) => ({
      quarter,
      totalRevenue: data.reduce((sum, d) => sum + d.totalRevenue, 0),
      totalExpenses: data.reduce((sum, d) => sum + d.expenseAmount, 0),
      netProfit: data.reduce((sum, d) => sum + d.netProfit, 0),
      avgGrowth: data.reduce((sum, d) => sum + d.growth, 0) / data.length,
      monthCount: data.length,
    }))
  }

  const quarterlyData = getQuarterlyData()

  return (
    <div className="container-responsive py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="heading-responsive font-bold text-slate-900">Reportes Mensuales</h1>
          <p className="text-responsive text-slate-600 mt-1">Análisis detallado de tu rendimiento financiero mensual</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleExportReport}
            variant="outline"
            className="button-responsive border-brand hover-brand bg-transparent"
            disabled={loading}
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Exportar</span>
            <span className="sm:hidden">CSV</span>
          </Button>
          <Button
            onClick={fetchMonthlyData}
            className="button-responsive gradient-brand hover-brand"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            <span className="hidden sm:inline">Actualizar</span>
            <span className="sm:hidden">Sync</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="card-responsive">
                <CardContent className="p-4">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-8 bg-slate-200 rounded w-1/2"></div>
                    <div className="h-3 bg-slate-200 rounded w-full"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards - Enhanced responsive grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 animate-fade-in">
              <CardContent className="card-responsive">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-responsive text-blue-600 font-medium">Ingresos Totales</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-900">
                      {formatCurrency(kpiData.totalRevenue)}
                    </p>
                    <p className="text-xs sm:text-sm text-blue-700">
                      {kpiData.revenueGrowthTrend > 0 ? "+" : ""}
                      {kpiData.revenueGrowthTrend}% vs mes anterior
                    </p>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-full">
                    <DollarSign className="h-6 w-6 text-blue-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100 animate-fade-in">
              <CardContent className="card-responsive">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-responsive text-emerald-600 font-medium">Ganancia Neta</p>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-900">
                      {formatCurrency(kpiData.netProfit)}
                    </p>
                    <p className="text-xs sm:text-sm text-emerald-700">Margen: {kpiData.profitMargin}%</p>
                  </div>
                  <div className="p-3 bg-emerald-200 rounded-full">
                    <TrendingUp className="h-6 w-6 text-emerald-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100 animate-fade-in">
              <CardContent className="card-responsive">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-responsive text-amber-600 font-medium">Total Gastos</p>
                    <p className="text-xl sm:text-2xl font-bold text-amber-900">
                      {formatCurrency(kpiData.totalExpenseAmount)}
                    </p>
                    <p className="text-xs sm:text-sm text-amber-700">
                      {kpiData.expenseGrowthTrend > 0 ? "+" : ""}
                      {kpiData.expenseGrowthTrend}% vs mes anterior
                    </p>
                  </div>
                  <div className="p-3 bg-amber-200 rounded-full">
                    <Receipt className="h-6 w-6 text-amber-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-slate-100 animate-fade-in">
              <CardContent className="card-responsive">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-responsive text-slate-600 font-medium">Promedio Crecimiento</p>
                    <p className="text-xl sm:text-2xl font-bold text-slate-900">
                      {kpiData.averageGrowth > 0 ? "+" : ""}
                      {kpiData.averageGrowth}%
                    </p>
                    <p className="text-xs sm:text-sm text-slate-700">Tendencia mensual</p>
                  </div>
                  <div className="p-3 bg-slate-200 rounded-full">
                    <BarChart3 className="h-6 w-6 text-slate-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Revenue Chart - Enhanced responsive */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 animate-fade-in">
            <CardHeader className="card-responsive pb-4">
              <CardTitle className="text-slate-800 flex items-center gap-2 text-lg sm:text-xl">
                <LineChartIcon className="h-5 w-6" />
                Evolución de Ingresos y Gastos
              </CardTitle>
              <CardDescription className="text-responsive">
                Comparativa mensual de ingresos vs gastos con tendencias
              </CardDescription>
            </CardHeader>
            <CardContent className="card-responsive pt-0">
              <div className="h-[300px] sm:h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis
                      dataKey="monthName"
                      stroke="#64748B"
                      fontSize={12}
                      angle={isClient && window.innerWidth < 640 ? -45 : 0}
                      textAnchor={isClient && window.innerWidth < 640 ? "end" : "middle"}
                      height={isClient && window.innerWidth < 640 ? 60 : 30}
                    />
                    <YAxis stroke="#64748B" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "none",
                        borderRadius: "12px",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                        padding: "12px",
                      }}
                      formatter={(value: any) => formatCurrency(value)}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalRevenue"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                      name="Ingresos"
                    />
                    <Line
                      type="monotone"
                      dataKey="expenseAmount"
                      stroke="#EF4444"
                      strokeWidth={3}
                      dot={{ fill: "#EF4444", strokeWidth: 2, r: 4 }}
                      name="Gastos"
                    />
                    <Line
                      type="monotone"
                      dataKey="netProfit"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                      name="Ganancia Neta"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Tabs with better mobile support */}
          <Tabs defaultValue="monthly" className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <TabsList className="grid w-full sm:w-auto grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 bg-slate-100">
                <TabsTrigger
                  value="monthly"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Desglose</span>
                  <span className="sm:hidden">Mes</span>
                </TabsTrigger>
                <TabsTrigger
                  value="financial"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Análisis</span>
                  <span className="sm:hidden">$$</span>
                </TabsTrigger>
                <TabsTrigger
                  value="performance"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Rendimiento</span>
                  <span className="sm:hidden">📊</span>
                </TabsTrigger>
                <TabsTrigger
                  value="insights"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Insights</span>
                  <span className="sm:hidden">💡</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Monthly Breakdown Tab - Enhanced responsive */}
            <TabsContent value="monthly" className="space-y-6">
              <div className="grid gap-4 sm:gap-6">
                {monthlyData.map((data, index) => (
                  <Card
                    key={index}
                    className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 animate-stagger"
                  >
                    <CardContent className="card-responsive">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">{data.monthName}</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
                            <div>
                              <p className="text-xs sm:text-sm text-slate-600">Ingresos</p>
                              <p className="text-sm sm:text-base font-semibold text-emerald-600">
                                {formatCurrency(data.totalRevenue)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm text-slate-600">Gastos</p>
                              <p className="text-sm sm:text-base font-semibold text-red-600">
                                {formatCurrency(data.expenseAmount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm text-slate-600">Ganancia</p>
                              <p className="text-sm sm:text-base font-semibold text-blue-600">
                                {formatCurrency(data.netProfit)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm text-slate-600">Margen</p>
                              <p className="text-sm sm:text-base font-semibold text-slate-900">{data.profitMargin}%</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-row sm:flex-col gap-2 sm:gap-1 text-center">
                          <div className="flex-1 sm:flex-none">
                            <p className="text-xs text-slate-600">Facturas</p>
                            <p className="text-lg sm:text-xl font-bold text-blue-600">{data.totalInvoices}</p>
                          </div>
                          <div className="flex-1 sm:flex-none">
                            <p className="text-xs text-slate-600">Gastos</p>
                            <p className="text-lg sm:text-xl font-bold text-amber-600">{data.totalExpenses}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Financial Analysis Tab - Enhanced responsive */}
            <TabsContent value="financial" className="space-y-6 sm:space-y-8">
              <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
                  <CardHeader className="card-responsive pb-4">
                    <CardTitle className="text-slate-800 flex items-center gap-2 text-lg sm:text-xl">
                      <PieChartIcon className="h-5 w-5" />
                      Distribución Financiera
                    </CardTitle>
                    <CardDescription className="text-responsive">
                      Análisis de la composición de ingresos y gastos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="card-responsive pt-0">
                    <div className="h-[250px] sm:h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={isClient && window.innerWidth < 640 ? 40 : 60}
                            outerRadius={isClient && window.innerWidth < 640 ? 80 : 120}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => formatCurrency(value)}
                            contentStyle={{
                              backgroundColor: "white",
                              border: "none",
                              borderRadius: "12px",
                              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                              padding: "12px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-1 gap-3 mt-4">
                      {categoryData.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }}></div>
                            <span className="font-medium text-slate-700 text-sm sm:text-base">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-slate-900 text-sm sm:text-base">
                              {formatCurrency(item.value)}
                            </p>
                            <p className="text-xs text-slate-500">{item.percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
                  <CardHeader>
                    <CardTitle className="text-slate-800 flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Métricas de Eficiencia
                    </CardTitle>
                    <CardDescription>Indicadores clave de rendimiento financiero</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700">Margen de Ganancia</span>
                        <span className="text-sm font-bold text-slate-900">{kpiData.profitMargin}%</span>
                      </div>
                      <Progress value={Math.max(0, Math.min(100, kpiData.profitMargin))} className="h-2" />
                      <p className="text-xs text-slate-500">
                        {kpiData.profitMargin > 20
                          ? "Excelente rentabilidad"
                          : kpiData.profitMargin > 10
                            ? "Rentabilidad saludable"
                            : "Necesita optimización"}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700">Eficiencia Operativa</span>
                        <span className="text-sm font-bold text-slate-900">
                          {(((kpiData.totalRevenue - kpiData.totalExpenseAmount) / kpiData.totalRevenue) * 100).toFixed(
                            1,
                          )}
                          %
                        </span>
                      </div>
                      <Progress
                        value={Math.max(
                          0,
                          Math.min(
                            100,
                            ((kpiData.totalRevenue - kpiData.totalExpenseAmount) / kpiData.totalRevenue) * 100,
                          ),
                        )}
                        className="h-2"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-emerald-600">{kpiData.bestMonth}</p>
                        <p className="text-xs text-slate-500">Mejor mes</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">{kpiData.worstMonth}</p>
                        <p className="text-xs text-slate-500">Mes más bajo</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-8">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
                <CardHeader>
                  <CardTitle className="text-slate-800 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Análisis de Rendimiento Mensual
                  </CardTitle>
                  <CardDescription>Evaluación detallada de eficiencia y productividad</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={performanceData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="monthName" stroke="#64748B" fontSize={12} />
                        <YAxis stroke="#64748B" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "none",
                            borderRadius: "12px",
                            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                            padding: "12px",
                          }}
                          formatter={(value: any, name: string) => [
                            name === "efficiency" ? `${value.toFixed(1)}%` : formatCurrency(value),
                            name === "efficiency" ? "Eficiencia" : "Ingreso por Factura",
                          ]}
                        />
                        <Bar dataKey="efficiency" fill="#3B82F6" name="efficiency" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="space-y-8">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
                  <CardHeader>
                    <CardTitle className="text-blue-800 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Insights Positivos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {kpiData.profitMargin > 15 && (
                      <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-emerald-800">Excelente Rentabilidad</p>
                          <p className="text-sm text-emerald-700">
                            Tu margen de ganancia del {kpiData.profitMargin}% está por encima del promedio de la
                            industria.
                          </p>
                        </div>
                      </div>
                    )}

                    {kpiData.revenueGrowthTrend > 5 && (
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <ArrowUpRight className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-800">Crecimiento Sostenido</p>
                          <p className="text-sm text-blue-700">
                            Tus ingresos muestran una tendencia de crecimiento del {kpiData.revenueGrowthTrend}%.
                          </p>
                        </div>
                      </div>
                    )}

                    {kpiData.avgInvoiceValue > 10000 && (
                      <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <DollarSign className="h-5 w-5 text-purple-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-purple-800">Alto Valor por Factura</p>
                          <p className="text-sm text-purple-700">
                            Tu valor promedio por factura de {formatCurrency(kpiData.avgInvoiceValue)} indica clientes
                            de alto valor.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100">
                  <CardHeader>
                    <CardTitle className="text-amber-800 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Áreas de Mejora
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {kpiData.profitMargin < 10 && (
                      <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-800">Margen de Ganancia Bajo</p>
                          <p className="text-sm text-red-700">
                            Considera revisar tus costos operativos para mejorar la rentabilidad.
                          </p>
                        </div>
                      </div>
                    )}

                    {kpiData.expenseGrowthTrend > 10 && (
                      <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <TrendingUp className="h-5 w-5 text-orange-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-orange-800">Gastos en Aumento</p>
                          <p className="text-sm text-orange-700">
                            Tus gastos han aumentado un {kpiData.expenseGrowthTrend}%. Revisa las categorías de mayor
                            impacto.
                          </p>
                        </div>
                      </div>
                    )}

                    {kpiData.averageGrowth < 0 && (
                      <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <ArrowDownRight className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-800">Crecimiento Negativo</p>
                          <p className="text-sm text-yellow-700">
                            Considera estrategias para revertir la tendencia decreciente en ingresos.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
                <CardHeader>
                  <CardTitle className="text-slate-800 flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Recomendaciones Estratégicas
                  </CardTitle>
                  <CardDescription>Sugerencias basadas en el análisis de tus datos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2">Optimización de Ingresos</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Enfócate en clientes de alto valor</li>
                        <li>• Considera aumentar precios gradualmente</li>
                        <li>• Diversifica tus servicios</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
                      <h4 className="font-semibold text-emerald-800 mb-2">Control de Gastos</h4>
                      <ul className="text-sm text-emerald-700 space-y-1">
                        <li>• Revisa gastos recurrentes</li>
                        <li>• Negocia mejores tarifas con proveedores</li>
                        <li>• Automatiza procesos para reducir costos</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
