"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  DollarSign,
  Activity,
  Sparkles,
  Eye,
  Star,
  ThumbsUp,
  Trophy
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface FinancialHealthProps {
  totalRevenue: number
  totalExpenses: number
  monthlyTarget: number
  monthlyRevenue: number
  pendingRevenue: number
  overdueInvoices: number
}

export const FinancialHealthWidget: React.FC<FinancialHealthProps> = ({
  totalRevenue,
  totalExpenses,
  monthlyTarget,
  monthlyRevenue,
  pendingRevenue,
  overdueInvoices,
}) => {
  const [healthScore, setHealthScore] = useState(0)
  const [healthStatus, setHealthStatus] = useState<'excellent' | 'good' | 'warning' | 'critical'>('good')

  useEffect(() => {
    // Si no hay datos suficientes, mostrar estado neutral
    if (totalRevenue === 0 && totalExpenses === 0 && monthlyTarget === 0) {
      setHealthScore(0)
      setHealthStatus('warning')
      return
    }

    // Calculate financial health score (0-100)
    let score = 100
    
    // Revenue vs target performance
    const targetPerformance = monthlyTarget > 0 ? (monthlyRevenue / monthlyTarget) * 100 : 0
    if (targetPerformance < 50) {
      score -= 30
    } else if (targetPerformance < 75) {
      score -= 15
    } else if (targetPerformance > 100) {
      score += 10
    }
    
    // Cash flow (revenue vs expenses)
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0
    if (profitMargin < 10) {
      score -= 25
    } else if (profitMargin < 30) {
      score -= 10
    } else if (profitMargin > 50) {
      score += 15
    }
    
    // Overdue invoices penalty
    if (overdueInvoices > 0) {
      score -= overdueInvoices * 5
    }
    
    // Pending revenue risk
    const pendingRisk = totalRevenue > 0 ? (pendingRevenue / totalRevenue) * 100 : 0
    if (pendingRisk > 50) {
      score -= 15
    } else if (pendingRisk > 30) {
      score -= 5
    }
    
    score = Math.max(0, Math.min(100, score))
    setHealthScore(score)
    
    if (score >= 85) {
      setHealthStatus('excellent')
    } else if (score >= 70) {
      setHealthStatus('good')
    } else if (score >= 50) {
      setHealthStatus('warning')
    } else {
      setHealthStatus('critical')
    }
  }, [totalRevenue, totalExpenses, monthlyTarget, monthlyRevenue, pendingRevenue, overdueInvoices])

  const getHealthConfig = () => {
    switch (healthStatus) {
      case 'excellent':
        return {
          color: 'from-emerald-500 to-green-600',
          bgColor: 'from-emerald-50 to-green-50',
          textColor: 'text-emerald-900',
          icon: Trophy,
          message: '¡Excelente salud financiera!',
          description: 'Tu negocio está funcionando de manera óptima',
        }
      case 'good':
        return {
          color: 'from-blue-500 to-indigo-600',
          bgColor: 'from-blue-50 to-indigo-50',
          textColor: 'text-blue-900',
          icon: ThumbsUp,
          message: 'Buena salud financiera',
          description: 'El negocio marcha bien con algunas oportunidades',
        }
      case 'warning':
        return {
          color: 'from-amber-500 to-orange-600',
          bgColor: 'from-amber-50 to-orange-50',
          textColor: 'text-amber-900',
          icon: AlertTriangle,
          message: healthScore === 0 ? 'Sin datos suficientes' : 'Atención requerida',
          description: healthScore === 0 ? 'Comienza registrando ingresos y gastos para ver tu salud financiera' : 'Hay áreas que necesitan mejoras',
        }
      case 'critical':
        return {
          color: 'from-red-500 to-pink-600',
          bgColor: 'from-red-50 to-pink-50',
          textColor: 'text-red-900',
          icon: AlertTriangle,
          message: 'Requiere acción inmediata',
          description: 'Es importante tomar medidas correctivas',
        }
    }
  }

  const config = getHealthConfig()
  const IconComponent = config.icon

  return (
    <Card className={`shadow-2xl border-0 bg-gradient-to-br ${config.bgColor} relative overflow-hidden`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${config.color}/5`}></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
      <CardHeader className="relative">
        <div className="flex items-center gap-4">
          <motion.div 
            className={`p-4 bg-gradient-to-r ${config.color} rounded-2xl shadow-lg`}
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <IconComponent className="h-8 w-8 text-white" />
          </motion.div>
          <div>
            <CardTitle className={`text-2xl font-bold ${config.textColor} flex items-center gap-2`}>
              Salud Financiera
              <Sparkles className="h-5 w-5" />
            </CardTitle>
            <CardDescription className={`${config.textColor} text-base font-medium`}>
              {config.message}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative space-y-6">
        <div className="text-center">
          <motion.div 
            className="text-6xl font-bold mb-2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          >
            <span className={`bg-gradient-to-r ${config.color} bg-clip-text text-transparent`}>
              {Math.round(healthScore)}
            </span>
          </motion.div>
          <p className={`text-lg font-semibold ${config.textColor} mb-4`}>
            {config.description}
          </p>
          <Progress 
            value={healthScore} 
            className="h-3 mb-4" 
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-white/50 backdrop-blur-sm rounded-xl">
            <div className={`text-2xl font-bold ${config.textColor}`}>
              {monthlyTarget > 0 ? Math.round((monthlyRevenue / monthlyTarget) * 100) : 0}%
            </div>
            <p className="text-sm text-gray-600">Meta del Mes</p>
          </div>
          <div className="text-center p-4 bg-white/50 backdrop-blur-sm rounded-xl">
            <div className={`text-2xl font-bold ${config.textColor}`}>
              {totalRevenue > 0 ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100) : 0}%
            </div>
            <p className="text-sm text-gray-600">Margen Profit</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface PerformanceComparisonProps {
  currentMonthRevenue: number
  previousMonthRevenue: number
  currentMonthExpenses: number
  previousMonthExpenses: number
  currentMonthInvoices: number
  previousMonthInvoices: number
}

export const PerformanceComparisonWidget: React.FC<PerformanceComparisonProps> = ({
  currentMonthRevenue,
  previousMonthRevenue,
  currentMonthExpenses,
  previousMonthExpenses,
  currentMonthInvoices,
  previousMonthInvoices,
}) => {
  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) {
      return current > 0 ? 100 : 0
    }
    return ((current - previous) / previous) * 100
  }

  const revenueGrowth = calculateGrowth(currentMonthRevenue, previousMonthRevenue)
  const expenseGrowth = calculateGrowth(currentMonthExpenses, previousMonthExpenses)
  const invoiceGrowth = calculateGrowth(currentMonthInvoices, previousMonthInvoices)

  const formatGrowth = (growth: number) => {
    const isPositive = growth >= 0
    return {
      value: Math.abs(growth).toFixed(1),
      isPositive,
      icon: isPositive ? ArrowUpRight : ArrowDownRight,
      color: isPositive ? 'text-emerald-600' : 'text-red-600',
      bgColor: isPositive ? 'bg-emerald-100' : 'bg-red-100',
    }
  }

  const metrics = [
    {
      title: 'Ingresos',
      current: currentMonthRevenue,
      previous: previousMonthRevenue,
      growth: formatGrowth(revenueGrowth),
      icon: DollarSign,
    },
    {
      title: 'Gastos',
      current: currentMonthExpenses,
      previous: previousMonthExpenses,
      growth: formatGrowth(-expenseGrowth), // Negative growth in expenses is good
      icon: BarChart3,
    },
    {
      title: 'Facturas',
      current: currentMonthInvoices,
      previous: previousMonthInvoices,
      growth: formatGrowth(invoiceGrowth),
      icon: Activity,
    },
  ]

  return (
    <Card className="shadow-2xl border-0 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-indigo-500/5"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-300/20 to-indigo-400/20 rounded-full -translate-y-16 translate-x-16"></div>
      <CardHeader className="relative">
        <div className="flex items-center gap-4">
          <motion.div 
            className="p-4 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-2xl shadow-lg"
            whileHover={{ scale: 1.05, rotate: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <BarChart3 className="h-8 w-8 text-white" />
          </motion.div>
          <div>
            <CardTitle className="text-2xl font-bold text-violet-900 flex items-center gap-2">
              Comparación Mensual
              <TrendingUp className="h-5 w-5 text-violet-600" />
            </CardTitle>
            <CardDescription className="text-violet-700 text-base font-medium">
              vs. mes anterior
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative space-y-6">
        {metrics.map((metric, index) => {
          const IconComponent = metric.icon
          const GrowthIcon = metric.growth.icon
          
          return (
            <motion.div 
              key={metric.title}
              className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-violet-100 to-indigo-100 rounded-xl">
                  <IconComponent className="h-6 w-6 text-violet-700" />
                </div>
                <div>
                  <h4 className="font-bold text-violet-900 text-lg">{metric.title}</h4>
                  <div className="flex items-center gap-2 text-sm text-violet-700">
                    <span>Actual: ${metric.current.toLocaleString()}</span>
                    <span>•</span>
                    <span>Anterior: ${metric.previous.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`flex items-center gap-2 ${metric.growth.color}`}>
                  <div className={`p-2 ${metric.growth.bgColor} rounded-lg`}>
                    <GrowthIcon className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-xl">{metric.growth.value}%</span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </CardContent>
    </Card>
  )
}

interface QuickInsightsProps {
  insights: Array<{
    type: 'tip' | 'warning' | 'success' | 'info'
    title: string
    message: string
    action?: {
      label: string
      href: string
    }
  }>
}

export const QuickInsightsWidget: React.FC<QuickInsightsProps> = ({ insights }) => {
  const [currentInsight, setCurrentInsight] = useState(0)

  useEffect(() => {
    if (insights.length > 1) {
      const interval = setInterval(() => {
        setCurrentInsight((prev) => (prev + 1) % insights.length)
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [insights.length])

  if (!insights.length) {
    return null
  }

  const getInsightConfig = (type: string) => {
    switch (type) {
      case 'success':
        return {
          color: 'from-emerald-500 to-green-600',
          bgColor: 'from-emerald-50 to-green-50',
          textColor: 'text-emerald-900',
          icon: CheckCircle,
        }
      case 'warning':
        return {
          color: 'from-amber-500 to-orange-600',
          bgColor: 'from-amber-50 to-orange-50',
          textColor: 'text-amber-900',
          icon: AlertTriangle,
        }
      case 'info':
        return {
          color: 'from-blue-500 to-indigo-600',
          bgColor: 'from-blue-50 to-indigo-50',
          textColor: 'text-blue-900',
          icon: Eye,
        }
      default:
        return {
          color: 'from-purple-500 to-pink-600',
          bgColor: 'from-purple-50 to-pink-50',
          textColor: 'text-purple-900',
          icon: Star,
        }
    }
  }

  const insight = insights[currentInsight]
  const config = getInsightConfig(insight.type)
  const IconComponent = config.icon

  return (
    <Card className={`shadow-2xl border-0 bg-gradient-to-br ${config.bgColor} relative overflow-hidden`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${config.color}/5`}></div>
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/20 to-transparent rounded-full -translate-y-12 translate-x-12"></div>
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div 
              className={`p-3 bg-gradient-to-r ${config.color} rounded-2xl shadow-lg`}
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <IconComponent className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <CardTitle className={`text-xl font-bold ${config.textColor}`}>
                Insights Inteligentes
              </CardTitle>
              <CardDescription className={`${config.textColor} font-medium`}>
                Recomendaciones personalizadas
              </CardDescription>
            </div>
          </div>
          {insights.length > 1 && (
            <div className="flex gap-1">
              {insights.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentInsight ? `bg-gradient-to-r ${config.color}` : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentInsight}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <h3 className={`text-lg font-bold ${config.textColor}`}>
              {insight.title}
            </h3>
            <p className={`${config.textColor} text-base leading-relaxed`}>
              {insight.message}
            </p>
            {insight.action && (
              <Button 
                variant="outline" 
                className={`border-2 ${config.textColor} hover:bg-white/50 transition-all duration-300`}
                asChild
              >
                <a href={insight.action.href}>
                  {insight.action.label}
                </a>
              </Button>
            )}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}