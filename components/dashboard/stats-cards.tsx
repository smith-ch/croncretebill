"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCurrency } from "@/hooks/use-currency"
import { DollarSign, FileText, Users, Package, FolderOpen, Receipt, TrendingUp, TrendingDown } from "lucide-react"

interface StatsCardsProps {
  totalRevenue: number
  totalInvoices: number
  totalClients: number
  totalProducts: number
  totalProjects: number
  totalExpenses: number
  totalExpenseAmount: number
  weeklyRevenue: number
  weeklyInvoices: number
  weeklyExpenses: number
  weeklyExpenseAmount: number
  monthlyRevenue: number
  monthlyInvoices: number
  monthlyExpenses: number
  monthlyExpenseAmount: number
}

export function StatsCards({
  totalRevenue,
  totalInvoices,
  totalClients,
  totalProducts,
  totalProjects,
  totalExpenses,
  totalExpenseAmount,
  weeklyRevenue,
  weeklyInvoices,
  weeklyExpenses,
  weeklyExpenseAmount,
  monthlyRevenue,
  monthlyInvoices,
  monthlyExpenses,
  monthlyExpenseAmount,
}: StatsCardsProps) {
  const { formatCurrency } = useCurrency()

  const netProfit = totalRevenue - totalExpenseAmount
  const weeklyNetProfit = weeklyRevenue - weeklyExpenseAmount
  const monthlyNetProfit = monthlyRevenue - monthlyExpenseAmount

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Revenue */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-2xl transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-700">Ingresos Totales</CardTitle>
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg">
            <DollarSign className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-900">{formatCurrency(totalRevenue)}</div>
          <p className="text-xs text-blue-600 mt-1">Esta semana: {formatCurrency(weeklyRevenue)}</p>
        </CardContent>
      </Card>

      {/* Total Invoices */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-50 to-slate-100 hover:shadow-2xl transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-700">Facturas</CardTitle>
          <div className="p-2 bg-gradient-to-br from-slate-500 to-slate-600 rounded-lg shadow-lg">
            <FileText className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900">{totalInvoices}</div>
          <p className="text-xs text-slate-600 mt-1">Esta semana: {weeklyInvoices}</p>
        </CardContent>
      </Card>

      {/* Total Expenses */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-red-50 to-red-100 hover:shadow-2xl transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-red-700">Gastos</CardTitle>
          <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg">
            <Receipt className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-900">{formatCurrency(totalExpenseAmount)}</div>
          <p className="text-xs text-red-600 mt-1">Esta semana: {formatCurrency(weeklyExpenseAmount)}</p>
        </CardContent>
      </Card>

      {/* Net Profit */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 to-emerald-100 hover:shadow-2xl transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-emerald-700">Ganancia Neta</CardTitle>
          <div
            className={`p-2 rounded-lg shadow-lg ${
              netProfit >= 0
                ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
                : "bg-gradient-to-br from-red-500 to-red-600"
            }`}
          >
            {netProfit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-white" />
            ) : (
              <TrendingDown className="h-4 w-4 text-white" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-emerald-900" : "text-red-900"}`}>
            {formatCurrency(netProfit)}
          </div>
          <p className={`text-xs mt-1 ${weeklyNetProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            Esta semana: {formatCurrency(weeklyNetProfit)}
          </p>
        </CardContent>
      </Card>

      {/* Clients */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-50 to-indigo-100 hover:shadow-2xl transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-indigo-700">Clientes</CardTitle>
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg">
            <Users className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-indigo-900">{totalClients}</div>
          <p className="text-xs text-indigo-600 mt-1">Clientes registrados</p>
        </CardContent>
      </Card>

      {/* Products */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-cyan-50 to-cyan-100 hover:shadow-2xl transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-cyan-700">Productos</CardTitle>
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg shadow-lg">
            <Package className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-cyan-900">{totalProducts}</div>
          <p className="text-xs text-cyan-600 mt-1">En catálogo</p>
        </CardContent>
      </Card>

      {/* Projects */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-violet-50 to-violet-100 hover:shadow-2xl transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-violet-700">Proyectos</CardTitle>
          <div className="p-2 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg shadow-lg">
            <FolderOpen className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-violet-900">{totalProjects}</div>
          <p className="text-xs text-violet-600 mt-1">Proyectos activos</p>
        </CardContent>
      </Card>

      {/* Monthly Summary */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-gray-50 to-gray-100 hover:shadow-2xl transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">Este Mes</CardTitle>
          <div className="p-2 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg shadow-lg">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{monthlyInvoices}</div>
          <p className="text-xs text-gray-600 mt-1">Facturas • {formatCurrency(monthlyRevenue)}</p>
        </CardContent>
      </Card>
    </div>
  )
}
