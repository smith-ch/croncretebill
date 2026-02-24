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
        <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-indigo-600/10 group-hover:from-blue-600/10 group-hover:to-indigo-600/15 transition-all duration-300"></div>
          <div className="hidden lg:block absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-600/20 to-indigo-600/30 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform duration-300"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative p-3 lg:p-6">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xs lg:text-sm font-bold text-blue-400 uppercase tracking-wide mb-1">Ingresos</CardTitle>
              <div className="hidden lg:flex items-center gap-2">
                {revenueTrend >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-600" />
                )}
                <Badge variant="secondary" className={`text-xs ${revenueTrend >= 0 ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                  {revenueTrend >= 0 ? '+' : ''}{revenueTrend.toFixed(1)}%
                </Badge>
              </div>
            </div>
            <div className="hidden lg:block p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 flex-shrink-0">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative p-3 lg:p-6 pt-0">
            <div className="flex flex-col">
              <span className="text-2xl lg:text-3xl font-bold text-blue-300 mb-2">{formatCurrency(totalRevenue)}</span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-400 uppercase tracking-wide">Semana:</span>
                <span className="font-bold text-blue-300">{formatCurrency(weeklyRevenue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Net Profit - Mobile Optimized */}
      {permissions.canViewFinances && (
        <Card className={`border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] relative overflow-hidden group`}>
          <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-300 ${netProfit >= 0
              ? 'from-emerald-600/5 to-green-600/10 group-hover:from-emerald-600/10 group-hover:to-green-600/15'
              : 'from-red-600/5 to-pink-600/10 group-hover:from-red-600/10 group-hover:to-pink-600/15'
            }`}></div>
          <div className={`hidden lg:block absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform duration-300 ${netProfit >= 0 ? 'bg-gradient-to-br from-emerald-600/20 to-green-600/30' : 'bg-gradient-to-br from-red-600/20 to-pink-600/30'
            }`}></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative p-3 lg:p-6">
            <div className="flex-1 min-w-0">
              <CardTitle className={`text-xs lg:text-sm font-bold uppercase tracking-wide mb-1 ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                Ganancia Neta
              </CardTitle>
              <div className="hidden lg:flex items-center gap-2">
                {netProfit >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <Badge variant="secondary" className={`text-xs ${netProfit >= 0 ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                  {netProfit >= 0 ? 'Positivo' : 'Negativo'}
                </Badge>
              </div>
            </div>
            <div className={`hidden lg:block p-3 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 flex-shrink-0 ${netProfit >= 0
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
          <CardContent className="relative p-3 lg:p-6 pt-0">
            <div className="flex flex-col">
              <span className={`text-2xl lg:text-3xl font-bold mb-2 ${netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatCurrency(netProfit)}
              </span>
              <div className="flex items-center justify-between text-xs">
                <span className={`uppercase tracking-wide ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>Esta semana:</span>
                <span className={`font-bold ${weeklyNetProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatCurrency(weeklyNetProfit)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total Expenses - Mobile Optimized */}
      {permissions.canViewFinances && (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-pink-600/10 group-hover:from-red-600/10 group-hover:to-pink-600/15 transition-all duration-300"></div>
          <div className="hidden lg:block absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-600/20 to-pink-600/30 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform duration-300"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative p-3 lg:p-6">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xs lg:text-sm font-bold text-red-400 uppercase tracking-wide mb-1">Gastos Totales</CardTitle>
              <div className="hidden lg:flex items-center gap-2">
                {expenseTrend >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-red-600" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-emerald-600" />
                )}
                <Badge variant="secondary" className={`text-xs ${expenseTrend >= 0 ? 'bg-red-900/30 text-red-400' : 'bg-emerald-900/30 text-emerald-400'}`}>
                  {expenseTrend >= 0 ? '+' : ''}{expenseTrend.toFixed(1)}%
                </Badge>
              </div>
            </div>
            <div className="hidden lg:block p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 flex-shrink-0">
              <Receipt className="h-6 w-6 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative p-3 lg:p-6 pt-0">
            <div className="flex flex-col">
              <span className="text-2xl lg:text-3xl font-bold text-red-400 mb-2">{formatCurrency(totalExpenseAmount)}</span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-400 uppercase tracking-wide">Esta semana:</span>
                <span className="font-bold text-red-400">{formatCurrency(weeklyExpenseAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total Invoices - Mobile Optimized */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-600/5 to-slate-500/10 group-hover:from-slate-600/10 group-hover:to-slate-500/15 transition-all duration-300"></div>
        <div className="hidden lg:block absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-600/20 to-slate-500/30 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform duration-300"></div>
        <CardHeader className="flex flex-row items-center justify-between pb-2 relative p-3 lg:p-6">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xs lg:text-sm font-bold text-slate-300 uppercase tracking-wide mb-1">Total Facturas</CardTitle>
            <div className="hidden lg:flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-400" />
              <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                {totalInvoices} docs
              </Badge>
            </div>
          </div>
          <div className="hidden lg:block p-3 bg-gradient-to-br from-slate-500 to-gray-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 flex-shrink-0">
            <FileText className="h-6 w-6 text-white" />
          </div>
        </CardHeader>
        <CardContent className="relative p-3 lg:p-6 pt-0">
          <div className="flex flex-col">
            <span className="text-2xl lg:text-3xl font-bold text-slate-200 mb-2">{totalInvoices}</span>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 uppercase tracking-wide">Esta semana:</span>
              <span className="font-bold text-slate-300">{weeklyInvoices}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients - Enhanced */}
      <Card className="border-0 shadow-2xl bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:shadow-3xl transition-all duration-500 hover:scale-[1.02] relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-purple-600/10 group-hover:from-indigo-600/10 group-hover:to-purple-600/15 transition-all duration-500"></div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-600/20 to-purple-600/30 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform duration-500 hidden lg:block"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative p-3 lg:p-6">
          <div className="space-y-1">
            <CardTitle className="text-xs lg:text-sm font-bold text-indigo-400 uppercase tracking-wide">Clientes</CardTitle>
            <div className="hidden lg:flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-400" />
              <Badge variant="secondary" className="text-xs bg-indigo-900/30 text-indigo-400">
                Activos
              </Badge>
            </div>
          </div>
          <div className="p-2 lg:p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl lg:rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
            <Users className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
          </div>
        </CardHeader>
        <CardContent className="relative p-3 lg:p-6 pt-0">
          <div className="text-2xl lg:text-3xl font-bold text-indigo-300 mb-2">{totalClients}</div>
          <div className="flex items-center justify-between text-xs lg:text-sm">
            <span className="text-indigo-400 font-medium">Promedio factura:</span>
            <span className="font-bold text-indigo-300">
              {totalClients > 0 ? formatCurrency(totalRevenue / totalClients) : formatCurrency(0)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Products - Enhanced */}
      <Card className="border-0 shadow-2xl bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:shadow-3xl transition-all duration-500 hover:scale-[1.02] relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/5 to-teal-600/10 group-hover:from-cyan-600/10 group-hover:to-teal-600/15 transition-all duration-500"></div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-600/20 to-teal-600/30 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform duration-500 hidden lg:block"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative p-3 lg:p-6">
          <div className="space-y-1">
            <CardTitle className="text-xs lg:text-sm font-bold text-cyan-400 uppercase tracking-wide">Productos</CardTitle>
            <div className="hidden lg:flex items-center gap-2">
              <Package className="h-4 w-4 text-cyan-400" />
              <Badge variant="secondary" className="text-xs bg-cyan-900/30 text-cyan-400">
                Catálogo
              </Badge>
            </div>
          </div>
          <div className="p-2 lg:p-3 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl lg:rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
            <Package className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
          </div>
        </CardHeader>
        <CardContent className="relative p-3 lg:p-6 pt-0">
          <div className="text-2xl lg:text-3xl font-bold text-cyan-300 mb-2">{totalProducts}</div>
          <div className="flex items-center justify-between text-xs lg:text-sm">
            <span className="text-cyan-400 font-medium">En inventario</span>
            <span className="font-bold text-cyan-300">Disponibles</span>
          </div>
        </CardContent>
      </Card>

      {/* Projects - Enhanced */}
      <Card className="border-0 shadow-2xl bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:shadow-3xl transition-all duration-500 hover:scale-[1.02] relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-purple-600/10 group-hover:from-violet-600/10 group-hover:to-purple-600/15 transition-all duration-500"></div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-violet-600/20 to-purple-600/30 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform duration-500 hidden lg:block"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative p-3 lg:p-6">
          <div className="space-y-1">
            <CardTitle className="text-xs lg:text-sm font-bold text-violet-400 uppercase tracking-wide">Proyectos</CardTitle>
            <div className="hidden lg:flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-violet-400" />
              <Badge variant="secondary" className="text-xs bg-violet-900/30 text-violet-400">
                Activos
              </Badge>
            </div>
          </div>
          <div className="p-2 lg:p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl lg:rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
            <FolderOpen className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
          </div>
        </CardHeader>
        <CardContent className="relative p-3 lg:p-6 pt-0">
          <div className="text-2xl lg:text-3xl font-bold text-violet-300 mb-2">{totalProjects}</div>
          <div className="flex items-center justify-between text-xs lg:text-sm">
            <span className="text-violet-400 font-medium">En progreso</span>
            <span className="font-bold text-violet-300">Gestionando</span>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary - Enhanced - Only visible with financial permissions */}
      {permissions.canViewFinances && (
        <Card className="border-0 shadow-2xl bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:shadow-3xl transition-all duration-500 hover:scale-[1.02] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600/5 to-orange-600/10 group-hover:from-amber-600/10 group-hover:to-orange-600/15 transition-all duration-500"></div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-600/20 to-orange-600/30 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform duration-500 hidden lg:block"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative p-3 lg:p-6">
            <div className="space-y-1">
              <CardTitle className="text-xs lg:text-sm font-bold text-amber-400 uppercase tracking-wide">Este Mes</CardTitle>
              <div className="hidden lg:flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-600" />
                <Badge variant="secondary" className="text-xs bg-amber-900/30 text-amber-400">
                  Resumen
                </Badge>
              </div>
            </div>
            <div className="p-2 lg:p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl lg:rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
              <TrendingUp className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative p-3 lg:p-6 pt-0">
            <div className="text-2xl lg:text-3xl font-bold text-amber-400 mb-2">{monthlyInvoices}</div>
            <div className="flex items-center justify-between text-xs lg:text-sm">
              <span className="text-amber-400 font-medium">Ingresos:</span>
              <span className="font-bold text-amber-400">{formatCurrency(monthlyRevenue)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
