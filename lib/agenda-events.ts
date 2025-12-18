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