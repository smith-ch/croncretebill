"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface UserPermissions {
  // Identificación
  userId: string
  parentUserId: string | null
  rootOwnerId: string
  isOwner: boolean
  displayName: string
  role: string
  
  // Permisos generales
  canCreateInvoices: boolean
  canViewFinances: boolean  
  canManageInventory: boolean
  canManageClients: boolean
  canManageEmployees: boolean
  maxInvoiceAmount: number | null
  
  // Permisos de edición
  canEditInvoices: boolean
  canEditClients: boolean
  canEditProducts: boolean
  canEditServices: boolean
  canEditProjects: boolean
  canEditVehicles: boolean
  canEditThermalReceipts: boolean
  canEditAgendaEvents: boolean
  canEditExpenses: boolean
  
  // Permisos de eliminación
  canDeleteInvoices: boolean
  canDeleteClients: boolean
  canDeleteProducts: boolean
  canDeleteServices: boolean
  canDeleteProjects: boolean
  canDeleteVehicles: boolean
  canDeleteThermalReceipts: boolean
  canDeleteAgendaEvents: boolean
  canDeleteExpenses: boolean
}

const DEFAULT_OWNER_PERMISSIONS: UserPermissions = {
  userId: '',
  parentUserId: null,
  rootOwnerId: '',
  isOwner: true,
  displayName: 'Propietario',
  role: 'owner',
  canCreateInvoices: true,
  canViewFinances: true,
  canManageInventory: true,
  canManageClients: true,
  canManageEmployees: true,
  maxInvoiceAmount: null,
  canEditInvoices: true,
  canEditClients: true,
  canEditProducts: true,
  canEditServices: true,
  canEditProjects: true,
  canEditVehicles: true,
  canEditThermalReceipts: true,
  canEditAgendaEvents: true,
  canEditExpenses: true,
  canDeleteInvoices: true,
  canDeleteClients: true,
  canDeleteProducts: true,
  canDeleteServices: true,
  canDeleteProjects: true,
  canDeleteVehicles: true,
  canDeleteThermalReceipts: true,
  canDeleteAgendaEvents: true,
  canDeleteExpenses: true
}

export function useUserPermissionsDB() {
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_OWNER_PERMISSIONS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadUserPermissions = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      
      if (!user) {
        setPermissions(DEFAULT_OWNER_PERMISSIONS)
        setLoading(false)
        return
      }

      // Llamar a la función que obtiene permisos desde la DB
      const { data, error: rpcError } = await supabase
        .rpc('get_user_permissions_simple', { user_uuid: user.id })

      if (rpcError) {
        console.error('Error loading permissions:', rpcError)
        // Si falla, asumir que es owner (fallback seguro)
        setPermissions({
          ...DEFAULT_OWNER_PERMISSIONS,
          userId: user.id,
          rootOwnerId: user.id,
          displayName: user.email?.split('@')[0] || 'Propietario'
        })
        setLoading(false)
        return
      }

      // Obtener también el perfil completo para root_owner_id y parent_user_id
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('user_id, parent_user_id, root_owner_id, display_name')
        .eq('user_id', user.id)
        .single()

      const isOwner = data.isOwner || false
      const rootOwnerId = profileData?.root_owner_id || profileData?.user_id || user.id
      
      // Mapear los permisos desde la respuesta de la función
      const mappedPermissions: UserPermissions = {
        userId: user.id,
        parentUserId: profileData?.parent_user_id || null,
        rootOwnerId: rootOwnerId,
        isOwner: isOwner,
        displayName: data.display_name || profileData?.display_name || user.email?.split('@')[0] || 'Usuario',
        role: data.role || 'employee',
        
        // Permisos generales
        canCreateInvoices: data.canCreateInvoices || false,
        canViewFinances: data.canViewFinances || false,
        canManageInventory: data.canManageInventory || false,
        canManageClients: data.canManageClients || false,
        canManageEmployees: data.canManageEmployees || false,
        maxInvoiceAmount: data.maxInvoiceAmount || null,
        
        // Permisos de edición - por defecto solo para owners
        canEditInvoices: isOwner,
        canEditClients: isOwner,
        canEditProducts: isOwner,
        canEditServices: isOwner,
        canEditProjects: isOwner,
        canEditVehicles: isOwner,
        canEditThermalReceipts: isOwner,
        canEditAgendaEvents: isOwner,
        canEditExpenses: isOwner,
        
        // Permisos de eliminación - por defecto solo para owners
        canDeleteInvoices: isOwner,
        canDeleteClients: isOwner,
        canDeleteProducts: isOwner,
        canDeleteServices: isOwner,
        canDeleteProjects: isOwner,
        canDeleteVehicles: isOwner,
        canDeleteThermalReceipts: isOwner,
        canDeleteAgendaEvents: isOwner,
        canDeleteExpenses: isOwner
      }

      setPermissions(mappedPermissions)
    } catch (err: any) {
      console.error('Error loading user permissions:', err)
      setError(err.message)
      // Fallback a permisos de owner en caso de error
      setPermissions(DEFAULT_OWNER_PERMISSIONS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUserPermissions()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        loadUserPermissions()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return {
    permissions,
    loading,
    error,
    refresh: loadUserPermissions,
    // Helpers útiles
    isOwner: permissions.isOwner,
    rootOwnerId: permissions.rootOwnerId,
    canManageEmployees: permissions.canManageEmployees
  }
}
