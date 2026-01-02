"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"

interface EmployeeGoal {
  id: string
  employee_id: string
  owner_id: string
  periodo_mes: number
  periodo_anio: number
  fecha_inicio: string
  fecha_fin: string
  meta_ventas_total: number
  meta_facturas_cantidad: number
  meta_clientes_nuevos: number
  notas: string | null
  is_active: boolean
}

interface EmployeeMetrics {
  ventas_total: number
  facturas_cantidad: number
  clientes_nuevos: number
}

interface GoalWithProgress extends EmployeeGoal {
  current_metrics: EmployeeMetrics
  progress: {
    ventas_percentage: number
    facturas_percentage: number
    clientes_percentage: number
    overall_percentage: number
  }
}

export function useEmployeeMetrics(employeeId?: string, ownerId?: string) {
  const [loading, setLoading] = useState(true)
  const [currentGoal, setCurrentGoal] = useState<GoalWithProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Obtener el mes y año actual
  const getCurrentPeriod = () => {
    const now = new Date()
    return {
      mes: now.getMonth() + 1,
      anio: now.getFullYear()
    }
  }

  const calculateProgress = useCallback((goal: EmployeeGoal, metrics: EmployeeMetrics): GoalWithProgress => {
    const ventas_percentage = goal.meta_ventas_total > 0 
      ? Math.round((metrics.ventas_total / goal.meta_ventas_total) * 100) 
      : 0
    
    const facturas_percentage = goal.meta_facturas_cantidad > 0 
      ? Math.round((metrics.facturas_cantidad / goal.meta_facturas_cantidad) * 100) 
      : 0
    
    const clientes_percentage = goal.meta_clientes_nuevos > 0 
      ? Math.round((metrics.clientes_nuevos / goal.meta_clientes_nuevos) * 100) 
      : 0

    // Calcular porcentaje general (promedio de los 3)
    const overall_percentage = Math.round(
      (ventas_percentage + facturas_percentage + clientes_percentage) / 3
    )

    return {
      ...goal,
      current_metrics: metrics,
      progress: {
        ventas_percentage,
        facturas_percentage,
        clientes_percentage,
        overall_percentage
      }
    }
  }, [])

  const loadCurrentGoalAndMetrics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Obtener el usuario actual si no se proporciona employeeId
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No hay sesión activa')
      }

      const targetEmployeeId = employeeId || session.user.id
      const { mes, anio } = getCurrentPeriod()

      // Obtener la meta del periodo actual
      const { data: goalData, error: goalError } = await supabase
        .from('employee_goals')
        .select('*')
        .eq('employee_id', targetEmployeeId)
        .eq('periodo_mes', mes)
        .eq('periodo_anio', anio)
        .eq('is_active', true)
        .single()

      if (goalError && goalError.code !== 'PGRST116') {
        // PGRST116 = no rows found, lo cual está bien
        throw goalError
      }

      if (!goalData) {
        // No hay meta establecida para este periodo
        setCurrentGoal(null)
        setLoading(false)
        return
      }

      // Obtener las métricas actuales
      const { data: metricsData, error: metricsError } = await supabase
        .rpc('get_employee_metrics', {
          p_employee_id: targetEmployeeId,
          p_owner_id: goalData.owner_id,
          p_fecha_inicio: goalData.fecha_inicio,
          p_fecha_fin: goalData.fecha_fin
        })

      if (metricsError) throw metricsError

      // Calcular progreso
      const goalWithProgress = calculateProgress(goalData, metricsData)
      setCurrentGoal(goalWithProgress)

    } catch (err: any) {
      console.error('Error loading employee metrics:', err)
      setError(err.message || 'Error al cargar métricas')
      setCurrentGoal(null)
    } finally {
      setLoading(false)
    }
  }, [employeeId, calculateProgress])

  useEffect(() => {
    loadCurrentGoalAndMetrics()

    // Recargar métricas cada 30 segundos para mostrar progreso en tiempo real
    const intervalId = setInterval(() => {
      loadCurrentGoalAndMetrics()
    }, 30000) // 30 segundos

    // Configurar suscripciones de forma asíncrona
    let invoicesSubscription: any
    let thermalReceiptsSubscription: any
    let clientsSubscription: any

    const setupSubscriptions = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const targetEmployeeId = employeeId || session?.user?.id

      if (targetEmployeeId) {
        // Suscribirse a cambios en invoices
        invoicesSubscription = supabase
          .channel('employee_invoices_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'invoices'
            },
            () => {
              // Recargar métricas cuando hay cambios
              loadCurrentGoalAndMetrics()
            }
          )
          .subscribe()

        // Suscribirse a cambios en thermal_receipts
        thermalReceiptsSubscription = supabase
          .channel('employee_thermal_receipts_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'thermal_receipts'
            },
            () => {
              // Recargar métricas cuando hay cambios en recibos térmicos
              loadCurrentGoalAndMetrics()
            }
          )
          .subscribe()

        // Suscribirse a cambios en clients
        clientsSubscription = supabase
          .channel('employee_clients_changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'clients'
            },
            () => {
              // Recargar métricas cuando se crea un cliente
              loadCurrentGoalAndMetrics()
            }
          )
          .subscribe()
      }
    }

    setupSubscriptions()

    // Cleanup
    return () => {
      clearInterval(intervalId)
      if (invoicesSubscription) {
        invoicesSubscription.unsubscribe()
      }
      if (thermalReceiptsSubscription) {
        thermalReceiptsSubscription.unsubscribe()
      }
      if (clientsSubscription) {
        clientsSubscription.unsubscribe()
      }
    }
  }, [loadCurrentGoalAndMetrics, employeeId])

  const refreshMetrics = () => {
    loadCurrentGoalAndMetrics()
  }

  return {
    currentGoal,
    loading,
    error,
    refreshMetrics,
    hasGoal: currentGoal !== null
  }
}

// Hook para que el owner obtenga todas las metas de sus empleados
export function useAllEmployeeGoals(ownerId?: string) {
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadAllGoals = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('No hay sesión activa')
      }

      const targetOwnerId = ownerId || session.user.id
      const { mes, anio } = { mes: new Date().getMonth() + 1, anio: new Date().getFullYear() }

      // Obtener todas las metas activas del periodo actual
      const { data: goalsData, error: goalsError } = await supabase
        .from('employee_goals')
        .select(`
          *,
          user_profiles!employee_goals_employee_id_fkey (
            display_name,
            email
          )
        `)
        .eq('owner_id', targetOwnerId)
        .eq('periodo_mes', mes)
        .eq('periodo_anio', anio)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (goalsError) throw goalsError

      if (!goalsData || goalsData.length === 0) {
        setGoals([])
        setLoading(false)
        return
      }

      // Obtener métricas para cada empleado
      const goalsWithProgress = await Promise.all(
        goalsData.map(async (goal) => {
          try {
            const { data: metricsData, error: metricsError } = await supabase
              .rpc('get_employee_metrics', {
                p_employee_id: goal.employee_id,
                p_owner_id: goal.owner_id,
                p_fecha_inicio: goal.fecha_inicio,
                p_fecha_fin: goal.fecha_fin
              })

            if (metricsError) throw metricsError

            const ventas_percentage = goal.meta_ventas_total > 0 
              ? Math.round((metricsData.ventas_total / goal.meta_ventas_total) * 100) 
              : 0
            
            const facturas_percentage = goal.meta_facturas_cantidad > 0 
              ? Math.round((metricsData.facturas_cantidad / goal.meta_facturas_cantidad) * 100) 
              : 0
            
            const clientes_percentage = goal.meta_clientes_nuevos > 0 
              ? Math.round((metricsData.clientes_nuevos / goal.meta_clientes_nuevos) * 100) 
              : 0

            const overall_percentage = Math.round(
              (ventas_percentage + facturas_percentage + clientes_percentage) / 3
            )

            return {
              ...goal,
              current_metrics: metricsData,
              progress: {
                ventas_percentage,
                facturas_percentage,
                clientes_percentage,
                overall_percentage
              }
            }
          } catch (err) {
            console.error('Error getting metrics for employee:', goal.employee_id, err)
            return {
              ...goal,
              current_metrics: { ventas_total: 0, facturas_cantidad: 0, clientes_nuevos: 0 },
              progress: { ventas_percentage: 0, facturas_percentage: 0, clientes_percentage: 0, overall_percentage: 0 }
            }
          }
        })
      )

      setGoals(goalsWithProgress)

    } catch (err: any) {
      console.error('Error loading all employee goals:', err)
      setError(err.message || 'Error al cargar metas')
      setGoals([])
    } finally {
      setLoading(false)
    }
  }, [ownerId])

  useEffect(() => {
    loadAllGoals()
  }, [loadAllGoals])

  const refreshGoals = () => {
    loadAllGoals()
  }

  return {
    goals,
    loading,
    error,
    refreshGoals
  }
}
