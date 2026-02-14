"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Target, DollarSign, FileText, Users, Plus, Edit2, Trash2, Loader2, Calendar, CheckCircle, AlertTriangle, XCircle } from "lucide-react"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import { useAllEmployeeGoals } from "@/hooks/use-employee-metrics"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useCurrency } from "@/hooks/use-currency"
import type { Database } from "@/types/database"

type EmployeeGoalInsert = Database['public']['Tables']['employee_goals']['Insert']
type EmployeeGoalUpdate = Database['public']['Tables']['employee_goals']['Update']

interface Employee {
  id: string
  user_id: string
  email: string
  display_name: string
}

interface GoalForm {
  employee_id: string
  meta_ventas_total: string
  meta_facturas_cantidad: string
  meta_clientes_nuevos: string
  notas: string
}

export default function EmployeeGoalsPage() {
  const { permissions } = useUserPermissions()
  const { goals, loading: goalsLoading, refreshGoals } = useAllEmployeeGoals()
  const { toast } = useToast()
  const { formatCurrency } = useCurrency()
  
  // Debug logging
  useEffect(() => {
    console.log('📋 Goals state:', { goals, goalsLoading, goalsCount: goals?.length })
  }, [goals, goalsLoading])
  
  const [employees, setEmployees] = useState<Employee[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<string | null>(null)
  
  const [goalForm, setGoalForm] = useState<GoalForm>({
    employee_id: "",
    meta_ventas_total: "",
    meta_facturas_cantidad: "",
    meta_clientes_nuevos: "",
    notas: ""
  })

  useEffect(() => {
    if (permissions.isOwner) {
      loadEmployees()
    }
  }, [permissions.isOwner]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadEmployees = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        return
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, user_id, email, display_name')
        .eq('parent_user_id', session.user.id)
        .eq('is_active', true)
        .order('display_name')

      if (error) {
        throw error
      }
      setEmployees(data || [])
    } catch (error: any) {
      console.error('Error loading employees:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los empleados",
        variant: "destructive"
      })
    } finally {
      // Loading is done
    }
  }

  const getCurrentPeriod = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    
    // Primer y último día del mes
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    
    return {
      mes: month,
      anio: year,
      fecha_inicio: firstDay.toISOString().split('T')[0],
      fecha_fin: lastDay.toISOString().split('T')[0]
    }
  }

  const handleSubmit = async () => {
    if (!goalForm.employee_id) {
      toast({
        title: "Error",
        description: "Selecciona un empleado",
        variant: "destructive"
      })
      return
    }

    try {
      setSubmitting(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No hay sesión activa')
      }

      const period = getCurrentPeriod()
      
      const goalData: EmployeeGoalUpdate = {
        meta_ventas_total: parseFloat(goalForm.meta_ventas_total) || 0,
        meta_facturas_cantidad: parseInt(goalForm.meta_facturas_cantidad) || 0,
        meta_clientes_nuevos: parseInt(goalForm.meta_clientes_nuevos) || 0,
        notas: goalForm.notas || null
      }

      if (editingGoal) {
        // Actualizar meta existente
        const { error } = await (supabase as any)
          .from('employee_goals')
          .update(goalData)
          .eq('id', editingGoal)

        if (error) {
          throw error
        }

        toast({
          title: "Meta actualizada",
          description: "La meta del empleado se actualizó exitosamente"
        })
      } else {
        // Crear nueva meta
        const insertData: EmployeeGoalInsert = {
          employee_id: goalForm.employee_id,
          owner_id: session.user.id,
          periodo_mes: period.mes,
          periodo_anio: period.anio,
          fecha_inicio: period.fecha_inicio,
          fecha_fin: period.fecha_fin,
          meta_ventas_total: parseFloat(goalForm.meta_ventas_total) || 0,
          meta_facturas_cantidad: parseInt(goalForm.meta_facturas_cantidad) || 0,
          meta_clientes_nuevos: parseInt(goalForm.meta_clientes_nuevos) || 0,
          notas: goalForm.notas || null,
          is_active: true
        }
        
        const { error } = await (supabase as any)
          .from('employee_goals')
          .insert(insertData)

        if (error) {
          throw error
        }

        toast({
          title: "Meta creada",
          description: "La meta del empleado se creó exitosamente"
        })
      }

      // Resetear formulario
      setGoalForm({
        employee_id: "",
        meta_ventas_total: "",
        meta_facturas_cantidad: "",
        meta_clientes_nuevos: "",
        notas: ""
      })
      setShowForm(false)
      setEditingGoal(null)
      
      console.log('✅ Goal saved, refreshing goals list...')
      refreshGoals()

    } catch (error: any) {
      console.error('Error saving goal:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la meta",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (goal: any) => {
    setGoalForm({
      employee_id: goal.employee_id,
      meta_ventas_total: goal.meta_ventas_total.toString(),
      meta_facturas_cantidad: goal.meta_facturas_cantidad.toString(),
      meta_clientes_nuevos: goal.meta_clientes_nuevos.toString(),
      notas: goal.notas || ""
    })
    setEditingGoal(goal.id)
    setShowForm(true)
  }

  const handleDelete = async (goalId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta meta?')) {
      return
    }

    try {
      const { error } = await (supabase as any)
        .from('employee_goals')
        .delete()
        .eq('id', goalId)

      if (error) {
        throw error
      }

      toast({
        title: "Meta eliminada",
        description: "La meta se eliminó exitosamente"
      })
      refreshGoals()
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la meta",
        variant: "destructive"
      })
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) {
      return "text-green-600 bg-green-900/30"
    }
    if (percentage >= 70) {
      return "text-yellow-600 bg-yellow-50"
    }
    return "text-red-600 bg-red-900/30"
  }

  const getProgressIcon = (percentage: number) => {
    if (percentage >= 90) {
      return <CheckCircle className="h-5 w-5 text-green-600" />
    }
    if (percentage >= 70) {
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />
    }
    return <XCircle className="h-5 w-5 text-red-600" />
  }

  if (!permissions.isOwner) {
    return (
      <div className="container max-w-6xl mx-auto py-8">
        <Card className="border-red-800 bg-red-900/30">
          <CardContent className="p-6">
            <p className="text-red-600">Solo los propietarios pueden gestionar metas de empleados.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const period = getCurrentPeriod()
  const monthNames = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

  return (
    <div className="container max-w-7xl mx-auto py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Target className="h-8 w-8 text-blue-600" />
          Metas de Empleados
        </h1>
        <p className="text-slate-400">
          Establece y monitorea las metas mensuales de tu equipo
        </p>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Calendar className="h-4 w-4" />
          <span>Periodo actual: {monthNames[period.mes]} {period.anio}</span>
        </div>
      </div>

      {/* Botón para mostrar formulario */}
      {!showForm && (
        <Button onClick={() => setShowForm(true)} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Establecer Nueva Meta
        </Button>
      )}

      {/* Formulario de meta */}
      {showForm && (
        <Card className="border-slate-700 bg-slate-900/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {editingGoal ? 'Editar Meta' : 'Nueva Meta del Mes'}
            </CardTitle>
            <CardDescription>
              {monthNames[period.mes]} {period.anio} ({period.fecha_inicio} al {period.fecha_fin})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Empleado *</Label>
              <select
                value={goalForm.employee_id}
                onChange={(e) => setGoalForm({...goalForm, employee_id: e.target.value})}
                disabled={editingGoal !== null}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Selecciona un empleado</option>
                {employees.map(emp => (
                  <option key={emp.user_id} value={emp.user_id}>
                    {emp.display_name} ({emp.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Meta de Ventas
                </Label>
                <Input
                  type="number"
                  placeholder="50000.00"
                  value={goalForm.meta_ventas_total}
                  onChange={(e) => setGoalForm({...goalForm, meta_ventas_total: e.target.value})}
                />
                <p className="text-xs text-slate-500">Ingresos totales esperados</p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Meta de Facturas
                </Label>
                <Input
                  type="number"
                  placeholder="20"
                  value={goalForm.meta_facturas_cantidad}
                  onChange={(e) => setGoalForm({...goalForm, meta_facturas_cantidad: e.target.value})}
                />
                <p className="text-xs text-slate-500">Cantidad de facturas</p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Meta de Clientes
                </Label>
                <Input
                  type="number"
                  placeholder="5"
                  value={goalForm.meta_clientes_nuevos}
                  onChange={(e) => setGoalForm({...goalForm, meta_clientes_nuevos: e.target.value})}
                />
                <p className="text-xs text-slate-500">Clientes nuevos</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                placeholder="Objetivos específicos, prioridades, etc."
                value={goalForm.notas}
                onChange={(e) => setGoalForm({...goalForm, notas: e.target.value})}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    {editingGoal ? 'Actualizar Meta' : 'Crear Meta'}
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowForm(false)
                  setEditingGoal(null)
                  setGoalForm({
                    employee_id: "",
                    meta_ventas_total: "",
                    meta_facturas_cantidad: "",
                    meta_clientes_nuevos: "",
                    notas: ""
                  })
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de metas con progreso */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Metas del Periodo Actual</h2>
        
        {goalsLoading ? (
          <Card>
            <CardContent className="p-8 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </CardContent>
          </Card>
        ) : goals.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay metas establecidas para este periodo</p>
              <p className="text-sm mt-1">Crea una nueva meta para comenzar</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {goals.map((goal) => (
              <Card key={goal.id} className="border-l-4" style={{
                borderLeftColor: 
                  goal.progress.overall_percentage >= 90 ? '#10b981' :
                  goal.progress.overall_percentage >= 70 ? '#f59e0b' : '#ef4444'
              }}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {goal.user_profiles?.display_name || 'Empleado'}
                        {getProgressIcon(goal.progress.overall_percentage)}
                      </CardTitle>
                      <CardDescription>{goal.user_profiles?.email}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(goal)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600"
                        onClick={() => handleDelete(goal.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progreso General */}
                  <div className={`p-4 rounded-lg ${getProgressColor(goal.progress.overall_percentage)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">Progreso General</span>
                      <span className="text-2xl font-bold">{goal.progress.overall_percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-800/50 rounded-full h-3">
                      <div 
                        className="h-3 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(goal.progress.overall_percentage, 100)}%`,
                          backgroundColor: 
                            goal.progress.overall_percentage >= 90 ? '#10b981' :
                            goal.progress.overall_percentage >= 70 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                  </div>

                  {/* Detalles de cada métrica */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Ventas */}
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Ventas</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Actual:</span>
                          <span className="font-semibold">{formatCurrency(goal.current_metrics.ventas_total)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Meta:</span>
                          <span>{formatCurrency(goal.meta_ventas_total)}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                          <div 
                            className="h-2 rounded-full bg-blue-600"
                            style={{width: `${Math.min(goal.progress.ventas_percentage, 100)}%`}}
                          />
                        </div>
                        <div className="text-right text-xs font-medium text-blue-600">
                          {goal.progress.ventas_percentage}%
                        </div>
                      </div>
                    </div>

                    {/* Facturas */}
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Facturas</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Actual:</span>
                          <span className="font-semibold">{goal.current_metrics.facturas_cantidad}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Meta:</span>
                          <span>{goal.meta_facturas_cantidad}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                          <div 
                            className="h-2 rounded-full bg-green-600"
                            style={{width: `${Math.min(goal.progress.facturas_percentage, 100)}%`}}
                          />
                        </div>
                        <div className="text-right text-xs font-medium text-green-600">
                          {goal.progress.facturas_percentage}%
                        </div>
                      </div>
                    </div>

                    {/* Clientes */}
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium">Clientes</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Actual:</span>
                          <span className="font-semibold">{goal.current_metrics.clientes_nuevos}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Meta:</span>
                          <span>{goal.meta_clientes_nuevos}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                          <div 
                            className="h-2 rounded-full bg-purple-600"
                            style={{width: `${Math.min(goal.progress.clientes_percentage, 100)}%`}}
                          />
                        </div>
                        <div className="text-right text-xs font-medium text-purple-600">
                          {goal.progress.clientes_percentage}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notas */}
                  {goal.notas && (
                    <div className="p-3 bg-slate-900 rounded-lg">
                      <p className="text-sm text-slate-300"><strong>Notas:</strong> {goal.notas}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
