"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useCurrency } from "@/hooks/use-currency"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import { DollarSign, FileText, Users, Package, FolderOpen, Receipt, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Activity, Calendar } from "lucide-react"

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
  totalExpenseAmount,
  weeklyRevenue,
  weeklyInvoices,
  weeklyExpenseAmount,
  monthlyRevenue,
  monthlyInvoices,
}: StatsCardsProps) {
  const { formatCurrency } = useCurrency()
  const { permissions } = useUserPermissions()

  const netProfit = totalRevenue - totalExpenseAmount
  const weeklyNetProfit = weeklyRevenue - weeklyExpenseAmount

  // Calculate trends (simplified - comparing weekly to total averages)
  const avgWeeklyRevenue = totalRevenue / 4 // Rough monthly average divided by weeks
  const revenueTrend = avgWeeklyRevenue > 0 ? ((weeklyRevenue - avgWeeklyRevenue) / avgWeeklyRevenue) * 100 : 0
  
  const avgWeeklyExpenses = totalExpenseAmount / 4
  const expenseTrend = avgWeeklyExpenses > 0 ? ((weeklyExpenseAmount - avgWeeklyExpenses) / avgWeeklyExpenses) * 100 : 0

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
      {/* Total Revenue - Mobile Optimized */}
      {permissions.canViewFinances && (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/10 group-hover:from-blue-500/10 group-hover:to-indigo-500/15 transition-all duration-300"></div>
        <div className="hidden lg:block absolute top-0 right-0 w-16 h-16 lg:w-24 lg:h-24 bg-gradient-to-br from-blue-300/20 to-indigo-400/30 rounded-full -translate-y-8 lg:-translate-y-12 translate-x-8 lg:translate-x-12 group-hover:scale-110 transition-transform duration-300"></div>
        <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-1 lg:space-y-0 pb-2 lg:pb-3 relative p-3 lg:p-6">
          <div className="space-y-1">
            <CardTitle className="text-xs lg:text-sm font-bold text-blue-700 uppercase tracking-wide">Ingresos</CardTitle>
            <div className="hidden lg:flex items-center gap-2">
              {revenueTrend >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-emerald-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              )}
              <Badge variant="secondary" className={`text-xs ${revenueTrend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {revenueTrend >= 0 ? '+' : ''}{revenueTrend.toFixed(1)}%
              </Badge>
            </div>
          </div>
          <div className="hidden lg:block p-2 lg:p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl lg:rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
            <DollarSign className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
          </div>
        </CardHeader>
        <CardContent className="relative p-3 lg:p-6 pt-0">
          <div className="text-lg lg:text-3xl font-bold text-blue-900 mb-1 lg:mb-2">{formatCurrency(totalRevenue)}</div>
          <div className="flex items-center justify-between text-xs lg:text-sm">
            <span className="text-blue-600 font-medium">Semana:</span>
            <span className="font-bold text-blue-800">{formatCurrency(weeklyRevenue)}</span>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Net Profit - Enhanced - Only visible with financial permissions */}
      {permissions.canViewFinances && (
      <Card className={`border-0 shadow-2xl bg-gradient-to-br hover:shadow-3xl transition-all duration-500 hover:scale-105 relative overflow-hidden group ${
        netProfit >= 0 ? 'from-emerald-50 via-green-50 to-emerald-100' : 'from-red-50 via-pink-50 to-red-100'
      }`}>
        <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-500 ${
          netProfit >= 0 
            ? 'from-emerald-500/5 to-green-500/10 group-hover:from-emerald-500/10 group-hover:to-green-500/15' 
            : 'from-red-500/5 to-pink-500/10 group-hover:from-red-500/10 group-hover:to-pink-500/15'
        }`}></div>
        <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform duration-500 ${
          netProfit >= 0 ? 'bg-gradient-to-br from-emerald-300/20 to-green-400/30' : 'bg-gradient-to-br from-red-300/20 to-pink-400/30'
        }`}></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
          <div className="space-y-1">
            <CardTitle className={`text-sm font-bold uppercase tracking-wide ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              Ganancia Neta
            </CardTitle>
            <div className="flex items-center gap-2">
              {netProfit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <Badge variant="secondary" className={`text-xs ${netProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {netProfit >= 0 ? 'Positivo' : 'Negativo'}
              </Badge>
            </div>
          </div>
          <div className={`p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 ${
            netProfit >= 0
              ? "bg-gradient-to-br from-emerald-500 to-green-600"
              : "bg-gradient-to-br from-red-500 to-pink-600"
          }`}>
            {netProfit >= 0 ? (
              <TrendingUp className="h-6 w-6 text-white" />
            ) : (
              <TrendingDown className="h-6 w-6 text-white" />
            )}
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className={`text-3xl font-bold mb-2 ${netProfit >= 0 ? "text-emerald-900" : "text-red-900"}`}>
            {formatCurrency(netProfit)}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className={`font-medium ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Esta semana:</span>
            <span className={`font-bold ${weeklyNetProfit >= 0 ? "text-emerald-800" : "text-red-800"}`}>
              {formatCurrency(weeklyNetProfit)}
            </span>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Total Expenses - Enhanced - Only visible with financial permissions */}
      {permissions.canViewFinances && (
      <Card className="border-0 shadow-2xl bg-gradient-to-br from-red-50 via-pink-50 to-red-100 hover:shadow-3xl transition-all duration-500 hover:scale-105 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-pink-500/10 group-hover:from-red-500/10 group-hover:to-pink-500/15 transition-all duration-500"></div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-300/20 to-pink-400/30 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform duration-500"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
          <div className="space-y-1">
            <CardTitle className="text-sm font-bold text-red-700 uppercase tracking-wide">Gastos Totales</CardTitle>
            <div className="flex items-center gap-2">
              {expenseTrend >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-red-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-emerald-600" />
              )}
              <Badge variant="secondary" className={`text-xs ${expenseTrend >= 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {expenseTrend >= 0 ? '+' : ''}{expenseTrend.toFixed(1)}%
              </Badge>
            </div>
          </div>
          <div className="p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
            <Receipt className="h-6 w-6 text-white" />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold text-red-900 mb-2">{formatCurrency(totalExpenseAmount)}</div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-red-600 font-medium">Esta semana:</span>
            <span className="font-bold text-red-800">{formatCurrency(weeklyExpenseAmount)}</span>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Total Invoices - Enhanced */}
      <Card className="border-0 shadow-2xl bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 hover:shadow-3xl transition-all duration-500 hover:scale-105 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-gray-500/10 group-hover:from-slate-500/10 group-hover:to-gray-500/15 transition-all duration-500"></div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-300/20 to-gray-400/30 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform duration-500"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
          <div className="space-y-1">
            <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide">Total Facturas</CardTitle>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-600" />
              <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700">
                {totalInvoices} docs
              </Badge>
            </div>
          </div>
          <div className="p-3 bg-gradient-to-br from-slate-500 to-gray-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
            <FileText className="h-6 w-6 text-white" />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold text-slate-900 mb-2">{totalInvoices}</div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 font-medium">Esta semana:</span>
            <span className="font-bold text-slate-800">{weeklyInvoices}</span>
          </div>
        </CardContent>
      </Card>

      {/* Clients - Enhanced */}
      <Card className="border-0 shadow-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-100 hover:shadow-3xl transition-all duration-500 hover:scale-105 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/10 group-hover:from-indigo-500/10 group-hover:to-purple-500/15 transition-all duration-500"></div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-300/20 to-purple-400/30 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform duration-500"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
          <div className="space-y-1">
            <CardTitle className="text-sm font-bold text-indigo-700 uppercase tracking-wide">Clientes</CardTitle>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-700">
                Activos
              </Badge>
            </div>
          </div>
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
            <Users className="h-6 w-6 text-white" />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold text-indigo-900 mb-2">{totalClients}</div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-indigo-600 font-medium">Promedio factura:</span>
            <span className="font-bold text-indigo-800">
              {totalClients > 0 ? formatCurrency(totalRevenue / totalClients) : formatCurrency(0)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Products - Enhanced */}
      <Card className="border-0 shadow-2xl bg-gradient-to-br from-cyan-50 via-teal-50 to-cyan-100 hover:shadow-3xl transition-all duration-500 hover:scale-105 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-teal-500/10 group-hover:from-cyan-500/10 group-hover:to-teal-500/15 transition-all duration-500"></div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-300/20 to-teal-400/30 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform duration-500"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
          <div className="space-y-1">
            <CardTitle className="text-sm font-bold text-cyan-700 uppercase tracking-wide">Productos</CardTitle>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-cyan-600" />
              <Badge variant="secondary" className="text-xs bg-cyan-100 text-cyan-700">
                Catálogo
              </Badge>
            </div>
          </div>
          <div className="p-3 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
            <Package className="h-6 w-6 text-white" />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold text-cyan-900 mb-2">{totalProducts}</div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-cyan-600 font-medium">En inventario</span>
            <span className="font-bold text-cyan-800">Disponibles</span>
          </div>
        </CardContent>
      </Card>

      {/* Projects - Enhanced */}
      <Card className="border-0 shadow-2xl bg-gradient-to-br from-violet-50 via-purple-50 to-violet-100 hover:shadow-3xl transition-all duration-500 hover:scale-105 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/10 group-hover:from-violet-500/10 group-hover:to-purple-500/15 transition-all duration-500"></div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-violet-300/20 to-purple-400/30 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform duration-500"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
          <div className="space-y-1">
            <CardTitle className="text-sm font-bold text-violet-700 uppercase tracking-wide">Proyectos</CardTitle>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-violet-600" />
              <Badge variant="secondary" className="text-xs bg-violet-100 text-violet-700">
                Activos
              </Badge>
            </div>
          </div>
          <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
            <FolderOpen className="h-6 w-6 text-white" />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold text-violet-900 mb-2">{totalProjects}</div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-violet-600 font-medium">En progreso</span>
            <span className="font-bold text-violet-800">Gestionando</span>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary - Enhanced - Only visible with financial permissions */}
      {permissions.canViewFinances && (
      <Card className="border-0 shadow-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 hover:shadow-3xl transition-all duration-500 hover:scale-105 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/10 group-hover:from-amber-500/10 group-hover:to-orange-500/15 transition-all duration-500"></div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-300/20 to-orange-400/30 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform duration-500"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
          <div className="space-y-1">
            <CardTitle className="text-sm font-bold text-amber-700 uppercase tracking-wide">Este Mes</CardTitle>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-600" />
              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                Resumen
              </Badge>
            </div>
          </div>
          <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold text-amber-900 mb-2">{monthlyInvoices}</div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-amber-600 font-medium">Ingresos:</span>
            <span className="font-bold text-amber-800">{formatCurrency(monthlyRevenue)}</span>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  )
}
