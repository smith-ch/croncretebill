"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
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
  Filter,
  Edit,
  Trash2,
  Receipt,
  Calendar,
  FileText,
  Tag,
  Loader2,
  Download,
  MoreHorizontal,
  DollarSign,
  TrendingUp,
  Settings,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { motion } from "framer-motion"
import { useCurrency } from "@/hooks/use-currency"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  expense_date: string
  receipt_number?: string
  notes?: string
  created_at: string
}

interface ExpenseCategory {
  id: string
  name: string
  description?: string
  color: string
  user_id: string
  created_at: string
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([])
  const { formatCurrency } = useCurrency()
  const { canDelete, permissions } = useUserPermissions()

  useEffect(() => {
    fetchExpenses()
    fetchCategories()
  }, [])

  // Check if user has permission to view finances/expenses
  if (!permissions.canViewFinances) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-2 border-red-200 bg-red-50">
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-red-800 mb-2">Acceso Restringido</h2>
                <p className="text-red-600">
                  No tienes permisos para acceder a la gestión de gastos. Esta función requiere permisos financieros.
                </p>
              </div>
              <Button 
                onClick={() => window.history.back()} 
                className="bg-red-600 hover:bg-red-700"
              >
                Volver
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const fetchExpenses = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("expense_date", { ascending: false })

      if (error) {
        throw error
      }
      setExpenses(data || [])
    } catch (error) {
      console.error("Error fetching expenses:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      const { data, error } = await supabase.from("expense_categories").select("*").eq("user_id", user.id).order("name")

      if (error) {
        throw error
      }
      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const handleExpenseSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const expenseData = {
      description: formData.get("description") as string,
      amount: Number.parseFloat(formData.get("amount") as string),
      category: formData.get("category") as string,
      expense_date: formData.get("expense_date") as string,
      receipt_number: formData.get("receipt_number") as string,
      notes: formData.get("notes") as string,
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("Usuario no autenticado")
      }

      if (editingExpense) {
        // @ts-ignore - Supabase type issue
        const { error } = await supabase.from("expenses").update(expenseData).eq("id", editingExpense.id)
        if (error) {
          throw error
        }
      } else {
        // @ts-ignore - Supabase type issue
        const { error } = await supabase.from("expenses").insert({
          ...expenseData,
          user_id: user.id,
        })
        if (error) {
          throw error
        }
      }

      setShowExpenseForm(false)
      setEditingExpense(null)
      fetchExpenses()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleCategorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const categoryData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      color: formData.get("color") as string,
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("Usuario no autenticado")
      }

      if (editingCategory) {
        // @ts-ignore - Supabase type issue
        const { error } = await supabase.from("expense_categories").update(categoryData).eq("id", editingCategory.id)
        if (error) {
          throw error
        }
      } else {
        // @ts-ignore - Supabase type issue
        const { error } = await supabase.from("expense_categories").insert({
          ...categoryData,
          user_id: user.id,
        })
        if (error) {
          throw error
        }
      }

      setShowCategoryForm(false)
      setEditingCategory(null)
      fetchCategories()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la categoría "${categoryName}"?`)) {
      return
    }

    try {
      // Check if category is being used by any expenses
      const { data: expensesUsingCategory, error: checkError } = await supabase
        .from("expenses")
        .select("id")
        .eq("category", categoryName)
        .limit(1)

      if (checkError) {
        throw checkError
      }

      if (expensesUsingCategory && expensesUsingCategory.length > 0) {
        alert("No se puede eliminar esta categoría porque está siendo utilizada por uno o más gastos.")
        return
      }

      const { error } = await supabase.from("expense_categories").delete().eq("id", categoryId)
      if (error) {
        throw error
      }

      fetchCategories()
    } catch (error) {
      console.error("Error deleting category:", error)
      alert("Error al eliminar la categoría")
    }
  }

  const handleDelete = async (id: string) => {
    if (!canDelete('expenses')) {
      alert("No tienes permisos para eliminar gastos")
      return
    }
    
    if (!confirm("¿Estás seguro de que quieres eliminar este gasto?")) {
      return
    }

    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id)
      if (error) {
        throw error
      }
      fetchExpenses()
      setSelectedExpenses(selectedExpenses.filter((expenseId) => expenseId !== id))
    } catch (error) {
      console.error("Error deleting expense:", error)
    }
  }

  const handleBulkDelete = async () => {
    if (!canDelete('expenses')) {
      alert("No tienes permisos para eliminar gastos")
      return
    }
    
    if (selectedExpenses.length === 0) {
      return
    }
    if (!confirm(`¿Estás seguro de que quieres eliminar ${selectedExpenses.length} gastos?`)) {
      return
    }

    try {
      const { error } = await supabase.from("expenses").delete().in("id", selectedExpenses)
      if (error) {
        throw error
      }

      fetchExpenses()
      setSelectedExpenses([])
    } catch (error) {
      console.error("Error deleting expenses:", error)
    }
  }

  const handleExportExpenses = () => {
    const csvContent = [
      ["Fecha", "Descripción", "Categoría", "Monto", "Recibo", "Notas"].join(","),
      ...expenses.map((expense) =>
        [
          expense.expense_date,
          `"${expense.description}"`,
          expense.category,
          expense.amount,
          expense.receipt_number || "",
          `"${expense.notes || ""}"`,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `gastos-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (expense.receipt_number && expense.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = selectedCategory === "all" || expense.category === selectedCategory

    let matchesDate = true
    if (dateFilter !== "all") {
      const expenseDate = new Date(expense.expense_date)
      const now = new Date()

      switch (dateFilter) {
        case "week":
          matchesDate = expenseDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case "month":
          matchesDate = expenseDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case "quarter":
          matchesDate = expenseDate >= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
      }
    }

    return matchesSearch && matchesCategory && matchesDate
  })

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const averageExpense = filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0
  const expensesByCategory = categories.map((category) => {
    const categoryExpenses = filteredExpenses.filter((expense) => expense.category === category.name)
    const total = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    return { ...category, total, count: categoryExpenses.length }
  })

  const getCategoryColor = (color: string) => {
    const colors = {
      blue: "bg-blue-100 text-blue-800 border-blue-200",
      green: "bg-emerald-100 text-emerald-800 border-emerald-200",
      red: "bg-red-100 text-red-800 border-red-200",
      yellow: "bg-amber-100 text-amber-800 border-amber-200",
      purple: "bg-purple-100 text-purple-800 border-purple-200",
      orange: "bg-orange-100 text-orange-800 border-orange-200",
    }
    return colors[color as keyof typeof colors] || colors.blue
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
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-slate-800 bg-clip-text text-transparent">
              Gestión de Gastos
            </h1>
            <p className="text-slate-600">Controla y administra todos tus gastos empresariales</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCategoryManager(true)}
              className="hover:bg-slate-100 border-slate-300"
            >
              <Settings className="h-4 w-4 mr-2" />
              Gestionar Categorías
            </Button>

            <Button
              variant="outline"
              onClick={handleExportExpenses}
              className="hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 bg-transparent"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>

            <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 bg-transparent"
                  onClick={() => setEditingCategory(null)}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Nueva Categoría
                </Button>
              </DialogTrigger>
            </Dialog>

            <Dialog open={showExpenseForm} onOpenChange={setShowExpenseForm}>
              <DialogTrigger asChild>
                <Button
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={() => setEditingExpense(null)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Gasto
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">Total Gastos</p>
                  <p className="text-2xl font-bold text-red-900">{formatCurrency(totalExpenses)}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-slate-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Cantidad</p>
                  <p className="text-2xl font-bold text-slate-900">{filteredExpenses.length}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-slate-500 to-slate-600 rounded-lg">
                  <Receipt className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700">Promedio</p>
                  <p className="text-2xl font-bold text-amber-900">{formatCurrency(averageExpense)}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Categorías</p>
                  <p className="text-2xl font-bold text-purple-900">{categories.length}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                  <Tag className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros y Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Buscar gastos..."
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

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full lg:w-48 border-slate-200">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las fechas</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mes</SelectItem>
                  <SelectItem value="quarter">Último trimestre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedExpenses.length > 0 && canDelete('expenses') && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    <span className="text-blue-800 font-medium">
                      {selectedExpenses.length} gasto{selectedExpenses.length > 1 ? "s" : ""} seleccionado
                      {selectedExpenses.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedExpenses([])}
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar Seleccionados
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses List */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
          <CardHeader>
            <CardTitle>Lista de Gastos</CardTitle>
            <CardDescription>Gestiona todos tus gastos empresariales</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Receipt className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  {searchTerm || selectedCategory !== "all" || dateFilter !== "all"
                    ? "No se encontraron gastos"
                    : "No hay gastos registrados"}
                </h3>
                <p className="text-slate-600 mb-4">
                  {searchTerm || selectedCategory !== "all" || dateFilter !== "all"
                    ? "Intenta ajustar los filtros de búsqueda"
                    : "Comienza registrando tu primer gasto"}
                </p>
                <Button
                  onClick={() => setShowExpenseForm(true)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Gasto
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredExpenses.map((expense, index) => (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group flex items-center justify-between p-6 border border-slate-200 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-slate-50 hover:border-blue-300 transition-all duration-300 hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={selectedExpenses.includes(expense.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedExpenses([...selectedExpenses, expense.id])
                          } else {
                            setSelectedExpenses(selectedExpenses.filter((id) => id !== expense.id))
                          }
                        }}
                        className="border-slate-300"
                      />

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-slate-900 group-hover:text-blue-900 transition-colors">
                            {expense.description}
                          </h4>
                          <Badge variant="outline" className={getCategoryColor("blue")}>
                            {expense.category}
                          </Badge>
                          {expense.receipt_number && (
                            <Badge variant="outline" className="text-xs border-slate-300">
                              <FileText className="h-3 w-3 mr-1" />
                              {expense.receipt_number}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(expense.expense_date).toLocaleDateString()}
                          </span>
                          <span className="font-semibold text-red-600 text-lg">{formatCurrency(expense.amount)}</span>
                        </div>
                        {expense.notes && <p className="text-sm text-slate-500 mt-2">{expense.notes}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingExpense(expense)
                          setShowExpenseForm(true)
                        }}
                        className="hover:bg-blue-100 hover:text-blue-700 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {canDelete('expenses') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(expense.id)}
                          className="hover:bg-red-100 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Gestionar Categorías
              </DialogTitle>
              <DialogDescription>
                Administra las categorías de gastos. Puedes editar, eliminar o crear nuevas categorías.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Categorías Existentes</h3>
                <Button
                  onClick={() => {
                    setEditingCategory(null)
                    setShowCategoryForm(true)
                  }}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Categoría
                </Button>
              </div>

              {categories.length === 0 ? (
                <div className="text-center py-8">
                  <Tag className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">No hay categorías personalizadas</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {categories.map((category) => {
                    const categoryStats = expensesByCategory.find((c) => c.name === category.name)
                    return (
                      <Card key={category.id} className="border border-slate-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getCategoryColor(category.color)} variant="outline">
                                  {category.name}
                                </Badge>
                              </div>
                              {category.description && (
                                <p className="text-sm text-slate-600 mb-2">{category.description}</p>
                              )}
                              <div className="text-xs text-slate-500">
                                {categoryStats?.count || 0} gastos • {formatCurrency(categoryStats?.total || 0)}
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingCategory(category)
                                    setShowCategoryForm(true)
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteCategory(category.id, category.name)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
              </DialogTitle>
              <DialogDescription>
                {editingCategory
                  ? "Modifica los detalles de la categoría existente."
                  : "Crea una nueva categoría para organizar mejor tus gastos."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Nombre *</Label>
                <Input
                  id="category-name"
                  name="name"
                  defaultValue={editingCategory?.name}
                  placeholder="Ej: Combustible, Oficina, etc."
                  required
                  className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-description">Descripción</Label>
                <Textarea
                  id="category-description"
                  name="description"
                  defaultValue={editingCategory?.description}
                  placeholder="Descripción de la categoría"
                  rows={2}
                  className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-color">Color</Label>
                <Select name="color" defaultValue={editingCategory?.color || "blue"}>
                  <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">Azul</SelectItem>
                    <SelectItem value="green">Verde</SelectItem>
                    <SelectItem value="red">Rojo</SelectItem>
                    <SelectItem value="yellow">Amarillo</SelectItem>
                    <SelectItem value="purple">Morado</SelectItem>
                    <SelectItem value="orange">Naranja</SelectItem>
                  </SelectContent>
                </Select>
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
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingCategory ? "Actualizar" : "Crear"} Categoría
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCategoryForm(false)
                    setEditingCategory(null)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showExpenseForm} onOpenChange={setShowExpenseForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                {editingExpense ? "Editar Gasto" : "Nuevo Gasto"}
              </DialogTitle>
              <DialogDescription>
                {editingExpense
                  ? "Modifica los detalles del gasto existente."
                  : "Registra un nuevo gasto empresarial con todos los detalles necesarios."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleExpenseSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-slate-700 font-medium">
                    Descripción *
                  </Label>
                  <Input
                    id="description"
                    name="description"
                    defaultValue={editingExpense?.description}
                    placeholder="Descripción del gasto"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-slate-700 font-medium">
                    Categoría *
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
                  <Label htmlFor="expense_date" className="text-slate-700 font-medium">
                    Fecha del Gasto *
                  </Label>
                  <Input
                    id="expense_date"
                    name="expense_date"
                    type="date"
                    defaultValue={editingExpense?.expense_date || new Date().toISOString().split("T")[0]}
                    required
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="receipt_number" className="text-slate-700 font-medium">
                  Número de Recibo
                </Label>
                <Input
                  id="receipt_number"
                  name="receipt_number"
                  defaultValue={editingExpense?.receipt_number}
                  placeholder="Número de factura o recibo"
                  className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-slate-700 font-medium">
                  Notas
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={editingExpense?.notes}
                  placeholder="Notas adicionales sobre el gasto"
                  rows={3}
                  className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                />
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
                  {editingExpense ? "Actualizar" : "Crear"} Gasto
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
