"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { BudgetPDFGenerator } from "@/components/pdf/budget-pdf-generator"
import { Plus, Search, Calculator, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/hooks/use-toast"
import { CurrencyConverter, DualCurrencyDisplay } from "@/components/currency-converter"
import { useCurrency } from "@/hooks/use-currency"

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<any[]>([])
  const [companySettings, setCompanySettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string | null }>({ show: false, id: null })
  const [isDeleting, setIsDeleting] = useState(false)
  const [showUSD, setShowUSD] = useState(false)
  const { toast } = useToast()
  const { exchangeRate, formatCurrency, formatUSD } = useCurrency()

  useEffect(() => {
    fetchBudgets()
    fetchCompanySettings()
  }, [])

  const fetchBudgets = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      const { data, error } = await supabase
        .from("budgets")
        .select(`
          *,
          clients(name, email, phone, address),
          projects(name),
          budget_items(
            *,
            products(name, unit),
            services(name, unit)
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setBudgets(data || [])
    } catch (error) {
      console.error("Error fetching budgets:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCompanySettings = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      const { data, error } = await supabase.from("company_settings").select("*").eq("user_id", user.id).single()

      if (error && error.code !== "PGRST116") throw error
      setCompanySettings(data)
    } catch (error) {
      console.error("Error fetching company settings:", error)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleteConfirm({ show: true, id })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return

    setIsDeleting(true)
    try {
      const { error } = await supabase.from("budgets").delete().eq("id", deleteConfirm.id)
      if (error) throw error
      
      toast({
        title: "Presupuesto eliminado",
        description: "El presupuesto ha sido eliminado exitosamente",
      })
      
      setDeleteConfirm({ show: false, id: null })
      fetchBudgets()
    } catch (error) {
      console.error("Error deleting budget:", error)
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el presupuesto",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "borrador":
        return "bg-gray-100 text-gray-800 border-gray-200"
      case "enviado":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "aprobado":
        return "bg-emerald-100 text-emerald-800 border-emerald-200"
      case "rechazado":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const filteredBudgets = budgets.filter(
    (budget) =>
      (budget.budget_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (budget.clients?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (budget.projects?.name || "").toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-full max-w-xs"></div>
          <div className="grid gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 sm:h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div className="w-full sm:w-auto">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            Presupuestos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Gestiona todos tus presupuestos</p>
        </div>
        <Button
          asChild
          className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white shadow-lg"
        >
          <Link href="/products/budgets/new">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Presupuesto
          </Link>
        </Button>
      </motion.div>

      <Card className="shadow-lg border-0 bg-white dark:bg-gray-900">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-slate-50 dark:from-blue-900/20 dark:to-slate-900/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar presupuestos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <CurrencyConverter 
              onToggle={setShowUSD} 
              exchangeRate={exchangeRate}
              currentCurrency="DOP"
              variant="compact"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredBudgets.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Calculator className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No hay presupuestos</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm sm:text-base">
                Comienza creando tu primer presupuesto
              </p>
              <Button
                asChild
                className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white"
              >
                <Link href="/products/budgets/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Presupuesto
                </Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredBudgets.map((budget, index) => (
                <motion.div
                  key={budget.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg truncate">
                          {budget.budget_number || `#${budget.id.slice(0, 8)}`}
                        </h3>
                        <Badge className={`${getStatusColor(budget.status || "borrador")} text-xs font-medium w-fit`}>
                          {budget.status || "borrador"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Cliente:</span>
                          <span className="truncate">{budget.clients?.name || "Sin cliente"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Fecha:</span>
                          <span>{new Date(budget.budget_date || budget.created_at).toLocaleDateString()}</span>
                        </div>
                        {budget.valid_until && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Válido hasta:</span>
                            <span>{new Date(budget.valid_until).toLocaleDateString()}</span>
                          </div>
                        )}
                        {budget.projects?.name && (
                          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1">
                            <span className="font-medium">Proyecto:</span>
                            <span className="truncate">{budget.projects.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="text-right">
                        {showUSD ? (
                          <div>
                            <p className="text-2xl font-bold text-green-600">
                              {formatUSD((budget.total || 0) / exchangeRate)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatCurrency(budget.total || 0)} DOP
                            </p>
                          </div>
                        ) : (
                          <DualCurrencyDisplay 
                            amount={budget.total || 0}
                            currencySymbol={companySettings?.currency_symbol || "RD$"}
                            exchangeRate={exchangeRate}
                            showBoth={true}
                            size="lg"
                          />
                        )}
                        <p className="text-xs text-gray-500 mt-1">{budget.budget_items?.length || 0} elemento(s)</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <BudgetPDFGenerator budget={budget} settings={companySettings} />
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all duration-200 bg-transparent"
                        >
                          <Link href={`/products/budgets/${budget.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all duration-200 bg-transparent"
                          onClick={() => handleDelete(budget.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteConfirm.show}
        onOpenChange={(open) => !open && setDeleteConfirm({ show: false, id: null })}
        title="Eliminar Presupuesto"
        description="¿Estás seguro de que deseas eliminar este presupuesto? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
