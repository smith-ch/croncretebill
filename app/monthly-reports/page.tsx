"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import {
  TrendingUp,
  FileText,
  DollarSign,
  BarChart3,
  Receipt,
  Download,
  Target,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PieChartIcon,
  RefreshCw,
  Loader2,
  Users,
  Calendar,
  Zap,
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
    
    // Mejorar predicción con análisis de tendencia y estacionalidad
    const nextMonth = AIAnalytics.predictNextMonth(recentData)
    const quarterPrediction = AIAnalytics.predictNextQuarter(recentData)
    
    // Ajustar nivel de confianza basado en múltiples factores
    let confidenceLevel = 90
    if (volatility > 0.4) confidenceLevel -= 25
    if (volatility > 0.6) confidenceLevel -= 15
    if (recentData.length < 4) confidenceLevel -= 10
    
    // Bonus de confianza si hay tendencia clara
    const hasPositiveTrend = recentData.slice(-3).every((d, i, arr) => i === 0 || d.totalRevenue >= arr[i-1].totalRevenue)
    const hasNegativeTrend = recentData.slice(-3).every((d, i, arr) => i === 0 || d.totalRevenue <= arr[i-1].totalRevenue)
    if (hasPositiveTrend || hasNegativeTrend) confidenceLevel += 10
    
    return {
      nextMonthRevenue: Math.max(0, nextMonth),
      confidenceLevel: Math.max(50, Math.min(95, confidenceLevel)),
      nextQuarterRevenue: Math.max(0, quarterPrediction)
    }
  },

  calculateVolatility: (data: MonthlyData[]) => {
    if (data.length < 2) {
      return 0
    }
    const revenues = data.map(d => d.totalRevenue)
    const mean = revenues.reduce((a, b) => a + b, 0) / revenues.length
    
    if (mean === 0) return 1
    
    const variance = revenues.reduce((sum, rev) => sum + Math.pow(rev - mean, 2), 0) / revenues.length
    return Math.sqrt(variance) / mean
  },

  predictNextMonth: (data: MonthlyData[]) => {
    if (data.length === 0) {
      return 0
    }
    
    // Usar regresión lineal simple para mejor predicción
    const n = Math.min(data.length, 6)
    const recentData = data.slice(-n)
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
    
    recentData.forEach((d, i) => {
      const x = i + 1
      const y = d.totalRevenue
      sumX += x
      sumY += y
      sumXY += x * y
      sumX2 += x * x
    })
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    const prediction = slope * (n + 1) + intercept
    
    // Aplicar factor de confianza basado en volatilidad
    const lastRevenue = data[data.length - 1].totalRevenue
    const avgRevenue = sumY / n
    
    // Si hay mucha volatilidad, usar promedio ponderado
    const volatility = AIAnalytics.calculateVolatility(recentData)
    if (volatility > 0.5) {
      return (prediction * 0.4) + (lastRevenue * 0.3) + (avgRevenue * 0.3)
    }
    
    return (prediction * 0.6) + (lastRevenue * 0.4)
  },

  predictNextQuarter: (data: MonthlyData[]) => {
    const nextMonth = AIAnalytics.predictNextMonth(data)
    
    // Calcular tendencia promedio de crecimiento
    const recentData = data.slice(-6)
    const avgGrowth = recentData.length >= 3 ? 
      recentData.slice(-3).reduce((sum, d) => sum + d.growth, 0) / 3 : 0
    
    // Proyectar 3 meses con crecimiento compuesto
    const month1 = nextMonth
    const month2 = month1 * (1 + (avgGrowth / 100))
    const month3 = month2 * (1 + (avgGrowth / 100))
    
    return month1 + month2 + month3
  },

  generateRecommendations: (monthlyData: MonthlyData[], kpiData: KPIData) => {
    const recommendations = []
    const recentData = monthlyData.slice(-3)

    // Análisis de margen de ganancia
    if (kpiData.profitMargin < 15) {
      recommendations.push({
        type: 'pricing',
        priority: 'high',
        action: 'Incrementar precios estratégicamente en productos/servicios de alto valor',
        impact: `Potencial aumento de ganancia: +8% mensual`
      })
    } else if (kpiData.profitMargin > 40) {
      recommendations.push({
        type: 'expansion',
        priority: 'medium',
        action: 'Márgenes excelentes. Considera invertir en marketing o expansión',
        impact: 'Oportunidad de crecimiento acelerado'
      })
    }

    // Análisis de tendencia de crecimiento
    if (kpiData.averageGrowth < -5) {
      recommendations.push({
        type: 'marketing',
        priority: 'high',
        action: 'URGENTE: Activar campaña de captación y retención de clientes',
        impact: 'Recuperación estimada del 20-30% en próximos 3 meses'
      })
    } else if (kpiData.averageGrowth > 15) {
      recommendations.push({
        type: 'scaling',
        priority: 'high',
        action: 'Crecimiento acelerado. Preparar infraestructura para escalar',
        impact: 'Capitalizar momentum de crecimiento'
      })
    }

    // Análisis de consistencia
    if (kpiData.consistencyScore < 50) {
      recommendations.push({
        type: 'operations',
        priority: 'high',
        action: 'Implementar procesos estandarizados y proyecciones mensuales',
        impact: 'Reducir volatilidad del 40-60% y mejorar planificación'
      })
    }

    // Análisis de gastos vs ingresos
    const expenseRatio = kpiData.totalExpenseAmount / kpiData.totalRevenue
    if (expenseRatio > 0.8) {
      recommendations.push({
        type: 'cost-control',
        priority: 'high',
        action: 'Revisar y reducir gastos operativos. Ratio gastos/ingresos muy alto',
        impact: `Ahorro potencial: 15% mensual`
      })
    } else if (expenseRatio < 0.4) {
      recommendations.push({
        type: 'investment',
        priority: 'medium',
        action: 'Margen operativo saludable. Considera invertir en crecimiento',
        impact: 'Oportunidad de inversión estratégica'
      })
    }

    // Análisis del valor promedio de facturas
    if (kpiData.avgInvoiceValue > 0 && recentData.length >= 2) {
      const avgValueTrend = (recentData[recentData.length - 1].avgInvoiceValue - recentData[0].avgInvoiceValue) / recentData[0].avgInvoiceValue
      if (avgValueTrend < -0.1) {
        recommendations.push({
          type: 'upselling',
          priority: 'medium',
          action: 'Valor promedio de factura disminuyendo. Implementar estrategia de upselling',
          impact: 'Incremento estimado del 12-18% en ingresos por cliente'
        })
      }
    }

    // Análisis de salud del negocio
    if (kpiData.businessHealthScore < 40) {
      recommendations.push({
        type: 'restructuring',
        priority: 'high',
        action: 'Score de salud bajo. Revisar modelo de negocio y estrategia general',
        impact: 'Crítico para sostenibilidad a largo plazo'
      })
    } else if (kpiData.businessHealthScore > 75) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        action: 'Negocio saludable. Optimizar procesos para maximizar eficiencia',
        impact: 'Incremento potencial del 10-15% en rentabilidad'
      })
    }

    // Análisis estacional
    if (kpiData.seasonalityIndex > 50) {
      recommendations.push({
        type: 'planning',
        priority: 'medium',
        action: 'Fuerte componente estacional detectado. Planificar inventario y recursos',
        impact: 'Mejor preparación para picos y valles de demanda'
      })
    }

    return recommendations.slice(0, 6) // Mostrar top 6 recomendaciones
  },

  identifyRisks: (monthlyData: MonthlyData[], kpiData: KPIData) => {
    const risks = []
    const recentData = monthlyData.slice(-3)
    
    // Riesgo de flujo de efectivo negativo
    if (kpiData.netProfit < 0) {
      risks.push({
        level: 'high',
        type: 'cashflow',
        description: `Pérdida neta detectada en el período`,
        recommendation: 'Acción inmediata: Reducir gastos 20-30% y acelerar cobros pendientes'
      })
    }

    // Riesgo de margen muy bajo
    if (kpiData.profitMargin < 5 && kpiData.totalRevenue > 0) {
      risks.push({
        level: 'high',
        type: 'profitability',
        description: `Margen crítico del ${kpiData.profitMargin.toFixed(1)}%. Negocio insostenible`,
        recommendation: 'Revisar inmediatamente estructura de costos y precios. Objetivo: 15-20% mínimo'
      })
    } else if (kpiData.profitMargin < 10) {
      risks.push({
        level: 'medium',
        type: 'profitability',
        description: `Margen bajo del ${kpiData.profitMargin.toFixed(1)}%. Riesgo financiero`,
        recommendation: 'Optimizar costos operativos y revisar estrategia de precios'
      })
    }

    // Riesgo de tendencia negativa sostenida
    if (recentData.length >= 3) {
      const allNegativeGrowth = recentData.every(d => d.growth < 0)
      if (allNegativeGrowth) {
        risks.push({
          level: 'high',
          type: 'declining-revenue',
          description: '3 meses consecutivos de decrecimiento. Tendencia alarmante',
          recommendation: 'Análisis urgente de causas: pérdida de clientes, competencia, o mercado'
        })
      }
    }

    // Riesgo de volatilidad alta
    if (kpiData.consistencyScore < 30) {
      risks.push({
        level: 'medium',
        type: 'volatility',
        description: 'Alta volatilidad en ingresos dificulta planificación',
        recommendation: 'Buscar contratos recurrentes o servicios de suscripción para estabilizar'
      })
    }

    // Riesgo de dependencia excesiva
    if (kpiData.totalInvoices > 0) {
      const avgInvoiceRatio = kpiData.avgInvoiceValue / (kpiData.totalRevenue / kpiData.totalInvoices || 1)
      if (avgInvoiceRatio > 0.5) {
        risks.push({
          level: 'medium',
          type: 'concentration',
          description: 'Posible alta concentración en pocos clientes grandes',
          recommendation: 'Diversificar base de clientes para reducir riesgo de concentración'
        })
      }
    }

    // Riesgo de gastos crecientes
    if (kpiData.expenseGrowthTrend > kpiData.revenueGrowthTrend + 10) {
      risks.push({
        level: 'high',
        type: 'cost-inflation',
        description: 'Gastos creciendo más rápido que ingresos',
        recommendation: 'Controlar inmediatamente gastos operativos. Riesgo de margen decreciente'
      })
    }

    // Riesgo de estancamiento
    if (Math.abs(kpiData.averageGrowth) < 2 && kpiData.profitMargin < 20) {
      risks.push({
        level: 'medium',
        type: 'stagnation',
        description: 'Estancamiento con márgenes ajustados. Sin crecimiento sostenible',
        recommendation: 'Implementar estrategia de crecimiento: nuevos productos, mercados o canales'
      })
    }

    // Riesgo de salud general baja
    if (kpiData.businessHealthScore < 35) {
      risks.push({
        level: 'high',
        type: 'business-health',
        description: `Score de salud crítico: ${kpiData.businessHealthScore}/100`,
        recommendation: 'Evaluación integral urgente. Considerar asesoría financiera externa'
      })
    }

    return risks.slice(0, 5) // Top 5 riesgos más importantes
  },

  identifyOpportunities: (monthlyData: MonthlyData[], kpiData: KPIData) => {
    const opportunities = []
    const recentData = monthlyData.slice(-3)

    // Oportunidad de expansión por salud fuerte
    if (kpiData.businessHealthScore > 75) {
      opportunities.push({
        area: 'expansion',
        potential: `Negocio muy saludable (${kpiData.businessHealthScore}/100). Momento ideal para crecer`,
        action: 'Explorar nuevos mercados, productos o servicios complementarios'
      })
    }

    // Oportunidad de crecimiento sostenido
    if (kpiData.averageGrowth > 10 && kpiData.consistencyScore > 60) {
      opportunities.push({
        area: 'scaling',
        potential: `Crecimiento consistente del ${kpiData.averageGrowth.toFixed(1)}% mensual`,
        action: 'Escalar operaciones, contratar personal clave o automatizar procesos'
      })
    }

    // Oportunidad de optimización de precios
    if (kpiData.avgInvoiceValue > 0 && kpiData.profitMargin > 20) {
      opportunities.push({
        area: 'pricing',
        potential: 'Márgenes saludables permiten ajuste de precios. Potencial: +5% en ingresos',
        action: 'Testear incremento de precios 3-5% en productos premium'
      })
    }

    // Oportunidad de eficiencia operativa
    const expenseRatio = kpiData.totalExpenseAmount / kpiData.totalRevenue
    if (expenseRatio > 0.6 && expenseRatio < 0.8) {
      opportunities.push({
        area: 'efficiency',
        potential: 'Margen de mejora en eficiencia operativa',
        action: 'Optimizar procesos, negociar con proveedores o implementar tecnología'
      })
    }

    // Oportunidad de diversificación
    if (kpiData.totalProducts > 0 && kpiData.avgInvoiceValue > 0) {
      opportunities.push({
        area: 'diversification',
        potential: 'Base de productos existente permite cross-selling',
        action: 'Crear paquetes o bundles de productos/servicios complementarios'
      })
    }

    // Oportunidad de retención
    if (kpiData.totalClients > 20 && recentData.length >= 2) {
      const clientGrowth = recentData[recentData.length - 1].totalInvoices - recentData[0].totalInvoices
      if (clientGrowth > 0) {
        opportunities.push({
          area: 'retention',
          potential: `Base de ${kpiData.totalClients} clientes con ${clientGrowth} nuevos recientes`,
          action: 'Implementar programa de lealtad o beneficios para clientes recurrentes'
        })
      }
    }

    // Oportunidad de estacionalidad
    if (kpiData.seasonalityIndex > 30) {
      opportunities.push({
        area: 'seasonal-planning',
        potential: 'Patrones estacionales claros identificados',
        action: 'Preparar campañas y promociones alineadas con temporadas altas'
      })
    }

    // Oportunidad de inversión
    if (kpiData.netProfit > kpiData.totalRevenue * 0.2 && kpiData.consistencyScore > 70) {
      opportunities.push({
        area: 'investment',
        potential: 'Rentabilidad y estabilidad permiten inversión estratégica',
        action: 'Considerar inversión en marketing, tecnología o nuevo talento'
      })
    }

    // Oportunidad de innovación
    if (kpiData.averageGrowth > 5 && kpiData.averageGrowth < 15) {
      opportunities.push({
        area: 'innovation',
        potential: 'Crecimiento moderado estable. Momento de innovar',
        action: 'Investigar nuevas tendencias del mercado o tecnologías disruptivas'
      })
    }

    return opportunities.slice(0, 6) // Top 6 oportunidades
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
  const { permissions } = useUserPermissions()

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
      console.log("Estados de facturas:", invoices?.map((inv: any) => inv.status))
      console.log("Gastos encontrados:", expenses?.length || 0)
      
      if (invoicesError) {
        console.error("Error al obtener facturas:", invoicesError)
      }
      if (expensesError) {
        console.error("Error al obtener gastos:", expensesError)
      }

      // Filtrar facturas válidas
      const validInvoices = invoices?.filter((invoice: any) => {
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
      validInvoices.forEach((invoice: any) => {
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
      expenses?.forEach((expense: any) => {
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

  // Check if user has permission to view financial reports
  if (!permissions.canViewFinances) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-3 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-2 border-red-200 bg-red-50">
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-red-800 mb-2">Acceso Restringido</h2>
                <p className="text-red-600">
                  No tienes permisos para acceder a los reportes mensuales. Esta función requiere permisos financieros.
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
          <TabsList className="grid w-full grid-cols-3 gap-1">
            <TabsTrigger value="overview" className="flex items-center space-x-1 lg:space-x-2 text-xs lg:text-sm">
              <BarChart3 className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="hidden sm:inline">Resumen</span>
              <span className="sm:hidden">Home</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-1 lg:space-x-2 text-xs lg:text-sm">
              <PieChartIcon className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="hidden sm:inline">Análisis</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="ai-insights" className="flex items-center space-x-1 lg:space-x-2 text-xs lg:text-sm">
              <Brain className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="hidden sm:inline">IA Insights</span>
              <span className="sm:hidden">IA</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 lg:space-y-6">
            {/* KPI Cards Optimizadas - Dos Filas Compactas */}
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-3">
              {/* Revenue Card */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-200">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] lg:text-xs text-blue-600 font-medium uppercase">Ingresos</p>
                      <p className="text-base lg:text-lg font-bold text-blue-900 truncate">{formatCurrency(kpiData.totalRevenue)}</p>
                      <div className="flex items-center space-x-1">
                        {kpiData.revenueGrowthTrend >= 0 ? (
                          <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-red-600" />
                        )}
                        <span className={`text-xs ${kpiData.revenueGrowthTrend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {kpiData.revenueGrowthTrend !== 0 ? `${Math.abs(kpiData.revenueGrowthTrend).toFixed(1)}%` : '0%'}
                        </span>
                      </div>
                    </div>
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              {/* Net Profit Card */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-emerald-100 hover:shadow-lg transition-all duration-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-emerald-600 font-medium uppercase">Ganancia</p>
                      <p className="text-lg font-bold text-emerald-900">{formatCurrency(kpiData.netProfit)}</p>
                      <p className="text-xs text-emerald-700">{kpiData.profitMargin.toFixed(1)}% margen</p>
                    </div>
                    <TrendingUp className="h-6 w-6 text-emerald-600" />
                  </div>
                </CardContent>
              </Card>

              {/* Expenses Card */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-red-100 hover:shadow-lg transition-all duration-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-red-600 font-medium uppercase">Gastos</p>
                      <p className="text-lg font-bold text-red-900">{formatCurrency(kpiData.totalExpenseAmount)}</p>
                      <div className="flex items-center space-x-1">
                        {kpiData.expenseGrowthTrend >= 0 ? (
                          <ArrowUpRight className="h-3 w-3 text-red-600" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-emerald-600" />
                        )}
                        <span className={`text-xs ${kpiData.expenseGrowthTrend >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {kpiData.expenseGrowthTrend !== 0 ? `${Math.abs(kpiData.expenseGrowthTrend).toFixed(1)}%` : '0%'}
                        </span>
                      </div>
                    </div>
                    <Receipt className="h-6 w-6 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              {/* Health Score Card */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all duration-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-purple-600 font-medium uppercase">Salud</p>
                      <p className="text-lg font-bold text-purple-900">{kpiData.businessHealthScore}/100</p>
                      <p className="text-xs text-purple-700">
                        {kpiData.businessHealthScore >= 75 ? 'Excelente' : kpiData.businessHealthScore >= 50 ? 'Bueno' : 'Atención'}
                      </p>
                    </div>
                    <Zap className="h-6 w-6 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              {/* Growth Card */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-100 hover:shadow-lg transition-all duration-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-amber-600 font-medium uppercase">Crecimiento</p>
                      <p className="text-lg font-bold text-amber-900">{kpiData.averageGrowth >= 0 ? '+' : ''}{kpiData.averageGrowth}%</p>
                      <p className="text-xs text-amber-700">promedio</p>
                    </div>
                    <BarChart3 className="h-6 w-6 text-amber-600" />
                  </div>
                </CardContent>
              </Card>

              {/* Prediction Card */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-teal-50 to-teal-100 hover:shadow-lg transition-all duration-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-teal-600 font-medium uppercase">Proyección IA</p>
                      <p className="text-lg font-bold text-teal-900">{formatCurrency(kpiData.predictedNextMonth)}</p>
                      <p className="text-xs text-teal-700">próximo mes</p>
                    </div>
                    <Brain className="h-6 w-6 text-teal-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Segunda Fila de Métricas */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Total Invoices */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-cyan-50 to-cyan-100 hover:shadow-lg transition-all duration-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-cyan-600 font-medium uppercase">Facturas</p>
                      <p className="text-lg font-bold text-cyan-900">{kpiData.totalInvoices}</p>
                      <p className="text-xs text-cyan-700">documentos</p>
                    </div>
                    <FileText className="h-6 w-6 text-cyan-600" />
                  </div>
                </CardContent>
              </Card>

              {/* Average Invoice */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-lime-50 to-lime-100 hover:shadow-lg transition-all duration-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-lime-600 font-medium uppercase">Ticket Prom.</p>
                      <p className="text-lg font-bold text-lime-900">{formatCurrency(kpiData.avgInvoiceValue)}</p>
                      <p className="text-xs text-lime-700">por factura</p>
                    </div>
                    <DollarSign className="h-6 w-6 text-lime-600" />
                  </div>
                </CardContent>
              </Card>

              {/* Total Expenses Count */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-lg transition-all duration-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-orange-600 font-medium uppercase">Gastos</p>
                      <p className="text-lg font-bold text-orange-900">{kpiData.totalExpenses}</p>
                      <p className="text-xs text-orange-700">registros</p>
                    </div>
                    <Receipt className="h-6 w-6 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              {/* Average Expense */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-pink-50 to-pink-100 hover:shadow-lg transition-all duration-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-pink-600 font-medium uppercase">Gasto Prom.</p>
                      <p className="text-lg font-bold text-pink-900">{formatCurrency(kpiData.avgExpenseValue)}</p>
                      <p className="text-xs text-pink-700">por gasto</p>
                    </div>
                    <Receipt className="h-6 w-6 text-pink-600" />
                  </div>
                </CardContent>
              </Card>

              {/* Consistency */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-indigo-50 to-indigo-100 hover:shadow-lg transition-all duration-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-indigo-600 font-medium uppercase">Consistencia</p>
                      <p className="text-lg font-bold text-indigo-900">{kpiData.consistencyScore.toFixed(0)}%</p>
                      <p className="text-xs text-indigo-700">estabilidad</p>
                    </div>
                    <Target className="h-6 w-6 text-indigo-600" />
                  </div>
                </CardContent>
              </Card>

              {/* ROI */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-violet-50 to-violet-100 hover:shadow-lg transition-all duration-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-violet-600 font-medium uppercase">ROI Prom.</p>
                      <p className="text-lg font-bold text-violet-900">
                        {monthlyData.length > 0 ? 
                          (monthlyData.reduce((sum, m) => sum + (m.roi || 0), 0) / monthlyData.length).toFixed(0) : '0'}%
                      </p>
                      <p className="text-xs text-violet-700">rendimiento</p>
                    </div>
                    <TrendingUp className="h-6 w-6 text-violet-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Desglose Mensual Detallado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Desglose Mensual */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-slate-600" />
                    <span>Desglose Mensual Detallado</span>
                  </CardTitle>
                  <CardDescription>Análisis completo mes por mes de tu rendimiento financiero</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                  {monthlyData.map((month, index) => (
                    <div key={index} className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-lg text-slate-800">{month.monthName} {month.year}</h4>
                          <p className="text-sm text-slate-600">{month.totalInvoices} facturas • {month.totalExpenses} gastos</p>
                        </div>
                        <div className="text-right">
                          <div className={`text-xl font-bold ${month.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(month.netProfit)}
                          </div>
                          <div className="text-sm text-slate-600">{month.profitMargin.toFixed(1)}% margen</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 text-sm">
                        <div className="text-center p-2 bg-blue-50 rounded border border-blue-200">
                          <p className="text-blue-700 font-medium">Ingresos</p>
                          <p className="font-bold text-blue-900">{formatCurrency(month.totalRevenue)}</p>
                          {index > 0 && (
                            <p className={`text-xs ${month.growth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {month.growth >= 0 ? '+' : ''}{month.growth.toFixed(1)}%
                            </p>
                          )}
                        </div>
                        
                        <div className="text-center p-2 bg-red-50 rounded border border-red-200">
                          <p className="text-red-700 font-medium">Gastos</p>
                          <p className="font-bold text-red-900">{formatCurrency(month.expenseAmount)}</p>
                          <p className="text-xs text-red-600">{month.totalExpenses} registros</p>
                        </div>
                        
                        <div className="text-center p-2 bg-emerald-50 rounded border border-emerald-200">
                          <p className="text-emerald-700 font-medium">ROI</p>
                          <p className="font-bold text-emerald-900">{month.roi.toFixed(1)}%</p>
                          <p className="text-xs text-emerald-600">rendimiento</p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-300">
                        <div className="flex justify-between text-xs text-slate-600">
                          <span>Ticket Promedio: <strong className="text-slate-800">{formatCurrency(month.avgInvoiceValue)}</strong></span>
                          <span>Gasto Promedio: <strong className="text-slate-800">{formatCurrency(month.avgExpenseValue)}</strong></span>
                        </div>
                        <div className="mt-1">
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${month.profitMargin >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(Math.abs(month.profitMargin), 100)}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Margen: {month.profitMargin.toFixed(1)}% • Eficiencia: {month.efficiency.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Análisis Comparativo */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-slate-600" />
                    <span>Análisis Comparativo</span>
                  </CardTitle>
                  <CardDescription>Comparación de rendimiento entre meses</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Best vs Worst Performance */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div>
                        <p className="text-sm font-medium text-emerald-800">🏆 Mejor Mes</p>
                        <p className="text-lg font-bold text-emerald-900">{kpiData.bestMonth}</p>
                        <p className="text-xs text-emerald-600">Mayor ganancia neta</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-emerald-700">Ganancia:</p>
                        <p className="font-bold text-emerald-900">
                          {monthlyData.length > 0 ? formatCurrency(Math.max(...monthlyData.map(m => m.netProfit))) : '$0'}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                      <div>
                        <p className="text-sm font-medium text-red-800">📉 Mes Más Débil</p>
                        <p className="text-lg font-bold text-red-900">{kpiData.worstMonth}</p>
                        <p className="text-xs text-red-600">Menor rendimiento</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-red-700">Ganancia:</p>
                        <p className="font-bold text-red-900">
                          {monthlyData.length > 0 ? formatCurrency(Math.min(...monthlyData.map(m => m.netProfit))) : '$0'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cash Flow Analysis */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                      <Activity className="h-4 w-4 mr-2" />
                      Análisis de Flujo de Efectivo
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Flujo Neto Total:</span>
                        <span className={`font-bold ${kpiData.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(kpiData.netProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Relación Ingresos/Gastos:</span>
                        <span className="font-bold text-blue-900">
                          {kpiData.totalExpenseAmount > 0 ? 
                            `${(kpiData.totalRevenue / kpiData.totalExpenseAmount).toFixed(1)}:1` : 
                            '∞:1'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Cobertura de Gastos:</span>
                        <span className="font-bold text-blue-900">
                          {kpiData.totalExpenseAmount > 0 ? 
                            `${Math.floor((kpiData.netProfit / kpiData.totalExpenseAmount) * 30)} días` : 
                            'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Business Metrics */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Métricas del Negocio
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-700">Clientes:</span>
                        <span className="font-bold text-green-900">{kpiData.totalClients}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Productos:</span>
                        <span className="font-bold text-green-900">{kpiData.totalProducts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Ingresos/Cliente:</span>
                        <span className="font-bold text-green-900">
                          {kpiData.totalClients > 0 ? 
                            formatCurrency(kpiData.totalRevenue / kpiData.totalClients) : 
                            formatCurrency(0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Facturas/Cliente:</span>
                        <span className="font-bold text-green-900">
                          {kpiData.totalClients > 0 ? 
                            (kpiData.totalInvoices / kpiData.totalClients).toFixed(1) : 
                            '0'}
                        </span>
                      </div>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-blue-800">
                    <Brain className="h-5 w-5" />
                    <span>Predicciones IA</span>
                  </CardTitle>
                  <CardDescription className="text-blue-700 font-medium">
                    Proyecciones basadas en análisis de tendencias y patrones históricos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-white rounded-lg border border-blue-200">
                    <div className="text-3xl font-bold text-blue-900">
                      {formatCurrency(aiInsights.predictions.nextMonthRevenue)}
                    </div>
                    <div className="text-sm text-blue-700 font-semibold mt-1">Próximo Mes Estimado</div>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <div className="text-xs text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full">
                        Confianza: {aiInsights.predictions.confidenceLevel}%
                      </div>
                      {aiInsights.predictions.confidenceLevel >= 80 && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      )}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg border border-blue-300">
                    <div className="text-2xl font-bold text-blue-800">
                      {formatCurrency(aiInsights.predictions.nextQuarterRevenue)}
                    </div>
                    <div className="text-sm text-blue-700 font-semibold mt-1">Proyección Trimestral (3 meses)</div>
                    <div className="text-xs text-blue-600 mt-2">
                      {aiInsights.predictions.nextQuarterRevenue > kpiData.totalRevenue * 1.1 ? '📈 Tendencia positiva' : 
                       aiInsights.predictions.nextQuarterRevenue < kpiData.totalRevenue * 0.9 ? '📉 Requiere atención' :
                       '➡️ Estable'}
                    </div>
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
                    {aiInsights.recommendations.slice(0, 4).map((rec, index) => (
                      <div key={index} className="p-3 bg-white rounded-lg border border-emerald-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <Badge 
                            variant={rec.priority === 'high' ? 'destructive' : 'secondary'}
                            className="text-xs font-semibold"
                          >
                            {rec.priority === 'high' ? '🔥 Alta Prioridad' : '⚡ Media'}
                          </Badge>
                          <span className="text-xs text-emerald-600 font-medium capitalize bg-emerald-50 px-2 py-1 rounded">
                            {rec.type.replace(/-/g, ' ')}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 mb-1">{rec.action}</p>
                        <p className="text-xs text-emerald-600 font-medium">💡 {rec.impact}</p>
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
                      aiInsights.risks.slice(0, 4).map((risk, index) => (
                        <div key={index} className="p-3 bg-white rounded-lg border border-amber-200 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <Badge 
                              variant={risk.level === 'high' ? 'destructive' : 'secondary'}
                              className="text-xs font-semibold"
                            >
                              {risk.level === 'high' ? '⚠️ Riesgo Alto' : '⚡ Riesgo Medio'}
                            </Badge>
                            <span className="text-xs text-amber-600 font-medium capitalize bg-amber-50 px-2 py-1 rounded">
                              {risk.type.replace(/-/g, ' ')}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-gray-800 mb-1">{risk.description}</p>
                          <p className="text-xs text-amber-700 font-medium">🎯 {risk.recommendation}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                        <p className="text-sm font-semibold text-emerald-600 mb-1">¡Excelente!</p>
                        <p className="text-xs text-emerald-500">No se detectaron riesgos críticos en tu negocio</p>
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
                  <CardDescription>
                    Acciones estratégicas recomendadas para maximizar tu potencial
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                    {aiInsights.opportunities.map((opp, index) => (
                      <div key={index} className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-bold text-purple-800 capitalize text-sm bg-white px-3 py-1 rounded-full">
                            {opp.area.replace(/-/g, ' ')}
                          </span>
                          <Badge variant="outline" className="text-purple-600 border-purple-300 font-semibold">
                            💎 Oportunidad
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold text-purple-800 mb-2">{opp.potential}</p>
                        <p className="text-xs text-purple-700 font-medium">🚀 {opp.action}</p>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
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