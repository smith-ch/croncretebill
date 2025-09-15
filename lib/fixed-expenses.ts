import { supabase } from '@/lib/supabase'
import { FixedExpense } from '@/types'

export async function getFixedExpenses(): Promise<FixedExpense[]> {
  try {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .select('*')
      .order('next_payment', { ascending: true })

    if (error) {
      console.error('Error fetching fixed expenses:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getFixedExpenses:', error)
    return []
  }
}

export async function createFixedExpense(expense: Omit<FixedExpense, 'id' | 'created_at' | 'updated_at'>): Promise<FixedExpense | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('fixed_expenses')
      .insert([{
        ...expense,
        user_id: user.id
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating fixed expense:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in createFixedExpense:', error)
    return null
  }
}

export async function updateFixedExpense(id: string, updates: Partial<FixedExpense>): Promise<FixedExpense | null> {
  try {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating fixed expense:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in updateFixedExpense:', error)
    return null
  }
}

export async function deleteFixedExpense(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('fixed_expenses')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting fixed expense:', error)
      throw error
    }

    return true
  } catch (error) {
    console.error('Error in deleteFixedExpense:', error)
    return false
  }
}

export async function toggleFixedExpenseStatus(id: string): Promise<FixedExpense | null> {
  try {
    // First get the current status
    const { data: currentExpense, error: fetchError } = await supabase
      .from('fixed_expenses')
      .select('is_active')
      .eq('id', id)
      .single()

    if (fetchError || !currentExpense) {
      console.error('Error fetching current expense:', fetchError)
      return null
    }

    // Toggle the status
    const { data, error } = await supabase
      .from('fixed_expenses')
      .update({ is_active: !currentExpense.is_active })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error toggling fixed expense status:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in toggleFixedExpenseStatus:', error)
    return null
  }
}

export function calculateNextPayment(dueDate: string, frequency: 'monthly' | 'quarterly' | 'annually'): string {
  const due = new Date(dueDate)
  const today = new Date()
  
  // If due date is in the future, return it
  if (due > today) {
    return dueDate
  }
  
  // Calculate next payment based on frequency
  while (due <= today) {
    switch (frequency) {
      case 'monthly':
        due.setMonth(due.getMonth() + 1)
        break
      case 'quarterly':
        due.setMonth(due.getMonth() + 3)
        break
      case 'annually':
        due.setFullYear(due.getFullYear() + 1)
        break
    }
  }
  
  return due.toISOString().split('T')[0]
}