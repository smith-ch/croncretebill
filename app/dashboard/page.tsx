"use client"

import { useEffect, useState } from "react"
import { StatsCards } from "@/components/dashboard/stats-cards"
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
  DollarSign,
  Calendar,
  Target,
  AlertCircle,
  Users,
  Settings,
  Clock,
  Bell,
  CalendarDays,
  Repeat,
} from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useCurrency } from "@/hooks/use-currency"

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

interface CalendarNotification {
  notification_type: string
  title: string
  message: string
  count: number
  priority: string
  action_url: string
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
    recentActivity: [],
    pendingInvoices: 0,
    overdueInvoices: 0,
    monthlyTarget: 100000,
    topClients: [],
    expensesByCategory: [],
  })
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [showTargetSettings, setShowTargetSettings] = useState(false)
  const [newTarget, setNewTarget] = useState(100000)
  const [calendarNotifications, setCalendarNotifications] = useState<CalendarNotification[]>([])
  const { formatCurrency } = useCurrency()

  useEffect(() => {
    fetchStats()
    loadMonthlyTarget()
    updateMonthlyStats()
    fetchCalendarNotifications()

    const interval = setInterval(
      () => {
        fetchStats()
        fetchCalendarNotifications()
        setLastUpdate(new Date())
      },
      5 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [])

  const fetchCalendarNotifications = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const notifications: CalendarNotification[] = []
      const now = new Date()
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      const { data: upcomingInvoices } = await supabase
        .from("invoices")
        .select("id, invoice_number, due_date, clients!inner(name)")
        .eq("user_id", user.id)
        .eq("status", "pendiente")
        .gte("due_date", now.toISOString().split("T")[0])
        .lte("due_date", oneWeekFromNow.toISOString().split("T")[0])

      if (upcomingInvoices && upcomingInvoices.length > 0) {
        notifications.push({
          notification_type: "invoice_due",
          title: "Facturas por vencer",
          message: `Tienes ${upcomingInvoices.length} factura${upcomingInvoices.length > 1 ? "s" : ""} que vence${upcomingInvoices.length > 1 ? "n" : ""} esta semana`,
          count: upcomingInvoices.length,
          priority: "high",
          action_url: "/invoices",
        })
      }

      const { data: overdueInvoices } = await supabase
        .from("invoices")
        .select("id, invoice_number, due_date, clients!inner(name)")
        .eq("user_id", user.id)
        .eq("status", "pendiente")
        .lt("due_date", now.toISOString().split("T")[0])

      if (overdueInvoices && overdueInvoices.length > 0) {
        notifications.push({
          notification_type: "invoice_overdue",
          title: "Facturas vencidas",
          message: `Tienes ${overdueInvoices.length} factura${overdueInvoices.length > 1 ? "s" : ""} vencida${overdueInvoices.length > 1 ? "s" : ""} que requiere${overdueInvoices.length > 1 ? "n" : ""} atención`,
          count: overdueInvoices.length,
          priority: "urgent",
          action_url: "/invoices",
        })
      }

      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const daysUntilMonthEnd = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilMonthEnd <= 5 && daysUntilMonthEnd > 0) {
        notifications.push({
          notification_type: "month_end",
          title: "Fin de mes próximo",
          message: `Quedan ${daysUntilMonthEnd} día${daysUntilMonthEnd > 1 ? "s" : ""} para el cierre mensual`,
          count: 1,
          priority: "medium",
          action_url: "/monthly-reports",
        })
      }

      setCalendarNotifications(notifications)
    } catch (error) {
      console.error("Error fetching calendar notifications:", error)
      setCalendarNotifications([])
    }
  }

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
      if (!user) return

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
      if (!user) return

      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const { data: invoices } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          total,
          status,
          due_date,
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
          if (inv.status !== "pendiente" || !inv.due_date) return false
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

      const monthlyInvoices = invoices?.filter((inv) => new Date(inv.created_at) >= monthAgo).length || 0
      const monthlyPaidInvoices = paidInvoices.filter((inv) => new Date(inv.created_at) >= monthAgo)
      const monthlyUnpaidInvoices = unpaidInvoices.filter((inv) => new Date(inv.created_at) >= monthAgo)
      const monthlyRevenue = monthlyPaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
      const monthlyPendingRevenue = monthlyUnpaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)

      const monthlyExpenses = expenses?.filter((exp) => new Date(exp.created_at) >= monthAgo).length || 0
      const monthlyExpenseAmount =
        expenses
          ?.filter((exp) => new Date(exp.created_at) >= monthAgo)
          .reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0

      const clientRevenue = new Map()
      paidInvoices.forEach((inv) => {
        const clientName = inv.clients.name
        const current = clientRevenue.get(clientName) || { total: 0, invoices: 0 }
        clientRevenue.set(clientName, {
          total: current.total + (inv.total || 0),
          invoices: current.invoices + 1,
        })
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
        invoices?.slice(0, 3).map((inv) => ({
          id: inv.id,
          type: "invoice" as const,
          number: inv.invoice_number,
          client_name: inv.clients.name,
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "invoice_due":
      case "invoice_overdue":
        return <FileText className="h-4 w-4" />
      case "upcoming_events":
        return <CalendarDays className="h-4 w-4" />
      case "recurring_expense":
        return <Repeat className="h-4 w-4" />
      case "month_end":
        return <Target className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getNotificationColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "border-red-200 bg-red-50 text-red-800"
      case "high":
        return "border-orange-200 bg-orange-50 text-orange-800"
      case "medium":
        return "border-blue-200 bg-blue-50 text-blue-800"
      case "low":
        return "border-green-200 bg-green-50 text-green-800"
      default:
        return "border-gray-200 bg-gray-50 text-gray-800"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Bienvenido a tu panel de control</span>
              <Badge variant="outline" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                Actualizado: {lastUpdate.toLocaleTimeString()}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/invoices/new">
              <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Factura
              </Button>
            </Link>
            <Link href="/expenses">
              <Button
                variant="outline"
                className="hover:bg-red-50 hover:text-red-700 hover:border-red-300 shadow-md hover:shadow-lg transition-all duration-300 bg-transparent"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Gasto
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                fetchStats()
                fetchCalendarNotifications()
                setLastUpdate(new Date())
              }}
              className="hover:bg-gray-100"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>

        {calendarNotifications.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-1 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Notificaciones
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {calendarNotifications.map((notification, index) => (
                <Card key={index} className={`border shadow-lg ${getNotificationColor(notification.priority)}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-white/50">
                          {getNotificationIcon(notification.notification_type)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{notification.title}</h4>
                          <p className="text-xs mt-1 opacity-90">{notification.message}</p>
                        </div>
                      </div>
                      {notification.count > 1 && (
                        <Badge variant="secondary" className="text-xs">
                          {notification.count}
                        </Badge>
                      )}
                    </div>
                    {notification.action_url && (
                      <div className="mt-3">
                        <Link href={notification.action_url}>
                          <Button size="sm" variant="outline" className="text-xs h-7 bg-white/50 hover:bg-white/80">
                            Ver detalles
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <Card className="border-0 shadow-xl bg-gradient-to-r from-amber-50 to-orange-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-amber-800">Meta Mensual</CardTitle>
                  <CardDescription className="text-amber-600">Progreso hacia tu objetivo de ingresos</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-amber-900">{monthlyProgress.toFixed(1)}%</div>
                  <div className="text-sm text-amber-700">
                    {formatCurrency(stats.monthlyRevenue)} / {formatCurrency(stats.monthlyTarget)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTargetSettings(!showTargetSettings)}
                  className="text-amber-700 hover:bg-amber-100"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {showTargetSettings && (
              <div className="mb-4 p-4 bg-white rounded-lg border border-amber-200">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="monthly-target" className="text-amber-800 font-medium">
                      Nueva Meta Mensual
                    </Label>
                    <Input
                      id="monthly-target"
                      type="number"
                      value={newTarget}
                      onChange={(e) => setNewTarget(Number(e.target.value))}
                      className="mt-1 border-amber-300 focus:border-amber-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={updateMonthlyTarget} className="bg-amber-600 hover:bg-amber-700">
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowTargetSettings(false)}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <Progress value={monthlyProgress} className="h-3" />
            <div className="flex justify-between text-xs text-amber-600 mt-2">
              <span>Inicio del mes</span>
              <span>Meta: {formatCurrency(stats.monthlyTarget)}</span>
            </div>
            {stats.monthlyPendingRevenue > 0 && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Ingresos Pendientes: {formatCurrency(stats.monthlyPendingRevenue)}
                  </span>
                </div>
                <p className="text-xs text-blue-600 mt-1">Facturas emitidas pero aún no marcadas como pagadas</p>
              </div>
            )}
          </CardContent>
        </Card>

        <StatsCards {...stats} />

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-1 w-8 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full"></div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  Acciones Rápidas
                </h2>
              </div>
              <div className="space-y-4">
                <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-lg">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-blue-800 text-lg">Crear Factura</CardTitle>
                        <CardDescription className="text-blue-600 text-sm">Genera una nueva factura</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Link href="/invoices/new">
                      <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300">
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Factura
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full shadow-lg">
                        <Receipt className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-purple-800 text-lg">Gestionar Gastos</CardTitle>
                        <CardDescription className="text-purple-600 text-sm">Administra tus gastos</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Link href="/expenses">
                      <Button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Ver Gastos
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-teal-50 to-teal-100 border-0 shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-r from-teal-500 to-teal-600 rounded-full shadow-lg">
                        <CalendarDays className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-teal-800 text-lg">Ver Agenda</CardTitle>
                        <CardDescription className="text-teal-600 text-sm">
                          Gestiona eventos y vencimientos
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Link href="/agenda">
                      <Button className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all duration-300">
                        <Calendar className="h-4 w-4 mr-2" />
                        Ver Agenda
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-full shadow-lg">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-green-800 text-lg">Ver Reportes</CardTitle>
                        <CardDescription className="text-green-600 text-sm">Analiza tu rendimiento</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Link href="/monthly-reports">
                      <Button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all duration-300">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Ver Reportes
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>

            {(stats.overdueInvoices > 0 || stats.pendingInvoices > 5) && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-1 w-8 bg-gradient-to-r from-red-500 to-red-600 rounded-full"></div>
                  <h3 className="text-lg font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
                    Alertas
                  </h3>
                </div>
                <div className="space-y-3">
                  {stats.overdueInvoices > 0 && (
                    <Card className="border-red-200 bg-red-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="font-medium text-red-800">{stats.overdueInvoices} facturas vencidas</p>
                            <p className="text-sm text-red-600">Requieren atención inmediata</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {stats.pendingInvoices > 5 && (
                    <Card className="border-amber-200 bg-amber-50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="h-5 w-5 text-amber-600" />
                          <div>
                            <p className="font-medium text-amber-800">{stats.pendingInvoices} facturas pendientes</p>
                            <p className="text-sm text-amber-600">Considera hacer seguimiento</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-1 w-8 bg-gradient-to-r from-green-500 to-teal-600 rounded-full"></div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                  Actividad Reciente
                </h2>
              </div>
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
                <CardContent className="p-6">
                  {stats.recentActivity.length > 0 ? (
                    <div className="space-y-4">
                      {stats.recentActivity.slice(0, 6).map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-full ${
                                activity.type === "invoice" ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-600"
                              }`}
                            >
                              {activity.type === "invoice" ? (
                                <FileText className="h-4 w-4" />
                              ) : (
                                <Receipt className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">
                                {activity.type === "invoice" ? `Factura ${activity.number}` : activity.description}
                              </p>
                              <p className="text-sm text-gray-500">
                                {activity.client_name || "Gasto registrado"} •{" "}
                                {new Date(activity.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`font-medium ${activity.type === "expense" ? "text-red-600" : "text-green-600"}`}
                            >
                              {activity.type === "expense" ? "-" : ""}
                              {formatCurrency(activity.total)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No hay actividad reciente</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-800 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Mejores Clientes
                  </CardTitle>
                  <CardDescription>Por ingresos generados</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.topClients.length > 0 ? (
                    <div className="space-y-3">
                      {stats.topClients.map((client, index) => (
                        <div key={client.name} className="flex items-center justify-between p-3 bg-white rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{client.name}</p>
                              <p className="text-sm text-gray-500">{client.invoices} facturas</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-blue-600">{formatCurrency(client.total)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No hay datos disponibles</p>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-red-50">
                <CardHeader>
                  <CardTitle className="text-red-800 flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Gastos por Categoría
                  </CardTitle>
                  <CardDescription>Distribución de gastos</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.expensesByCategory.length > 0 ? (
                    <div className="space-y-3">
                      {stats.expensesByCategory.map((category) => (
                        <div
                          key={category.category}
                          className="flex items-center justify-between p-3 bg-white rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{category.category}</p>
                            <p className="text-sm text-gray-500">{category.count} gastos</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-red-600">{formatCurrency(category.amount)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No hay datos disponibles</p>
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
