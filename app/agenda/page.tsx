"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Calendar,
  Clock,
  Plus,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Receipt,
  Edit,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Bell,
  TrendingUp,
  User,
  FileText,
  Download,
  RefreshCw,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useCurrency } from "@/hooks/use-currency"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import { FixedExpense } from "@/types"
import { 
  getFixedExpenses, 
  createFixedExpense, 
  updateFixedExpense, 
  deleteFixedExpense, 
  calculateNextPayment 
} from "@/lib/fixed-expenses"
import {
  getAgendaEvents,
  createAgendaEvent,
  updateAgendaEvent,
  deleteAgendaEvent,
  markAgendaEventCompleted,
  updateOverdueEvents,
  AgendaEvent,
  CreateAgendaEvent
} from "@/lib/agenda-events"

interface AgendaItem {
  id: string
  title: string
  description?: string
  due_date: string
  type: "invoice" | "expense" | "payment" | "reminder" | "fixed_expense" | "task"
  amount?: number
  status: "pending" | "completed" | "overdue"
  priority: "low" | "medium" | "high"
  created_at: string
}

export default function AgendaPage() {
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewItemDialog, setShowNewItemDialog] = useState(false)
  const [showFixedExpenseDialog, setShowFixedExpenseDialog] = useState(false)
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("all")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null)
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const { formatCurrency } = useCurrency()
  const { canAccessModule, canDelete, permissions } = useUserPermissions()

  // Verificación defensiva para evitar crash si canAccessModule no existe
  if (typeof canAccessModule !== 'function' || typeof permissions.canAccessModule === 'function') {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Error de permisos</h2>
            <p className="text-muted-foreground">
              El sistema detectó un error grave: <code>canAccessModule</code> no está disponible correctamente.<br />
              <b>Posible causa:</b> Se está usando <code>permissions.canAccessModule</code> en vez de la función del hook.<br />
              Por favor, recarga la página, limpia el caché, y asegúrate de no usar <code>permissions.canAccessModule</code> en ningún componente.<br />
              Si el error persiste, contacta soporte técnico.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Block employee access to agenda completamente
  if (!canAccessModule('agenda')) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Acceso Restringido</h2>
            <p className="text-muted-foreground">
              No tienes permisos para acceder a la agenda. Esta sección está disponible solo para propietarios.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Form states
  const [newItem, setNewItem] = useState({
    title: "",
    description: "",
    due_date: "",
    type: "reminder" as "invoice" | "expense" | "payment" | "reminder" | "fixed_expense" | "task",
    amount: 0,
    priority: "medium" as "low" | "medium" | "high",
  })

  const [newFixedExpense, setNewFixedExpense] = useState({
    name: "",
    amount: 0,
    due_date: "",
    frequency: "monthly" as "monthly" | "quarterly" | "annually",
    category: "",
  })

  useEffect(() => {
    fetchAgendaData()
  }, [])

  // Auto-refresh each 5 minutes if enabled
  useEffect(() => {
    if (!autoRefresh) {
      return
    }

    const interval = setInterval(() => {
      console.log('Auto-refreshing agenda data...')
      fetchAgendaData()
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [autoRefresh])

  const fetchAgendaData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      // Update overdue events first
      await updateOverdueEvents()

      // Fetch agenda events from database
      const agendaEventsData = await getAgendaEvents()

      // Fetch invoices for agenda
      const { data: invoiceData } = await supabase
        .from("invoices")
        .select("id, invoice_number, total, due_date, status, clients!inner(name)")
        .eq("user_id", user.id)
        .order("due_date", { ascending: true })

      // Convert invoices to agenda items
      const invoiceItems: AgendaItem[] = (invoiceData || []).map((invoice: any) => ({
        id: `invoice-${invoice.id}`,
        title: `Factura ${invoice.invoice_number}`,
        description: `Cliente: ${invoice.clients?.name || 'Sin cliente'} - Estado: ${invoice.status}`,
        due_date: invoice.due_date,
        type: "invoice" as const,
        amount: invoice.total,
        status: invoice.status === "pagada" ? "completed" : 
                new Date(invoice.due_date) < new Date() ? "overdue" : "pending",
        priority: "high" as const,
        created_at: new Date().toISOString(),
      }))

      // Convert database agenda events to AgendaItem format
      const agendaEventItems: AgendaItem[] = agendaEventsData.map((event: AgendaEvent) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        due_date: event.due_date,
        type: event.type === 'task' ? 'task' : event.type,
        amount: event.amount,
        status: event.status,
        priority: event.priority,
        created_at: event.created_at,
      }))

      // Fetch fixed expenses from database
      const fixedExpensesData = await getFixedExpenses()

      // Combine all agenda items
      const allAgendaItems = [...agendaEventItems, ...invoiceItems]

      setAgendaItems(allAgendaItems)
      setFixedExpenses(fixedExpensesData)
    } catch (error) {
      console.error("Error fetching agenda data:", error)
    } finally {
      setLoading(false)
    }
  }

  const addNewItem = async () => {
    if (!newItem.title) {
      return
    }

    try {
      if (editingItem) {
        // Update existing item
        await updateItem()
        return
      }

      // Use selected calendar date if no date is specified
      const itemDate = newItem.due_date || 
        (selectedCalendarDate ? selectedCalendarDate.toISOString().split('T')[0] : '')

      if (!itemDate) {
        alert('Por favor selecciona una fecha para el evento')
        return
      }

      // Create the agenda event in database
      const newAgendaEvent: CreateAgendaEvent = {
        title: newItem.title,
        description: newItem.description || undefined,
        due_date: itemDate,
        type: newItem.type === 'fixed_expense' ? 'expense' : newItem.type,
        amount: newItem.amount > 0 ? newItem.amount : undefined,
        status: "pending",
        priority: newItem.priority,
      }

      const createdEvent = await createAgendaEvent(newAgendaEvent)

      // Add to local state
      const newAgendaItem: AgendaItem = {
        id: createdEvent.id,
        title: createdEvent.title,
        description: createdEvent.description,
        due_date: createdEvent.due_date,
        type: createdEvent.type === 'task' ? 'task' : createdEvent.type,
        amount: createdEvent.amount,
        status: createdEvent.status,
        priority: createdEvent.priority,
        created_at: createdEvent.created_at,
      }

      setAgendaItems(prev => [...prev, newAgendaItem])
      
      // Reset form
      setNewItem({
        title: "",
        description: "",
        due_date: "",
        type: "reminder",
        amount: 0,
        priority: "medium",
      })
      setShowNewItemDialog(false)
    } catch (error) {
      console.error('Error creating agenda event:', error)
      alert('Error al crear el evento. Por favor intenta de nuevo.')
    }
  }

  const openNewItemDialog = (preselectedDate?: Date) => {
    if (preselectedDate) {
      setNewItem(prev => ({
        ...prev,
        due_date: preselectedDate.toISOString().split('T')[0]
      }))
    }
    setShowNewItemDialog(true)
  }

  const markItemCompleted = async (itemId: string) => {
    try {
      // Only mark agenda events as completed (not invoices)
      if (!itemId.startsWith('invoice-')) {
        await markAgendaEventCompleted(itemId)
      }
      
      setAgendaItems(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { ...item, status: "completed" as const }
            : item
        )
      )
    } catch (error) {
      console.error('Error marking item as completed:', error)
      alert('Error al marcar el evento como completado. Por favor intenta de nuevo.')
    }
  }

  const editItem = (item: AgendaItem) => {
    setEditingItem(item)
    
    // Formatear fecha para input type="date" (YYYY-MM-DD)
    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString)
        return date.toISOString().split('T')[0]
      } catch {
        return dateString
      }
    }
    
    setNewItem({
      title: item.title,
      description: item.description || "",
      due_date: formatDate(item.due_date),
      type: item.type,
      amount: item.amount || 0,
      priority: item.priority,
    })
    setShowNewItemDialog(true)
  }

  const updateItem = async () => {
    if (!editingItem || !newItem.title) {
      return
    }

    try {
      // Only update agenda events (not invoices)
      if (!editingItem.id.startsWith('invoice-')) {
        const updates = {
          title: newItem.title,
          description: newItem.description || undefined,
          due_date: newItem.due_date,
          type: newItem.type === 'fixed_expense' ? 'expense' : newItem.type,
          amount: newItem.amount > 0 ? newItem.amount : undefined,
          priority: newItem.priority,
        }

        await updateAgendaEvent(editingItem.id, updates)
      }

      setAgendaItems(prev => 
        prev.map(item => 
          item.id === editingItem.id 
            ? {
                ...item,
                title: newItem.title,
                description: newItem.description,
                due_date: newItem.due_date,
                type: newItem.type,
                amount: newItem.amount,
                priority: newItem.priority,
              }
            : item
        )
      )

      setEditingItem(null)
      setNewItem({
        title: "",
        description: "",
        due_date: "",
        type: "reminder",
        amount: 0,
        priority: "medium",
      })
      setShowNewItemDialog(false)
    } catch (error) {
      console.error('Error updating agenda event:', error)
      alert('Error al actualizar el evento. Por favor intenta de nuevo.')
    }
  }

  const deleteItem = async (itemId: string) => {
    if (!canDelete('agendaEvents')) {
      alert("No tienes permisos para eliminar eventos de la agenda")
      return
    }
    
    if (confirm("¿Estás seguro de que quieres eliminar este evento?")) {
      try {
        // Only delete agenda events (not invoices)
        if (!itemId.startsWith('invoice-')) {
          await deleteAgendaEvent(itemId)
        }

        setAgendaItems(prev => prev.filter(item => item.id !== itemId))
      } catch (error) {
        console.error('Error deleting agenda event:', error)
        alert('Error al eliminar el evento. Por favor intenta de nuevo.')
      }
    }
  }

  const handleDeleteFixedExpense = async (expenseId: string) => {
    if (!canDelete('expenses')) {
      alert("No tienes permisos para eliminar gastos fijos")
      return
    }
    
    if (confirm("¿Estás seguro de que quieres eliminar este gasto fijo?")) {
      try {
        const success = await deleteFixedExpense(expenseId)
        if (success) {
          setFixedExpenses(prev => prev.filter(expense => expense.id !== expenseId))
        }
      } catch (error) {
        console.error('Error deleting fixed expense:', error)
      }
    }
  }

  const editFixedExpense = (expense: FixedExpense) => {
    setEditingExpense(expense)
    setNewFixedExpense({
      name: expense.name,
      amount: expense.amount,
      due_date: expense.due_date,
      frequency: expense.frequency,
      category: expense.category || '',
    })
    setShowFixedExpenseDialog(true)
  }

  const markExpensePaid = async (expenseId: string) => {
    try {
      const expense = fixedExpenses.find(exp => exp.id === expenseId)
      if (!expense) {
        return
      }

      const nextPayment = calculateNextPayment(expense.due_date, expense.frequency)
      const updatedExpense = await updateFixedExpense(expenseId, {
        last_payment: expense.due_date,
        next_payment: nextPayment,
        due_date: nextPayment
      })

      if (updatedExpense) {
        setFixedExpenses(prev => 
          prev.map(exp => exp.id === expenseId ? updatedExpense : exp)
        )
      }
    } catch (error) {
      console.error('Error marking expense as paid:', error)
    }
  }

  const addFixedExpense = async () => {
    if (!newFixedExpense.name || !newFixedExpense.amount) {
      return
    }

    try {
      if (editingExpense) {
        // Update existing expense
        const updatedExpense = await updateFixedExpense(editingExpense.id, {
          name: newFixedExpense.name,
          amount: newFixedExpense.amount,
          due_date: newFixedExpense.due_date,
          frequency: newFixedExpense.frequency,
          category: newFixedExpense.category,
          next_payment: calculateNextPayment(newFixedExpense.due_date, newFixedExpense.frequency),
        })

        if (updatedExpense) {
          setFixedExpenses(prev => 
            prev.map(expense => 
              expense.id === editingExpense.id ? updatedExpense : expense
            )
          )
        }
        setEditingExpense(null)
      } else {
        // Add new expense
        const newExpense = await createFixedExpense({
          name: newFixedExpense.name,
          amount: newFixedExpense.amount,
          due_date: newFixedExpense.due_date,
          frequency: newFixedExpense.frequency,
          category: newFixedExpense.category || '',
          is_active: true,
          next_payment: calculateNextPayment(newFixedExpense.due_date, newFixedExpense.frequency),
        })

        if (newExpense) {
          setFixedExpenses(prev => [...prev, newExpense])
        }
      }

      setNewFixedExpense({
        name: "",
        amount: 0,
        due_date: "",
        frequency: "monthly",
        category: "",
      })
      setShowFixedExpenseDialog(false)
    } catch (error) {
      console.error('Error saving fixed expense:', error)
    }
  }

  const getUpcomingItems = () => {
    return agendaItems.filter(item => item.status === "pending")
  }

  const getOverdueItems = () => {
    return agendaItems.filter(item => item.status === "overdue")
  }

  const getTotalMonthlyExpenses = () => {
    return fixedExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  }

  const getUpcomingNotifications = () => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    const notifications = []

    // Eventos vencidos
    const overdueItems = agendaItems.filter(item => 
      item.status === "overdue" || 
      (item.status === "pending" && new Date(item.due_date) < today)
    )
    if (overdueItems.length > 0) {
      notifications.push({
        type: "error",
        title: "Eventos Vencidos",
        message: `Tienes ${overdueItems.length} evento(s) vencido(s)`,
        count: overdueItems.length
      })
    }

    // Eventos para mañana
    const tomorrowItems = agendaItems.filter(item => {
      const itemDate = new Date(item.due_date)
      return itemDate.toDateString() === tomorrow.toDateString() && item.status === "pending"
    })
    if (tomorrowItems.length > 0) {
      notifications.push({
        type: "warning",
        title: "Eventos para Mañana",
        message: `Tienes ${tomorrowItems.length} evento(s) programado(s) para mañana`,
        count: tomorrowItems.length
      })
    }

    // Gastos fijos próximos (solo para propietarios)
    if (permissions.canViewFinances) {
      const upcomingExpenses = fixedExpenses.filter(expense => {
        const expenseDate = new Date(expense.due_date)
        return expenseDate >= today && expenseDate <= nextWeek
      })
      if (upcomingExpenses.length > 0) {
        notifications.push({
          type: "info",
          title: "Gastos Fijos Próximos",
          message: `${upcomingExpenses.length} gasto(s) fijo(s) vencen esta semana`,
          count: upcomingExpenses.length
        })
      }
    }

    return notifications
  }

  const getProductivityInsights = () => {
    const completedThisWeek = agendaItems.filter(item => {
      const completedDate = new Date(item.created_at)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return item.status === "completed" && completedDate >= weekAgo
    }).length

    const totalPending = agendaItems.filter(item => item.status === "pending").length
    
    return {
      completedThisWeek,
      totalPending,
      completionRate: totalPending > 0 ? Math.round((completedThisWeek / (completedThisWeek + totalPending)) * 100) : 0
    }
  }

  const exportToCSV = () => {
    if (agendaItems.length === 0) {
      alert('No hay datos de agenda para exportar')
      return
    }
    
    const headers = ['Título', 'Descripción', 'Fecha', 'Tipo', 'Estado', 'Prioridad', 'Monto']
    const csvData = [
      headers,
      ...agendaItems.map(item => [
        item.title,
        item.description || '',
        new Date(item.due_date).toLocaleDateString('es-ES'),
        item.type === 'invoice' ? 'Factura' :
        item.type === 'expense' ? 'Gasto' :
        item.type === 'payment' ? 'Pago' : 'Recordatorio',
        item.status === 'pending' ? 'Pendiente' :
        item.status === 'completed' ? 'Completado' : 'Vencido',
        item.priority === 'high' ? 'Alta' :
        item.priority === 'medium' ? 'Media' : 'Baja',
        item.amount ? formatCurrency(item.amount) : ''
      ])
    ]
    
    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `agenda_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportExpensesToCSV = () => {
    if (!permissions.canViewFinances) {
      return
    }
    
    if (fixedExpenses.length === 0) {
      alert('No hay gastos fijos para exportar')
      return
    }
    
    const headers = ['Nombre', 'Monto', 'Frecuencia', 'Próximo Pago', 'Categoría']
    const csvData = [
      headers,
      ...fixedExpenses.map(expense => [
        expense.name,
        formatCurrency(expense.amount),
        expense.frequency === 'monthly' ? 'Mensual' :
        expense.frequency === 'quarterly' ? 'Trimestral' : 'Anual',
        new Date(expense.due_date).toLocaleDateString('es-ES'),
        expense.category || ''
      ])
    ]
    
    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `gastos_fijos_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredItems = agendaItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = selectedFilter === "all" || 
                         selectedFilter === item.status ||
                         selectedFilter === item.type

    return matchesSearch && matchesFilter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "completed":
        return "bg-emerald-100 text-emerald-800 border-emerald-200"
      case "overdue":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-slate-100 text-slate-800 border-slate-200"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200"
      case "medium":
        return "bg-amber-100 text-amber-800 border-amber-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-slate-100 text-slate-800 border-slate-200"
    }
  }

  // Calendar helper functions
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDate = firstDay.getDay() // 0 = Sunday
    
    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startDate; i++) {
      days.push(null)
    }
    
    // Add days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    return days
  }

  const getItemsForCalendarDate = (day: number) => {
    if (!day) {
      return []
    }
    
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    
    const agendaForDate = agendaItems.filter(item => 
      item.due_date === dateStr
    )
    
    const expensesForDate = fixedExpenses.filter(expense => 
      expense.due_date === dateStr || expense.next_payment === dateStr
    )
    
    return [...agendaForDate, ...expensesForDate.map(exp => ({
      id: exp.id,
      title: exp.name,
      due_date: exp.due_date,
      amount: exp.amount,
      type: 'expense' as const,
      status: 'pending' as const,
      priority: 'medium' as const,
      created_at: new Date().toISOString(),
    }))]
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const isToday = (day: number) => {
    if (!day) {
      return false
    }
    const today = new Date()
    return today.getDate() === day && 
           today.getMonth() === currentDate.getMonth() && 
           today.getFullYear() === currentDate.getFullYear()
  }

  const isSelectedDate = (day: number) => {
    if (!day || !selectedCalendarDate) {
      return false
    }
    return selectedCalendarDate.getDate() === day &&
           selectedCalendarDate.getMonth() === currentDate.getMonth() &&
           selectedCalendarDate.getFullYear() === currentDate.getFullYear()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header consistent with other pages */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-slate-800 bg-clip-text text-transparent">
              Agenda de Negocio
            </h1>
            <p className="text-slate-600">Administra y controla todas tus actividades empresariales</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => openNewItemDialog()} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Evento
            </Button>
            {/* Solo propietarios pueden gestionar gastos fijos */}
            {permissions.canViewFinances && (
              <Button onClick={() => setShowFixedExpenseDialog(true)} variant="outline">
                <Receipt className="h-4 w-4 mr-2" />
                Gasto Fijo
              </Button>
            )}
            {/* Botones de exportación */}
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar Agenda
            </Button>
            {permissions.canViewFinances && (
              <Button onClick={exportExpensesToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar Gastos
              </Button>
            )}
            <Button onClick={fetchAgendaData} variant="outline" size="sm" title="Actualizar datos">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Notificaciones y Alertas */}
        {getUpcomingNotifications().length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              Notificaciones Importantes
            </h2>
            <div className="grid gap-3">
              {getUpcomingNotifications().map((notification, index) => (
                <Card key={index} className={`border-l-4 ${
                  notification.type === "error" ? "border-l-red-500 bg-red-50" :
                  notification.type === "warning" ? "border-l-amber-500 bg-amber-50" :
                  "border-l-blue-500 bg-blue-50"
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {notification.type === "error" && <AlertCircle className="h-5 w-5 text-red-600" />}
                        {notification.type === "warning" && <Clock className="h-5 w-5 text-amber-600" />}
                        {notification.type === "info" && <Bell className="h-5 w-5 text-blue-600" />}
                        <div>
                          <p className="font-medium text-slate-800">{notification.title}</p>
                          <p className="text-sm text-slate-600">{notification.message}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        {notification.count}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Insights de Productividad */}
        {!permissions.isRealEmployee && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Resumen de Productividad
                  </h3>
                  <div className="flex items-center gap-6 text-sm text-slate-600">
                    <div>
                      <span className="font-medium text-green-600">{getProductivityInsights().completedThisWeek}</span> completadas esta semana
                    </div>
                    <div>
                      <span className="font-medium text-blue-600">{getProductivityInsights().totalPending}</span> pendientes
                    </div>
                    <div>
                      <span className="font-medium text-purple-600">{getProductivityInsights().completionRate}%</span> tasa de finalización
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Rendimiento semanal</p>
                  <div className={`text-2xl font-bold ${
                    getProductivityInsights().completionRate >= 70 ? 'text-green-600' :
                    getProductivityInsights().completionRate >= 40 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {getProductivityInsights().completionRate >= 70 ? '🎯' :
                     getProductivityInsights().completionRate >= 40 ? '⚡' : '📈'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Eventos Pendientes</p>
                  <p className="text-2xl font-bold text-blue-600">{getUpcomingItems().length}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Vencidos</p>
                  <p className="text-2xl font-bold text-red-600">{getOverdueItems().length}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          {permissions.canViewFinances && (
            <>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Gastos Fijos</p>
                      <p className="text-2xl font-bold text-orange-600">{fixedExpenses.length}</p>
                    </div>
                    <Receipt className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Total Mensual</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(getTotalMonthlyExpenses())}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          {!permissions.canViewFinances && (
            <>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Mis Tareas</p>
                      <p className="text-2xl font-bold text-purple-600">{agendaItems.filter(item => item.type === 'reminder').length}</p>
                    </div>
                    <User className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Facturas Activas</p>
                      <p className="text-2xl font-bold text-green-600">{agendaItems.filter(item => item.type === 'invoice').length}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Search and Filter */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Buscar eventos, gastos o recordatorios..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="overdue">Vencidos</SelectItem>
                  <SelectItem value="completed">Completados</SelectItem>
                  <SelectItem value="invoice">Facturas</SelectItem>
                  <SelectItem value="expense">Gastos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="agenda" className="space-y-6">
          <TabsList className={`grid w-full ${permissions.canViewFinances ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            {permissions.canViewFinances && (
              <TabsTrigger value="fixed-expenses">Gastos Fijos</TabsTrigger>
            )}
            <TabsTrigger value="calendar">Calendario</TabsTrigger>
          </TabsList>

          <TabsContent value="agenda" className="space-y-4">
            <div className="grid gap-4">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{item.title}</h3>
                            <Badge className={getStatusColor(item.status)}>
                              {item.status === "pending" ? "Pendiente" :
                               item.status === "completed" ? "Completado" : "Vencido"}
                            </Badge>
                            <Badge className={getPriorityColor(item.priority)}>
                              {item.priority === "high" ? "Alta" :
                               item.priority === "medium" ? "Media" : "Baja"}
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="text-slate-600">{item.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(item.due_date).toLocaleDateString('es-ES')}
                            </div>
                            {item.amount && item.amount > 0 && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                {formatCurrency(item.amount)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => editItem(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => markItemCompleted(item.id)}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          {canDelete('agendaEvents') && (
                            <Button size="sm" variant="outline" onClick={() => deleteItem(item.id)} className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay eventos en la agenda</h3>
                    <p className="text-gray-500 mb-4">Comienza agregando eventos, recordatorios o tareas</p>
                    <Button onClick={() => openNewItemDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Evento
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {permissions.canViewFinances && (
            <TabsContent value="fixed-expenses" className="space-y-4">
              <div className="grid gap-4">
                {fixedExpenses.length > 0 ? (
                  fixedExpenses.map((expense) => (
                    <Card key={expense.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{expense.name}</h3>
                              <Badge variant="outline">
                                {expense.frequency === "monthly" ? "Mensual" :
                                 expense.frequency === "quarterly" ? "Trimestral" : "Anual"}
                              </Badge>
                            </div>
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Próximo: {new Date(expense.next_payment).toLocaleDateString('es-ES')}
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              {formatCurrency(expense.amount)}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => editFixedExpense(expense)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => markExpensePaid(expense.id)}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          {canDelete('expenses') && (
                            <Button size="sm" variant="outline" onClick={() => handleDeleteFixedExpense(expense.id)} className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Receipt className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay gastos fijos configurados</h3>
                      <p className="text-gray-500 mb-4">Agrega gastos recurrentes para un mejor control</p>
                      <Button onClick={() => setShowFixedExpenseDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Gasto Fijo
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          )}

          <TabsContent value="calendar" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Calendar Grid */}
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">
                        {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigateMonth('prev')}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setCurrentDate(new Date())}
                        >
                          Hoy
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigateMonth('next')}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Week day headers */}
                    <div className="grid grid-cols-7 border-b">
                      {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                        <div key={day} className="p-3 text-center text-sm font-medium text-slate-600 border-r last:border-r-0">
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    {/* Calendar days */}
                    <div className="grid grid-cols-7">
                      {generateCalendarDays().map((day, index) => {
                        const items = day ? getItemsForCalendarDate(day) : []
                        const dayIsToday = day && isToday(day)
                        const dayIsSelected = day && isSelectedDate(day)
                        
                        return (
                          <div 
                            key={index}
                            className={`min-h-[120px] p-2 border-r border-b last-in-row:border-r-0 cursor-pointer transition-colors ${
                              dayIsToday ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50'
                            } ${dayIsSelected ? 'ring-2 ring-blue-400 bg-blue-50' : ''}`}
                            onClick={() => day && setSelectedCalendarDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                          >
                            {day && (
                              <>
                                <div className={`text-sm font-medium mb-2 flex items-center justify-between ${
                                  dayIsToday ? 'text-blue-600 font-bold' : 'text-slate-900'
                                }`}>
                                  <span>{day}</span>
                                  {items.length > 0 && (
                                    <div className="flex gap-1">
                                      <div className={`w-2 h-2 rounded-full ${
                                        items.some(item => item.type === 'invoice') ? 'bg-red-400' : ''
                                      }`} />
                                      <div className={`w-2 h-2 rounded-full ${
                                        items.some(item => item.type === 'expense') ? 'bg-orange-400' : ''
                                      }`} />
                                      <div className={`w-2 h-2 rounded-full ${
                                        items.some(item => item.type === 'reminder') ? 'bg-blue-400' : ''
                                      }`} />
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  {items.slice(0, 2).map((item, i) => (
                                    <div 
                                      key={i}
                                      className={`text-xs p-1.5 rounded-md text-white truncate transition-all hover:scale-105 ${
                                        item.type === 'invoice' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                                        item.type === 'expense' ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                                        item.type === 'payment' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                        'bg-gradient-to-r from-blue-500 to-blue-600'
                                      }`}
                                      title={`${item.title} ${item.amount ? `- ${formatCurrency(item.amount)}` : ''}`}
                                    >
                                      <div className="flex items-center gap-1">
                                        {item.type === 'invoice' && <FileText className="h-3 w-3" />}
                                        {item.type === 'expense' && <Receipt className="h-3 w-3" />}
                                        {item.type === 'payment' && <DollarSign className="h-3 w-3" />}
                                        {item.type === 'reminder' && <Clock className="h-3 w-3" />}
                                        <span className="truncate">{item.title}</span>
                                      </div>
                                    </div>
                                  ))}
                                  {items.length > 2 && (
                                    <div className="text-xs text-slate-500 pl-1 font-medium">
                                      +{items.length - 2} más eventos
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Selected Date Details */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {selectedCalendarDate ? 
                        `${selectedCalendarDate.getDate()} de ${selectedCalendarDate.toLocaleDateString('es-ES', { month: 'long' })}` : 
                        'Selecciona una fecha'
                      }
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedCalendarDate ? (
                      <div className="space-y-3">
                        {(() => {
                          const selectedDay = selectedCalendarDate.getDate()
                          const itemsForDay = getItemsForCalendarDate(selectedDay)
                          return itemsForDay.length > 0 ? (
                            itemsForDay.map((item, index) => (
                              <div key={index} className="p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="font-medium text-sm mb-1">{item.title}</div>
                                {item.amount && item.amount > 0 && (
                                  <div className="text-xs text-slate-600 mb-2">
                                    {formatCurrency(item.amount)}
                                  </div>
                                )}
                                <div className="flex items-center justify-between">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      item.type === 'invoice' ? 'border-red-200 text-red-600' :
                                      item.type === 'expense' ? 'border-orange-200 text-orange-600' :
                                      'border-blue-200 text-blue-600'
                                    }`}
                                  >
                                    {item.type === 'invoice' ? 'Factura' :
                                     item.type === 'expense' ? 'Gasto' : 'Evento'}
                                  </Badge>
                                  <Button size="sm" variant="ghost">
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-500 text-sm text-center py-4">No hay eventos para esta fecha</p>
                          )
                        })()}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm text-center py-4">Haz clic en una fecha para ver los detalles</p>
                    )}
                  </CardContent>
                </Card>
                
                {/* Calendar Legend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Leyenda del Calendario
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4 text-red-500" />
                          <div className="w-3 h-3 bg-gradient-to-r from-red-500 to-red-600 rounded"></div>
                        </div>
                        <span className="text-sm font-medium">Facturas</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Receipt className="h-4 w-4 text-orange-500" />
                          <div className="w-3 h-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded"></div>
                        </div>
                        <span className="text-sm font-medium">Gastos</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-green-500" />
                          <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-green-600 rounded"></div>
                        </div>
                        <span className="text-sm font-medium">Pagos</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded"></div>
                        </div>
                        <span className="text-sm font-medium">Recordatorios</span>
                      </div>
                    </div>
                    <hr className="border-slate-200" />
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded"></div>
                        <span className="text-sm text-slate-600">Fecha seleccionada</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-blue-50 border border-blue-300 rounded relative">
                          <div className="absolute inset-1 bg-blue-200 rounded-full"></div>
                        </div>
                        <span className="text-sm text-slate-600">Día actual</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      onClick={() => openNewItemDialog(selectedCalendarDate || undefined)} 
                      className="w-full" 
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Evento
                    </Button>
                    {permissions.canViewFinances && (
                      <Button 
                        onClick={() => setShowFixedExpenseDialog(true)} 
                        variant="outline" 
                        className="w-full" 
                        size="sm"
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        Gasto Fijo
                      </Button>
                    )}
                    <div className="border-t pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Auto-actualizar</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAutoRefresh(!autoRefresh)}
                          className={autoRefresh ? 'text-green-600' : 'text-slate-400'}
                        >
                          <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500">
                        {autoRefresh ? 'Actualiza cada 5 minutos' : 'Actualización manual'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Add New Item Dialog */}
        <Dialog open={showNewItemDialog} onOpenChange={setShowNewItemDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Editar Evento" : "Agregar Nuevo Evento"}</DialogTitle>
              <DialogDescription>
                {editingItem ? "Modifica los detalles del evento" : "Crea un nuevo evento, recordatorio o tarea para tu agenda"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  placeholder="Título del evento"
                  value={newItem.title}
                  onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Descripción del evento"
                  value={newItem.description}
                  onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="due_date">Fecha</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={newItem.due_date}
                    onChange={(e) => setNewItem(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="type">Tipo</Label>
                  <Select value={newItem.type} onValueChange={(value: any) => setNewItem(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reminder">Recordatorio</SelectItem>
                      <SelectItem value="payment">Pago</SelectItem>
                      <SelectItem value="expense">Gasto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Prioridad</Label>
                  <Select value={newItem.priority} onValueChange={(value: any) => setNewItem(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(newItem.type === "payment" || newItem.type === "expense") && (
                <div>
                  <Label htmlFor="amount">Monto</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={newItem.amount}
                    onChange={(e) => setNewItem(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewItemDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={addNewItem}>
                  {editingItem ? "Guardar" : "Agregar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Fixed Expense Dialog */}
        <Dialog open={showFixedExpenseDialog} onOpenChange={setShowFixedExpenseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Gasto Fijo</DialogTitle>
              <DialogDescription>
                Configura un gasto recurrente para tu negocio
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="expense-name">Nombre del Gasto</Label>
                <Input
                  id="expense-name"
                  placeholder="Ej: Alquiler, Internet, etc."
                  value={newFixedExpense.name}
                  onChange={(e) => setNewFixedExpense(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expense-amount">Monto</Label>
                  <Input
                    id="expense-amount"
                    type="number"
                    placeholder="0.00"
                    value={newFixedExpense.amount}
                    onChange={(e) => setNewFixedExpense(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="expense-frequency">Frecuencia</Label>
                  <Select 
                    value={newFixedExpense.frequency} 
                    onValueChange={(value: any) => setNewFixedExpense(prev => ({ ...prev, frequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensual</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                      <SelectItem value="annually">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="expense-date">Próxima Fecha de Pago</Label>
                <Input
                  id="expense-date"
                  type="date"
                  value={newFixedExpense.due_date}
                  onChange={(e) => setNewFixedExpense(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowFixedExpenseDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={addFixedExpense}>
                  Agregar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}