"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Hook que devuelve el user_id correcto para consultas de datos
 * - Si el usuario es owner: devuelve su propio user_id
 * - Si el usuario es empleado: devuelve el user_id de su owner (parent_user_id)
 * 
 * Esto permite que los empleados vean los datos de su owner automáticamente
 */
export function useDataUserId() {
  const [dataUserId, setDataUserId] = useState<string | null>(null)
  const [isEmployee, setIsEmployee] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDataUserId()
  }, [])

  const loadDataUserId = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      
      if (!user) {
        setDataUserId(null)
        setLoading(false)
        return
      }

      // Consultar el perfil del usuario
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_id, parent_user_id, is_active')
        .eq('user_id', user.id)
        .single()

      if (profile) {
        if (profile.parent_user_id !== null && profile.is_active) {
          // ES EMPLEADO: usar el user_id del owner
          setDataUserId(profile.parent_user_id)
          setIsEmployee(true)
          console.log('📊 useDataUserId: Empleado detectado, usando datos del owner:', profile.parent_user_id)
        } else {
          // ES OWNER: usar su propio user_id
          setDataUserId(user.id)
          setIsEmployee(false)
          console.log('📊 useDataUserId: Owner detectado, usando sus propios datos:', user.id)
        }
      } else {
        // Fallback: usar el user_id del usuario actual
        setDataUserId(user.id)
        setIsEmployee(false)
      }
    } catch (error) {
      console.error('Error loading data user_id:', error)
      // En caso de error, usar el user_id del usuario actual
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setDataUserId(session.user.id)
      }
    } finally {
      setLoading(false)
    }
  }

  return {
    dataUserId,      // El user_id a usar en las consultas .eq('user_id', dataUserId)
    isEmployee,      // true si es empleado, false si es owner
    loading          // true mientras se carga
  }
}
