"use client"

import { useEffect, useState } from "react"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { AgendaWidget } from "@/components/dashboard/agenda-widget"
import { RevenueChart, ExpenseChart, ComparisonChart } from "@/components/dashboard/charts"
import { FinancialHealthWidget, PerformanceComparisonWidget, QuickInsightsWidget } from "@/components/dashboard/interactive-widgets"
import { EmployeeMetricsCard } from "@/components/dashboard/employee-metrics-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
  ShoppingCart,
  Package,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Info,
} from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useCurrency } from "@/hooks/use-currency"
import { useBusinessNotifications } from "@/components/notifications/notification-system"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import { useDataUserId } from "@/hooks/use-data-user-id"

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
  todayInvoices: number
  todayExpenseAmount: number
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
    todayInvoices: 0,
    todayExpenseAmount: 0,
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
  const [showWelcome, setShowWelcome] = useState(false)
  const [userName, setUserName] = useState('')
  const [dailyQuote, setDailyQuote] = useState('Hoy es un gran día para alcanzar tus metas.')
  const [quoteLoading, setQuoteLoading] = useState(true)
  const [showWeekly, setShowWeekly] = useState(true)
  const { formatCurrency, formatNumber } = useCurrency()
  const { permissions } = useUserPermissions()
  const businessNotifications = useBusinessNotifications()
  const { dataUserId, loading: userIdLoading } = useDataUserId()

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Welcome animation on login (solo primera vez en la sesión)
  useEffect(() => {
    const fetchUserAndShowWelcome = async () => {
      // Verificar si ya se mostró en esta sesión
      const welcomeShown = sessionStorage.getItem('welcomeShown')
      
      if (welcomeShown) {
        // Ya se mostró en esta sesión, no mostrar de nuevo
        return
      }
      
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // Get user metadata for name
        const name = session.user.user_metadata?.full_name || 
                     session.user.user_metadata?.name || 
                     session.user.email?.split('@')[0] || 
                     'Usuario'
        
        setUserName(name)
        
        // Fetch daily quote from Groq AI
        try {
          const response = await fetch('/api/daily-quote')
          if (response.ok) {
            const data = await response.json()
            setDailyQuote(data.quote)
          }
        } catch (error) {
          console.error('Error fetching daily quote:', error)
        } finally {
          setQuoteLoading(false)
        }
        
        setShowWelcome(true)
        
        // Marcar que ya se mostró en esta sesión
        sessionStorage.setItem('welcomeShown', 'true')
        
        // Hide welcome animation after 6 seconds
        setTimeout(() => {
          setShowWelcome(false)
        }, 6000)
      }
    }
    
    fetchUserAndShowWelcome()
  }, [])

  useEffect(() => {
    if (!userIdLoading && dataUserId) {
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
    }
  }, [dataUserId, userIdLoading])

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
      if (!dataUserId) return

      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()

      const startOfMonth = new Date(currentYear, currentMonth - 1, 1)
      const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59)

      const [invoicesResult, expensesResult] = await Promise.all([
        supabase
          .from("invoices")
          .select("total, status")
          .eq("user_id", dataUserId)
          .neq("status", "cancelada")
          .neq("status", "borrador")
          .gte("created_at", startOfMonth.toISOString())
          .lte("created_at", endOfMonth.toISOString()) as unknown as { data: { total: number; status: string }[] | null },
        supabase
          .from("expenses")
          .select("amount")
          .eq("user_id", dataUserId)
          .gte("expense_date", startOfMonth.toISOString().split("T")[0])
          .lte("expense_date", endOfMonth.toISOString().split("T")[0]) as unknown as { data: { amount: number }[] | null },
      ])

      const totalInvoices = invoicesResult.data?.length || 0
      const totalRevenue =
        invoicesResult.data?.filter((inv) => inv.status === "pagada").reduce((sum, inv) => sum + (inv.total || 0), 0) ||
        0
      const expenseCount = expensesResult.data?.length || 0
      const totalExpenses = expensesResult.data?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

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
      if (!dataUserId) return

      // Cargar datos básicos primero
      setLoadingStates(prev => ({ ...prev, basicStats: true }))

      // Helper para normalizar fechas (eliminar hora, comparar solo fecha)
      const normalizeDate = (dateStr: string | Date) => {
        const d = new Date(dateStr)
        return new Date(d.getFullYear(), d.getMonth(), d.getDate())
      }

      const now = new Date()
      const today = normalizeDate(now)
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      // Calculate current month start for accurate monthly calculations
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      // Consulta específica para facturas pendientes
      const { data: pendingInvoicesData } = await supabase
        .from("invoices")
        .select("id, invoice_number, total, due_date")
        .eq("user_id", dataUserId)
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
          clients(name)
        `)
        .eq("user_id", dataUserId)
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
        .eq("user_id", dataUserId)
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
        .eq("user_id", dataUserId)
        .eq("status", "active")
        .order("created_at", { ascending: false }) as unknown as { data: ThermalReceipt[] | null, error: any }

      const { count: clientsCount } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("user_id", dataUserId)

      const { count: productsCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("user_id", dataUserId)

      const { count: projectsCount } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("user_id", dataUserId)

      const totalInvoices = invoices?.length || 0
      // Usar la consulta directa de facturas pendientes
      const facturasPendientesSimple = pendingInvoicesData || []
      
      // Filtrar facturas válidas (excluir canceladas y borradores) para otras estadísticas
      const validInvoices = invoices?.filter((inv) => inv.status !== "cancelada" && inv.status !== "borrador") || []
      const paidInvoices = validInvoices.filter((inv) => inv.status === "pagada") || []
      const unpaidInvoices = validInvoices.filter((inv) => inv.status === "enviada") || []

      console.log('📊 DEBUG FACTURAS:', {
        totalInvoices,
        validInvoices: validInvoices.length,
        paidInvoices: paidInvoices.length,
        unpaidInvoices: unpaidInvoices.length,
        statusesEncontrados: [...new Set(invoices?.map(inv => inv.status))],
        ejemploFactura: paidInvoices[0]
      })

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



      const weeklyPaidInvoices = paidInvoices.filter((inv) => normalizeDate(inv.created_at) >= weekAgo)
      const weeklyUnpaidInvoices = unpaidInvoices.filter((inv) => normalizeDate(inv.created_at) >= weekAgo)
      const weeklyThermalReceipts = thermalError ? [] : (thermalReceipts?.filter((receipt) => normalizeDate(receipt.created_at) >= weekAgo) || [])
      
      console.log('📅 DEBUG SEMANAL:', {
        weekAgo: weekAgo.toISOString(),
        now: now.toISOString(),
        weeklyPaidInvoices: weeklyPaidInvoices.length,
        weeklyThermalReceipts: weeklyThermalReceipts.length,
        ejemploFechaPaidInvoice: weeklyPaidInvoices[0]?.created_at,
        ejemploFechaThermal: weeklyThermalReceipts[0]?.created_at
      })
      
      const weeklyInvoiceRevenue = weeklyPaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
      const weeklyThermalRevenue = weeklyThermalReceipts.reduce((sum, receipt) => sum + (receipt.total_amount || 0), 0)
      const weeklyRevenue = weeklyInvoiceRevenue + weeklyThermalRevenue
      const weeklyPendingRevenue = weeklyUnpaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
      
      console.log('💰 DEBUG REVENUE SEMANAL:', {
        weeklyInvoiceRevenue,
        weeklyThermalRevenue,
        weeklyRevenue
      })
      
      // Contar solo facturas que generan revenue (pagadas + thermal receipts)
      const weeklyInvoices = weeklyPaidInvoices.length + weeklyThermalReceipts.length

      const weeklyExpenses = expenses?.filter((exp) => new Date(exp.created_at) >= weekAgo).length || 0
      const weeklyExpenseAmount =
        expenses
          ?.filter((exp) => new Date(exp.created_at) >= weekAgo)
          .reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0

      // Calcular venta de hoy (comparar solo fecha, no hora)
      const todayPaidInvoices = paidInvoices.filter((inv) => {
        const invDate = normalizeDate(inv.created_at)
        return invDate.getTime() === today.getTime()
      })
      
      const todayThermalReceipts = thermalError ? [] : (thermalReceipts?.filter((receipt) => {
        const receiptDate = normalizeDate(receipt.created_at)
        return receiptDate.getTime() === today.getTime()
      }) || [])
      
      const todayInvoiceRevenue = todayPaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
      const todayThermalRevenue = todayThermalReceipts.reduce((sum, receipt) => sum + (receipt.total_amount || 0), 0)
      const todayRevenue = todayInvoiceRevenue + todayThermalRevenue
      const todayInvoices = todayPaidInvoices.length + todayThermalReceipts.length
      
      const todayExpenseAmount = expenses?.filter((exp) => {
        const expDate = normalizeDate(exp.created_at)
        return expDate.getTime() === today.getTime()
      }).reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0

      // Filtrar facturas PAGADAS del mes usando created_at (cuando se registró/pagó)
      // Esto asegura que contemos ingresos reales del mes, no facturas emitidas hace meses
      const monthlyPaidInvoices = invoices?.filter((inv) => {
        if (inv.status !== "pagada") {
          return false
        }
        const invDate = normalizeDate(inv.created_at)
        return invDate >= currentMonthStart && invDate <= currentMonthEnd
      }) || []
      
      console.log('📆 DEBUG MENSUAL:', {
        currentMonthStart: currentMonthStart.toISOString(),
        currentMonthEnd: currentMonthEnd.toISOString(),
        monthlyPaidInvoices: monthlyPaidInvoices.length,
        ejemploFecha: monthlyPaidInvoices[0]?.created_at,
        ejemploFechaNormalizada: monthlyPaidInvoices[0] ? normalizeDate(monthlyPaidInvoices[0].created_at).toISOString() : null
      })
      
      const monthlyUnpaidInvoices = invoices?.filter((inv) => {
        if (inv.status !== "enviada") {
          return false
        }
        const invDate = normalizeDate(inv.created_at)
        return invDate >= currentMonthStart && invDate <= currentMonthEnd
      }) || []
      
      const monthlyThermalReceipts = thermalError ? [] : (thermalReceipts?.filter((receipt) => {
        const receiptDate = normalizeDate(receipt.created_at)
        return receiptDate >= currentMonthStart && receiptDate <= currentMonthEnd
      }) || [])
      
      const monthlyInvoiceRevenue = monthlyPaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
      const monthlyThermalRevenue = monthlyThermalReceipts.reduce((sum, receipt) => sum + (receipt.total_amount || 0), 0)
      const monthlyRevenue = monthlyInvoiceRevenue + monthlyThermalRevenue
      const monthlyPendingRevenue = monthlyUnpaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
      
      // Contar solo facturas que generan revenue (pagadas + thermal receipts)
      const monthlyInvoices = monthlyPaidInvoices.length + monthlyThermalReceipts.length
      
      // Calcular facturas pendientes específicamente del mes actual para mostrar en la tarjeta
      const monthlyPendingInvoices = monthlyUnpaidInvoices.length // Facturas no pagadas del mes

      const monthlyExpenses = expenses?.filter((exp) => {
        const expDate = normalizeDate(exp.created_at)
        return expDate >= currentMonthStart && expDate <= currentMonthEnd
      }).length || 0
      const monthlyExpenseAmount =
        expenses
          ?.filter((exp) => {
            const expDate = normalizeDate(exp.created_at)
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
        todayInvoices,
        todayExpenseAmount,
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-2 sm:p-3 lg:p-6">
        <div className="max-w-[1600px] mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Header Skeleton */}
          <Card className="border-0 shadow-lg skeleton">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-700 rounded-xl skeleton"></div>
                  <div className="space-y-2">
                    <div className="h-6 sm:h-8 bg-slate-700 rounded w-32 sm:w-48"></div>
                    <div className="h-3 sm:h-4 bg-slate-800 rounded w-40 sm:w-64 hidden sm:block"></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-8 sm:h-10 bg-slate-700 rounded w-24 sm:w-32"></div>
                  <div className="h-8 sm:h-10 bg-slate-800 rounded w-20 sm:w-28"></div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Meta Card Skeleton */}
          <Card className="border-0 shadow-xl skeleton animate-scale-in">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="h-6 bg-slate-700 rounded w-48"></div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 bg-slate-800 rounded w-24"></div>
                      <div className="h-8 bg-slate-700 rounded w-32"></div>
                    </div>
                  ))}
                </div>
                <div className="h-3 bg-slate-800 rounded w-full"></div>
                <div className="h-8 bg-slate-700 rounded w-full"></div>
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
                      <div className="h-4 bg-slate-800 rounded w-20"></div>
                      <div className="h-8 w-8 bg-slate-700 rounded-lg"></div>
                    </div>
                    <div className="h-7 sm:h-8 bg-slate-700 rounded w-24"></div>
                    <div className="h-3 bg-slate-800 rounded w-16"></div>
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
                      <div className="h-5 bg-slate-700 rounded w-32"></div>
                      <div className="space-y-2">
                        {[1,2,3].map((j) => (
                          <div key={j} className="flex justify-between items-center">
                            <div className="h-4 bg-slate-800 rounded w-24"></div>
                            <div className="h-4 bg-slate-700 rounded w-16"></div>
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
                  <div className="h-80 bg-slate-800 rounded"></div>
                </CardContent>
              </Card>
              <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                {[1,2].map((i) => (
                  <Card key={i} className="border-0 shadow-lg skeleton animate-scale-in" style={{animationDelay: `${0.4 + i * 0.1}s`}}>
                    <CardContent className="p-6">
                      <div className="h-64 bg-slate-800 rounded"></div>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-2 sm:p-3 lg:p-4">
      {/* Enhanced Welcome Animation */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          {/* Backdrop con efecto */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10 backdrop-blur-sm animate-in fade-in duration-700"></div>
          
          {/* Partículas flotantes decorativas */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{animationDelay: '0ms'}}></div>
            <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-purple-400 rounded-full animate-ping" style={{animationDelay: '200ms'}}></div>
            <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-pink-400 rounded-full animate-ping" style={{animationDelay: '400ms'}}></div>
            <div className="absolute bottom-1/4 right-1/3 w-2 h-2 bg-indigo-400 rounded-full animate-ping" style={{animationDelay: '600ms'}}></div>
          </div>
          
          {/* Card principal mejorada */}
          <div className="relative animate-in fade-in zoom-in duration-700 slide-in-from-bottom-8">
            {/* Glow effect exterior */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl blur-2xl opacity-30 animate-pulse"></div>
            
            {/* Card content */}
            <div className="relative bg-slate-900/98 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-slate-700 p-8 max-w-xl mx-4 overflow-hidden">
              {/* Efecto de brillo animado en el fondo */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 animate-shimmer"></div>
              
              {/* Header con avatar animado */}
              <div className="relative flex items-center gap-5 mb-6">
                <div className="relative">
                  {/* Anillos orbitales */}
                  <div className="absolute inset-0 -m-2">
                    <div className="w-20 h-20 border-2 border-blue-300/30 rounded-full animate-spin" style={{animationDuration: '3s'}}></div>
                  </div>
                  <div className="absolute inset-0 -m-3">
                    <div className="w-24 h-24 border-2 border-purple-300/20 rounded-full animate-spin" style={{animationDuration: '4s', animationDirection: 'reverse'}}></div>
                  </div>
                  
                  {/* Avatar central */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full blur-xl opacity-40 animate-pulse"></div>
                  <div className="relative w-16 h-16 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-300">
                    <span className="text-4xl animate-wave filter drop-shadow-lg">👋</span>
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-in slide-in-from-left duration-700">
                      ¡Bienvenido de nuevo!
                    </h2>
                    <span className="text-2xl animate-bounce">✨</span>
                  </div>
                  <p className="text-xl text-slate-200 font-semibold animate-in slide-in-from-left duration-700" style={{animationDelay: '100ms'}}>
                    {userName}
                  </p>
                </div>
              </div>
              
              {/* Separador decorativo */}
              <div className="h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent mb-6"></div>
              
              {/* Frase del día con IA */}
              <div className="relative animate-in fade-in slide-in-from-bottom duration-700" style={{animationDelay: '300ms'}}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-400 rounded-lg blur-md opacity-50 animate-pulse"></div>
                      <div className="relative bg-gradient-to-r from-amber-500 to-orange-500 text-white p-2 rounded-lg shadow-lg">
                        <span className="text-xl">💡</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-amber-600 mb-1 flex items-center gap-1">
                      FRASE DEL DÍA
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-slate-800 to-slate-700 text-[10px] font-bold text-purple-400">
                        <span className="animate-pulse">✨</span> Powered by Groq AI
                      </span>
                    </p>
                    {quoteLoading ? (
                      <div className="space-y-2">
                        <div className="h-4 bg-slate-800 rounded animate-pulse"></div>
                        <div className="h-4 bg-slate-800 rounded animate-pulse w-3/4"></div>
                      </div>
                    ) : (
                      <p className="text-base text-slate-300 leading-relaxed italic font-medium">
                        "{dailyQuote}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Footer decorativo */}
              <div className="mt-6 flex justify-center gap-2 animate-in fade-in duration-700" style={{animationDelay: '500ms'}}>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '100ms'}}></div>
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-[1600px] mx-auto space-y-3 sm:space-y-4 lg:space-y-6">
        
        {/* Vista solo para empleados - cuando NO puede ver finanzas O está en modo empleado */}
        {showEmployeeView ? (
          <div className="space-y-6">
            {/* Header Simple para Empleado con Botones */}
            <div className="bg-slate-900/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-700/50 p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl shadow-md">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-200 via-emerald-400 to-green-400 bg-clip-text text-transparent">
                      Venta de Hoy
                    </h1>
                    <p className="text-sm text-slate-400">Panel de ventas</p>
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
                      className="bg-slate-800 hover:bg-emerald-900/30 text-emerald-400 border-emerald-800 hover:border-emerald-600 shadow-sm hover:shadow-md transition-all duration-300"
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
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar
                  </Button>

                </div>
              </div>
            </div>

            {/* Tarjeta de Metas del Empleado */}
            <EmployeeMetricsCard />

            {/* Solo Tarjeta de Venta de Hoy */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/10"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-600/20 to-green-600/30 rounded-full -translate-y-16 translate-x-16"></div>
              <CardHeader className="flex flex-row items-center justify-between pb-4 relative">
                <div className="flex-1">
                  <CardTitle className="text-lg font-bold text-emerald-300 uppercase tracking-wide mb-2">Ingresos del Día</CardTitle>
                  <p className="text-sm text-emerald-400">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-lg">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="flex flex-col">
                  <span className="text-5xl font-bold text-slate-200 mb-4">{formatCurrency(stats.todayRevenue)}</span>
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-400" />
                    <span className="text-sm text-slate-300">Total de ventas generadas hoy</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actividad Reciente para Empleados */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-1 w-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                <h2 className="text-xl font-bold text-slate-200">Actividad Reciente</h2>
              </div>
              <Card className="shadow-lg border border-slate-800 bg-slate-900 relative overflow-hidden">
                <CardContent className="p-4 relative">
                  {stats.recentActivity.length > 0 ? (
                    <div className="space-y-2">
                      {stats.recentActivity.slice(0, 10).map((activity, index) => (
                        <div
                          key={activity.id}
                          className={`flex items-center gap-2 p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors ${
                            index === 0 ? 'border-l-2 border-l-emerald-500 bg-emerald-900/30' : ''
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
                            <p className="font-semibold text-slate-200 text-sm truncate">
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
        <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-800/50 p-2 sm:p-3">
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
                <p className="text-xs text-slate-400 hidden sm:block">Panel de control empresarial</p>
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
                    className="bg-slate-800 hover:bg-red-900/30 text-red-400 border-red-800 hover:border-red-600 shadow-sm hover:shadow-md transition-all duration-300 text-xs sm:text-sm"
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
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 shadow-sm hover:shadow-md transition-all duration-300 hidden sm:flex"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
              
              {permissions.canViewFinances && (
                <Link href="/monthly-reports">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-slate-800 hover:bg-emerald-900/30 text-emerald-400 border-emerald-800 hover:border-emerald-600 shadow-sm hover:shadow-md transition-all duration-300 text-xs sm:text-sm hidden sm:flex"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Reportes
                  </Button>
                </Link>
              )}

              {/* Divisor - Hidden on mobile */}
              <div className="h-8 w-px bg-gray-300 mx-1 hidden lg:block"></div>

              {/* Controles de Vista - Optimized for mobile */}
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 sm:p-1">
                <Button
                  variant={viewMode === 'overview' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('overview')}
                  className={`rounded-md text-xs h-6 sm:h-7 px-2 sm:px-3 transition-all duration-200 ${viewMode === 'overview' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Resumen</span>
                </Button>
                <Button
                  variant={viewMode === 'detailed' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('detailed')}
                  className={`rounded-md text-xs h-6 sm:h-7 px-2 sm:px-3 transition-all duration-200 ${viewMode === 'detailed' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Detallado</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Layout principal - Reorganizado y optimizado para móvil */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-3 mb-3 sm:mb-4">
          {/* Meta Mensual - Stack completo en mobile, 1 columna en desktop */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 card-hover animate-scale-in">
            <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-blue-600 rounded-lg">
                    <Target className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg font-bold text-blue-300 flex items-center gap-2">
                      Meta Mensual
                      <Badge className={`${
                        monthlyProgress >= 100 ? 'bg-emerald-500' :
                        monthlyProgress >= 75 ? 'bg-blue-500' :
                        monthlyProgress >= 50 ? 'bg-amber-500' : 'bg-red-500'
                      } text-white px-1.5 sm:px-2 py-0.5 text-xs sm:text-sm`}>
                        {monthlyProgress.toFixed(1)}%
                      </Badge>
                    </CardTitle>
                    <p className="text-xs text-blue-400">
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
                  className="text-blue-400 hover:bg-slate-800 rounded-lg p-1.5 sm:p-2"
                  title="Configurar meta mensual"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-2 p-3 sm:p-6">
              <div className="space-y-2 sm:space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-800/60 rounded-lg p-2 sm:p-3">
                    <div className="text-xs text-blue-400">Alcanzado</div>
                    <div className="text-base sm:text-lg font-bold text-blue-300">{formatCurrency(stats.monthlyRevenue)}</div>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg p-2 sm:p-3">
                    <div className="text-xs text-blue-400">Meta</div>
                    <div className="text-base sm:text-lg font-bold text-blue-300">{formatCurrency(stats.monthlyTarget)}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-400">Progreso</span>
                    <span className="text-blue-300 font-semibold">
                      {monthlyProgress >= 100 ? '¡Meta Superada! 🎉' : 
                       `Falta: ${formatCurrency(Math.max(0, stats.monthlyTarget - stats.monthlyRevenue))}`}
                    </span>
                  </div>
                  <Progress value={Math.min(monthlyProgress, 100)} className="h-2" />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <div className="text-xs text-slate-400">Facturas</div>
                    <div className="text-sm font-bold text-slate-200">{formatNumber(stats.monthlyInvoices)}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <div className="text-xs text-slate-400">Promedio</div>
                    <div className="text-sm font-bold text-slate-200">
                      {stats.monthlyInvoices > 0 ? formatCurrency(stats.monthlyRevenue / stats.monthlyInvoices) : formatCurrency(0)}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <div className="text-xs text-slate-400">Días resto</div>
                    <div className="text-sm font-bold text-slate-200">
                      {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Facturas Pendientes - Mobile Optimized */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 card-hover animate-scale-in" style={{animationDelay: '0.1s'}}>
            <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-amber-600 rounded-lg">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <CardTitle className="text-base sm:text-lg font-bold text-amber-300">Pendientes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="space-y-2 sm:space-y-3">
                <div className="text-center bg-slate-800/60 rounded-lg p-2 sm:p-3">
                  <div className="text-2xl sm:text-3xl font-bold text-amber-400">
                    {formatCurrency(stats.pendingRevenue)}
                  </div>
                  <div className="text-xs sm:text-sm text-amber-400">Total por cobrar</div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <div className="text-lg sm:text-xl font-bold text-amber-400">{formatNumber(stats.pendingInvoices)}</div>
                    <div className="text-xs text-slate-400">Facturas</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <div className="text-lg sm:text-xl font-bold text-red-400">{stats.overdueInvoices}</div>
                    <div className="text-xs text-red-600">Vencidas</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rendimiento Semanal/Hoy - Mobile Optimized */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 relative overflow-hidden card-hover animate-scale-in" style={{animationDelay: '0.2s'}}>
            <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-emerald-600/20 to-green-600/20 rounded-full -translate-y-8 sm:-translate-y-12 translate-x-8 sm:translate-x-12"></div>
            <CardHeader className="relative pb-2 sm:pb-3 p-3 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 sm:p-2.5 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl shadow-lg">
                    <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <CardTitle className="text-base sm:text-lg font-bold text-emerald-300">
                    {showWeekly ? 'Esta Semana' : 'Hoy'}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-400 font-medium">Hoy</span>
                  <Switch
                    checked={showWeekly}
                    onCheckedChange={setShowWeekly}
                    className="data-[state=checked]:bg-emerald-600"
                  />
                  <span className="text-xs text-emerald-400 font-medium">Semana</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative pt-0 p-3 sm:p-6">
              <div className="space-y-2 sm:space-y-3">
                <div className="text-center bg-slate-800/70 backdrop-blur-sm rounded-xl p-2 sm:p-3 border border-slate-700/50">
                  <div className="text-2xl sm:text-3xl font-bold text-emerald-400">
                    {formatCurrency(showWeekly ? stats.weeklyRevenue : stats.todayRevenue)}
                  </div>
                  <div className="text-xs sm:text-sm text-emerald-400 font-medium">
                    {showWeekly ? 'Ingresos semanales' : 'Ingresos de hoy'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                    <div className="text-lg sm:text-xl font-bold text-emerald-400">
                      {formatNumber(showWeekly ? stats.weeklyInvoices : stats.todayInvoices)}
                    </div>
                    <div className="text-xs text-slate-400">Facturas</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                    <div className="text-lg sm:text-xl font-bold text-emerald-400">
                      {formatCurrency(showWeekly ? stats.weeklyExpenseAmount : stats.todayExpenseAmount)}
                    </div>
                    <div className="text-xs text-slate-400">Gastos</div>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-2">
                  <div className="text-xs text-slate-400">
                    {showWeekly ? 'Balance neto semanal' : 'Balance neto de hoy'}
                  </div>
                  <div className="text-base sm:text-lg font-bold text-emerald-400">
                    {formatCurrency(showWeekly 
                      ? (stats.weeklyRevenue - stats.weeklyExpenseAmount) 
                      : (stats.todayRevenue - stats.todayExpenseAmount)
                    )}
                  </div>
                  <div className={`text-xs ${
                    (showWeekly 
                      ? (stats.weeklyRevenue - stats.weeklyExpenseAmount) 
                      : (stats.todayRevenue - stats.todayExpenseAmount)
                    ) > 0 ? 'text-emerald-600' : 'text-red-600'
                  } flex items-center gap-1`}>
                    {(showWeekly 
                      ? (stats.weeklyRevenue - stats.weeklyExpenseAmount) 
                      : (stats.todayRevenue - stats.todayExpenseAmount)
                    ) > 0 ? '↗ Positivo' : '↘ Negativo'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Segunda fila - Gastos del Mes - Mobile Optimized */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-3 mb-3 sm:mb-4">
          {/* Gastos del Mes - Tarjeta completa */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-red-600/20 to-rose-600/20 rounded-full -translate-y-8 sm:-translate-y-12 translate-x-8 sm:translate-x-12"></div>
            <CardHeader className="relative pb-2 sm:pb-3 p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-2.5 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl shadow-lg">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white transform rotate-180" />
                </div>
                <CardTitle className="text-base sm:text-lg font-bold text-red-300">Gastos del Mes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="relative pt-0 p-3 sm:p-6">
              <div className="space-y-2 sm:space-y-3">
                <div className="text-center bg-slate-800/70 backdrop-blur-sm rounded-xl p-2 sm:p-3 border border-slate-700/50">
                  <div className="text-2xl sm:text-3xl font-bold text-red-400">
                    {formatCurrency(stats.monthlyExpenseAmount)}
                  </div>
                  <div className="text-xs sm:text-sm text-red-400 font-medium">Total gastado</div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                    <div className="text-lg sm:text-xl font-bold text-red-400">{formatNumber(stats.monthlyExpenses)}</div>
                    <div className="text-xs text-slate-400">Registros</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                    <div className="text-lg sm:text-xl font-bold text-red-400">
                      {stats.monthlyExpenses > 0 ? formatCurrency(stats.monthlyExpenseAmount / stats.monthlyExpenses) : formatCurrency(0)}
                    </div>
                    <div className="text-xs text-slate-400">Promedio</div>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-2">
                  <div className="text-xs text-slate-400">Margen bruto</div>
                  <div className="text-base sm:text-lg font-bold text-red-400">
                    {formatCurrency(stats.monthlyRevenue - stats.monthlyExpenseAmount)}
                  </div>
                  <div className="text-xs text-red-400">
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
          <Card className="lg:col-span-2 border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
            <CardHeader className="pb-3 p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-r from-slate-700 to-slate-600 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-sm sm:text-base font-bold text-slate-200">Resumen General</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-slate-800/70 rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 uppercase tracking-wide mb-1.5">Clientes</span>
                    <span className="text-xl sm:text-2xl font-bold text-slate-200">{formatNumber(stats.totalClients)}</span>
                  </div>
                </div>
                <div className="bg-slate-800/70 rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 uppercase tracking-wide mb-1.5">Productos</span>
                    <span className="text-xl sm:text-2xl font-bold text-slate-200">{formatNumber(stats.totalProducts)}</span>
                  </div>
                </div>
                <div className="bg-slate-800/70 rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 uppercase tracking-wide mb-1.5">Proyectos</span>
                    <span className="text-xl sm:text-2xl font-bold text-slate-200">{formatNumber(stats.totalProjects)}</span>
                  </div>
                </div>
                <div className="bg-slate-800/70 rounded-lg p-3 sm:p-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 uppercase tracking-wide mb-1.5">Facturas</span>
                    <span className="text-xl sm:text-2xl font-bold text-slate-200">{formatNumber(stats.totalInvoices)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Configuración de Meta */}
        {showTargetSettings && (
          <Card className="border-2 border-slate-800 shadow-xl bg-slate-900 mb-4 animate-in slide-in-from-top-2 duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-blue-300 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurar Meta Mensual
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="monthly-target" className="text-slate-300 font-semibold">
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
                    className="mt-2 border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
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
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
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
              <h2 className="text-xl font-bold text-slate-200 mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Resumen General
              </h2>
              {loadingStates.basicStats ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-slate-800 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <StatsCards {...stats} />
              )}
            </div>

            {/* Banner Nueva Funcionalidad - Sistema de Clasificación de Compras */}
            <div className="mb-6 lg:mb-8 animate-in slide-in-from-top duration-700">
              <Card className="border-2 border-green-600 bg-gradient-to-br from-slate-900 to-slate-800 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden relative">
                {/* Efecto de brillo animado */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-600/10 rounded-full blur-3xl animate-pulse"></div>
                
                <CardContent className="p-4 lg:p-6 relative">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-6">
                    {/* Icono destacado */}
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <div className="absolute inset-0 bg-green-400 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
                        <div className="relative w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                          <ShoppingCart className="h-8 w-8 lg:h-10 lg:w-10 text-white" />
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white">
                            <Sparkles className="h-3 w-3 text-yellow-900" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-xs font-bold">
                          NUEVA FUNCIONALIDAD
                        </Badge>
                        <Badge variant="outline" className="border-green-600 text-green-400 px-2 py-0.5 text-xs">
                          Contabilidad
                        </Badge>
                      </div>
                      
                      <h3 className="text-lg lg:text-2xl font-bold text-slate-200 mb-2 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 lg:h-6 lg:w-6 text-green-400" />
                        Sistema de Clasificación de Compras
                      </h3>
                      
                      <p className="text-sm lg:text-base text-slate-300 mb-3 lg:mb-4">
                        <strong>Evita errores contables:</strong> Ahora puedes clasificar tus compras correctamente como 
                        <span className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 bg-green-900/30 text-green-300 rounded font-semibold">
                          <Package className="h-3 w-3" />
                          Inventario
                        </span> 
                        (productos para venta) o
                        <span className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 bg-orange-900/30 text-orange-300 rounded font-semibold">
                          <Receipt className="h-3 w-3" />
                          Gastos
                        </span>
                        (uso interno). El sistema registra automáticamente cada compra en la categoría correcta.
                      </p>

                      {/* Beneficios rápidos */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                        <div className="flex items-center gap-1.5 text-xs lg:text-sm text-green-400 bg-slate-800/50 rounded-lg p-2">
                          <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="font-medium">Contabilidad correcta</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs lg:text-sm text-green-400 bg-slate-800/50 rounded-lg p-2">
                          <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="font-medium">Control de stock</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs lg:text-sm text-green-400 bg-slate-800/50 rounded-lg p-2">
                          <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="font-medium">Utilidades reales</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs lg:text-sm text-green-400 bg-slate-800/50 rounded-lg p-2">
                          <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="font-medium">Sin errores</span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-col gap-2 w-full lg:w-auto lg:flex-shrink-0">
                      <Link href="/purchases/new" className="w-full lg:w-auto">
                        <Button className="bg-green-600 hover:bg-green-700 text-white w-full lg:w-auto group shadow-lg hover:shadow-xl transition-all">
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Registrar Compra
                          <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                      <Link href="/system-info" className="w-full lg:w-auto">
                        <Button variant="outline" size="sm" className="w-full lg:w-auto border-green-600 text-green-400 hover:bg-green-900/30">
                          <Info className="h-4 w-4 mr-2" />
                          Ver más detalles
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alertas Importantes Mejoradas */}
            {(stats.overdueInvoices > 0 || stats.pendingInvoices > 5) && (
              <div className="mb-6 lg:mb-8 animate-in slide-in-from-left duration-500">
                <div className="flex items-center gap-2 lg:gap-3 mb-4">
                  <div className="h-1 w-8 lg:w-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-full animate-pulse"></div>
                  <h3 className="text-lg lg:text-xl font-bold text-red-400">Alertas Importantes</h3>
                  <AlertCircle className="h-4 w-4 lg:h-5 lg:w-5 text-red-500 animate-pulse" />
                </div>
                <div className="grid gap-3 lg:gap-4 md:grid-cols-2">
                  {stats.overdueInvoices > 0 && (
                    <Card className="border-l-4 border-l-red-500 bg-slate-900/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                      <CardContent className="p-4 lg:p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:gap-4">
                          <div className="p-2 lg:p-3 bg-red-900/30 rounded-full flex-shrink-0">
                            <AlertCircle className="h-5 w-5 lg:h-6 lg:w-6 text-red-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-red-400 text-base lg:text-lg">{stats.overdueInvoices} facturas vencidas</p>
                            <p className="text-sm lg:text-base text-red-400">Requieren atención inmediata</p>
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
                    <Card className="border-l-4 border-l-amber-500 bg-slate-900/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                      <CardContent className="p-4 lg:p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:gap-4">
                          <div className="p-2 lg:p-3 bg-amber-900/30 rounded-full flex-shrink-0">
                            <Clock className="h-5 w-5 lg:h-6 lg:w-6 text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-amber-400 text-base lg:text-lg">{formatNumber(stats.pendingInvoices)} facturas pendientes</p>
                            <p className="text-sm lg:text-base text-amber-400">Considera hacer seguimiento</p>
                          </div>
                          <Link href="/invoices" className="w-full sm:w-auto">
                            <Button size="sm" variant="outline" className="border-amber-300 text-amber-300 hover:bg-amber-900/30 w-full sm:w-auto hover:scale-105 transition-transform">
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
                  <h2 className="text-2xl font-bold text-slate-200">Análisis Rápido</h2>
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
                <h2 className="text-2xl font-bold text-slate-200">Estadísticas Detalladas</h2>
              </div>
              <StatsCards {...stats} />
            </div>

            {/* Análisis Avanzado */}
            {permissions.canViewFinances && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-1 w-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                  <h2 className="text-2xl font-bold text-slate-200">Análisis Avanzado</h2>
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
              <h2 className="text-2xl font-bold text-slate-200">Análisis Visual</h2>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue Trend Chart */}
            <Card className="shadow-2xl border-0 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-teal-600/5"></div>
              <CardHeader className="relative">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl shadow-lg">
                    <TrendingUp className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-emerald-300 flex items-center gap-2">
                      Tendencia de Ingresos
                      <TrendingUp className="h-5 w-5 text-emerald-400" />
                    </CardTitle>
                    <CardDescription className="text-emerald-400 text-base font-medium">
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
          <Card className="shadow-2xl border-0 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-rose-600/5"></div>
            <CardHeader className="relative">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl shadow-lg">
                  <Receipt className="h-8 w-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-red-300 flex items-center gap-2">
                    Gastos por Categoría
                    <PieChart className="h-5 w-5 text-red-400" />
                  </CardTitle>
                  <CardDescription className="text-red-400 text-base font-medium">
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
          <Card className="shadow-2xl border-0 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-indigo-600/5"></div>
            <CardHeader className="relative">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-lg">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-purple-300 flex items-center gap-2">
                    Comparación Mensual
                    <BarChart3 className="h-5 w-5 text-purple-400" />
                  </CardTitle>
                  <CardDescription className="text-purple-400 text-base font-medium">
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

        {/* Sección de Gestión y Actividad - Optimizada y Centralizada */}
        <div className="max-w-7xl mx-auto">
          <div className="space-y-4">
            {/* Actividad Reciente Compacta - Ultra Mobile Optimized */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-1 w-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                <h2 className="text-base sm:text-xl font-bold text-slate-200">Actividad Reciente</h2>
              </div>
              <Card className="shadow-lg border border-slate-800 bg-slate-900 relative overflow-hidden">
                <CardContent className="p-2 sm:p-4 relative">
                  {stats.recentActivity.length > 0 ? (
                    <div className="space-y-2">
                      {stats.recentActivity.slice(0, 8).map((activity, index) => (
                        <div
                          key={activity.id}
                          className={`flex items-center gap-2 p-2 bg-slate-800 rounded-lg ${
                            index === 0 ? 'border-l-2 border-l-emerald-500 bg-emerald-900/30' : ''
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
                            <p className="font-semibold text-slate-200 text-xs truncate">
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
              <Card className="shadow-xl border-0 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5"></div>
                <CardHeader className="p-3 sm:p-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg">
                      <Users className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="overflow-hidden">
                      <CardTitle className="text-blue-300 text-sm sm:text-xl font-bold">Mejores Clientes</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  {stats.topClients.length > 0 ? (
                    <div className="space-y-2">
                      {stats.topClients.map((client, index) => (
                        <div key={client.name} className="flex items-center gap-2 p-2 bg-slate-800/80 rounded-lg shadow-sm">
                          <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-lg shadow-lg flex-shrink-0 ${
                            index === 0 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                            index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                            index === 2 ? 'bg-gradient-to-r from-orange-600 to-red-600' :
                            'bg-gradient-to-r from-blue-500 to-indigo-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="font-bold text-slate-200 text-xs sm:text-base truncate">{client.name}</p>
                            <p className="text-xs text-slate-400">{client.invoices} fact.</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-blue-400 text-xs sm:text-base whitespace-nowrap">{formatCurrency(client.total)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Users className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">Sin datos</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Expenses by Category - Ultra Compact */}
              <Card className="shadow-xl border-0 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-rose-600/5"></div>
                <CardHeader className="p-3 sm:p-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl shadow-lg">
                      <PieChart className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="overflow-hidden">
                      <CardTitle className="text-red-300 text-sm sm:text-xl font-bold">Gastos</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  {stats.expensesByCategory.length > 0 ? (
                    <div className="space-y-2">
                      {stats.expensesByCategory.map((category, index) => (
                        <div
                          key={category.category}
                          className="flex items-center gap-2 p-2 bg-slate-800/80 rounded-lg shadow-sm"
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
                            <p className="font-bold text-slate-200 text-xs sm:text-base truncate">{category.category}</p>
                            <p className="text-xs text-slate-400">{category.count} reg.</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-red-400 text-xs sm:text-base whitespace-nowrap">{formatCurrency(category.amount)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Receipt className="h-8 w-8 text-red-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">Sin gastos</p>
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



