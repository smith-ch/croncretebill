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
  Target,
  AlertCircle,
  Users,
  Settings,
  Clock,
  Activity,
  BarChart3,
  PieChart,
  Eye,
  RefreshCw,
  DollarSign,
} from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useCurrency } from "@/hooks/use-currency"
import { useBusinessNotifications } from "@/components/notifications/notification-system"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import { RoleSwitcher } from "@/components/auth/role-switcher"

// Definiciones de tipos para Supabase
interface Invoice {
  id: string
  invoice_number: string
  total: number
  status: string
  due_date?: string
  issue_date?: string
  created_at: string
  clients: { name: string } | { name: string }[]
}

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  expense_date: string
  created_at: string
}

interface ThermalReceipt {
  id: string
  receipt_number: string
  total_amount: number
  status: string
  created_at: string
}

interface DashboardStats {
  totalInvoices: number
  totalRevenue: number
  pendingRevenue: number
  todayRevenue: number
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
  monthlyPendingInvoices: number
  monthlyExpenses: number
  monthlyExpenseAmount: number
  previousMonthRevenue: number
  recentActivity: Array<{
    id: string
    type: "invoice" | "expense" | "thermal_receipt"
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
    todayRevenue: 0,
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
    monthlyPendingInvoices: 0,
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
  const [loadingStates, setLoadingStates] = useState({
    basicStats: true,
    charts: true,
    recentActivity: true,
    analytics: true
  })
  const [showTargetSettings, setShowTargetSettings] = useState(false)
  const [newTarget, setNewTarget] = useState(100000)
  const [isClient, setIsClient] = useState(false)
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview')
  const [notificationsShown, setNotificationsShown] = useState({
    targetAchievement: false,
    revenueGrowth: false,
    overdueInvoices: false,
    lowCashFlow: false
  })
  const { formatCurrency, formatNumber } = useCurrency()
  const { permissions } = useUserPermissions()
  const businessNotifications = useBusinessNotifications()

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    fetchStats()
    loadMonthlyTarget()
    updateMonthlyStats()

    const interval = setInterval(
      () => {
        fetchStats()
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
      // Validar que el valor sea válido
      if (!newTarget || newTarget <= 0) {
        alert("Por favor ingresa una meta válida mayor a 0")
        return
      }

      // Guardar en localStorage
      localStorage.setItem("monthly_target", newTarget.toString())
      
      // Actualizar el estado
      setStats((prev) => ({ ...prev, monthlyTarget: newTarget }))
      
      // Cerrar el modal
      setShowTargetSettings(false)
      
      // Mostrar mensaje de éxito
      alert(`Meta mensual actualizada exitosamente: ${formatCurrency(newTarget)}`)
      
      console.log("Meta mensual actualizada exitosamente:", newTarget)
    } catch (error) {
      console.error("Error updating monthly target:", error)
      alert("Error al actualizar la meta mensual: " + (error instanceof Error ? error.message : 'Error desconocido'))
    }
  }

  const updateMonthlyStats = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user
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
          .neq("status", "cancelada")
          .neq("status", "borrador")
          .gte("created_at", startOfMonth.toISOString())
          .lte("created_at", endOfMonth.toISOString()) as unknown as { data: { total: number; status: string }[] | null },
        supabase
          .from("expenses")
          .select("amount")
          .eq("user_id", user.id)
          .gte("expense_date", startOfMonth.toISOString().split("T")[0])
          .lte("expense_date", endOfMonth.toISOString().split("T")[0]) as unknown as { data: { amount: number }[] | null },
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
        .single() as unknown as { data: { id: string } | null }

      if (existingRecord) {
        await (supabase as any)
          .from("monthly_stats")
          .update({
            total_invoices: totalInvoices,
            total_revenue: totalRevenue,
            expense_count: expenseCount,
            total_expenses: totalExpenses,
          })
          .eq("id", existingRecord.id)
      } else {
        await (supabase as any).from("monthly_stats").insert({
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
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) {
        return
      }

      // Cargar datos básicos primero
      setLoadingStates(prev => ({ ...prev, basicStats: true }))

      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      // Calculate current month start for accurate monthly calculations
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      // Consulta específica para facturas pendientes
      const { data: pendingInvoicesData } = await supabase
        .from("invoices")
        .select("id, invoice_number, total, due_date")
        .eq("user_id", user.id)
        .eq("status", "enviada")

      // Consulta para todas las facturas (para otras estadísticas)
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
        .order("created_at", { ascending: false }) as unknown as { data: Invoice[] | null }

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
        .order("created_at", { ascending: false }) as unknown as { data: Expense[] | null }

      const { data: thermalReceipts, error: thermalError } = await supabase
        .from("thermal_receipts")
        .select(`
          id,
          receipt_number,
          total_amount,
          status,
          created_at
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false }) as unknown as { data: ThermalReceipt[] | null, error: any }

      const { count: clientsCount } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      const { count: productsCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      const { count: projectsCount } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      const totalInvoices = invoices?.length || 0
      // Usar la consulta directa de facturas pendientes
      const facturasPendientesSimple = pendingInvoicesData || []
      
      // Filtrar facturas válidas (excluir canceladas y borradores) para otras estadísticas
      const validInvoices = invoices?.filter((inv) => inv.status !== "cancelada" && inv.status !== "borrador") || []
      const paidInvoices = validInvoices.filter((inv) => inv.status === "pagada") || []
      const unpaidInvoices = validInvoices.filter((inv) => inv.status === "enviada") || []

      const invoiceRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
      // Si hay error en thermal receipts, usar 0 como fallback
      const thermalReceiptRevenue = thermalError ? 0 : (thermalReceipts?.reduce((sum, receipt) => sum + (receipt.total_amount || 0), 0) || 0)
      const totalRevenue = invoiceRevenue + thermalReceiptRevenue

      const totalExpenses = expenses?.length || 0
      const totalExpenseAmount = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0

      // Cálculo usando la consulta directa
      const pendingInvoices = facturasPendientesSimple.length
      const pendingRevenue = facturasPendientesSimple.reduce((sum, inv) => sum + (inv.total || 0), 0)
      
      const overdueInvoices =
        facturasPendientesSimple.filter((inv) => {
          if (!inv.due_date) {
            return false
          }
          return new Date(inv.due_date) < now
        }).length || 0



      const weeklyInvoices = validInvoices.filter((inv) => new Date(inv.created_at) >= weekAgo).length || 0
      const weeklyPaidInvoices = paidInvoices.filter((inv) => new Date(inv.created_at) >= weekAgo)
      const weeklyUnpaidInvoices = unpaidInvoices.filter((inv) => new Date(inv.created_at) >= weekAgo)
      const weeklyThermalReceipts = thermalError ? [] : (thermalReceipts?.filter((receipt) => new Date(receipt.created_at) >= weekAgo) || [])
      
      const weeklyInvoiceRevenue = weeklyPaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
      const weeklyThermalRevenue = weeklyThermalReceipts.reduce((sum, receipt) => sum + (receipt.total_amount || 0), 0)
      const weeklyRevenue = weeklyInvoiceRevenue + weeklyThermalRevenue
      const weeklyPendingRevenue = weeklyUnpaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)

      const weeklyExpenses = expenses?.filter((exp) => new Date(exp.created_at) >= weekAgo).length || 0
      const weeklyExpenseAmount =
        expenses
          ?.filter((exp) => new Date(exp.created_at) >= weekAgo)
          .reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0

      // Calcular venta de hoy (inicio y fin del día actual)
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      
      const todayPaidInvoices = paidInvoices.filter((inv) => {
        const invDate = new Date(inv.issue_date || inv.created_at)
        return invDate >= todayStart && invDate <= todayEnd
      })
      
      const todayThermalReceipts = thermalError ? [] : (thermalReceipts?.filter((receipt) => {
        const receiptDate = new Date(receipt.created_at)
        return receiptDate >= todayStart && receiptDate <= todayEnd
      }) || [])
      
      const todayInvoiceRevenue = todayPaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
      const todayThermalRevenue = todayThermalReceipts.reduce((sum, receipt) => sum + (receipt.total_amount || 0), 0)
      const todayRevenue = todayInvoiceRevenue + todayThermalRevenue

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
        if (inv.status !== "enviada") {
          return false
        }
        const invDate = new Date(inv.issue_date || inv.created_at)
        return invDate >= currentMonthStart && invDate <= currentMonthEnd
      }) || []
      
      const monthlyThermalReceipts = thermalError ? [] : (thermalReceipts?.filter((receipt) => {
        const receiptDate = new Date(receipt.created_at)
        return receiptDate >= currentMonthStart && receiptDate <= currentMonthEnd
      }) || [])
      
      const monthlyInvoiceRevenue = monthlyPaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
      const monthlyThermalRevenue = monthlyThermalReceipts.reduce((sum, receipt) => sum + (receipt.total_amount || 0), 0)
      const monthlyRevenue = monthlyInvoiceRevenue + monthlyThermalRevenue
      const monthlyPendingRevenue = monthlyUnpaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
      
      // Calcular facturas pendientes específicamente del mes actual para mostrar en la tarjeta
      const monthlyPendingInvoices = monthlyUnpaidInvoices.length // Facturas no pagadas del mes

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

      const recentThermalReceipts = thermalError ? [] : (
        thermalReceipts?.slice(0, 2).map((receipt) => ({
          id: receipt.id,
          type: "thermal_receipt" as const,
          number: receipt.receipt_number,
          description: `Comprobante ${receipt.receipt_number}`,
          total: receipt.total_amount || 0,
          created_at: receipt.created_at,
        })) || []
      )

      const recentActivity = [...recentInvoices, ...recentExpenses, ...recentThermalReceipts].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

      // Calculate previous month revenue for growth comparison
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      const previousMonthPaidInvoices = paidInvoices.filter((inv) => {
        const invDate = new Date(inv.created_at)
        return invDate >= previousMonthStart && invDate <= previousMonthEnd
      })
      const previousMonthThermalReceipts = thermalReceipts?.filter((receipt) => {
        const receiptDate = new Date(receipt.created_at)
        return receiptDate >= previousMonthStart && receiptDate <= previousMonthEnd
      }) || []
      
      const previousMonthInvoiceRevenue = previousMonthPaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
      const previousMonthThermalRevenue = previousMonthThermalReceipts.reduce((sum, receipt) => sum + (receipt.total_amount || 0), 0)
      const previousMonthRevenue = previousMonthInvoiceRevenue + previousMonthThermalRevenue

      // ✅ VALORES FINALES CONFIRMADOS:
      // Stats calculated successfully

      setStats((prev) => ({
        ...prev,
        totalInvoices,
        totalRevenue,
        pendingRevenue,
        todayRevenue,
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
        monthlyPendingInvoices,
        monthlyExpenses,
        monthlyExpenseAmount,
        previousMonthRevenue,
        recentActivity,
        pendingInvoices,
        overdueInvoices,
        topClients,
        expensesByCategory,
      }))

      // Actualizar estados de carga progresivamente
      setLoadingStates(prev => ({ ...prev, basicStats: false }))
      setTimeout(() => setLoadingStates(prev => ({ ...prev, charts: false })), 500)
      setTimeout(() => setLoadingStates(prev => ({ ...prev, recentActivity: false })), 1000)
      setTimeout(() => setLoadingStates(prev => ({ ...prev, analytics: false })), 1500)
      
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-2 sm:p-3 lg:p-6">
        <div className="max-w-[1600px] mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Header Skeleton */}
          <Card className="border-0 shadow-lg skeleton">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-300 rounded-xl skeleton"></div>
                  <div className="space-y-2">
                    <div className="h-6 sm:h-8 bg-gray-300 rounded w-32 sm:w-48"></div>
                    <div className="h-3 sm:h-4 bg-gray-200 rounded w-40 sm:w-64 hidden sm:block"></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-8 sm:h-10 bg-gray-300 rounded w-24 sm:w-32"></div>
                  <div className="h-8 sm:h-10 bg-gray-200 rounded w-20 sm:w-28"></div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Meta Card Skeleton */}
          <Card className="border-0 shadow-xl skeleton animate-scale-in">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="h-6 bg-gray-300 rounded w-48"></div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-8 bg-gray-300 rounded w-32"></div>
                    </div>
                  ))}
                </div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-8 bg-gray-300 rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
          
          {/* Stats Cards Skeleton */}
          <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-2 lg:grid-cols-4">
            {[1,2,3,4,5,6,7,8].map((i) => (
              <Card key={i} className="border-0 shadow-lg skeleton animate-scale-in" style={{animationDelay: `${i * 0.05}s`}}>
                <CardContent className="p-3 sm:p-4">
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                      <div className="h-8 w-8 bg-gray-300 rounded-lg"></div>
                    </div>
                    <div className="h-7 sm:h-8 bg-gray-300 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Content Grid Skeleton */}
          <div className="grid gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-3">
            <div className="space-y-4 sm:space-y-6">
              {[1,2,3].map((i) => (
                <Card key={i} className="border-0 shadow-lg skeleton animate-slide-up" style={{animationDelay: `${i * 0.1}s`}}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="h-5 bg-gray-300 rounded w-32"></div>
                      <div className="space-y-2">
                        {[1,2,3].map((j) => (
                          <div key={j} className="flex justify-between items-center">
                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                            <div className="h-4 bg-gray-300 rounded w-16"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <Card className="border-0 shadow-xl skeleton animate-scale-in" style={{animationDelay: '0.3s'}}>
                <CardContent className="p-6">
                  <div className="h-80 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
              <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                {[1,2].map((i) => (
                  <Card key={i} className="border-0 shadow-lg skeleton animate-scale-in" style={{animationDelay: `${0.4 + i * 0.1}s`}}>
                    <CardContent className="p-6">
                      <div className="h-64 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const monthlyProgress = Math.min((stats.monthlyRevenue / stats.monthlyTarget) * 100, 100)

  // Verificar directamente el localStorage para el modo empleado
  const isEmployeeMode = typeof window !== 'undefined' && localStorage.getItem('employee-view-mode') === 'true'
  const wasOriginallyOwner = typeof window !== 'undefined' && localStorage.getItem('was-originally-owner') === 'true'
  
  // Lógica: Mostrar vista empleado SOLO si el modo empleado está activado
  const showEmployeeView = isEmployeeMode

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-2 sm:p-3 lg:p-4">
      <div className="max-w-[1600px] mx-auto space-y-3 sm:space-y-4 lg:space-y-6">
        
        {/* Vista solo para empleados - cuando NO puede ver finanzas O está en modo empleado */}
        {showEmployeeView ? (
          <div className="space-y-6">
            {/* Header Simple para Empleado con Botones */}
            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl shadow-md">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-emerald-800 to-green-600 bg-clip-text text-transparent">
                      Venta de Hoy
                    </h1>
                    <p className="text-sm text-gray-600">Panel de ventas</p>
                  </div>
                </div>

                {/* Botones de Acción para Empleado */}
                <div className="flex items-center gap-2">
                  <Link href="/invoices/new">
                    <Button 
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-300 text-white"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nueva Factura
                    </Button>
                  </Link>
                  
                  <Link href="/thermal-receipts/new">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400 shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      Recibo Térmico
                    </Button>
                  </Link>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      fetchStats()
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar
                  </Button>

                  {/* Divisor */}
                  <div className="h-8 w-px bg-gray-300 mx-1"></div>

                  {/* RoleSwitcher */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <Users className="h-4 w-4 text-gray-500" />
                    <RoleSwitcher />
                  </div>
                </div>
              </div>
            </div>

            {/* Solo Tarjeta de Venta de Hoy */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/10"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-300/20 to-green-400/30 rounded-full -translate-y-16 translate-x-16"></div>
              <CardHeader className="flex flex-row items-center justify-between pb-4 relative">
                <div className="flex-1">
                  <CardTitle className="text-lg font-bold text-emerald-700 uppercase tracking-wide mb-2">Ingresos del Día</CardTitle>
                  <p className="text-sm text-emerald-600">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-lg">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="flex flex-col">
                  <span className="text-5xl font-bold text-emerald-900 mb-4">{formatCurrency(stats.todayRevenue)}</span>
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm text-emerald-700">Total de ventas generadas hoy</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actividad Reciente para Empleados */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-1 w-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                <h2 className="text-xl font-bold text-gray-800">Actividad Reciente</h2>
              </div>
              <Card className="shadow-lg border-0 bg-white relative overflow-hidden">
                <CardContent className="p-4 relative">
                  {stats.recentActivity.length > 0 ? (
                    <div className="space-y-2">
                      {stats.recentActivity.slice(0, 10).map((activity, index) => (
                        <div
                          key={activity.id}
                          className={`flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors ${
                            index === 0 ? 'border-l-2 border-l-emerald-500 bg-emerald-50' : ''
                          }`}
                        >
                          <div
                            className={`p-1.5 rounded-md flex-shrink-0 ${
                              activity.type === "invoice" 
                                ? "bg-blue-500 text-white" 
                                : activity.type === "thermal_receipt"
                                ? "bg-green-500 text-white"
                                : "bg-red-500 text-white"
                            }`}
                          >
                            {activity.type === "invoice" ? (
                              <FileText className="h-4 w-4" />
                            ) : activity.type === "thermal_receipt" ? (
                              <Receipt className="h-4 w-4" />
                            ) : (
                              <Receipt className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="font-semibold text-gray-900 text-sm truncate">
                              {activity.type === "invoice" 
                                ? `Factura #${activity.number}` 
                                : activity.type === "thermal_receipt"
                                ? `Recibo TRM-${activity.number}`
                                : activity.description?.substring(0, 25)}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {activity.client_name || (activity.type === "thermal_receipt" ? "Venta directa" : "Gasto")}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p
                              className={`font-bold text-sm ${
                                activity.type === "expense" ? "text-red-600" : "text-emerald-600"
                              }`}
                            >
                              {formatCurrency(activity.total)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(activity.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold">Sin actividad reciente</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Vista completa para usuarios con permisos */
          <>
        {/* Barra de Acciones Flotante - Sticky - Mobile Optimized */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/50 p-2 sm:p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            {/* Título del Dashboard */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-md">
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-600 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-xs text-gray-600 hidden sm:block">Panel de control empresarial</p>
              </div>
            </div>

            {/* Botones de Acción Principal - Mobile Optimized */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Link href="/invoices/new">
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-300 text-white text-xs sm:text-sm"
                  size="sm"
                >
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Nueva Factura</span>
                  <span className="sm:hidden">Factura</span>
                </Button>
              </Link>
              
              {(permissions.isOwner || permissions.wasOriginallyOwner) && (
                <Link href="/expenses">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white hover:bg-red-50 text-red-700 border-red-200 hover:border-red-400 shadow-sm hover:shadow-md transition-all duration-300 text-xs sm:text-sm"
                  >
                    <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Nuevo Gasto</span>
                    <span className="sm:hidden">Gasto</span>
                  </Button>
                </Link>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  fetchStats()
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 shadow-sm hover:shadow-md transition-all duration-300 hidden sm:flex"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
              
              {permissions.canViewFinances && (
                <Link href="/monthly-reports">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400 shadow-sm hover:shadow-md transition-all duration-300 text-xs sm:text-sm hidden sm:flex"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Reportes
                  </Button>
                </Link>
              )}

              {/* Divisor - Hidden on mobile */}
              <div className="h-8 w-px bg-gray-300 mx-1 hidden lg:block"></div>

              {/* Controles de Vista - Optimized for mobile */}
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5 sm:p-1">
                <Button
                  variant={viewMode === 'overview' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('overview')}
                  className={`rounded-md text-xs h-6 sm:h-7 px-2 sm:px-3 transition-all duration-200 ${viewMode === 'overview' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white'}`}
                >
                  <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Resumen</span>
                </Button>
                <Button
                  variant={viewMode === 'detailed' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('detailed')}
                  className={`rounded-md text-xs h-6 sm:h-7 px-2 sm:px-3 transition-all duration-200 ${viewMode === 'detailed' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white'}`}
                >
                  <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Detallado</span>
                </Button>
              </div>
              
              {/* RoleSwitcher - Hidden on mobile */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 shadow-sm">
                <Users className="h-4 w-4 text-gray-500" />
                <RoleSwitcher />
              </div>
            </div>
          </div>
        </div>

        {/* Layout principal - Reorganizado y optimizado para móvil */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-3 mb-3 sm:mb-4">
          {/* Meta Mensual - Stack completo en mobile, 1 columna en desktop */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 card-hover animate-scale-in">
            <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-blue-500 rounded-lg">
                    <Target className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg font-bold text-blue-900 flex items-center gap-2">
                      Meta Mensual
                      <Badge className={`${
                        monthlyProgress >= 100 ? 'bg-emerald-500' :
                        monthlyProgress >= 75 ? 'bg-blue-500' :
                        monthlyProgress >= 50 ? 'bg-amber-500' : 'bg-red-500'
                      } text-white px-1.5 sm:px-2 py-0.5 text-xs sm:text-sm`}>
                        {monthlyProgress.toFixed(1)}%
                      </Badge>
                    </CardTitle>
                    <p className="text-xs text-blue-600">
                      {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log("Botón de configuración clickeado, showTargetSettings actual:", showTargetSettings)
                    setShowTargetSettings(!showTargetSettings)
                  }}
                  className="text-blue-700 hover:bg-blue-100 rounded-lg p-1.5 sm:p-2"
                  title="Configurar meta mensual"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-2 p-3 sm:p-6">
              <div className="space-y-2 sm:space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/60 rounded-lg p-2 sm:p-3">
                    <div className="text-xs text-blue-600">Alcanzado</div>
                    <div className="text-base sm:text-lg font-bold text-blue-800">{formatCurrency(stats.monthlyRevenue)}</div>
                  </div>
                  <div className="bg-white/60 rounded-lg p-2 sm:p-3">
                    <div className="text-xs text-blue-600">Meta</div>
                    <div className="text-base sm:text-lg font-bold text-blue-800">{formatCurrency(stats.monthlyTarget)}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-600">Progreso</span>
                    <span className="text-blue-800 font-semibold">
                      {monthlyProgress >= 100 ? '¡Meta Superada! 🎉' : 
                       `Falta: ${formatCurrency(Math.max(0, stats.monthlyTarget - stats.monthlyRevenue))}`}
                    </span>
                  </div>
                  <Progress value={Math.min(monthlyProgress, 100)} className="h-2" />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/50 rounded-lg p-2">
                    <div className="text-xs text-amber-600">Facturas</div>
                    <div className="text-sm font-bold text-amber-900">{formatNumber(stats.monthlyInvoices)}</div>
                  </div>
                  <div className="bg-white/50 rounded-lg p-2">
                    <div className="text-xs text-amber-600">Promedio</div>
                    <div className="text-sm font-bold text-amber-900">
                      {stats.monthlyInvoices > 0 ? formatCurrency(stats.monthlyRevenue / stats.monthlyInvoices) : formatCurrency(0)}
                    </div>
                  </div>
                  <div className="bg-white/50 rounded-lg p-2">
                    <div className="text-xs text-amber-600">Días resto</div>
                    <div className="text-sm font-bold text-amber-900">
                      {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Facturas Pendientes - Mobile Optimized */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 card-hover animate-scale-in" style={{animationDelay: '0.1s'}}>
            <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-amber-500 rounded-lg">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <CardTitle className="text-base sm:text-lg font-bold text-amber-800">Pendientes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="space-y-2 sm:space-y-3">
                <div className="text-center bg-white/60 rounded-lg p-2 sm:p-3">
                  <div className="text-2xl sm:text-3xl font-bold text-amber-800">
                    {formatCurrency(stats.pendingRevenue)}
                  </div>
                  <div className="text-xs sm:text-sm text-amber-600">Total por cobrar</div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-white/50 rounded-lg p-2">
                    <div className="text-lg sm:text-xl font-bold text-amber-700">{formatNumber(stats.pendingInvoices)}</div>
                    <div className="text-xs text-amber-600">Facturas</div>
                  </div>
                  <div className="bg-white/50 rounded-lg p-2">
                    <div className="text-lg sm:text-xl font-bold text-red-700">{stats.overdueInvoices}</div>
                    <div className="text-xs text-red-600">Vencidas</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rendimiento Semanal - Mobile Optimized */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 relative overflow-hidden card-hover animate-scale-in" style={{animationDelay: '0.2s'}}>
            <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-emerald-300/20 to-green-300/20 rounded-full -translate-y-8 sm:-translate-y-12 translate-x-8 sm:translate-x-12"></div>
            <CardHeader className="relative pb-2 sm:pb-3 p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-2.5 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl shadow-lg">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <CardTitle className="text-base sm:text-lg font-bold text-emerald-900">Esta Semana</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="relative pt-0 p-3 sm:p-6">
              <div className="space-y-2 sm:space-y-3">
                <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-2 sm:p-3 border border-emerald-200/50">
                  <div className="text-2xl sm:text-3xl font-bold text-emerald-800">
                    {formatCurrency(stats.weeklyRevenue)}
                  </div>
                  <div className="text-xs sm:text-sm text-emerald-600 font-medium">Ingresos semanales</div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/50 rounded-lg p-2 text-center">
                    <div className="text-lg sm:text-xl font-bold text-emerald-700">{formatNumber(stats.weeklyInvoices)}</div>
                    <div className="text-xs text-emerald-600">Facturas</div>
                  </div>
                  <div className="bg-white/50 rounded-lg p-2 text-center">
                    <div className="text-lg sm:text-xl font-bold text-emerald-700">
                      {formatCurrency(stats.weeklyExpenseAmount)}
                    </div>
                    <div className="text-xs text-emerald-600">Gastos</div>
                  </div>
                </div>

                <div className="bg-white/50 rounded-lg p-2">
                  <div className="text-xs text-emerald-600">Balance neto semanal</div>
                  <div className="text-base sm:text-lg font-bold text-emerald-800">
                    {formatCurrency(stats.weeklyRevenue - stats.weeklyExpenseAmount)}
                  </div>
                  <div className={`text-xs ${
                    (stats.weeklyRevenue - stats.weeklyExpenseAmount) > 0 ? 'text-emerald-600' : 'text-red-600'
                  } flex items-center gap-1`}>
                    {(stats.weeklyRevenue - stats.weeklyExpenseAmount) > 0 ? '↗ Positivo' : '↘ Negativo'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Segunda fila - Gastos del Mes - Mobile Optimized */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-3 mb-3 sm:mb-4">
          {/* Gastos del Mes - Tarjeta completa */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-red-300/20 to-rose-300/20 rounded-full -translate-y-8 sm:-translate-y-12 translate-x-8 sm:translate-x-12"></div>
            <CardHeader className="relative pb-2 sm:pb-3 p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-2.5 bg-gradient-to-r from-red-500 to-rose-500 rounded-xl shadow-lg">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white transform rotate-180" />
                </div>
                <CardTitle className="text-base sm:text-lg font-bold text-red-900">Gastos del Mes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="relative pt-0 p-3 sm:p-6">
              <div className="space-y-2 sm:space-y-3">
                <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-2 sm:p-3 border border-red-200/50">
                  <div className="text-2xl sm:text-3xl font-bold text-red-800">
                    {formatCurrency(stats.monthlyExpenseAmount)}
                  </div>
                  <div className="text-xs sm:text-sm text-red-600 font-medium">Total gastado</div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/50 rounded-lg p-2 text-center">
                    <div className="text-lg sm:text-xl font-bold text-red-700">{formatNumber(stats.monthlyExpenses)}</div>
                    <div className="text-xs text-red-600">Registros</div>
                  </div>
                  <div className="bg-white/50 rounded-lg p-2 text-center">
                    <div className="text-lg sm:text-xl font-bold text-red-700">
                      {stats.monthlyExpenses > 0 ? formatCurrency(stats.monthlyExpenseAmount / stats.monthlyExpenses) : formatCurrency(0)}
                    </div>
                    <div className="text-xs text-red-600">Promedio</div>
                  </div>
                </div>

                <div className="bg-white/50 rounded-lg p-2">
                  <div className="text-xs text-red-600">Margen bruto</div>
                  <div className="text-base sm:text-lg font-bold text-red-800">
                    {formatCurrency(stats.monthlyRevenue - stats.monthlyExpenseAmount)}
                  </div>
                  <div className="text-xs text-red-500">
                    {stats.monthlyRevenue > 0 ? 
                      `${(((stats.monthlyRevenue - stats.monthlyExpenseAmount) / stats.monthlyRevenue) * 100).toFixed(1)}% margen` 
                      : '0% margen'
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumen General - Mobile Optimized Vertical Stack */}
          <Card className="lg:col-span-2 border-0 shadow-lg bg-gradient-to-br from-slate-50 to-gray-100">
            <CardHeader className="pb-3 p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-r from-slate-600 to-gray-700 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-sm sm:text-base font-bold text-slate-800">Resumen General</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white/70 rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Clientes</span>
                    <span className="text-xl sm:text-2xl font-bold text-slate-800">{formatNumber(stats.totalClients)}</span>
                  </div>
                </div>
                <div className="bg-white/70 rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Productos</span>
                    <span className="text-xl sm:text-2xl font-bold text-slate-800">{formatNumber(stats.totalProducts)}</span>
                  </div>
                </div>
                <div className="bg-white/70 rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Proyectos</span>
                    <span className="text-xl sm:text-2xl font-bold text-slate-800">{formatNumber(stats.totalProjects)}</span>
                  </div>
                </div>
                <div className="bg-white/70 rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Facturas</span>
                    <span className="text-xl sm:text-2xl font-bold text-slate-800">{formatNumber(stats.totalInvoices)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Configuración de Meta */}
        {showTargetSettings && (
          <Card className="border-2 border-blue-200 shadow-xl bg-white mb-4 animate-in slide-in-from-top-2 duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-blue-800 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurar Meta Mensual
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="monthly-target" className="text-gray-700 font-semibold">
                    Nueva Meta Mensual ({formatCurrency(newTarget)})
                  </Label>
                  <Input
                    id="monthly-target"
                    type="number"
                    min="1"
                    step="1000"
                    value={newTarget}
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      if (!isNaN(value) && value >= 0) {
                        setNewTarget(value)
                      }
                    }}
                    placeholder="Ingresa tu meta mensual"
                    className="mt-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => {
                      console.log("Botón Guardar clickeado, newTarget:", newTarget)
                      updateMonthlyTarget()
                    }} 
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={!newTarget || newTarget <= 0}
                  >
                    Guardar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowTargetSettings(false)}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contenido Principal Organizado por Vista - Solo para usuarios con permisos */}
        {viewMode === 'overview' ? (
          /* Vista Resumen - Lo más importante de un vistazo */
          <>
            {/* Estadísticas Principales */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Resumen General
              </h2>
              {loadingStates.basicStats ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <StatsCards {...stats} />
              )}
            </div>

            {/* Alertas Importantes Mejoradas */}
            {(stats.overdueInvoices > 0 || stats.pendingInvoices > 5) && (
              <div className="mb-6 lg:mb-8 animate-in slide-in-from-left duration-500">
                <div className="flex items-center gap-2 lg:gap-3 mb-4">
                  <div className="h-1 w-8 lg:w-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-full animate-pulse"></div>
                  <h3 className="text-lg lg:text-xl font-bold text-red-700">Alertas Importantes</h3>
                  <AlertCircle className="h-4 w-4 lg:h-5 lg:w-5 text-red-500 animate-pulse" />
                </div>
                <div className="grid gap-3 lg:gap-4 md:grid-cols-2">
                  {stats.overdueInvoices > 0 && (
                    <Card className="border-l-4 border-l-red-500 bg-red-50/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                      <CardContent className="p-4 lg:p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:gap-4">
                          <div className="p-2 lg:p-3 bg-red-100 rounded-full flex-shrink-0">
                            <AlertCircle className="h-5 w-5 lg:h-6 lg:w-6 text-red-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-red-900 text-base lg:text-lg">{stats.overdueInvoices} facturas vencidas</p>
                            <p className="text-sm lg:text-base text-red-700">Requieren atención inmediata</p>
                          </div>
                          <Link href="/invoices" className="w-full sm:w-auto">
                            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto hover:scale-105 transition-transform">
                              Ver Facturas
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {stats.pendingInvoices > 5 && (
                    <Card className="border-l-4 border-l-amber-500 bg-amber-50/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                      <CardContent className="p-4 lg:p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:gap-4">
                          <div className="p-2 lg:p-3 bg-amber-100 rounded-full flex-shrink-0">
                            <Clock className="h-5 w-5 lg:h-6 lg:w-6 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-amber-900 text-base lg:text-lg">{formatNumber(stats.pendingInvoices)} facturas pendientes</p>
                            <p className="text-sm lg:text-base text-amber-700">Considera hacer seguimiento</p>
                          </div>
                          <Link href="/invoices" className="w-full sm:w-auto">
                            <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-50 w-full sm:w-auto hover:scale-105 transition-transform">
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

            {/* Widgets de Información Clave */}
            {permissions.canViewFinances && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-1 w-10 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"></div>
                  <h2 className="text-2xl font-bold text-gray-800">Análisis Rápido</h2>
                </div>
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
                      title: 'Rendimiento del mes',
                      message: `${formatCurrency(stats.monthlyRevenue)} generados`
                    },
                    {
                      type: 'info', 
                      title: 'Base de clientes',
                      message: `${stats.totalClients} clientes activos`
                    }
                  ]} />
                </div>
              </div>
            )}
          </>
        ) : (
          /* Vista Detallada - Análisis completo */
          <>
            {/* Estadísticas Completas */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-1 w-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"></div>
                <h2 className="text-2xl font-bold text-gray-800">Estadísticas Detalladas</h2>
              </div>
              <StatsCards {...stats} />
            </div>

            {/* Análisis Avanzado */}
            {permissions.canViewFinances && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-1 w-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                  <h2 className="text-2xl font-bold text-gray-800">Análisis Avanzado</h2>
                </div>
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
                      title: 'Rendimiento del mes',
                      message: `${formatCurrency(stats.monthlyRevenue)} generados`
                    },
                    {
                      type: 'info', 
                      title: 'Base de clientes',
                      message: `${stats.totalClients} clientes activos`
                    }
                  ]} />
                </div>
              </div>
            )}
          </>
        )}

        {/* Gráficos y Análisis Visual - Solo para vista detallada y usuarios con permisos */}
        {viewMode === 'detailed' && permissions.canViewFinances && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-1 w-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
              <h2 className="text-2xl font-bold text-gray-800">Análisis Visual</h2>
            </div>
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
          </div>
        )}

        {/* Comparison Chart - Solo para usuarios con permisos financieros */}
        {permissions.canViewFinances && (
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
        )}

        {/* Sección de Gestión y Actividad - Optimizada */}
        <div className="grid gap-4 xl:grid-cols-4">
          <div className="xl:col-span-1 space-y-4">
            {/* Panel de Control Rápido */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-1 w-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                <h2 className="text-lg font-bold text-gray-800">Panel de Control</h2>
              </div>
              <div className="space-y-3">
                {/* Acción Principal */}
                <Link href="/invoices/new">
                  <Card className="hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                          <Plus className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">Nueva Factura</h3>
                          <p className="text-blue-100 text-sm">Crear factura profesional</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                {/* Gestionar Gastos - Solo para owners */}
                {(permissions.isOwner || permissions.wasOriginallyOwner) && (
                  <Link href="/expenses">
                    <Card className="hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-red-500 to-pink-600 text-white border-0 cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/20 rounded-lg">
                            <Receipt className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">Nuevo Gasto</h3>
                            <p className="text-red-100 text-sm">Registrar gasto</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )}
                

                
                {/* Widget de Estadísticas Rápidas */}
                <Card className="border-0 shadow-lg bg-white">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-gray-800 mb-3 text-sm">Resumen Semanal</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Ingresos:</span>
                        <span className="font-semibold text-green-600 text-sm">{formatCurrency(stats.weeklyRevenue)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Gastos:</span>
                        <span className="font-semibold text-red-600 text-sm">{formatCurrency(stats.weeklyExpenseAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t">
                        <span className="text-xs text-gray-600">Neto:</span>
                        <span className="font-bold text-blue-600 text-sm">{formatCurrency(stats.weeklyRevenue - stats.weeklyExpenseAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Facturas:</span>
                        <span className="font-semibold text-purple-600 text-sm">{formatNumber(stats.weeklyInvoices)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Widget de Estado del Negocio */}
                <Card className="border-0 shadow-lg bg-white">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-gray-800 mb-3 text-sm">Estado del Negocio</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Total Clientes:</span>
                        <span className="font-semibold text-blue-600 text-sm">{formatNumber(stats.totalClients)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Total Productos:</span>
                        <span className="font-semibold text-green-600 text-sm">{formatNumber(stats.totalProducts)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Proyectos:</span>
                        <span className="font-semibold text-purple-600 text-sm">{formatNumber(stats.totalProjects)}</span>
                      </div>
                      {stats.overdueInvoices > 0 && (
                        <div className="flex justify-between items-center pt-1 border-t">
                          <span className="text-xs text-red-600">Vencidas:</span>
                          <span className="font-bold text-red-600 text-sm">{stats.overdueInvoices}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                


                {/* Enlaces rápidos compactos */}
                {permissions.canViewFinances && (
                  <Link href="/monthly-reports">
                    <Card className="hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 cursor-pointer">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="p-1 bg-white/20 rounded-lg">
                            <BarChart3 className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm">Ver Reportes</h3>
                            <p className="text-emerald-100 text-xs">Análisis con IA</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )}
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
                            <p className="font-bold text-amber-900 text-lg">{formatNumber(stats.pendingInvoices)} facturas pendientes</p>
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

            {/* Agenda Widget - Solo en vista detallada */}
            {viewMode === 'detailed' && <AgendaWidget />}
          </div>

          <div className="xl:col-span-3 space-y-4">
            {/* Actividad Reciente Compacta - Ultra Mobile Optimized */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-1 w-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                <h2 className="text-base sm:text-xl font-bold text-gray-800">Actividad Reciente</h2>
              </div>
              <Card className="shadow-lg border-0 bg-white relative overflow-hidden">
                <CardContent className="p-2 sm:p-4 relative">
                  {stats.recentActivity.length > 0 ? (
                    <div className="space-y-2">
                      {stats.recentActivity.slice(0, 8).map((activity, index) => (
                        <div
                          key={activity.id}
                          className={`flex items-center gap-2 p-2 bg-gray-50 rounded-lg ${
                            index === 0 ? 'border-l-2 border-l-emerald-500 bg-emerald-50' : ''
                          }`}
                        >
                          <div
                            className={`p-1 rounded-md flex-shrink-0 ${
                              activity.type === "invoice" 
                                ? "bg-blue-500 text-white" 
                                : activity.type === "thermal_receipt"
                                ? "bg-green-500 text-white"
                                : "bg-red-500 text-white"
                            }`}
                          >
                            {activity.type === "invoice" ? (
                              <FileText className="h-3 w-3" />
                            ) : activity.type === "thermal_receipt" ? (
                              <Receipt className="h-3 w-3" />
                            ) : (
                              <Receipt className="h-3 w-3" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="font-semibold text-gray-900 text-xs truncate">
                              {activity.type === "invoice" 
                                ? `#${activity.number}` 
                                : activity.type === "thermal_receipt"
                                ? `TRM-${activity.number}`
                                : activity.description?.substring(0, 15)}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {activity.client_name?.substring(0, 20) || (activity.type === "thermal_receipt" ? "Venta" : "Gasto")}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p
                              className={`font-bold text-xs ${
                                activity.type === "expense" ? "text-red-600" : "text-emerald-600"
                              }`}
                            >
                              {formatCurrency(activity.total)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold">Sin actividad</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Analytics Cards - Ultra Compact Mobile */}
            <div className="grid gap-3 sm:gap-6 grid-cols-1 md:grid-cols-2">
              {/* Top Clients - Ultra Compact */}
              <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-50 to-purple-50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
                <CardHeader className="p-3 sm:p-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
                      <Users className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="overflow-hidden">
                      <CardTitle className="text-blue-900 text-sm sm:text-xl font-bold">Mejores Clientes</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  {stats.topClients.length > 0 ? (
                    <div className="space-y-2">
                      {stats.topClients.map((client, index) => (
                        <div key={client.name} className="flex items-center gap-2 p-2 bg-white/80 rounded-lg shadow-sm">
                          <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-lg shadow-lg flex-shrink-0 ${
                            index === 0 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                            index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                            index === 2 ? 'bg-gradient-to-r from-orange-600 to-red-600' :
                            'bg-gradient-to-r from-blue-500 to-indigo-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="font-bold text-gray-900 text-xs sm:text-base truncate">{client.name}</p>
                            <p className="text-xs text-gray-600">{client.invoices} fact.</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-blue-700 text-xs sm:text-base whitespace-nowrap">{formatCurrency(client.total)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                      <p className="text-xs text-gray-600">Sin datos</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Expenses by Category - Ultra Compact */}
              <Card className="shadow-xl border-0 bg-gradient-to-br from-red-50 to-rose-50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-rose-500/5"></div>
                <CardHeader className="p-3 sm:p-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl shadow-lg">
                      <PieChart className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="overflow-hidden">
                      <CardTitle className="text-red-900 text-sm sm:text-xl font-bold">Gastos</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  {stats.expensesByCategory.length > 0 ? (
                    <div className="space-y-2">
                      {stats.expensesByCategory.map((category, index) => (
                        <div
                          key={category.category}
                          className="flex items-center gap-2 p-2 bg-white/80 rounded-lg shadow-sm"
                        >
                          <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0 ${
                            index === 0 ? 'bg-gradient-to-r from-red-500 to-pink-600' :
                            index === 1 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                            index === 2 ? 'bg-gradient-to-r from-pink-500 to-rose-600' :
                            'bg-gradient-to-r from-purple-500 to-pink-600'
                          }`}>
                            <Receipt className="h-3 w-3 sm:h-5 sm:w-5" />
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="font-bold text-gray-900 text-xs sm:text-base truncate">{category.category}</p>
                            <p className="text-xs text-gray-600">{category.count} reg.</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-red-700 text-xs sm:text-base whitespace-nowrap">{formatCurrency(category.amount)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Receipt className="h-8 w-8 text-red-500 mx-auto mb-2" />
                      <p className="text-xs text-gray-600">Sin gastos</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  )
}
