import { supabase } from './supabase'

export async function initializeCategoriesTable() {
  try {
    // Try to query the categories table to see if it exists
    const { error: testError } = await (supabase as any)
      .from('categories')
      .select('id')
      .limit(1)

    if (testError && testError.code === '42P01') {
      console.log('Categories table does not exist, attempting to create...')
      
      // Table doesn't exist, we need to create it manually
      // This is a fallback - ideally the migration should be run through Supabase dashboard
      throw new Error(
        'La tabla de categorías no existe. Por favor:\n' +
        '1. Ve al panel de Supabase\n' +
        '2. Ve a SQL Editor\n' +
        '3. Ejecuta el script scripts/simple_categories.sql\n' +
        '4. Recarga la página'
      )
    }

    // If we get here, the table exists
    return true
  } catch (error) {
    console.error('Error checking categories table:', error)
    throw error
  }
}

export async function createDefaultCategories(userId: string) {
  const defaultCategories = [
    {
      name: 'General',
      description: 'Categoría general para productos y servicios',
      color: '#6B7280',
      icon: 'folder',
      type: 'both' as const
    },
    {
      name: 'Materiales',
      description: 'Materiales de construcción y suministros',
      color: '#EF4444',
      icon: 'package',
      type: 'product' as const
    },
    {
      name: 'Herramientas',
      description: 'Herramientas y equipos',
      color: '#F59E0B',
      icon: 'wrench',
      type: 'product' as const
    },
    {
      name: 'Servicios Técnicos',
      description: 'Servicios técnicos especializados',
      color: '#10B981',
      icon: 'settings',
      type: 'service' as const
    },
    {
      name: 'Consultoría',
      description: 'Servicios de consultoría y asesoría',
      color: '#3B82F6',
      icon: 'user-check',
      type: 'service' as const
    },
    {
      name: 'Mantenimiento',
      description: 'Servicios de mantenimiento',
      color: '#8B5CF6',
      icon: 'tool',
      type: 'service' as const
    }
  ]

  try {
    // Check if user already has categories
    const { data: existing } = await (supabase as any)
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if (existing && existing.length > 0) {
      return // User already has categories
    }

    // Create default categories
    const categoriesToInsert = defaultCategories.map(cat => ({
      ...cat,
      user_id: userId
    }))

    const { error } = await (supabase as any)
      .from('categories')
      .insert(categoriesToInsert)

    if (error) {
      console.error('Error creating default categories:', error)
      throw error
    }

    console.log('Default categories created successfully')
  } catch (error) {
    console.error('Error in createDefaultCategories:', error)
    throw error
  }
}