"use client"

import { useEffect, useState } from "react"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { AgendaWidget } from "@/components/dashboard/agenda-widget"
import { RevenueChart, ExpenseChart, ComparisonChart } from "@/components/dashboard/charts"
import { FinancialHealthWidget, PerformanceComparisonWidget, QuickInsightsWidget } from "@/components/dashboard/interactive-widgets"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Plus,
  FileText,
  Receipt,
  TrendingUp,
  Calendar,
  Target,
  AlertCircle,
  Users,
  Settings,
  Clock,
  Activity,
  BarChart3,
  PieChart,
  ArrowUpRight,
  Zap,
  Sparkles,
  Eye,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useCurrency } from "@/hooks/use-currency"
import { useBusinessNotifications } from "@/components/notifications/notification-system"

interface DashboardStats {
  totalInvoices: number
  totalRevenue: number
  pendingRevenue: number
  totalClients: number
  totalProducts: number
  totalProjects: number
  totalExpenses: number
  totalExpenseAmount: number
  weeklyInvoices: number
  weeklyRevenue: number
  weeklyPendingRevenue: number
  weeklyExpenses: number
  weeklyExpenseAmount: number
  monthlyInvoices: number
  monthlyRevenue: number
  monthlyPendingRevenue: number
  monthlyExpenses: number
  monthlyExpenseAmount: number
  previousMonthRevenue: number
  recentActivity: Array<{
    id: string
    type: "invoice" | "expense"
    number: string
    client_name?: string
    description?: string
    total: number
    created_at: string
  }>
  pendingInvoices: number
  overdueInvoices: number
  monthlyTarget: number
  topClients: Array<{
    name: string
    total: number
    invoices: number
  }>
  expensesByCategory: Array<{
    category: string
    amount: number
    count: number
  }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    totalClients: 0,
    totalProducts: 0,
    totalProjects: 0,
    totalExpenses: 0,
    totalExpenseAmount: 0,
    weeklyInvoices: 0,
    weeklyRevenue: 0,
    weeklyPendingRevenue: 0,
    weeklyExpenses: 0,
    weeklyExpenseAmount: 0,
    monthlyInvoices: 0,
    monthlyRevenue: 0,
    monthlyPendingRevenue: 0,
    monthlyExpenses: 0,
    monthlyExpenseAmount: 0,
    previousMonthRevenue: 0,
    recentActivity: [],
    pendingInvoices: 0,
    overdueInvoices: 0,
    monthlyTarget: 100000,
    topClients: [],
    expensesByCategory: [],
  })
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [showTargetSettings, setShowTargetSettings] = useState(false)
  const [newTarget, setNewTarget] = useState(100000)
  const [isClient, setIsClient] = useState(false)
  const [notificationsShown, setNotificationsShown] = useState({
    targetAchievement: false,
    revenueGrowth: false,
    overdueInvoices: false,
    lowCashFlow: false
  })
  const { formatCurrency } = useCurrency()
  const businessNotifications = useBusinessNotifications()

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true)
    setLastUpdate(new Date())
  }, [])

  useEffect(() => {
    fetchStats()
    loadMonthlyTarget()
    updateMonthlyStats()

    const interval = setInterval(
      () => {
        fetchStats()
        setLastUpdate(new Date())
      },
      5 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [])

  // Smart notifications based on data changes (won't repeat once dismissed)
  useEffect(() => {
    if (!loading && stats.monthlyTarget > 0 && isClient) {
      const targetProgress = (stats.monthlyRevenue / stats.monthlyTarget) * 100
      
      // Notify about target achievement (only once per session)
      if (targetProgress >= 100 && !notificationsShown.targetAchievement) {
        businessNotifications.notifyTargetAchievement(targetProgress)
        setNotificationsShown(prev => ({ ...prev, targetAchievement: true }))
      }
      
      // Notify about revenue growth (only once per session)
      if (stats.previousMonthRevenue > 0 && !notificationsShown.revenueGrowth) {
        const revenueGrowth = ((stats.monthlyRevenue - stats.previousMonthRevenue) / stats.previousMonthRevenue) * 100
        if (Math.abs(revenueGrowth) > 15) {
          businessNotifications.notifyRevenueGrowth(revenueGrowth)
          setNotificationsShown(prev => ({ ...prev, revenueGrowth: true }))
        }
      }
      
      // Notify about overdue invoices (only once per session)
      if (stats.overdueInvoices > 0 && !notificationsShown.overdueInvoices) {
        businessNotifications.notifyOverdueInvoices(stats.overdueInvoices)
        setNotificationsShown(prev => ({ ...prev, overdueInvoices: true }))
      }
      
      // Notify about low cash flow (only once per session)
      if (stats.totalRevenue > 0 && !notificationsShown.lowCashFlow) {
        const profitMargin = ((stats.totalRevenue - stats.totalExpenseAmount) / stats.totalRevenue) * 100
        if (profitMargin < 20) {
          businessNotifications.notifyLowCashFlow(profitMargin)
          setNotificationsShown(prev => ({ ...prev, lowCashFlow: true }))
        }
      }
    }
  }, [stats, loading, businessNotifications, notificationsShown, isClient])

  const loadMonthlyTarget = async () => {
    try {
      const savedTarget = localStorage.getItem("monthly_target")
      if (savedTarget) {
        const target = Number(savedTarget)
        setStats((prev) => ({ ...prev, monthlyTarget: target }))
        setNewTarget(target)
      }
    } catch (error) {
      console.error("Error loading monthly target:", error)
    }
  }

  const updateMonthlyTarget = async () => {
    try {
      localStorage.setItem("monthly_target", newTarget.toString())
      setStats((prev) => ({ ...prev, monthlyTarget: newTarget }))
      setShowTargetSettings(false)
    } catch (error) {
      console.error("Error updating monthly target:", error)
      alert("Error al actualizar la meta mensual")
    }
  }

  const updateMonthlyStats = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()

      const startOfMonth = new Date(currentYear, currentMonth - 1, 1)
      const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59)

      const [invoicesResult, expensesResult] = await Promise.all([
        supabase
          .from("invoices")
          .select("total, status")
          .eq("user_id", user.id)
          .gte("created_at", startOfMonth.toISOString())
          .lte("created_at", endOfMonth.toISOString()),
        supabase
          .from("expenses")
          .select("amount")
          .eq("user_id", user.id)
          .gte("expense_date", startOfMonth.toISOString().split("T")[0])
          .lte("expense_date", endOfMonth.toISOString().split("T")[0]),
      ])

      const totalInvoices = invoicesResult.data?.length || 0
      const totalRevenue =
        invoicesResult.data?.filter((inv) => inv.status === "pagada").reduce((sum, inv) => sum + (inv.total || 0), 0) ||
        0
      const expenseCount = expensesResult.data?.length || 0
      const totalExpenses = expensesResult.data?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0

      const { data: existingRecord } = await supabase
        .from("monthly_stats")
        .select("id")
        .eq("user_id", user.id)
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .single()

      if (existingRecord) {
        await supabase
          .from("monthly_stats")
          .update({
            total_invoices: totalInvoices,
            total_revenue: totalRevenue,
            expense_count: expenseCount,
            total_expenses: totalExpenses,
          })
          .eq("id", existingRecord.id)
      } else {
        await supabase.from("monthly_stats").insert({
          user_id: user.id,
          month: currentMonth,
          year: currentYear,
          total_invoices: totalInvoices,
          total_revenue: totalRevenue,
          expense_count: expenseCount,
          total_expenses: totalExpenses,
        })
      }
    } catch (error) {
      console.error("Error updating monthly stats:", error)
    }
  }

  const fetchStats = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      // Calculate current month start for accurate monthly calculations
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      const { data: invoices } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          total,
          status,
          due_date,
          issue_date,
          created_at,
          clients!inner(name)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      const { data: expenses } = await supabase
        .from("expenses")
        .select(`
          id,
          description,
          amount,
          category,
          expense_date,
          created_at
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      const { count: clientsCount } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      const { count: productsCount } = await supabase.from("products").select("*", { count: "exact", head: true })

      const { count: projectsCount } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      const totalInvoices = invoices?.length || 0
      const paidInvoices = invoices?.filter((inv) => inv.status === "pagada") || []
      const unpaidInvoices = invoices?.filter((inv) => inv.status !== "pagada" && inv.status !== "cancelada") || []

      const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
      const pendingRevenue = unpaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)

      const totalExpenses = expenses?.length || 0
      const totalExpenseAmount = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0

      const pendingInvoices = invoices?.filter((inv) => inv.status === "pendiente").length || 0
      const overdueInvoices =
        invoices?.filter((inv) => {
          if (inv.status !== "pendiente" || !inv.due_date) {
            return false
          }
          return new Date(inv.due_date) < now
        }).length || 0

      const weeklyInvoices = invoices?.filter((inv) => new Date(inv.created_at) >= weekAgo).length || 0
      const weeklyPaidInvoices = paidInvoices.filter((inv) => new Date(inv.created_at) >= weekAgo)
      const weeklyUnpaidInvoices = unpaidInvoices.filter((inv) => new Date(inv.created_at) >= weekAgo)
      const weeklyRevenue = weeklyPaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
      const weeklyPendingRevenue = weeklyUnpaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)

      const weeklyExpenses = expenses?.filter((exp) => new Date(exp.created_at) >= weekAgo).length || 0
      const weeklyExpenseAmount =
        expenses
          ?.filter((exp) => new Date(exp.created_at) >= weekAgo)
          .reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0

      const monthlyInvoices = invoices?.filter((inv) => {
        const invDate = new Date(inv.issue_date || inv.created_at)
        return invDate >= currentMonthStart && invDate <= currentMonthEnd
      }).length || 0
      
      // Filter paid invoices by issue_date (not created_at) and status = 'pagada'
      const monthlyPaidInvoices = invoices?.filter((inv) => {
        if (inv.status !== "pagada") {
          return false
        }
        const invDate = new Date(inv.issue_date || inv.created_at)
        return invDate >= currentMonthStart && invDate <= currentMonthEnd
      }) || []
      
      const monthlyUnpaidInvoices = invoices?.filter((inv) => {
        if (inv.status === "pagada" || inv.status === "cancelada") {
          return false
        }
        const invDate = new Date(inv.issue_date || inv.created_at)
        return invDate >= currentMonthStart && invDate <= currentMonthEnd
      }) || []
      
      const monthlyRevenue = monthlyPaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
      const monthlyPendingRevenue = monthlyUnpaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)

      const monthlyExpenses = expenses?.filter((exp) => {
        const expDate = new Date(exp.created_at)
        return expDate >= currentMonthStart && expDate <= currentMonthEnd
      }).length || 0
      const monthlyExpenseAmount =
        expenses
          ?.filter((exp) => {
            const expDate = new Date(exp.created_at)
            return expDate >= currentMonthStart && expDate <= currentMonthEnd
          })
          .reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0

      const clientRevenue = new Map()
      paidInvoices.forEach((inv: any) => {
        const clientName = Array.isArray(inv.clients) ? inv.clients[0]?.name : inv.clients?.name
        if (clientName) {
          const current = clientRevenue.get(clientName) || { total: 0, invoices: 0 }
          clientRevenue.set(clientName, {
            total: current.total + (inv.total || 0),
            invoices: current.invoices + 1,
          })
        }
      })

      const topClients = Array.from(clientRevenue.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)

      const categoryExpenses = new Map()
      expenses?.forEach((exp) => {
        const category = exp.category || "Sin categoría"
        const current = categoryExpenses.get(category) || { amount: 0, count: 0 }
        categoryExpenses.set(category, {
          amount: current.amount + (exp.amount || 0),
          count: current.count + 1,
        })
      })

      const expensesByCategory = Array.from(categoryExpenses.entries())
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

      const recentInvoices =
        invoices?.slice(0, 3).map((inv: any) => ({
          id: inv.id,
          type: "invoice" as const,
          number: inv.invoice_number,
          client_name: Array.isArray(inv.clients) ? inv.clients[0]?.name : inv.clients?.name,
          total: inv.total || 0,
          created_at: inv.created_at,
        })) || []

      const recentExpenses =
        expenses?.slice(0, 3).map((exp) => ({
          id: exp.id,
          type: "expense" as const,
          number: "GASTO",
          description: exp.description,
          total: exp.amount || 0,
          created_at: exp.created_at,
        })) || []

      const recentActivity = [...recentInvoices, ...recentExpenses].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

      // Calculate previous month revenue for growth comparison
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      const previousMonthPaidInvoices = paidInvoices.filter((inv) => {
        const invDate = new Date(inv.created_at)
        return invDate >= previousMonthStart && invDate <= previousMonthEnd
      })
      const previousMonthRevenue = previousMonthPaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)

      setStats((prev) => ({
        ...prev,
        totalInvoices,
        totalRevenue,
        pendingRevenue,
        totalClients: clientsCount || 0,
        totalProducts: productsCount || 0,
        totalProjects: projectsCount || 0,
        totalExpenses,
        totalExpenseAmount,
        weeklyInvoices,
        weeklyRevenue,
        weeklyPendingRevenue,
        weeklyExpenses,
        weeklyExpenseAmount,
        monthlyInvoices,
        monthlyRevenue,
        monthlyPendingRevenue,
        monthlyExpenses,
        monthlyExpenseAmount,
        previousMonthRevenue,
        recentActivity,
        pendingInvoices,
        overdueInvoices,
        topClients,
        expensesByCategory,
      }))
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const monthlyProgress = Math.min((stats.monthlyRevenue / stats.monthlyTarget) * 100, 100)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-600 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-lg text-gray-600 font-medium">Control total de tu negocio</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <Badge variant="secondary" className="bg-white/80 text-gray-700 border border-gray-200 shadow-sm">
                <Eye className="h-3 w-3 mr-1" />
                Vista General
              </Badge>
              <Badge variant="outline" className="bg-white/50 text-gray-600 border-gray-300">
                <Clock className="h-3 w-3 mr-1" />
                Actualizado: {lastUpdate?.toLocaleTimeString() || 'Cargando...'}
              </Badge>
              <Badge 
                variant="outline" 
                className={`${monthlyProgress >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 
                          monthlyProgress >= 50 ? 'bg-amber-50 text-amber-700 border-amber-300' : 
                          'bg-red-50 text-red-700 border-red-300'}`}
              >
                <Target className="h-3 w-3 mr-1" />
                Meta: {monthlyProgress.toFixed(0)}%
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/invoices/new">
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-white border-0">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Factura
              </Button>
            </Link>
            <Link href="/expenses">
              <Button
                variant="outline"
                className="bg-white/80 hover:bg-red-50 text-red-700 border-red-200 hover:border-red-300 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Nuevo Gasto
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                fetchStats()
                setLastUpdate(new Date())
              }}
              className="bg-white/50 hover:bg-gray-100 text-gray-700 shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Enhanced Monthly Target Card */}
        <Card className="border-0 shadow-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-red-500/5"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-300/20 to-orange-400/20 rounded-full -translate-y-16 translate-x-16"></div>
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-lg">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-amber-900 flex items-center gap-2">
                    Meta Mensual 
                    <Sparkles className="h-5 w-5 text-amber-600" />
                  </CardTitle>
                  <CardDescription className="text-amber-700 text-base font-medium">
                    Tu progreso hacia el objetivo de ingresos del mes
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="text-4xl font-bold text-amber-900">{monthlyProgress.toFixed(1)}%</div>
                    {monthlyProgress >= 100 ? (
                      <div className="p-1 bg-emerald-100 rounded-full">
                        <Zap className="h-4 w-4 text-emerald-600" />
                      </div>
                    ) : monthlyProgress >= 75 ? (
                      <div className="p-1 bg-amber-100 rounded-full">
                        <ArrowUpRight className="h-4 w-4 text-amber-600" />
                      </div>
                    ) : (
                      <div className="p-1 bg-blue-100 rounded-full">
                        <Activity className="h-4 w-4 text-blue-600" />
                      </div>
                    )}
                  </div>
                  <div className="text-lg text-amber-800 font-semibold">
                    {formatCurrency(stats.monthlyRevenue)} / {formatCurrency(stats.monthlyTarget)}
                  </div>
                  <div className="text-sm text-amber-600">
                    Faltan: {formatCurrency(Math.max(0, stats.monthlyTarget - stats.monthlyRevenue))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTargetSettings(!showTargetSettings)}
                  className="text-amber-700 hover:bg-amber-100/50 rounded-xl p-3"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            {showTargetSettings && (
              <div className="mb-6 p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-200 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="monthly-target" className="text-amber-900 font-semibold text-base">
                      Nueva Meta Mensual
                    </Label>
                    <Input
                      id="monthly-target"
                      type="number"
                      value={newTarget}
                      onChange={(e) => setNewTarget(Number(e.target.value))}
                      className="mt-2 border-amber-300 focus:border-amber-500 focus:ring-amber-500/20 text-lg"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      size="sm" 
                      onClick={updateMonthlyTarget} 
                      className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-lg px-6"
                    >
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowTargetSettings(false)}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50 px-6"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-4">
              <Progress value={monthlyProgress} className="h-4 bg-amber-100" />
              <div className="flex justify-between text-sm text-amber-700 font-medium">
                <span>Inicio del mes</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Meta: {formatCurrency(stats.monthlyTarget)}
                </span>
              </div>
            </div>
            {stats.monthlyPendingRevenue > 0 && (
              <div className="mt-6 p-4 bg-blue-50/80 backdrop-blur-sm rounded-xl border border-blue-200">
                <div className="flex items-center gap-3 text-blue-700">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-base font-semibold">
                      Ingresos Pendientes: {formatCurrency(stats.monthlyPendingRevenue)}
                    </span>
                    <p className="text-sm text-blue-600 mt-1">Facturas emitidas pero aún no marcadas como pagadas</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <StatsCards {...stats} />

        {/* Enhanced Analytics Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          <FinancialHealthWidget
            totalRevenue={stats.totalRevenue}
            totalExpenses={stats.totalExpenseAmount}
            monthlyTarget={stats.monthlyTarget}
            monthlyRevenue={stats.monthlyRevenue}
            pendingRevenue={stats.pendingRevenue}
            overdueInvoices={stats.overdueInvoices}
          />
          
          <PerformanceComparisonWidget
            currentMonthRevenue={stats.monthlyRevenue}
            previousMonthRevenue={stats.previousMonthRevenue}
            currentMonthExpenses={stats.monthlyExpenseAmount}
            previousMonthExpenses={stats.monthlyExpenseAmount}
            currentMonthInvoices={stats.monthlyInvoices}
            previousMonthInvoices={stats.monthlyInvoices}
          />
          
          <QuickInsightsWidget insights={[
            {
              type: 'success',
              title: 'Buen rendimiento',
              message: `Has generado ${formatCurrency(stats.monthlyRevenue)} este mes`
            },
            {
              type: 'info', 
              title: 'Clientes activos',
              message: `Tienes ${stats.totalClients} clientes registrados`
            }
          ]} />
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Revenue Trend Chart */}
          <Card className="shadow-2xl border-0 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5"></div>
            <CardHeader className="relative">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-emerald-900 flex items-center gap-2">
                    Tendencia de Ingresos
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </CardTitle>
                  <CardDescription className="text-emerald-700 text-base font-medium">
                    Evolución de ingresos últimos 7 días
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="h-80">
                <RevenueChart data={{
                  labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                  datasets: [{
                    label: 'Ingresos',
                    data: [stats.weeklyRevenue / 7, stats.weeklyRevenue / 6, stats.weeklyRevenue / 5, stats.weeklyRevenue / 4, stats.weeklyRevenue / 3, stats.weeklyRevenue / 2, stats.weeklyRevenue],
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: true
                  }]
                }} />
              </div>
            </CardContent>
          </Card>

          {/* Expense Chart */}
          <Card className="shadow-2xl border-0 bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-rose-500/5"></div>
            <CardHeader className="relative">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl shadow-lg">
                  <Receipt className="h-8 w-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-red-900 flex items-center gap-2">
                    Gastos por Categoría
                    <PieChart className="h-5 w-5 text-red-600" />
                  </CardTitle>
                  <CardDescription className="text-red-700 text-base font-medium">
                    Distribución de gastos del mes
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="h-80">
                {stats.expensesByCategory.length > 0 ? (
                  <ExpenseChart data={{
                    labels: stats.expensesByCategory.map(cat => cat.category),
                    datasets: [{
                      label: 'Gastos',
                      data: stats.expensesByCategory.map(cat => cat.amount),
                      backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(245, 101, 101, 0.8)',
                        'rgba(248, 113, 113, 0.8)',
                        'rgba(252, 165, 165, 0.8)',
                        'rgba(254, 202, 202, 0.8)'
                      ],
                      borderColor: [
                        'rgb(239, 68, 68)',
                        'rgb(245, 101, 101)',
                        'rgb(248, 113, 113)',
                        'rgb(252, 165, 165)',
                        'rgb(254, 202, 202)'
                      ],
                      borderWidth: 2
                    }]
                  }} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Receipt className="h-16 w-16 text-red-300 mx-auto mb-4" />
                      <p className="text-red-600 font-medium">No hay gastos registrados</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comparison Chart */}
        <Card className="shadow-2xl border-0 bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-500/5"></div>
          <CardHeader className="relative">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl shadow-lg">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-purple-900 flex items-center gap-2">
                  Comparación Mensual
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </CardTitle>
                <CardDescription className="text-purple-700 text-base font-medium">
                  Ingresos vs Gastos del mes actual
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="h-80">
              <ComparisonChart data={{
                labels: ['Este Mes'],
                datasets: [
                  {
                    label: 'Ingresos',
                    data: [stats.monthlyRevenue],
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    borderColor: 'rgb(34, 197, 94)',
                    borderWidth: 2
                  },
                  {
                    label: 'Gastos',
                    data: [stats.monthlyExpenseAmount],
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 2
                  }
                ]
              }} />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions - Enhanced */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-2 w-8 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-full shadow-sm"></div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                  Acciones Rápidas
                </h2>
                <Sparkles className="h-5 w-5 text-amber-500" />
              </div>
              <div className="space-y-4">
                <Card className="group hover:shadow-2xl transition-all duration-500 hover:scale-105 bg-gradient-to-br from-blue-50 to-indigo-100 border-0 shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5"></div>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-300/20 to-indigo-400/20 rounded-full -translate-y-12 translate-x-12"></div>
                  <CardHeader className="pb-3 relative">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-blue-900 text-xl font-bold">Crear Factura</CardTitle>
                        <CardDescription className="text-blue-700 text-base">Genera una nueva factura profesional</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 relative">
                    <Link href="/invoices/new">
                      <Button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 text-lg py-6 rounded-xl font-semibold">
                        <Plus className="h-5 w-5 mr-2" />
                        Nueva Factura
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-2xl transition-all duration-500 hover:scale-105 bg-gradient-to-br from-purple-50 to-violet-100 border-0 shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-violet-500/5"></div>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-300/20 to-violet-400/20 rounded-full -translate-y-12 translate-x-12"></div>
                  <CardHeader className="pb-3 relative">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow">
                        <Receipt className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-purple-900 text-xl font-bold">Gestionar Gastos</CardTitle>
                        <CardDescription className="text-purple-700 text-base">Administra y categoriza tus gastos</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 relative">
                    <Link href="/expenses">
                      <Button className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 shadow-lg hover:shadow-xl transition-all duration-300 text-lg py-6 rounded-xl font-semibold">
                        <Receipt className="h-5 w-5 mr-2" />
                        Ver Gastos
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-2xl transition-all duration-500 hover:scale-105 bg-gradient-to-br from-emerald-50 to-green-100 border-0 shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5"></div>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-300/20 to-green-400/20 rounded-full -translate-y-12 translate-x-12"></div>
                  <CardHeader className="pb-3 relative">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow">
                        <BarChart3 className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-emerald-900 text-xl font-bold">Ver Reportes</CardTitle>
                        <CardDescription className="text-emerald-700 text-base">Analiza tu rendimiento con IA</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 relative">
                    <Link href="/monthly-reports">
                      <Button className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all duration-300 text-lg py-6 rounded-xl font-semibold">
                        <TrendingUp className="h-5 w-5 mr-2" />
                        Ver Reportes
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* New Quick Action - Analytics */}
                <Card className="group hover:shadow-2xl transition-all duration-500 hover:scale-105 bg-gradient-to-br from-cyan-50 to-blue-100 border-0 shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5"></div>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-300/20 to-blue-400/20 rounded-full -translate-y-12 translate-x-12"></div>
                  <CardHeader className="pb-3 relative">
                    <div className="flex items-center gap-4">
                      <div className="p-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow">
                        <PieChart className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-cyan-900 text-xl font-bold">Analytics</CardTitle>
                        <CardDescription className="text-cyan-700 text-base">Insights profundos de tu negocio</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 relative">
                    <Button 
                      variant="outline"
                      className="w-full border-2 border-cyan-300 text-cyan-800 hover:bg-cyan-50 hover:border-cyan-400 transition-all duration-300 text-lg py-6 rounded-xl font-semibold bg-white/50"
                    >
                      <Activity className="h-5 w-5 mr-2" />
                      Próximamente
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Enhanced Alerts */}
            {(stats.overdueInvoices > 0 || stats.pendingInvoices > 5) && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-2 w-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-full shadow-sm"></div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                    Alertas Importantes
                  </h3>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
                <div className="space-y-3">
                  {stats.overdueInvoices > 0 && (
                    <Card className="border-0 bg-gradient-to-r from-red-50 to-pink-50 shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-pink-500/5"></div>
                      <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl shadow-lg">
                            <AlertCircle className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-red-900 text-lg">{stats.overdueInvoices} facturas vencidas</p>
                            <p className="text-red-700 font-medium">Requieren atención inmediata</p>
                          </div>
                          <Link href="/invoices">
                            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white shadow-lg">
                              Ver Facturas
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {stats.pendingInvoices > 5 && (
                    <Card className="border-0 bg-gradient-to-r from-amber-50 to-yellow-50 shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-yellow-500/5"></div>
                      <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-xl shadow-lg">
                            <Clock className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-amber-900 text-lg">{stats.pendingInvoices} facturas pendientes</p>
                            <p className="text-amber-700 font-medium">Considera hacer seguimiento</p>
                          </div>
                          <Link href="/invoices">
                            <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-50">
                              Revisar
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Agenda Widget */}
            <AgendaWidget />
          </div>

          <div className="lg:col-span-2 space-y-6">
            {/* Enhanced Recent Activity */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-2 w-8 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-full shadow-sm"></div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
                  Actividad Reciente
                </h2>
                <Activity className="h-5 w-5 text-emerald-500" />
              </div>
              <Card className="shadow-2xl border-0 bg-gradient-to-br from-white via-gray-50 to-slate-50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-300/20 to-teal-400/20 rounded-full -translate-y-16 translate-x-16"></div>
                <CardContent className="p-8 relative">
                  {stats.recentActivity.length > 0 ? (
                    <div className="space-y-4">
                      {stats.recentActivity.slice(0, 6).map((activity, index) => (
                        <div
                          key={activity.id}
                          className={`flex items-center justify-between p-5 bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] ${
                            index === 0 ? 'ring-2 ring-emerald-200' : ''
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`p-3 rounded-2xl shadow-lg ${
                                activity.type === "invoice" 
                                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white" 
                                  : "bg-gradient-to-r from-red-500 to-pink-600 text-white"
                              }`}
                            >
                              {activity.type === "invoice" ? (
                                <FileText className="h-5 w-5" />
                              ) : (
                                <Receipt className="h-5 w-5" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-lg">
                                {activity.type === "invoice" ? `Factura ${activity.number}` : activity.description}
                              </p>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span>{activity.client_name || "Gasto registrado"}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(activity.created_at).toLocaleDateString()}
                                </span>
                                {index === 0 && (
                                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                                    Reciente
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`font-bold text-xl ${
                                activity.type === "expense" ? "text-red-600" : "text-emerald-600"
                              }`}
                            >
                              {activity.type === "expense" ? "-" : "+"}
                              {formatCurrency(activity.total)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {activity.type === "invoice" ? "Ingreso" : "Gasto"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <div className="p-6 bg-gray-100 rounded-full w-fit mx-auto mb-4">
                        <TrendingUp className="h-16 w-16 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay actividad reciente</h3>
                      <p className="text-gray-500">Crea tu primera factura o registra un gasto para comenzar</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Analytics Cards */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Top Clients */}
              <Card className="shadow-2xl border-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-300/20 to-purple-400/20 rounded-full -translate-y-12 translate-x-12"></div>
                <CardHeader className="relative">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-blue-900 text-xl font-bold">Mejores Clientes</CardTitle>
                      <CardDescription className="text-blue-700 font-medium">Por ingresos generados</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  {stats.topClients.length > 0 ? (
                    <div className="space-y-4">
                      {stats.topClients.map((client, index) => (
                        <div key={client.name} className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                              index === 0 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                              index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                              index === 2 ? 'bg-gradient-to-r from-orange-600 to-red-600' :
                              'bg-gradient-to-r from-blue-500 to-indigo-600'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-lg">{client.name}</p>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <FileText className="h-3 w-3" />
                                <span>{client.invoices} facturas</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-blue-700 text-lg">{formatCurrency(client.total)}</p>
                            <p className="text-sm text-blue-600">
                              {formatCurrency(client.total / client.invoices)} prom.
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="p-4 bg-blue-100 rounded-full w-fit mx-auto mb-3">
                        <Users className="h-12 w-12 text-blue-500" />
                      </div>
                      <p className="text-gray-600 font-medium">No hay datos de clientes disponibles</p>
                      <p className="text-sm text-gray-500 mt-1">Crea facturas para ver tus mejores clientes</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Expenses by Category */}
              <Card className="shadow-2xl border-0 bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-rose-500/5"></div>
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-300/20 to-rose-400/20 rounded-full -translate-y-12 translate-x-12"></div>
                <CardHeader className="relative">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl shadow-lg">
                      <PieChart className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-red-900 text-xl font-bold">Gastos por Categoría</CardTitle>
                      <CardDescription className="text-red-700 font-medium">Distribución de gastos</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  {stats.expensesByCategory.length > 0 ? (
                    <div className="space-y-4">
                      {stats.expensesByCategory.map((category, index) => {
                        const percentage = stats.totalExpenseAmount > 0 ? (category.amount / stats.totalExpenseAmount) * 100 : 0;
                        return (
                          <div
                            key={category.category}
                            className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg ${
                                index === 0 ? 'bg-gradient-to-r from-red-500 to-pink-600' :
                                index === 1 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                                index === 2 ? 'bg-gradient-to-r from-pink-500 to-rose-600' :
                                'bg-gradient-to-r from-purple-500 to-pink-600'
                              }`}>
                                <Receipt className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-lg">{category.category}</p>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <span>{category.count} gastos</span>
                                  <span>•</span>
                                  <span>{percentage.toFixed(1)}%</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-red-700 text-lg">{formatCurrency(category.amount)}</p>
                              <p className="text-sm text-red-600">
                                {formatCurrency(category.amount / category.count)} prom.
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="p-4 bg-red-100 rounded-full w-fit mx-auto mb-3">
                        <Receipt className="h-12 w-12 text-red-500" />
                      </div>
                      <p className="text-gray-600 font-medium">No hay datos de gastos disponibles</p>
                      <p className="text-sm text-gray-500 mt-1">Registra gastos para ver la distribución por categorías</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
