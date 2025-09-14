"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts"
import { supabase } from "@/lib/supabase"
import { useCurrency } from "@/hooks/use-currency"
import {
  TrendingUp,
  DollarSign,
  BarChart3,
  Target,
  CheckCircle2,
  ArrowUpRight,
  Activity,
  RefreshCw,
  Loader2,
  Percent,
  Zap,
  Award,
  Brain,
  Lightbulb,
  AlertTriangle,
  Briefcase,
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

export default function MonthlyReportsWithAI() {
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

  useEffect(() => {
    fetchMonthlyData()
  }, [selectedPeriod])

  const fetchMonthlyData = async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      // Simulación de datos para demo
      const mockData: MonthlyData[] = [
        {
          month: "9/2024",
          year: 2024,
          monthName: "Septiembre",
          totalInvoices: 25,
          totalExpenses: 8,
          totalRevenue: 45000,
          expenseAmount: 12000,
          netProfit: 33000,
          growth: 15.5,
          profitMargin: 73.3,
          avgInvoiceValue: 1800,
          avgExpenseValue: 1500,
          efficiency: 73.3,
          revenuePerInvoice: 1800,
          expensePerInvoice: 480,
          cashFlow: 33000,
          roi: 275
        },
        {
          month: "8/2024",
          year: 2024,
          monthName: "Agosto",
          totalInvoices: 22,
          totalExpenses: 6,
          totalRevenue: 39000,
          expenseAmount: 10000,
          netProfit: 29000,
          growth: 8.3,
          profitMargin: 74.4,
          avgInvoiceValue: 1773,
          avgExpenseValue: 1667,
          efficiency: 74.4,
          revenuePerInvoice: 1773,
          expensePerInvoice: 455,
          cashFlow: 29000,
          roi: 290
        }
      ]

      const mockKpiData: KPIData = {
        totalRevenue: 84000,
        totalInvoices: 47,
        totalExpenses: 14,
        totalExpenseAmount: 22000,
        netProfit: 62000,
        averageGrowth: 11.9,
        profitMargin: 73.8,
        avgInvoiceValue: 1787,
        avgExpenseValue: 1571,
        bestMonth: "Septiembre",
        worstMonth: "Agosto",
        totalClients: 15,
        totalProducts: 8,
        revenueGrowthTrend: 15.4,
        expenseGrowthTrend: 20.0,
        consistencyScore: 85.5,
        seasonalityIndex: 12.3,
        businessHealthScore: 89,
        predictedNextMonth: 48500,
      }

      setMonthlyData(mockData)
      setKpiData(mockKpiData)

      // Generar insights de IA
      const aiPredictions = AIAnalytics.generateAdvancedPredictions(mockData)
      const recommendations = AIAnalytics.generateRecommendations(mockData, mockKpiData)
      const risks = AIAnalytics.identifyRisks(mockData, mockKpiData)
      const opportunities = AIAnalytics.identifyOpportunities(mockData, mockKpiData)

      setAiInsights({
        predictions: aiPredictions,
        recommendations,
        risks,
        opportunities,
        seasonalityScore: mockKpiData.seasonalityIndex,
        marketPosition: mockKpiData.businessHealthScore >= 75 ? 'Líder' : 'Competitivo'
      })

    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reportes Mensuales con IA</h1>
          <p className="text-slate-600 mt-1">Análisis inteligente de tu rendimiento financiero</p>
        </div>
        <Button
          onClick={fetchMonthlyData}
          className="bg-blue-600 hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Actualizar
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
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
            <TabsTrigger value="overview">📊 Resumen</TabsTrigger>
            <TabsTrigger value="analytics">📈 Análisis</TabsTrigger>
            <TabsTrigger value="ai-insights">🤖 IA Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-600 font-medium uppercase">Ingresos Totales</p>
                      <p className="text-xl font-bold text-blue-900">{formatCurrency(kpiData.totalRevenue)}</p>
                      <div className="flex items-center space-x-1">
                        <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                        <span className="text-xs text-emerald-600">+{kpiData.revenueGrowthTrend}%</span>
                      </div>
                    </div>
                    <DollarSign className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-emerald-600 font-medium uppercase">Ganancia Neta</p>
                      <p className="text-xl font-bold text-emerald-900">{formatCurrency(kpiData.netProfit)}</p>
                      <div className="flex items-center space-x-1">
                        <Percent className="h-3 w-3 text-emerald-600" />
                        <span className="text-xs text-emerald-700">{kpiData.profitMargin.toFixed(1)}% margen</span>
                      </div>
                    </div>
                    <TrendingUp className="h-8 w-8 text-emerald-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-purple-600 font-medium uppercase">Salud del Negocio</p>
                      <p className="text-xl font-bold text-purple-900">{kpiData.businessHealthScore}/100</p>
                      <div className="flex items-center space-x-1">
                        <Award className="h-3 w-3 text-purple-600" />
                        <span className="text-xs text-purple-700">
                          {kpiData.businessHealthScore >= 75 ? 'Excelente' : 'Bueno'}
                        </span>
                      </div>
                    </div>
                    <Zap className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-amber-600 font-medium uppercase">Crecimiento</p>
                      <p className="text-xl font-bold text-amber-900">+{kpiData.averageGrowth}%</p>
                      <div className="flex items-center space-x-1">
                        <Activity className="h-3 w-3 text-amber-600" />
                        <span className="text-xs text-amber-700">promedio</span>
                      </div>
                    </div>
                    <BarChart3 className="h-8 w-8 text-amber-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Tendencia de Ingresos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="monthName" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Area 
                      type="monotone" 
                      dataKey="totalRevenue" 
                      stroke="#3B82F6" 
                      fill="#3B82F6" 
                      fillOpacity={0.1}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="netProfit" 
                      stroke="#10B981" 
                      fill="#10B981" 
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Análisis de Rendimiento</CardTitle>
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
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Métricas Clave</CardTitle>
                </CardHeader>
                <CardContent>
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
                      <span>Mejor Mes:</span>
                      <span className="font-semibold text-emerald-600">{kpiData.bestMonth}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ai-insights" className="space-y-6">
            {/* Predicciones de IA */}
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

            {/* Oportunidades de Crecimiento */}
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

            {/* Posición de Mercado */}
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