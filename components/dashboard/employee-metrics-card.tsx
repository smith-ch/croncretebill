"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Target, TrendingUp, DollarSign, FileText, Users, Loader2, CheckCircle, AlertTriangle, XCircle, Calendar } from "lucide-react"
import { useEmployeeMetrics } from "@/hooks/use-employee-metrics"
import { useCurrency } from "@/hooks/use-currency"

export function EmployeeMetricsCard() {
  const { currentGoal, loading, hasGoal } = useEmployeeMetrics()
  const { formatCurrency } = useCurrency()

  if (loading) {
    return (
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    )
  }

  if (!hasGoal || !currentGoal) {
    return (
      <Card className="border-slate-200 bg-slate-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-600">
            <Target className="h-5 w-5" />
            Metas del Mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">No hay metas establecidas para este periodo</p>
        </CardContent>
      </Card>
    )
  }

  const { progress, current_metrics } = currentGoal
  const monthNames = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

  const getOverallStatus = () => {
    if (progress.overall_percentage >= 90) {
      return {
        color: "from-green-50 to-emerald-50",
        borderColor: "border-green-300",
        icon: <CheckCircle className="h-6 w-6 text-green-600" />,
        text: "¡Excelente desempeño!",
        textColor: "text-green-700"
      }
    }
    if (progress.overall_percentage >= 70) {
      return {
        color: "from-yellow-50 to-amber-50",
        borderColor: "border-yellow-300",
        icon: <AlertTriangle className="h-6 w-6 text-yellow-600" />,
        text: "Buen progreso",
        textColor: "text-yellow-700"
      }
    }
    return {
      color: "from-red-50 to-rose-50",
      borderColor: "border-red-300",
      icon: <XCircle className="h-6 w-6 text-red-600" />,
      text: "Necesitas mejorar",
      textColor: "text-red-700"
    }
  }

  const status = getOverallStatus()

  return (
    <Card className={`${status.borderColor} border-2 bg-gradient-to-br ${status.color} shadow-lg`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Mis Metas del Mes
            </CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <Calendar className="h-3 w-3" />
              {monthNames[currentGoal.periodo_mes]} {currentGoal.periodo_anio}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {status.icon}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progreso General */}
        <div className="p-4 bg-white rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-slate-700">Progreso General</span>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{
                color: progress.overall_percentage >= 90 ? '#10b981' :
                       progress.overall_percentage >= 70 ? '#f59e0b' : '#ef4444'
              }}>
                {progress.overall_percentage}%
              </div>
              <div className={`text-sm font-medium ${status.textColor}`}>
                {status.text}
              </div>
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-4">
            <div 
              className="h-4 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.min(progress.overall_percentage, 100)}%`,
                backgroundColor: 
                  progress.overall_percentage >= 90 ? '#10b981' :
                  progress.overall_percentage >= 70 ? '#f59e0b' : '#ef4444'
              }}
            />
          </div>
        </div>

        {/* Métricas Individuales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Ventas */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-slate-700">Ventas</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>Actual</span>
                  <span>Meta</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-bold text-blue-600">
                    {formatCurrency(current_metrics.ventas_total)}
                  </span>
                  <span className="text-sm text-slate-500">
                    {formatCurrency(currentGoal.meta_ventas_total)}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div 
                  className="h-2.5 rounded-full bg-blue-600 transition-all duration-500"
                  style={{width: `${Math.min(progress.ventas_percentage, 100)}%`}}
                />
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-blue-600">{progress.ventas_percentage}%</span>
              </div>
            </div>
          </div>

          {/* Facturas */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm font-semibold text-slate-700">Facturas</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>Actual</span>
                  <span>Meta</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-bold text-green-600">
                    {current_metrics.facturas_cantidad}
                  </span>
                  <span className="text-sm text-slate-500">
                    {currentGoal.meta_facturas_cantidad}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div 
                  className="h-2.5 rounded-full bg-green-600 transition-all duration-500"
                  style={{width: `${Math.min(progress.facturas_percentage, 100)}%`}}
                />
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-green-600">{progress.facturas_percentage}%</span>
              </div>
            </div>
          </div>

          {/* Clientes Nuevos */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <span className="text-sm font-semibold text-slate-700">Clientes</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>Actual</span>
                  <span>Meta</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-bold text-purple-600">
                    {current_metrics.clientes_nuevos}
                  </span>
                  <span className="text-sm text-slate-500">
                    {currentGoal.meta_clientes_nuevos}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div 
                  className="h-2.5 rounded-full bg-purple-600 transition-all duration-500"
                  style={{width: `${Math.min(progress.clientes_percentage, 100)}%`}}
                />
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-purple-600">{progress.clientes_percentage}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notas del owner */}
        {currentGoal.notas && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Nota de tu supervisor:
              </strong>
              <span className="mt-1 block">{currentGoal.notas}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
