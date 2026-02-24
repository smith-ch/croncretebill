'use client'

import { useState, useEffect, useContext, createContext, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface UserProfile {
  profile_id: string
  user_id: string
  parent_user_id: string | null
  role_name: string
  display_name: string
  department: string | null
  position: string | null
  permissions: Record<string, any>
  is_owner: boolean
  allowed_modules: string[]
  restrictions: Record<string, any>
}

interface UserPermissionsContextType {
  profile: UserProfile | null
  loading: boolean
  error: string | null
  hasPermission: (module: string, action: string) => boolean
  canAccess: (module: string) => boolean
  isOwner: boolean
  refreshProfile: () => Promise<void>
}

const UserPermissionsContext = createContext<UserPermissionsContextType | undefined>(undefined)

export function UserPermissionsProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) {
        setProfile(null)
        return
      }

      const { data, error } = await supabase
        .rpc('get_user_profile', { user_uuid: user.id })

      if (error) {
        throw error
      }

      if (data && data.length > 0) {
        setProfile(data[0])
      } else {
        // Si no hay perfil, crear uno básico de propietario
        setProfile({
          profile_id: '',
          user_id: user.id,
          parent_user_id: null,
          role_name: 'owner',
          display_name: user.email?.split('@')[0] || 'Usuario',
          department: null,
          position: null,
          permissions: { all: true },
          is_owner: true,
          allowed_modules: ['all'],
          restrictions: {}
        })
      }
    } catch (err: any) {
      console.error('Error fetching user profile:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const hasPermission = (module: string, action: string): boolean => {
    if (!profile) return false
    
    // Los propietarios tienen todos los permisos
    if (profile.is_owner || profile.permissions?.all) {
      return true
    }

    // Verificar permisos específicos del módulo
    const modulePerms = profile.permissions?.[module]
    if (modulePerms && typeof modulePerms === 'object') {
      return modulePerms[action] === true
    }

    return false
  }

  const canAccess = (module: string): boolean => {
    if (!profile) return false
    
    // Los propietarios pueden acceder a todo
    if (profile.is_owner || profile.allowed_modules.includes('all')) {
      return true
    }

    // Verificar módulos permitidos
    return profile.allowed_modules.includes(module)
  }

  const refreshProfile = async () => {
    setLoading(true)
    await fetchUserProfile()
  }

  useEffect(() => {
    fetchUserProfile()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        fetchUserProfile()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const value: UserPermissionsContextType = {
    profile,
    loading,
    error,
    hasPermission,
    canAccess,
    isOwner: profile?.is_owner || false,
    refreshProfile
  }

  return (
    <UserPermissionsContext.Provider value={value}>
      {children}
    </UserPermissionsContext.Provider>
  )
}

export function useUserPermissions() {
  const context = useContext(UserPermissionsContext)
  if (context === undefined) {
    throw new Error('useUserPermissions must be used within a UserPermissionsProvider')
  }
  return context
}