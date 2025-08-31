"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Calendar,
  RefreshCw,
  Loader2,
  MoreHorizontal,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  Repeat,
  CalendarDays,
} from "lucide-react"
import { motion } from "framer-motion"
import { useCurrency } from "@/hooks/use-currency"
import { useNotifications } from "@/hooks/use-notifications"

interface RecurringExpense {
  id: string
  name: string
  description?: string
  amount: number
  category?: string
  recurrence_pattern: string
  recurrence_interval: number
  day_of_month?: number
  day_of_week?: number
  start_date: string
  end_date?: string
  next_due_date: string
  is_active: boolean
  auto_create_expense: boolean
  created_at: string
}

interface ExpenseCategory {
  id: string
  name: string
  color: string
}

export default function RecurringExpensesPage() {
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { formatCurrency } = useCurrency()
  const { notifySuccess, notifyError } = useNotifications()

  useEffect(() => {
    fetchRecurringExpenses()
    fetchCategories()
  }, [])

  const fetchRecurringExpenses = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("recurring_expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("next_due_date", { ascending: true })

      if (error) throw error
      setRecurringExpenses(data || [])
    } catch (error) {
      console.error("Error fetching recurring expenses:", error)
      notifyError("Error al cargar los gastos recurrentes")
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase.from("expense_categories").select("*").eq("user_id", user.id).order("name")

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const expenseData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      amount: Number.parseFloat(formData.get("amount") as string),
      category: formData.get("category") as string,
      recurrence_pattern: formData.get("recurrence_pattern") as string,
      recurrence_interval: Number.parseInt(formData.get("recurrence_interval") as string) || 1,
      day_of_month: formData.get("day_of_month") ? Number.parseInt(formData.get("day_of_month") as string) : null,
      day_of_week: formData.get("day_of_week") ? Number.parseInt(formData.get("day_of_week") as string) : null,
      start_date: formData.get("start_date") as string,
      end_date: (formData.get("end_date") as string) || null,
      is_active: formData.get("is_active") === "on",
      auto_create_expense: formData.get("auto_create_expense") === "on",
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      if (editingExpense) {
        const { error } = await supabase.from("recurring_expenses").update(expenseData).eq("id", editingExpense.id)
        if (error) throw error
        notifySuccess("Gasto recurrente actualizado correctamente")
      } else {
        const { error } = await supabase.from("recurring_expenses").insert({
          ...expenseData,
          user_id: user.id,
        })
        if (error) throw error
        notifySuccess("Gasto recurrente creado correctamente")
      }

      // Generate calendar events for the recurring expense
      await generateCalendarEvents()

      setShowExpenseForm(false)
      setEditingExpense(null)
      fetchRecurringExpenses()
    } catch (error: any) {
      setError(error.message)
      notifyError(error.message || "Error al guardar el gasto recurrente")
    } finally {
      setFormLoading(false)
    }
  }

  const generateCalendarEvents = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase.rpc("create_recurring_expense_events", {
        p_user_id: user.id,
        p_months_ahead: 12,
      })

      if (error) throw error
      console.log(`Generated ${data} calendar events for recurring expenses`)
    } catch (error) {
      console.error("Error generating calendar events:", error)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${name}"?`)) return

    try {
      const { error } = await supabase.from("recurring_expenses").delete().eq("id", id)
      if (error) throw error

      notifySuccess("Gasto recurrente eliminado correctamente")
      fetchRecurringExpenses()
    } catch (error) {
      console.error("Error deleting recurring expense:", error)
      notifyError("Error al eliminar el gasto recurrente")
    }
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("recurring_expenses").update({ is_active: !currentStatus }).eq("id", id)

      if (error) throw error

      notifySuccess(`Gasto recurrente ${!currentStatus ? "activado" : "desactivado"}`)
      fetchRecurringExpenses()
    } catch (error) {
      console.error("Error toggling recurring expense:", error)
      notifyError("Error al cambiar el estado del gasto recurrente")
    }
  }

  const createExpenseNow = async (recurringExpense: RecurringExpense) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        description: recurringExpense.name,
        amount: recurringExpense.amount,
        category: recurringExpense.category || "Gasto Recurrente",
        expense_date: new Date().toISOString().split("T")[0],
        notes: `Creado desde gasto recurrente: ${recurringExpense.description || ""}`,
      })

      if (error) throw error

      notifySuccess("Gasto creado correctamente")
    } catch (error) {
      console.error("Error creating expense:", error)
      notifyError("Error al crear el gasto")
    }
  }

  const filteredExpenses = recurringExpenses.filter((expense) => {
    const matchesSearch =
      expense.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (expense.description && expense.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (expense.category && expense.category.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = selectedCategory === "all" || expense.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const totalMonthlyAmount = filteredExpenses
    .filter((expense) => expense.is_active)
    .reduce((sum, expense) => {
      // Convert to monthly amount based on recurrence pattern
      let monthlyAmount = expense.amount
      switch (expense.recurrence_pattern) {
        case "weekly":
          monthlyAmount = expense.amount * 4.33 // Average weeks per month
          break
        case "yearly":
          monthlyAmount = expense.amount / 12
          break
        // monthly is already correct
      }
      return sum + monthlyAmount / expense.recurrence_interval
    }, 0)

  const getRecurrenceText = (expense: RecurringExpense) => {
    const interval = expense.recurrence_interval > 1 ? ` cada ${expense.recurrence_interval}` : ""
    switch (expense.recurrence_pattern) {
      case "weekly":
        return `Semanal${interval} semana${expense.recurrence_interval > 1 ? "s" : ""}`
      case "monthly":
        return `Mensual${interval} mes${expense.recurrence_interval > 1 ? "es" : ""}`
      case "yearly":
        return `Anual${interval} año${expense.recurrence_interval > 1 ? "s" : ""}`
      default:
        return expense.recurrence_pattern
    }
  }

  const getDaysUntilDue = (dueDateString: string) => {
    const dueDate = new Date(dueDateString)
    const today = new Date()
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getDueBadgeColor = (daysUntil: number) => {
    if (daysUntil < 0) return "bg-red-100 text-red-800 border-red-200"
    if (daysUntil <= 3) return "bg-orange-100 text-orange-800 border-orange-200"
    if (daysUntil <= 7) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    return "bg-green-100 text-green-800 border-green-200"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-slate-800 bg-clip-text text-transparent">
              Gastos Recurrentes
            </h1>
            <p className="text-slate-600">
              Gestiona gastos que se repiten automáticamente como alquiler, servicios y más
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={generateCalendarEvents}
              className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 bg-transparent"
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Sincronizar Agenda
            </Button>

            <Dialog open={showExpenseForm} onOpenChange={setShowExpenseForm}>
              <DialogTrigger asChild>
                <Button
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={() => setEditingExpense(null)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Gasto Recurrente
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Total Mensual</p>
                  <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalMonthlyAmount)}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Activos</p>
                  <p className="text-2xl font-bold text-green-900">
                    {filteredExpenses.filter((e) => e.is_active).length}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700">Próximos 7 días</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {
                      filteredExpenses.filter(
                        (e) =>
                          e.is_active && getDaysUntilDue(e.next_due_date) <= 7 && getDaysUntilDue(e.next_due_date) >= 0,
                      ).length
                    }
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg">
                  <Clock className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Total</p>
                  <p className="text-2xl font-bold text-purple-900">{filteredExpenses.length}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                  <Repeat className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filtros y Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Buscar gastos recurrentes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full lg:w-48 border-slate-200">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Recurring Expenses List */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
          <CardHeader>
            <CardTitle>Gastos Recurrentes</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Repeat className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  {searchTerm || selectedCategory !== "all"
                    ? "No se encontraron gastos recurrentes"
                    : "No hay gastos recurrentes registrados"}
                </h3>
                <p className="text-slate-600 mb-4">
                  {searchTerm || selectedCategory !== "all"
                    ? "Intenta ajustar los filtros de búsqueda"
                    : "Comienza registrando tu primer gasto recurrente"}
                </p>
                <Button
                  onClick={() => setShowExpenseForm(true)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Gasto Recurrente
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredExpenses.map((expense, index) => {
                  const daysUntilDue = getDaysUntilDue(expense.next_due_date)
                  return (
                    <motion.div
                      key={expense.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group flex items-center justify-between p-6 border border-slate-200 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-slate-50 hover:border-blue-300 transition-all duration-300 hover:shadow-md"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-slate-900 group-hover:text-blue-900 transition-colors">
                              {expense.name}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {getRecurrenceText(expense)}
                            </Badge>
                            {expense.category && (
                              <Badge variant="outline" className="text-xs border-slate-300">
                                {expense.category}
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={`text-xs ${expense.is_active ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-800 border-gray-200"}`}
                            >
                              {expense.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Próximo: {new Date(expense.next_due_date).toLocaleDateString()}
                            </span>
                            <Badge variant="outline" className={`text-xs ${getDueBadgeColor(daysUntilDue)}`}>
                              {daysUntilDue < 0
                                ? `Vencido hace ${Math.abs(daysUntilDue)} días`
                                : daysUntilDue === 0
                                  ? "Vence hoy"
                                  : `En ${daysUntilDue} días`}
                            </Badge>
                            <span className="font-semibold text-red-600 text-lg">{formatCurrency(expense.amount)}</span>
                          </div>
                          {expense.description && <p className="text-sm text-slate-500 mt-2">{expense.description}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {expense.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => createExpenseNow(expense)}
                            className="hover:bg-green-100 hover:text-green-700 transition-colors"
                            title="Crear gasto ahora"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(expense.id, expense.is_active)}
                          className={`transition-colors ${
                            expense.is_active
                              ? "hover:bg-orange-100 hover:text-orange-700"
                              : "hover:bg-green-100 hover:text-green-700"
                          }`}
                          title={expense.is_active ? "Desactivar" : "Activar"}
                        >
                          {expense.is_active ? <RefreshCw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="hover:bg-slate-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingExpense(expense)
                                setShowExpenseForm(true)
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(expense.id, expense.name)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recurring Expense Form Dialog */}
        <Dialog open={showExpenseForm} onOpenChange={setShowExpenseForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Repeat className="h-5 w-5" />
                {editingExpense ? "Editar Gasto Recurrente" : "Nuevo Gasto Recurrente"}
              </DialogTitle>
              <DialogDescription>
                {editingExpense
                  ? "Modifica los detalles del gasto recurrente existente."
                  : "Configura un gasto que se repite automáticamente en intervalos regulares."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700 font-medium">
                    Nombre *
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingExpense?.name}
                    placeholder="Ej: Alquiler de oficina"
                    required
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-slate-700 font-medium">
                    Monto *
                  </Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    defaultValue={editingExpense?.amount}
                    placeholder="0.00"
                    required
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-700 font-medium">
                  Descripción
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingExpense?.description}
                  placeholder="Descripción del gasto recurrente"
                  rows={2}
                  className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-slate-700 font-medium">
                    Categoría
                  </Label>
                  <Select name="category" defaultValue={editingExpense?.category}>
                    <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recurrence_pattern" className="text-slate-700 font-medium">
                    Frecuencia *
                  </Label>
                  <Select name="recurrence_pattern" defaultValue={editingExpense?.recurrence_pattern || "monthly"}>
                    <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensual</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recurrence_interval" className="text-slate-700 font-medium">
                    Intervalo
                  </Label>
                  <Input
                    id="recurrence_interval"
                    name="recurrence_interval"
                    type="number"
                    min="1"
                    defaultValue={editingExpense?.recurrence_interval || 1}
                    placeholder="1"
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500">Cada cuántos períodos se repite (ej: cada 2 meses)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_date" className="text-slate-700 font-medium">
                    Fecha de Inicio *
                  </Label>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    defaultValue={editingExpense?.start_date || new Date().toISOString().split("T")[0]}
                    required
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date" className="text-slate-700 font-medium">
                  Fecha de Fin (Opcional)
                </Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  defaultValue={editingExpense?.end_date}
                  className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500">Deja vacío para que no tenga fecha de fin</p>
              </div>

              {/* Settings */}
              <div className="space-y-4 border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="is_active" className="text-slate-700 font-medium">
                      Activo
                    </Label>
                    <p className="text-xs text-slate-500">El gasto recurrente está activo y generará recordatorios</p>
                  </div>
                  <Switch id="is_active" name="is_active" defaultChecked={editingExpense?.is_active ?? true} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="auto_create_expense" className="text-slate-700 font-medium">
                      Crear Gasto Automáticamente
                    </Label>
                    <p className="text-xs text-slate-500">Crear automáticamente el gasto cuando llegue la fecha</p>
                  </div>
                  <Switch
                    id="auto_create_expense"
                    name="auto_create_expense"
                    defaultChecked={editingExpense?.auto_create_expense ?? false}
                  />
                </div>
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={formLoading}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingExpense ? "Actualizar" : "Crear"} Gasto Recurrente
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowExpenseForm(false)
                    setEditingExpense(null)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
