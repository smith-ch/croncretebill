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
      <Card className="border-slate-700 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    )
  }

  if (!hasGoal || !currentGoal) {
    return (
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-400">
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
        color: "from-green-950/40 to-emerald-950/20",
        borderColor: "border-green-900/50",
        icon: <CheckCircle className="h-6 w-6 text-green-500" />,
        text: "¡Excelente desempeño!",
        textColor: "text-green-400",
        progressColor: "#10b981"
      }
    }
    if (progress.overall_percentage >= 70) {
      return {
        color: "from-yellow-950/40 to-amber-950/20",
        borderColor: "border-yellow-900/50",
        icon: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
        text: "Buen progreso",
        textColor: "text-yellow-500",
        progressColor: "#f59e0b"
      }
    }
    return {
      color: "from-red-950/40 to-rose-950/20",
      borderColor: "border-red-900/50",
      icon: <XCircle className="h-6 w-6 text-red-500" />,
      text: "Necesitas mejorar",
      textColor: "text-red-400",
      progressColor: "#ef4444"
    }
  }

  const status = getOverallStatus()

  return (
    <Card className={`${status.borderColor} border bg-gradient-to-br ${status.color} shadow-lg`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Target className="h-5 w-5 text-blue-500" />
              Mis Metas del Mes
            </CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1 text-slate-400">
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
        <div className="p-4 bg-slate-900/80 rounded-lg shadow-sm border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-slate-300">Progreso General</span>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color: status.progressColor }}>
                {progress.overall_percentage}%
              </div>
              <div className={`text-sm font-medium ${status.textColor}`}>
                {status.text}
              </div>
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-4 border border-slate-700">
            <div
              className="h-4 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.min(progress.overall_percentage, 100)}%`,
                backgroundColor: status.progressColor
              }}
            />
          </div>
        </div>

        {/* Métricas Individuales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Ventas */}
          <div className="bg-slate-900/80 p-4 rounded-lg shadow-sm border border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
                <DollarSign className="h-4 w-4 text-blue-500" />
              </div>
              <span className="text-sm font-semibold text-slate-300">Ventas</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Actual</span>
                  <span>Meta</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-bold text-blue-500">
                    {formatCurrency(current_metrics.ventas_total)}
                  </span>
                  <span className="text-sm text-slate-500">
                    {formatCurrency(currentGoal.meta_ventas_total)}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 border border-slate-700">
                <div
                  className="h-2.5 rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${Math.min(progress.ventas_percentage, 100)}%` }}
                />
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-blue-500">{progress.ventas_percentage}%</span>
              </div>
            </div>
          </div>

          {/* Facturas */}
          <div className="bg-slate-900/80 p-4 rounded-lg shadow-sm border border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-green-900/20 rounded-lg border border-green-900/30">
                <FileText className="h-4 w-4 text-green-500" />
              </div>
              <span className="text-sm font-semibold text-slate-300">Facturas</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Actual</span>
                  <span>Meta</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-bold text-green-500">
                    {current_metrics.facturas_cantidad}
                  </span>
                  <span className="text-sm text-slate-500">
                    {currentGoal.meta_facturas_cantidad}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 border border-slate-700">
                <div
                  className="h-2.5 rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${Math.min(progress.facturas_percentage, 100)}%` }}
                />
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-green-500">{progress.facturas_percentage}%</span>
              </div>
            </div>
          </div>

          {/* Clientes Nuevos */}
          <div className="bg-slate-900/80 p-4 rounded-lg shadow-sm border border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-purple-900/20 rounded-lg border border-purple-900/30">
                <Users className="h-4 w-4 text-purple-500" />
              </div>
              <span className="text-sm font-semibold text-slate-300">Clientes</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Actual</span>
                  <span>Meta</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-bold text-purple-500">
                    {current_metrics.clientes_nuevos}
                  </span>
                  <span className="text-sm text-slate-500">
                    {currentGoal.meta_clientes_nuevos}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 border border-slate-700">
                <div
                  className="h-2.5 rounded-full bg-purple-500 transition-all duration-500"
                  style={{ width: `${Math.min(progress.clientes_percentage, 100)}%` }}
                />
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-purple-500">{progress.clientes_percentage}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notas del owner */}
        {currentGoal.notas && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
            <p className="text-sm text-blue-400">
              <strong className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Nota de tu supervisor:
              </strong>
              <span className="mt-1 block text-slate-400">{currentGoal.notas}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
