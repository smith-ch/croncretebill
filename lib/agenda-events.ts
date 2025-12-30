import { supabase } from './supabase'

export interface AgendaEvent {
  id: string
  user_id: string
  title: string
  description?: string
  due_date: string
  type: 'invoice' | 'expense' | 'payment' | 'reminder' | 'task'
  amount?: number
  status: 'pending' | 'completed' | 'overdue'
  priority: 'low' | 'medium' | 'high'
  created_at: string
  updated_at: string
}

export type CreateAgendaEvent = Omit<AgendaEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type UpdateAgendaEvent = Partial<CreateAgendaEvent>

/**
 * Get all agenda events for the current user
 */
export async function getAgendaEvents(): Promise<AgendaEvent[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('agenda_events')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true })

    if (error) {
      console.error('Error fetching agenda events:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getAgendaEvents:', error)
    throw error
  }
}

/**
 * Create a new agenda event
 */
export async function createAgendaEvent(event: CreateAgendaEvent): Promise<AgendaEvent> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('agenda_events')
      .insert({
        ...event,
        user_id: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating agenda event:', error)
      throw error
    }

    if (!data) {
      throw new Error('No data returned from insert')
    }

    return data
  } catch (error) {
    console.error('Error in createAgendaEvent:', error)
    throw error
  }
}

/**
 * Update an existing agenda event
 */
export async function updateAgendaEvent(id: string, updates: UpdateAgendaEvent): Promise<AgendaEvent> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('agenda_events')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating agenda event:', error)
      throw error
    }

    if (!data) {
      throw new Error('No data returned from update')
    }

    return data
  } catch (error) {
    console.error('Error in updateAgendaEvent:', error)
    throw error
  }
}

/**
 * Delete an agenda event
 */
export async function deleteAgendaEvent(id: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { error } = await supabase
      .from('agenda_events')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting agenda event:', error)
      throw error
    }

    return true
  } catch (error) {
    console.error('Error in deleteAgendaEvent:', error)
    throw error
  }
}

/**
 * Mark an agenda event as completed
 */
export async function markAgendaEventCompleted(id: string): Promise<AgendaEvent> {
  return updateAgendaEvent(id, { status: 'completed' })
}

/**
 * Update agenda events status based on due dates
 */
export async function updateOverdueEvents(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) {
      throw new Error('User not authenticated')
    }

    const today = new Date().toISOString().split('T')[0]

    const { error } = await supabase
      .from('agenda_events')
      .update({ status: 'overdue' })
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .lt('due_date', today)

    if (error) {
      console.error('Error updating overdue events:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in updateOverdueEvents:', error)
    throw error
  }
}

/**
 * Limpia duplicados de eventos de gastos fijos
 */
async function cleanDuplicateFixedExpenseEvents(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return

    // Obtener todos los eventos de tipo expense
    const { data: events } = await supabase
      .from('agenda_events')
      .select('id, title, due_date, amount, created_at')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .order('created_at', { ascending: true })

    if (!events || events.length === 0) return

    // Identificar duplicados (mismos: title, due_date, amount)
    const seen = new Map<string, string>() // key -> id del primero
    const duplicateIds: string[] = []

    for (const event of events) {
      const key = `${event.title}-${event.due_date}-${event.amount || 0}`
      
      if (seen.has(key)) {
        // Es duplicado, marcar para eliminar
        duplicateIds.push(event.id)
      } else {
        // Es el primero con esta combinación
        seen.set(key, event.id)
      }
    }

    // Eliminar duplicados
    if (duplicateIds.length > 0) {
      const { error } = await supabase
        .from('agenda_events')
        .delete()
        .in('id', duplicateIds)

      if (!error) {
        console.log(`🧹 Eliminados ${duplicateIds.length} eventos duplicados`)
      }
    }
  } catch (error) {
    console.error('Error cleaning duplicates:', error)
  }
}

/**
 * Generate agenda events from fixed expenses for current and future months
 * This ensures fixed expenses appear automatically in the agenda without manual input
 * Generates events for 12 months by default to ensure continuous visibility
 */
export async function generateFixedExpenseEvents(monthsAhead: number = 12): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) {
      throw new Error('User not authenticated')
    }

    // PASO 1: Limpiar duplicados existentes primero
    await cleanDuplicateFixedExpenseEvents()

    // Get all active fixed expenses
    const { data: fixedExpenses, error: fetchError } = await supabase
      .from('fixed_expenses')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (fetchError) {
      console.error('Error fetching fixed expenses:', fetchError)
      throw fetchError
    }

    if (!fixedExpenses || fixedExpenses.length === 0) {
      return
    }

    // Get existing agenda events to avoid duplicates
    const today = new Date()
    const futureDate = new Date()
    futureDate.setMonth(futureDate.getMonth() + monthsAhead + 1)

    const { data: existingEvents, error: eventsError } = await supabase
      .from('agenda_events')
      .select('title, due_date, amount')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('due_date', today.toISOString().split('T')[0])
      .lte('due_date', futureDate.toISOString().split('T')[0])

    if (eventsError) {
      console.error('Error fetching existing events:', eventsError)
      throw eventsError
    }

    // Crear set con clave robusta: título-fecha-monto
    const existingEventKeys = new Set(
      (existingEvents || []).map(e => `${e.title}-${e.due_date}-${e.amount || 0}`)
    )

    const eventsToCreate: CreateAgendaEvent[] = []

    // For each fixed expense, generate events for current and future months
    for (const expense of fixedExpenses) {
      let currentDate = new Date(expense.due_date)
      
      // Make sure we start from the current or next payment date
      while (currentDate < today) {
        switch (expense.frequency) {
          case 'monthly':
            currentDate.setMonth(currentDate.getMonth() + 1)
            break
          case 'quarterly':
            currentDate.setMonth(currentDate.getMonth() + 3)
            break
          case 'annually':
            currentDate.setFullYear(currentDate.getFullYear() + 1)
            break
        }
      }

      // Generate events for the specified months ahead
      let monthsGenerated = 0
      const maxIterations = 20

      while (monthsGenerated <= monthsAhead && maxIterations > 0) {
        const eventDate = currentDate.toISOString().split('T')[0]
        const eventKey = `${expense.name}-${eventDate}-${expense.amount}`

        // Only create if doesn't exist
        if (!existingEventKeys.has(eventKey)) {
          eventsToCreate.push({
            title: expense.name,
            description: `Gasto fijo ${expense.frequency === 'monthly' ? 'mensual' : expense.frequency === 'quarterly' ? 'trimestral' : 'anual'}${expense.category ? ` - ${expense.category}` : ''}`,
            due_date: eventDate,
            type: 'expense',
            amount: expense.amount,
            status: 'pending',
            priority: 'high',
          })
          
          // Agregar al set para evitar duplicados en esta misma ejecución
          existingEventKeys.add(eventKey)
        }

        // Move to next occurrence
        switch (expense.frequency) {
          case 'monthly':
            currentDate.setMonth(currentDate.getMonth() + 1)
            monthsGenerated += 1
            break
          case 'quarterly':
            currentDate.setMonth(currentDate.getMonth() + 3)
            monthsGenerated += 3
            break
          case 'annually':
            currentDate.setFullYear(currentDate.getFullYear() + 1)
            monthsGenerated += 12
            break
        }
      }
    }

    // Bulk insert new events (solo si hay eventos nuevos)
    if (eventsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('agenda_events')
        .insert(eventsToCreate.map(event => ({
          ...event,
          user_id: user.id
        })))

      if (insertError) {
        console.error('Error creating fixed expense events:', insertError)
        throw insertError
      }

      console.log(`✅ Creados ${eventsToCreate.length} nuevos eventos de gastos fijos`)
    }
  } catch (error) {
    console.error('Error in generateFixedExpenseEvents:', error)
    throw error
  }
}