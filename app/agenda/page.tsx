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
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useCurrency } from "@/hooks/use-currency"

interface AgendaItem {
  id: string
  title: string
  description?: string
  due_date: string
  type: "invoice" | "expense" | "payment" | "reminder" | "fixed_expense"
  amount?: number
  status: "pending" | "completed" | "overdue"
  priority: "low" | "medium" | "high"
  created_at: string
}

interface FixedExpense {
  id: string
  name: string
  amount: number
  due_date: string
  frequency: "monthly" | "quarterly" | "annually"
  category: string
  is_active: boolean
  last_payment?: string
  next_payment: string
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
  const { formatCurrency } = useCurrency()

  // Form states
  const [newItem, setNewItem] = useState({
    title: "",
    description: "",
    due_date: "",
    type: "reminder" as "invoice" | "expense" | "payment" | "reminder" | "fixed_expense",
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

  const fetchAgendaData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return
      }

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

      // Mock fixed expenses
      const mockFixedExpenses: FixedExpense[] = [
        {
          id: 'expense-1',
          name: 'Alquiler de oficina',
          amount: 25000,
          due_date: '2025-09-30',
          frequency: 'monthly',
          category: 'oficina',
          is_active: true,
          next_payment: '2025-09-30'
        },
        {
          id: 'expense-2',
          name: 'Servicios públicos',
          amount: 8500,
          due_date: '2025-09-28',
          frequency: 'monthly',
          category: 'servicios',
          is_active: true,
          next_payment: '2025-09-28'
        }
      ]

      setAgendaItems(invoiceItems)
      setFixedExpenses(mockFixedExpenses)
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

    if (editingItem) {
      // Update existing item
      updateItem()
      return
    }

    // Use selected calendar date if no date is specified
    const itemDate = newItem.due_date || 
      (selectedCalendarDate ? selectedCalendarDate.toISOString().split('T')[0] : '')

    const newAgendaItem: AgendaItem = {
      id: `item-${Date.now()}`,
      title: newItem.title,
      description: newItem.description,
      due_date: itemDate,
      type: newItem.type,
      amount: newItem.amount,
      status: "pending",
      priority: newItem.priority,
      created_at: new Date().toISOString(),
    }

    setAgendaItems(prev => [...prev, newAgendaItem])
    setNewItem({
      title: "",
      description: "",
      due_date: "",
      type: "reminder",
      amount: 0,
      priority: "medium",
    })
    setShowNewItemDialog(false)
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

  const markItemCompleted = (itemId: string) => {
    setAgendaItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, status: "completed" as const }
          : item
      )
    )
  }

  const editItem = (item: AgendaItem) => {
    setEditingItem(item)
    setNewItem({
      title: item.title,
      description: item.description || "",
      due_date: item.due_date,
      type: item.type,
      amount: item.amount || 0,
      priority: item.priority,
    })
    setShowNewItemDialog(true)
  }

  const updateItem = () => {
    if (!editingItem || !newItem.title) {
      return
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
  }

  const deleteItem = (itemId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este evento?")) {
      setAgendaItems(prev => prev.filter(item => item.id !== itemId))
    }
  }

  const deleteFixedExpense = (expenseId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este gasto fijo?")) {
      setFixedExpenses(prev => prev.filter(expense => expense.id !== expenseId))
    }
  }

  const editFixedExpense = (expense: FixedExpense) => {
    setEditingExpense(expense)
    setNewFixedExpense({
      name: expense.name,
      amount: expense.amount,
      due_date: expense.due_date,
      frequency: expense.frequency,
      category: expense.category,
    })
    setShowFixedExpenseDialog(true)
  }

  const markExpensePaid = (expenseId: string) => {
    setFixedExpenses(prev => 
      prev.map(expense => {
        if (expense.id === expenseId) {
          // Calculate next payment date based on frequency
          const currentDate = new Date(expense.due_date)
          const nextDate = new Date(currentDate)
          
          switch (expense.frequency) {
            case 'monthly':
              nextDate.setMonth(nextDate.getMonth() + 1)
              break
            case 'quarterly':
              nextDate.setMonth(nextDate.getMonth() + 3)
              break
            case 'annually':
              nextDate.setFullYear(nextDate.getFullYear() + 1)
              break
          }
          
          return {
            ...expense,
            last_payment: expense.due_date,
            next_payment: nextDate.toISOString().split('T')[0],
            due_date: nextDate.toISOString().split('T')[0],
          }
        }
        return expense
      })
    )
  }

  const addFixedExpense = () => {
    if (!newFixedExpense.name || !newFixedExpense.amount) {
      return
    }

    if (editingExpense) {
      // Update existing expense
      setFixedExpenses(prev => 
        prev.map(expense => 
          expense.id === editingExpense.id 
            ? {
                ...expense,
                name: newFixedExpense.name,
                amount: newFixedExpense.amount,
                due_date: newFixedExpense.due_date,
                frequency: newFixedExpense.frequency,
                category: newFixedExpense.category,
                next_payment: newFixedExpense.due_date,
              }
            : expense
        )
      )
      setEditingExpense(null)
    } else {
      // Add new expense
      const expense: FixedExpense = {
        id: `expense-${Date.now()}`,
        name: newFixedExpense.name,
        amount: newFixedExpense.amount,
        due_date: newFixedExpense.due_date,
        frequency: newFixedExpense.frequency,
        category: newFixedExpense.category,
        is_active: true,
        next_payment: newFixedExpense.due_date,
      }

      setFixedExpenses(prev => [...prev, expense])
    }

    setNewFixedExpense({
      name: "",
      amount: 0,
      due_date: "",
      frequency: "monthly",
      category: "",
    })
    setShowFixedExpenseDialog(false)
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
            <Button onClick={() => setShowFixedExpenseDialog(true)} variant="outline">
              <Receipt className="h-4 w-4 mr-2" />
              Gasto Fijo
            </Button>
          </div>
        </div>

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="fixed-expenses">Gastos Fijos</TabsTrigger>
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
                          <Button size="sm" variant="outline" onClick={() => deleteItem(item.id)} className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                          <Button size="sm" variant="outline" onClick={() => deleteFixedExpense(expense.id)} className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                                <div className={`text-sm font-medium mb-2 ${
                                  dayIsToday ? 'text-blue-600 font-bold' : 'text-slate-900'
                                }`}>
                                  {day}
                                </div>
                                <div className="space-y-1">
                                  {items.slice(0, 3).map((item, i) => (
                                    <div 
                                      key={i}
                                      className={`text-xs p-1 rounded text-white truncate ${
                                        item.type === 'invoice' ? 'bg-red-500' :
                                        item.type === 'expense' ? 'bg-orange-500' :
                                        'bg-blue-500'
                                      }`}
                                      title={item.title}
                                    >
                                      {item.title}
                                    </div>
                                  ))}
                                  {items.length > 3 && (
                                    <div className="text-xs text-slate-500 pl-1">
                                      +{items.length - 3} más
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
                    <CardTitle className="text-lg">Leyenda</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span className="text-sm">Facturas</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-orange-500 rounded"></div>
                      <span className="text-sm">Gastos Fijos</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-blue-500 rounded"></div>
                      <span className="text-sm">Eventos</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></div>
                      <span className="text-sm">Hoy</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      onClick={() => openNewItemDialog(selectedCalendarDate || undefined)} 
                      className="w-full" 
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Evento
                    </Button>
                    <Button 
                      onClick={() => setShowFixedExpenseDialog(true)} 
                      variant="outline" 
                      className="w-full" 
                      size="sm"
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      Gasto Fijo
                    </Button>
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
                  Agregar
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