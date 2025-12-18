"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { offlineCache } from '@/lib/offline-cache'

export interface Category {
  id: string
  user_id: string
  name: string
  description?: string | null
  color: string
  icon: string
  type: 'product' | 'service' | 'both'
  is_active: boolean
  created_at: string
  updated_at: string
}

interface UseCategoriesReturn {
  categories: Category[]
  loading: boolean
  error: string | null
  createCategory: (category: Omit<Category, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Category | null>
  updateCategory: (id: string, updates: Partial<Category>) => Promise<boolean>
  deleteCategory: (id: string) => Promise<boolean>
  refreshCategories: () => Promise<void>
  getProductCategories: () => Category[]
  getServiceCategories: () => Category[]
}

export function useCategories(type?: 'product' | 'service' | 'both'): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) {
        setLoading(false)
        return
      }

      try {
        let query = (supabase as any)
          .from('categories')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('name', { ascending: true })

        // Filter by type if specified
        if (type && type !== 'both') {
          query = query.or(`type.eq.${type},type.eq.both`)
        }

        const { data, error: fetchError } = await query

        if (fetchError) {
          if (fetchError.code === '42P01') {
            // Table doesn't exist - try cache
            const cached = await offlineCache.getAll<Category>('categories', user.id)
            setCategories(cached || [])
            setError('Usando categorías guardadas')
            setLoading(false)
            return
          }
          throw fetchError
        }

        setCategories(data || [])
        
        // Save to cache
        if (data) {
          for (const category of data) {
            await offlineCache.set('categories', category.id, category, user.id, 'VERY_LONG')
          }
        }
        
        // If no categories exist, try to create defaults
        if ((!data || data.length === 0) && typeof window !== 'undefined') {
          // Only try to create defaults in browser environment and if no filter is applied
          if (!type || type === 'both') {
            try {
              const { createDefaultCategories } = await import('../lib/categories-init')
              await createDefaultCategories(user.id)
              // Refetch after creating defaults
              const { data: newData } = await query
              setCategories(newData || [])
            } catch (defaultError) {
              console.log('Could not create default categories:', defaultError)
            }
          }
        }
      } catch (fetchError) {
        // Network error - use cache
        console.log('Fetch failed, loading from cache:', fetchError)
        const cached = await offlineCache.getAll<Category>('categories', user.id)
        if (cached && cached.length > 0) {
          setCategories(cached)
          setError('Usando categorías offline')
        } else {
          setError('No hay categorías disponibles offline')
          setCategories([])
        }
      }
    } catch (err) {
      console.error('Error fetching categories:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const createCategory = async (categoryData: Omit<Category, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Category | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // Check if category with same name already exists and create unique name if needed
      let finalName = categoryData.name
      let counter = 1
      
      while (true) {
        const { data: existingCategories } = await (supabase as any)
          .from('categories')
          .select('name')
          .eq('user_id', user.id)
          .eq('name', finalName)
          .eq('is_active', true)

        if (!existingCategories || existingCategories.length === 0) {
          break
        }
        
        counter++
        finalName = `${categoryData.name} (${counter})`
        
        if (counter > 10) {
          throw new Error(`No se pudo crear una categoría única con el nombre "${categoryData.name}"`)
        }
      }

      const { data, error: insertError } = await (supabase as any)
        .from('categories')
        .insert({
          ...categoryData,
          name: finalName,
          user_id: user.id
        })
        .select()
        .single()

      if (insertError) {
        if (insertError.code === '23505') { // unique_violation
          throw new Error(`Ya existe una categoría llamada "${finalName}"`)
        }
        if (insertError.code === '42P01') { // table doesn't exist
          throw new Error(`La tabla de categorías no existe. Por favor, ejecute las migraciones de base de datos.`)
        }
        throw insertError
      }

      // Update local state
      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      return data
    } catch (err) {
      console.error('Error creating category:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error creando categoría'
      setError(errorMessage)
      
      // Show user-friendly error message
      if (typeof window !== 'undefined') {
        alert(errorMessage)
      }
      
      return null
    }
  }

  const updateCategory = async (id: string, updates: Partial<Category>): Promise<boolean> => {
    try {
      const { error: updateError } = await (supabase as any)
        .from('categories')
        .update(updates)
        .eq('id', id)

      if (updateError) {
        throw updateError
      }

      // Update local state
      setCategories(prev => 
        prev.map(cat => 
          cat.id === id ? { ...cat, ...updates } : cat
        ).sort((a, b) => a.name.localeCompare(b.name))
      )
      return true
    } catch (err) {
      console.error('Error updating category:', err)
      setError(err instanceof Error ? err.message : 'Error actualizando categoría')
      return false
    }
  }

  const deleteCategory = async (id: string): Promise<boolean> => {
    try {
      // Soft delete - mark as inactive
      const { error: deleteError } = await (supabase as any)
        .from('categories')
        .update({ is_active: false })
        .eq('id', id)

      if (deleteError) {
        throw deleteError
      }

      // Update local state
      setCategories(prev => prev.filter(cat => cat.id !== id))
      return true
    } catch (err) {
      console.error('Error deleting category:', err)
      setError(err instanceof Error ? err.message : 'Error eliminando categoría')
      return false
    }
  }

  const refreshCategories = async () => {
    await fetchCategories()
  }

  const getProductCategories = (): Category[] => {
    return categories.filter(cat => cat.type === 'product' || cat.type === 'both')
  }

  const getServiceCategories = (): Category[] => {
    return categories.filter(cat => cat.type === 'service' || cat.type === 'both')
  }

  useEffect(() => {
    fetchCategories()
  }, [type]) // fetchCategories is stable and doesn't need to be in deps

  return {
    categories,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    refreshCategories,
    getProductCategories,
    getServiceCategories
  }
}