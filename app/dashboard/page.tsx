"use client"

import { useEffect, useState } from "react"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { AgendaWidget } from "@/components/dashboard/agenda-widget"
import { CompanyProfileWidget } from "@/components/dashboard/company-profile-widget"
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
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
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
        data: { user },
      } = await supabase.auth.getUser()
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
      console.log("🔥 FACTURAS PENDIENTES DIRECTAS:", facturasPendientesSimple)
      
      // Filtrar facturas válidas (excluir canceladas y borradores) para otras estadísticas
      const validInvoices = invoices?.filter((inv) => inv.status !== "cancelada" && inv.status !== "borrador") || []
      const paidInvoices = validInvoices.filter((inv) => inv.status === "pagada") || []
      const unpaidInvoices = validInvoices.filter((inv) => inv.status === "enviada") || []

      // Los logs de debug muestran que hay 4 facturas "enviada" pero de meses anteriores

      const invoiceRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
      // Si hay error en thermal receipts, usar 0 como fallback
      const thermalReceiptRevenue = thermalError ? 0 : (thermalReceipts?.reduce((sum, receipt) => sum + (receipt.total_amount || 0), 0) || 0)
      const totalRevenue = invoiceRevenue + thermalReceiptRevenue

      const totalExpenses = expenses?.length || 0
      const totalExpenseAmount = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0

      // Cálculo SUPER SIMPLE usando la consulta directa
      const pendingInvoices = facturasPendientesSimple.length
      const pendingRevenue = facturasPendientesSimple.reduce((sum, inv) => sum + (inv.total || 0), 0)
      
      console.log("� RESULTADO FINAL SIMPLE:")
      console.log("- Cantidad facturas pendientes:", pendingInvoices)
      console.log("- Revenue pendiente:", pendingRevenue)
      console.log("- Lista facturas:", facturasPendientesSimple.map(inv => ({
        numero: inv.invoice_number,
        total: inv.total
      })))
      
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
      console.log("✅ ENVIANDO A setStats:", { pendingInvoices, pendingRevenue, overdueInvoices })

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            {/* Header Skeleton */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-300 rounded-3xl"></div>
                <div className="space-y-2">
                  <div className="h-8 bg-gray-300 rounded w-48"></div>
                  <div className="h-4 bg-gray-200 rounded w-64"></div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-10 bg-gray-300 rounded w-32"></div>
                <div className="h-10 bg-gray-200 rounded w-28"></div>
              </div>
            </div>
            
            {/* Meta Card Skeleton */}
            <div className="h-48 bg-gray-200 rounded-2xl"></div>
            
            {/* Stats Cards Skeleton */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl shadow-sm"></div>
              ))}
            </div>
            
            {/* Content Grid Skeleton */}
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-40 bg-gray-200 rounded-xl"></div>
                ))}
              </div>
              <div className="lg:col-span-2 space-y-6">
                <div className="h-96 bg-gray-200 rounded-xl"></div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="h-64 bg-gray-200 rounded-xl"></div>
                  <div className="h-64 bg-gray-200 rounded-xl"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const monthlyProgress = Math.min((stats.monthlyRevenue / stats.monthlyTarget) * 100, 100)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-3 lg:p-4">
      <div className="max-w-[1600px] mx-auto space-y-4 lg:space-y-6">
        {/* Header Section - Mobile Optimized */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl shadow-lg border border-gray-200/50 p-3 lg:p-4 mb-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 lg:gap-4">
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="p-2 lg:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl lg:rounded-2xl shadow-lg">
                <BarChart3 className="h-5 w-5 lg:h-7 lg:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-600 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-xs lg:text-sm text-gray-600 font-medium">Panel de control empresarial</p>
              </div>
            </div>
            
            {/* Indicadores de Estado Limpios */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-700">En línea</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                <Clock className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-600">
                  {lastUpdate?.toLocaleTimeString() || 'Cargando...'}
                </span>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300 ${
                monthlyProgress >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 
                monthlyProgress >= 50 ? 'bg-amber-50 text-amber-700 border-amber-300' : 
                'bg-red-50 text-red-700 border-red-300'
              }`}>
                <Target className="h-3 w-3" />
                <span className="text-xs font-semibold">Meta: {monthlyProgress.toFixed(0)}%</span>
              </div>
              {stats.overdueInvoices > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg border border-red-300">
                  <AlertCircle className="h-3 w-3 text-red-500" />
                  <span className="text-xs font-semibold text-red-700">{stats.overdueInvoices} vencidas</span>
                </div>
              )}
              {stats.pendingInvoices > 5 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-300">
                  <Clock className="h-3 w-3 text-amber-500" />
                  <span className="text-xs font-semibold text-amber-700">{formatNumber(stats.pendingInvoices)} pendientes</span>
                </div>
              )}
            </div>

            {/* Información Clave y Controles */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Métricas rápidas */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">Ingresos mes:</span>
                  <span className="font-bold text-blue-700">{formatCurrency(stats.monthlyRevenue)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Total clientes:</span>
                  <span className="font-bold text-green-700">{formatNumber(stats.totalClients)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-gray-600">Facturas mes:</span>
                  <span className="font-bold text-purple-700">{formatNumber(stats.monthlyInvoices)}</span>
                </div>
                

              </div>
              
              {/* Controles de Vista y Rol */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'overview' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('overview')}
                    className={`rounded-md text-xs transition-all duration-200 ${viewMode === 'overview' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-600 hover:bg-white'}`}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Resumen
                  </Button>
                  <Button
                    variant={viewMode === 'detailed' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('detailed')}
                    className={`rounded-md text-xs transition-all duration-200 ${viewMode === 'detailed' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-600 hover:bg-white'}`}
                  >
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Detallado
                  </Button>
                </div>
                
                {/* RoleSwitcher integrado elegantemente */}
                <div className="flex items-center gap-2 px-2 py-1 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <Users className="h-3 w-3 text-gray-500" />
                  <RoleSwitcher />
                </div>
              </div>
            </div>
          </div>

          {/* Acciones Rápidas Integradas */}
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/invoices/new">
              <Button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 text-white border-0 px-4 py-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Factura
              </Button>
            </Link>
            
            {(permissions.isOwner || permissions.wasOriginallyOwner) && (
              <Link href="/expenses">
                <Button
                  variant="outline"
                  className="bg-white hover:bg-red-50 text-red-700 border border-red-200 hover:border-red-400 shadow-md hover:shadow-lg transition-all duration-300 px-4 py-2"
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Nuevo Gasto
                </Button>
              </Link>
            )}
            
            <Button
              variant="ghost"
              onClick={() => {
                fetchStats()
                setLastUpdate(new Date())
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 shadow-sm hover:shadow-md transition-all duration-300 px-4 py-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
            
            {permissions.canViewFinances && (
              <Link href="/monthly-reports">
                <Button
                  variant="outline"
                  className="bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 hover:border-emerald-400 shadow-md hover:shadow-lg transition-all duration-300 px-4 py-2"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Reportes
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Layout principal - Simplificado */}
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4 mb-4">
          {/* Meta Mensual - Simplificada */}
          <Card className="xl:col-span-2 border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-blue-900 flex items-center gap-2">
                      Meta Mensual
                      <Badge className={`${
                        monthlyProgress >= 100 ? 'bg-emerald-500' :
                        monthlyProgress >= 75 ? 'bg-blue-500' :
                        monthlyProgress >= 50 ? 'bg-amber-500' : 'bg-red-500'
                      } text-white px-2 py-0.5 text-sm`}>
                        {monthlyProgress.toFixed(1)}%
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-blue-600">
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
                  className="text-blue-700 hover:bg-blue-100 rounded-lg p-2"
                  title="Configurar meta mensual"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white/60 rounded-lg p-3">
                    <div className="text-sm text-blue-600">Alcanzado</div>
                    <div className="text-xl font-bold text-blue-800">{formatCurrency(stats.monthlyRevenue)}</div>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3">
                    <div className="text-sm text-blue-600">Meta</div>
                    <div className="text-xl font-bold text-blue-800">{formatCurrency(stats.monthlyTarget)}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-600">Progreso</span>
                    <span className="text-blue-800 font-semibold">
                      {monthlyProgress >= 100 ? '¡Meta Superada! 🎉' : 
                       `Falta: ${formatCurrency(Math.max(0, stats.monthlyTarget - stats.monthlyRevenue))}`}
                    </span>
                  </div>
                  <Progress value={Math.min(monthlyProgress, 100)} className="h-2" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
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
          
          {/* Información Empresarial y Perfil - 2 columnas */}
          <div className="xl:col-span-2">
            <CompanyProfileWidget />
          </div>
        </div>

        {/* Métricas Clave - Simplificadas */}
        <div className="grid gap-3 lg:grid-cols-3 mb-4">
          {/* Facturas Pendientes */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-amber-800 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-800">
                    {formatCurrency(stats.pendingRevenue)}
                  </div>
                  <div className="text-sm text-amber-600">Total por cobrar</div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-center text-sm">
                  <div>
                    <div className="font-bold text-amber-700">{formatNumber(stats.pendingInvoices)}</div>
                    <div className="text-amber-600">Facturas</div>
                  </div>
                  <div>
                    <div className="font-bold text-red-700">{stats.overdueInvoices}</div>
                    <div className="text-red-600">Vencidas</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gastos del Mes */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-300/20 to-rose-300/20 rounded-full -translate-y-12 translate-x-12"></div>
            <CardHeader className="relative pb-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-gradient-to-r from-red-500 to-rose-500 rounded-xl shadow-lg">
                  <TrendingUp className="h-5 w-5 text-white transform rotate-180" />
                </div>
                <CardTitle className="text-lg font-bold text-red-900">Gastos del Mes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="relative pt-0">
              <div className="space-y-4">
                <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-red-200/50">
                  <div className="text-3xl font-bold text-red-800 mb-1">
                    {formatCurrency(stats.monthlyExpenseAmount)}
                  </div>
                  <div className="text-sm text-red-600 font-medium">Total gastado</div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-700">{formatNumber(stats.monthlyExpenses)}</div>
                    <div className="text-xs text-red-600">Registros</div>
                  </div>
                  <div className="bg-white/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-700">
                      {stats.monthlyExpenses > 0 ? formatCurrency(stats.monthlyExpenseAmount / stats.monthlyExpenses) : formatCurrency(0)}
                    </div>
                    <div className="text-xs text-red-600">Promedio</div>
                  </div>
                </div>

                <div className="bg-white/50 rounded-lg p-3">
                  <div className="text-xs text-red-600 mb-1">Margen bruto</div>
                  <div className="text-lg font-bold text-red-800">
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

          {/* Rendimiento Semanal */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-300/20 to-green-300/20 rounded-full -translate-y-12 translate-x-12"></div>
            <CardHeader className="relative pb-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl shadow-lg">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-emerald-900">Esta Semana</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="relative pt-0">
              <div className="space-y-4">
                <div className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-emerald-200/50">
                  <div className="text-3xl font-bold text-emerald-800 mb-1">
                    {formatCurrency(stats.weeklyRevenue)}
                  </div>
                  <div className="text-sm text-emerald-600 font-medium">Ingresos semanales</div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-700">{formatNumber(stats.weeklyInvoices)}</div>
                    <div className="text-xs text-emerald-600">Facturas</div>
                  </div>
                  <div className="bg-white/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-700">
                      {formatCurrency(stats.weeklyExpenseAmount)}
                    </div>
                    <div className="text-xs text-emerald-600">Gastos</div>
                  </div>
                </div>

                <div className="bg-white/50 rounded-lg p-3">
                  <div className="text-xs text-emerald-600 mb-1">Balance neto semanal</div>
                  <div className="text-lg font-bold text-emerald-800">
                    {formatCurrency(stats.weeklyRevenue - stats.weeklyExpenseAmount)}
                  </div>
                  <div className={`text-xs ${
                    (stats.weeklyRevenue - stats.weeklyExpenseAmount) >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {(stats.weeklyRevenue - stats.weeklyExpenseAmount) >= 0 ? '↗ Positivo' : '↘ Negativo'}
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



        {/* Contenido Principal Organizado por Vista */}
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

            {/* Alertas Importantes */}
            {(stats.overdueInvoices > 0 || stats.pendingInvoices > 5) && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-1 w-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-full"></div>
                  <h3 className="text-xl font-bold text-red-700">Alertas Importantes</h3>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {stats.overdueInvoices > 0 && (
                    <Card className="border-l-4 border-l-red-500 bg-red-50/50 backdrop-blur-sm shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-red-100 rounded-full">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-red-900 text-lg">{stats.overdueInvoices} facturas vencidas</p>
                            <p className="text-red-700">Requieren atención inmediata</p>
                          </div>
                          <Link href="/invoices">
                            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                              Ver Facturas
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {stats.pendingInvoices > 5 && (
                    <Card className="border-l-4 border-l-amber-500 bg-amber-50/50 backdrop-blur-sm shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-amber-100 rounded-full">
                            <Clock className="h-6 w-6 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-amber-900 text-lg">{formatNumber(stats.pendingInvoices)} facturas pendientes</p>
                            <p className="text-amber-700">Considera hacer seguimiento</p>
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
            {/* Actividad Reciente Compacta */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-1 w-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                <h2 className="text-xl font-bold text-gray-800">Actividad Reciente</h2>
                <Activity className="h-4 w-4 text-emerald-500" />
              </div>
              <Card className="shadow-lg border-0 bg-white relative overflow-hidden">
                <CardContent className="p-4 relative">
                  {stats.recentActivity.length > 0 ? (
                    <div className="space-y-3">
                      {stats.recentActivity.slice(0, 8).map((activity, index) => (
                        <div
                          key={activity.id}
                          className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-300 ${
                            index === 0 ? 'border-l-4 border-l-emerald-500 bg-emerald-50 hover:bg-emerald-100' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${
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
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 text-sm truncate">
                                {activity.type === "invoice" 
                                  ? `Factura ${activity.number}` 
                                  : activity.type === "thermal_receipt"
                                  ? `Comprobante ${activity.number}`
                                  : activity.description}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="truncate">{activity.client_name || activity.type === "thermal_receipt" ? "Venta directa" : "Gasto"}</span>
                                <span>•</span>
                                <span>{new Date(activity.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</span>
                                {index === 0 && (
                                  <Badge className="bg-emerald-100 text-emerald-700 text-xs py-0 px-1">
                                    Nuevo
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`font-bold text-sm ${
                                activity.type === "expense" ? "text-red-600" : "text-emerald-600"
                              }`}
                            >
                              {activity.type === "expense" ? "-" : "+"}
                              {formatCurrency(activity.total)}
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
