"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  Area,
  AreaChart,
  ComposedChart,
} from "recharts"
import { supabase } from "@/lib/supabase"
import { useCurrency } from "@/hooks/use-currency"
import {
  TrendingUp,
  DollarSign,
  BarChart3,
  Download,
  Target,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PieChartIcon,
  RefreshCw,
  Loader2,
  Calendar,
  Percent,
  Clock,
  Zap,
  Award,
  LineChart as LineChartIcon,
  Lightbulb,
  AlertTriangle,
  Briefcase,
  Brain,
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
  efficiency: number
  revenuePerInvoice: number
  expensePerInvoice: number
  cashFlow: number
  roi: number
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
  consistencyScore: number
  seasonalityIndex: number
  businessHealthScore: number
  predictedNextMonth: number
}

interface AIInsights {
  predictions: {
    nextMonthRevenue: number
    confidenceLevel: number
    nextQuarterRevenue: number
  }
  recommendations: Array<{
    type: string
    priority: string
    action: string
    impact: string
  }>
  risks: Array<{
    level: string
    type: string
    description: string
    recommendation: string
  }>
  opportunities: Array<{
    area: string
    potential: string
    action: string
  }>
  seasonalityScore: number
  marketPosition: string
}

// Funciones de IA para análisis inteligente
const AIAnalytics = {
  generateAdvancedPredictions: (monthlyData: MonthlyData[]) => {
    const recentData = monthlyData.slice(-6)
    const volatility = AIAnalytics.calculateVolatility(recentData)
    
    return {
      nextMonthRevenue: AIAnalytics.predictNextMonth(recentData),
      confidenceLevel: volatility < 0.2 ? 95 : volatility < 0.4 ? 80 : 65,
      nextQuarterRevenue: AIAnalytics.predictNextQuarter(recentData)
    }
  },

  calculateVolatility: (data: MonthlyData[]) => {
    if (data.length < 2) {
      return 0
    }
    const revenues = data.map(d => d.totalRevenue)
    const mean = revenues.reduce((a, b) => a + b, 0) / revenues.length
    const variance = revenues.reduce((sum, rev) => sum + Math.pow(rev - mean, 2), 0) / revenues.length
    return Math.sqrt(variance) / mean
  },

  predictNextMonth: (data: MonthlyData[]) => {
    if (data.length === 0) {
      return 0
    }
    const trend = data.length >= 3 ? 
      (data[data.length - 1].totalRevenue - data[data.length - 3].totalRevenue) / 2 : 0
    const lastRevenue = data[data.length - 1].totalRevenue
    return Math.max(0, lastRevenue + trend)
  },

  predictNextQuarter: (data: MonthlyData[]) => {
    const nextMonth = AIAnalytics.predictNextMonth(data)
    const avgGrowth = data.length >= 3 ? 
      data.slice(-3).reduce((sum, d) => sum + d.growth, 0) / 3 : 0
    return nextMonth * 3 * (1 + avgGrowth / 100)
  },

  generateRecommendations: (monthlyData: MonthlyData[], kpiData: KPIData) => {
    const recommendations = []

    if (kpiData.profitMargin < 15) {
      recommendations.push({
        type: 'pricing',
        priority: 'high',
        action: 'Analizar incremento de precios del 8-12%',
        impact: 'Potencial aumento de margen del 3-5%'
      })
    }

    if (kpiData.averageGrowth < 0) {
      recommendations.push({
        type: 'marketing',
        priority: 'high',
        action: 'Implementar estrategia de retención de clientes',
        impact: 'Recuperación estimada del 15-20% en ingresos'
      })
    }

    if (kpiData.consistencyScore < 50) {
      recommendations.push({
        type: 'operations',
        priority: 'medium',
        action: 'Estabilizar procesos operativos',
        impact: 'Mejora en predictibilidad de ingresos'
      })
    }

    return recommendations
  },

  identifyRisks: (monthlyData: MonthlyData[], kpiData: KPIData) => {
    const risks = []
    
    if (kpiData.netProfit < 0) {
      risks.push({
        level: 'high',
        type: 'cashflow',
        description: 'Flujo de efectivo negativo detectado',
        recommendation: 'Revisar gastos y acelerar cobros inmediatamente'
      })
    }

    if (kpiData.profitMargin < 5) {
      risks.push({
        level: 'medium',
        type: 'profitability',
        description: 'Margen de ganancia muy bajo',
        recommendation: 'Optimizar estructura de costos'
      })
    }

    return risks
  },

  identifyOpportunities: (monthlyData: MonthlyData[], kpiData: KPIData) => {
    const opportunities = []

    if (kpiData.businessHealthScore > 75) {
      opportunities.push({
        area: 'expansion',
        potential: 'Alto potencial de crecimiento',
        action: 'Considerar expansión de servicios o mercados'
      })
    }

    if (kpiData.avgInvoiceValue > 0) {
      opportunities.push({
        area: 'pricing',
        potential: 'Optimización de precios detectada',
        action: 'Revisar estrategia de precios comparativa'
      })
    }

    return opportunities
  }
}

export default function MonthlyReportsPage() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod] = useState("12")
  const [aiInsights, setAiInsights] = useState<AIInsights>({
    predictions: { nextMonthRevenue: 0, confidenceLevel: 0, nextQuarterRevenue: 0 },
    recommendations: [],
    risks: [],
    opportunities: [],
    seasonalityScore: 0,
    marketPosition: 'Analizando...'
  })
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
    consistencyScore: 0,
    seasonalityIndex: 0,
    businessHealthScore: 0,
    predictedNextMonth: 0,
  })

  const { formatCurrency } = useCurrency()

  const fetchAdditionalMetrics = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return
      }

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

  const fetchMonthlyData = useCallback(async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      const monthsToFetch = Number.parseInt(selectedPeriod)
      
      // Obtener facturas directamente para cálculos precisos
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("id, total, created_at, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })

      // Obtener gastos directamente para cálculos precisos
      const { data: expenses, error: expensesError } = await supabase
        .from("expenses")
        .select("id, amount, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })

      console.log("Todas las facturas encontradas:", invoices?.length || 0)
      console.log("Estados de facturas:", invoices?.map(inv => inv.status))
      console.log("Gastos encontrados:", expenses?.length || 0)
      
      if (invoicesError) {
        console.error("Error al obtener facturas:", invoicesError)
      }
      if (expensesError) {
        console.error("Error al obtener gastos:", expensesError)
      }

      // Filtrar facturas válidas
      const validInvoices = invoices?.filter(invoice => {
        const hasValidTotal = invoice.total && invoice.total > 0
        const isValidStatus = !invoice.status || 
                             invoice.status === 'paid' || 
                             invoice.status === 'pending' || 
                             invoice.status === 'completed' ||
                             invoice.status === 'pagada' ||
                             invoice.status === 'pagado' ||
                             invoice.status === 'finalizada'
        
        console.log(`Factura ${invoice.id}: total=${invoice.total}, status="${invoice.status}", válida=${hasValidTotal && isValidStatus}`)
        return hasValidTotal && isValidStatus
      }) || []

      console.log("Facturas válidas después del filtro:", validInvoices.length)

      const additionalMetrics = await fetchAdditionalMetrics()

      // Procesar datos por mes
      const monthlyDataMap = new Map()
      
      // Procesar facturas válidas
      validInvoices.forEach(invoice => {
        const date = new Date(invoice.created_at)
        const month = date.getMonth() + 1
        const year = date.getFullYear()
        const key = `${month}/${year}`
        
        if (!monthlyDataMap.has(key)) {
          monthlyDataMap.set(key, {
            month: month,
            year: year,
            totalRevenue: 0,
            totalInvoices: 0,
            totalExpenses: 0,
            expenseAmount: 0
          })
        }
        
        const monthData = monthlyDataMap.get(key)
        monthData.totalRevenue += invoice.total || 0
        monthData.totalInvoices += 1
      })

      // Procesar gastos
      expenses?.forEach(expense => {
        const date = new Date(expense.created_at)
        const month = date.getMonth() + 1
        const year = date.getFullYear()
        const key = `${month}/${year}`
        
        if (!monthlyDataMap.has(key)) {
          monthlyDataMap.set(key, {
            month: month,
            year: year,
            totalRevenue: 0,
            totalInvoices: 0,
            totalExpenses: 0,
            expenseAmount: 0
          })
        }
        
        const monthData = monthlyDataMap.get(key)
        monthData.expenseAmount += expense.amount || 0
        monthData.totalExpenses += 1
      })

      // Convertir a array y ordenar
      const monthlyStats = Array.from(monthlyDataMap.values())
        .sort((a, b) => {
          if (a.year !== b.year) {
            return a.year - b.year
          }
          return a.month - b.month
        })
        .slice(-monthsToFetch)

      if (monthlyStats.length > 0) {
        const processedData = monthlyStats.map((stat, index) => {
          const monthNames = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
          ]

          let growth = 0
          if (index > 0) {
            const previousRevenue = monthlyStats[index - 1].totalRevenue || 0
            const currentRevenue = stat.totalRevenue || 0
            if (previousRevenue > 0) {
              growth = ((currentRevenue - previousRevenue) / previousRevenue) * 100
            }
          }

          const revenue = stat.totalRevenue || 0
          const expenseAmount = stat.expenseAmount || 0
          const netProfit = revenue - expenseAmount
          
          const rawProfitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0
          const profitMargin = Math.max(0, Math.min(95, rawProfitMargin))
          
          const avgInvoiceValue = stat.totalInvoices > 0 ? revenue / stat.totalInvoices : 0
          const avgExpenseValue = stat.totalExpenses > 0 ? expenseAmount / stat.totalExpenses : 0
          
          const efficiency = revenue > 0 ? (netProfit / revenue) * 100 : 0
          const revenuePerInvoice = avgInvoiceValue
          const expensePerInvoice = stat.totalInvoices > 0 ? expenseAmount / stat.totalInvoices : 0
          const cashFlow = netProfit
          const roi = expenseAmount > 0 ? ((netProfit / expenseAmount) * 100) : 0

          return {
            month: `${stat.month}/${stat.year}`,
            year: stat.year,
            monthName: monthNames[stat.month - 1],
            totalInvoices: stat.totalInvoices || 0,
            totalExpenses: stat.totalExpenses || 0,
            totalRevenue: revenue,
            expenseAmount: expenseAmount,
            netProfit: netProfit,
            growth: Math.round(growth * 100) / 100,
            profitMargin: Math.round(profitMargin * 100) / 100,
            avgInvoiceValue: avgInvoiceValue,
            avgExpenseValue: avgExpenseValue,
            efficiency: Math.round(efficiency * 100) / 100,
            revenuePerInvoice: revenuePerInvoice,
            expensePerInvoice: expensePerInvoice,
            cashFlow: cashFlow,
            roi: Math.round(roi * 100) / 100,
          }
        })

        setMonthlyData(processedData)

        // Calcular KPIs
        const totalRevenue = processedData.reduce((sum, data) => sum + data.totalRevenue, 0)
        const totalInvoices = processedData.reduce((sum, data) => sum + data.totalInvoices, 0)
        const totalExpenses = processedData.reduce((sum, data) => sum + data.totalExpenses, 0)
        const totalExpenseAmount = processedData.reduce((sum, data) => sum + data.expenseAmount, 0)
        const netProfit = totalRevenue - totalExpenseAmount
        
        const rawProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
        const profitMargin = Math.max(0, Math.min(95, rawProfitMargin))
        
        const avgInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0
        const avgExpenseValue = totalExpenses > 0 ? totalExpenseAmount / totalExpenses : 0

        const averageGrowth = processedData.length > 1
          ? processedData.slice(1).reduce((sum, data) => sum + data.growth, 0) / (processedData.length - 1)
          : 0

        const bestMonth = processedData.length > 0 ? processedData.reduce((best, current) => (current.netProfit > best.netProfit ? current : best)) : { monthName: "N/A" }
        const worstMonth = processedData.length > 0 ? processedData.reduce((worst, current) =>
          current.netProfit < worst.netProfit ? current : worst,
        ) : { monthName: "N/A" }

        const recentMonths = processedData.slice(-3)
        const olderMonths = processedData.slice(-6, -3)
        const recentAvgRevenue = recentMonths.length > 0 ? recentMonths.reduce((sum, m) => sum + m.totalRevenue, 0) / recentMonths.length : 0
        const olderAvgRevenue = olderMonths.length > 0 ? olderMonths.reduce((sum, m) => sum + m.totalRevenue, 0) / olderMonths.length : 0
        const revenueGrowthTrend = olderAvgRevenue > 0 ? ((recentAvgRevenue - olderAvgRevenue) / olderAvgRevenue) * 100 : 0

        const recentAvgExpenses = recentMonths.length > 0 ? recentMonths.reduce((sum, m) => sum + m.expenseAmount, 0) / recentMonths.length : 0
        const olderAvgExpenses = olderMonths.length > 0 ? olderMonths.reduce((sum, m) => sum + m.expenseAmount, 0) / olderMonths.length : 0
        const expenseGrowthTrend = olderAvgExpenses > 0 ? ((recentAvgExpenses - olderAvgExpenses) / olderAvgExpenses) * 100 : 0

        const consistencyScore = processedData.length > 3 ? 
          100 - (processedData.slice(-6).reduce((acc, curr, idx, arr) => {
            if (idx === 0) {
              return acc
            }
            const variance = Math.abs(curr.growth - arr[idx - 1].growth)
            return acc + variance
          }, 0) / 5) : 50

        const seasonalityIndex = processedData.length >= 12 ? 
          Math.abs(processedData.slice(-12).reduce((sum, data) => {
            const monthIndex = data.month.split('/')[0]
            const seasonalWeight = Math.sin((parseInt(monthIndex) - 1) * Math.PI / 6)
            return sum + (data.totalRevenue * seasonalWeight)
          }, 0) / 12) / 1000 : 0

        const businessHealthScore = Math.round(
          (profitMargin > 0 ? 25 : 0) +
          (averageGrowth > 0 ? 25 : 0) +
          (consistencyScore > 70 ? 25 : consistencyScore / 70 * 25) +
          (revenueGrowthTrend > 0 ? 25 : 0)
        )

        const predictedNextMonth = processedData.length >= 3 ?
          processedData.slice(-3).reduce((sum, data) => sum + data.totalRevenue, 0) / 3 * 
          (1 + (averageGrowth / 100)) : 0

        const currentKpiData = {
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
          consistencyScore: Math.round(consistencyScore * 100) / 100,
          seasonalityIndex: Math.round(seasonalityIndex * 100) / 100,
          businessHealthScore,
          predictedNextMonth: Math.round(predictedNextMonth),
        }

        setKpiData(currentKpiData)

        // Generar insights de IA
        const aiPredictions = AIAnalytics.generateAdvancedPredictions(processedData)
        const recommendations = AIAnalytics.generateRecommendations(processedData, currentKpiData)
        const risks = AIAnalytics.identifyRisks(processedData, currentKpiData)
        const opportunities = AIAnalytics.identifyOpportunities(processedData, currentKpiData)

        setAiInsights({
          predictions: aiPredictions,
          recommendations,
          risks,
          opportunities,
          seasonalityScore: Math.round(seasonalityIndex * 100) / 100,
          marketPosition: businessHealthScore >= 75 ? 'Líder' : businessHealthScore >= 50 ? 'Competitivo' : 'En desarrollo'
        })
      }
    } catch (error) {
      console.error("Error fetching monthly data:", error)
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod])

  useEffect(() => {
    fetchMonthlyData()
  }, [fetchMonthlyData])

  const handleExportReport = () => {
    const csvContent = [
      ["Mes", "Ingresos", "Gastos", "Ganancia Neta", "Facturas", "Margen"].join(","),
      ...monthlyData.map((data) =>
        [
          data.monthName,
          data.totalRevenue,
          data.expenseAmount,
          data.netProfit,
          data.totalInvoices,
          `${data.profitMargin}%`,
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

  return (
    <div className="container-responsive py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="heading-responsive font-bold text-slate-900">Reportes Mensuales</h1>
          <p className="text-responsive text-slate-600 mt-1">Análisis detallado de tu rendimiento financiero mensual con IA</p>
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
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Resumen</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <PieChartIcon className="h-4 w-4" />
              <span>Análisis</span>
            </TabsTrigger>
            <TabsTrigger value="ai-insights" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>IA Insights</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Revenue Card */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Ingresos Totales</p>
                      <p className="text-xl font-bold text-blue-900">
                        {formatCurrency(kpiData.totalRevenue)}
                      </p>
                      <div className="flex items-center space-x-1">
                        {kpiData.revenueGrowthTrend >= 0 ? (
                          <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-red-600" />
                        )}
                        <span className={`text-xs font-medium ${kpiData.revenueGrowthTrend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {kpiData.revenueGrowthTrend !== 0 ? `${Math.abs(kpiData.revenueGrowthTrend)}%` : 'Sin cambios'}
                        </span>
                      </div>
                    </div>
                    <div className="p-2 bg-blue-200 rounded-full">
                      <DollarSign className="h-5 w-5 text-blue-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Net Profit Card */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Ganancia Neta</p>
                      <p className="text-xl font-bold text-emerald-900">
                        {formatCurrency(kpiData.netProfit)}
                      </p>
                      <div className="flex items-center space-x-1">
                        <Percent className="h-3 w-3 text-emerald-600" />
                        <span className="text-xs text-emerald-700 font-medium">
                          {kpiData.profitMargin.toFixed(1)}% margen
                        </span>
                      </div>
                    </div>
                    <div className="p-2 bg-emerald-200 rounded-full">
                      <TrendingUp className="h-5 w-5 text-emerald-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Business Health Score */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">Salud del Negocio</p>
                      <p className="text-xl font-bold text-purple-900">
                        {kpiData.businessHealthScore}/100
                      </p>
                      <div className="flex items-center space-x-1">
                        <Award className="h-3 w-3 text-purple-600" />
                        <span className="text-xs text-purple-700 font-medium">
                          {kpiData.businessHealthScore >= 75 ? 'Excelente' : 
                           kpiData.businessHealthScore >= 50 ? 'Bueno' : 'Atención'}
                        </span>
                      </div>
                    </div>
                    <div className="p-2 bg-purple-200 rounded-full">
                      <Zap className="h-5 w-5 text-purple-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Average Growth */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Crecimiento</p>
                      <p className="text-xl font-bold text-amber-900">
                        {kpiData.averageGrowth >= 0 ? '+' : ''}{kpiData.averageGrowth}%
                      </p>
                      <div className="flex items-center space-x-1">
                        <Activity className="h-3 w-3 text-amber-600" />
                        <span className="text-xs text-amber-700 font-medium">promedio</span>
                      </div>
                    </div>
                    <div className="p-2 bg-amber-200 rounded-full">
                      <BarChart3 className="h-5 w-5 text-amber-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Consistency Score */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-indigo-100 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-indigo-600 font-medium uppercase tracking-wide">Consistencia</p>
                      <p className="text-xl font-bold text-indigo-900">
                        {kpiData.consistencyScore}%
                      </p>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-indigo-600" />
                        <span className="text-xs text-indigo-700 font-medium">estabilidad</span>
                      </div>
                    </div>
                    <div className="p-2 bg-indigo-200 rounded-full">
                      <Target className="h-5 w-5 text-indigo-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Predicted Next Month */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-50 to-teal-100 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-teal-600 font-medium uppercase tracking-wide">Proyección</p>
                      <p className="text-xl font-bold text-teal-900">
                        {formatCurrency(kpiData.predictedNextMonth)}
                      </p>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-teal-600" />
                        <span className="text-xs text-teal-700 font-medium">próximo mes</span>
                      </div>
                    </div>
                    <div className="p-2 bg-teal-200 rounded-full">
                      <Brain className="h-5 w-5 text-teal-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trend Chart */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <LineChartIcon className="h-5 w-5 text-blue-600" />
                    <span>Tendencia de Ingresos y Gastos</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="monthName" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Bar dataKey="totalRevenue" fill="#3B82F6" name="Ingresos" />
                      <Bar dataKey="expenseAmount" fill="#EF4444" name="Gastos" />
                      <Line type="monotone" dataKey="netProfit" stroke="#10B981" strokeWidth={3} name="Ganancia Neta" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Performance Chart */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-emerald-600" />
                    <span>Margen de Ganancia</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="monthName" />
                      <YAxis />
                      <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                      <Area 
                        type="monotone" 
                        dataKey="profitMargin" 
                        stroke="#10B981" 
                        fill="#10B981" 
                        fillOpacity={0.3}
                        name="Margen (%)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Detailed Analytics */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <span>Análisis de Rendimiento</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{kpiData.businessHealthScore}</div>
                        <div className="text-sm text-blue-700">Score de Salud</div>
                      </div>
                      <div className="text-center p-4 bg-emerald-50 rounded-lg">
                        <div className="text-2xl font-bold text-emerald-600">{kpiData.consistencyScore}%</div>
                        <div className="text-sm text-emerald-700">Consistencia</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Valor Promedio por Factura:</span>
                        <span className="font-semibold">{formatCurrency(kpiData.avgInvoiceValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total de Facturas:</span>
                        <span className="font-semibold">{kpiData.totalInvoices}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total de Gastos:</span>
                        <span className="font-semibold">{kpiData.totalExpenses}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Mejor Mes:</span>
                        <span className="font-semibold text-emerald-600">{kpiData.bestMonth}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Mes con Menor Rendimiento:</span>
                        <span className="font-semibold text-red-600">{kpiData.worstMonth}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Month by Month Breakdown */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <span>Desglose Mensual</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {monthlyData.map((month, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-medium">{month.monthName}</span>
                          <div className="text-xs text-gray-600">
                            {month.totalInvoices} facturas • {month.totalExpenses} gastos
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-emerald-600">{formatCurrency(month.netProfit)}</div>
                          <div className="text-xs text-gray-600">{month.profitMargin.toFixed(1)}% margen</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ai-insights" className="space-y-6">
            {/* AI Predictions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-blue-800">
                    <Brain className="h-5 w-5" />
                    <span>Predicciones IA</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-900">
                      {formatCurrency(aiInsights.predictions.nextMonthRevenue)}
                    </div>
                    <div className="text-sm text-blue-700">Próximo Mes</div>
                    <div className="text-xs text-blue-600 mt-1">
                      Confianza: {aiInsights.predictions.confidenceLevel}%
                    </div>
                  </div>
                  <div className="text-center pt-2 border-t">
                    <div className="text-xl font-bold text-blue-800">
                      {formatCurrency(aiInsights.predictions.nextQuarterRevenue)}
                    </div>
                    <div className="text-sm text-blue-700">Próximo Trimestre</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-emerald-800">
                    <Lightbulb className="h-5 w-5" />
                    <span>Recomendaciones</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {aiInsights.recommendations.slice(0, 3).map((rec, index) => (
                      <div key={index} className="p-3 bg-white rounded-lg border border-emerald-200">
                        <div className="flex items-center justify-between mb-2">
                          <Badge 
                            variant={rec.priority === 'high' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {rec.priority === 'high' ? 'Alta' : 'Media'}
                          </Badge>
                          <span className="text-xs text-emerald-600 font-medium capitalize">{rec.type}</span>
                        </div>
                        <p className="text-sm text-gray-700 mb-1">{rec.action}</p>
                        <p className="text-xs text-emerald-600">{rec.impact}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-amber-800">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Alertas IA</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {aiInsights.risks.length > 0 ? (
                      aiInsights.risks.slice(0, 3).map((risk, index) => (
                        <div key={index} className="p-3 bg-white rounded-lg border border-amber-200">
                          <div className="flex items-center justify-between mb-2">
                            <Badge 
                              variant={risk.level === 'high' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {risk.level === 'high' ? 'Alto' : 'Medio'}
                            </Badge>
                            <span className="text-xs text-amber-600 font-medium capitalize">{risk.type}</span>
                          </div>
                          <p className="text-sm text-gray-700 mb-1">{risk.description}</p>
                          <p className="text-xs text-amber-600">{risk.recommendation}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm text-emerald-600">No se detectaron riesgos críticos</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Opportunities */}
            {aiInsights.opportunities.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    <span>Oportunidades de Crecimiento Detectadas por IA</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiInsights.opportunities.map((opp, index) => (
                      <div key={index} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-purple-800 capitalize">{opp.area}</span>
                          <Badge variant="outline" className="text-purple-600 border-purple-300">
                            Oportunidad
                          </Badge>
                        </div>
                        <p className="text-sm text-purple-700 mb-2">{opp.potential}</p>
                        <p className="text-xs text-purple-600">{opp.action}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Market Position */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Briefcase className="h-5 w-5 text-indigo-600" />
                  <span>Análisis de Posición de Mercado con IA</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-indigo-50 rounded-lg">
                    <div className="text-2xl font-bold text-indigo-600">{aiInsights.marketPosition}</div>
                    <div className="text-sm text-indigo-700">Clasificación IA</div>
                  </div>
                  <div className="text-center p-4 bg-teal-50 rounded-lg">
                    <div className="text-2xl font-bold text-teal-600">{aiInsights.seasonalityScore}%</div>
                    <div className="text-sm text-teal-700">Índice Estacional</div>
                  </div>
                  <div className="text-center p-4 bg-rose-50 rounded-lg">
                    <div className="text-2xl font-bold text-rose-600">{kpiData.businessHealthScore}/100</div>
                    <div className="text-sm text-rose-700">Score de Salud</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}