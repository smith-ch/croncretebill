"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { isRealEmployeeByEmail } from '@/lib/employee-config'

interface UserPermissions {
  canCreateInvoices: boolean
  canViewFinances: boolean  
  canManageInventory: boolean
  canManageClients: boolean
  maxInvoiceAmount: number | null
  role: string
  isOwner: boolean
  wasOriginallyOwner?: boolean
  isRealEmployee?: boolean // Para distinguir empleados reales vs propietario en modo prueba
}

export function useUserPermissions() {
  const [permissions, setPermissions] = useState<UserPermissions>({
    canCreateInvoices: true, // Default para owner
    canViewFinances: true,
    canManageInventory: true,
    canManageClients: true,
    maxInvoiceAmount: null,
    role: 'owner',
    isOwner: true,
    wasOriginallyOwner: true
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserPermissions()
  }, [])

  const loadUserPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Verificar si es empleado real por email (método simple)
      let isRealEmployee = false
      if (user.email) {
        isRealEmployee = isRealEmployeeByEmail(user.email)
        if (isRealEmployee) {
          console.log(`User ${user.email} is a real employee`)
          // Si es empleado real, forzar modo empleado
          localStorage.setItem('employee-view-mode', 'true')
        } else {
          // Si NO es empleado real, pero hay modo empleado guardado, 
          // significa que es un owner que estaba probando
          console.log(`User ${user.email} is owner, checking saved mode`)
        }
      }

      // Verificar si está en modo empleado DESPUÉS de la verificación de email
      const isEmployeeMode = localStorage.getItem('employee-view-mode') === 'true'

      // Usar la función RPC para obtener permisos
      const { data: permissionsData, error } = await supabase
        .rpc('get_user_permissions_simple', { user_uuid: user.id })

      if (error) {
        console.error('Error loading permissions:', error)
        // En caso de error, asumir permisos de owner
        // Guardar que es owner originalmente
        localStorage.setItem('was-originally-owner', 'true')
        
        let defaultPermissions = {
          canCreateInvoices: true,
          canViewFinances: true,
          canManageInventory: true,
          canManageClients: true,
          maxInvoiceAmount: null as number | null,
          role: 'owner',
          isOwner: true,
          wasOriginallyOwner: true
        }

        console.log('Using default owner permissions due to error')

        // Si está en modo empleado, aplicar restricciones
        if (isEmployeeMode) {
          console.log('Applying employee mode to default permissions')
          defaultPermissions = {
            canCreateInvoices: true,
            canViewFinances: false,
            canManageInventory: false,
            canManageClients: true,
            maxInvoiceAmount: 50000,
            role: 'employee',
            isOwner: false,
            wasOriginallyOwner: true
          }
        }

        setPermissions(defaultPermissions)
      } else if (permissionsData) {
        console.log('Raw permissions data:', permissionsData)
        
        const originalIsOwner = permissionsData.isOwner || false
        
        // Guardar si es owner originalmente para el RoleSwitcher
        localStorage.setItem('was-originally-owner', String(originalIsOwner))
        
        let finalPermissions = {
          canCreateInvoices: permissionsData.canCreateInvoices || false,
          canViewFinances: permissionsData.canViewFinances || false,
          canManageInventory: permissionsData.canManageInventory || false,
          canManageClients: permissionsData.canManageClients || false,
          maxInvoiceAmount: permissionsData.maxInvoiceAmount,
          role: permissionsData.role || 'owner',
          isOwner: originalIsOwner,
          wasOriginallyOwner: originalIsOwner, // Nuevo campo para RoleSwitcher
          isRealEmployee: isRealEmployee // Indica si es empleado real vs propietario en modo prueba
        }

        console.log('Processed permissions:', finalPermissions)

        // Si es empleado real O está en modo empleado (propietario probando)
        if (isRealEmployee || (isEmployeeMode && originalIsOwner)) {
          console.log('Applying employee mode restrictions')
          finalPermissions = {
            ...finalPermissions,
            canCreateInvoices: true,
            canViewFinances: false,
            canManageInventory: false,
            canManageClients: true,
            maxInvoiceAmount: 50000,
            role: 'employee',
            isOwner: false, // Temporalmente false para simular empleado
            wasOriginallyOwner: originalIsOwner, // Mantener el estado original
            isRealEmployee: isRealEmployee // Empleado real no puede cambiar modos
          }
        }

        setPermissions(finalPermissions)
      } else {
        // No hay datos de permisos específicos, asumir que es owner principal
        console.log('No permissions data found, assuming primary owner')
        
        // Guardar que es owner originalmente
        localStorage.setItem('was-originally-owner', 'true')
        
        let ownerPermissions = {
          canCreateInvoices: true,
          canViewFinances: true,
          canManageInventory: true,
          canManageClients: true,
          maxInvoiceAmount: null as number | null,
          role: 'owner',
          isOwner: true,
          wasOriginallyOwner: true
        }

        // Si está en modo empleado, aplicar restricciones
        if (isEmployeeMode) {
          console.log('Applying employee mode to owner (no data case)')
          ownerPermissions = {
            canCreateInvoices: true,
            canViewFinances: false,
            canManageInventory: false,
            canManageClients: true,
            maxInvoiceAmount: 50000,
            role: 'employee',
            isOwner: false,
            wasOriginallyOwner: true
          }
        }

        setPermissions(ownerPermissions)
      }
    } catch (error) {
      console.error('Error loading user permissions:', error)
      // En caso de error, asumir permisos de owner para no bloquear
      setPermissions({
        canCreateInvoices: true,
        canViewFinances: true,
        canManageInventory: true,
        canManageClients: true,
        maxInvoiceAmount: null,
        role: 'owner',
        isOwner: true
      })
    } finally {
      setLoading(false)
    }
  }

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    return Boolean(permissions[permission])
  }

  const canAccessModule = (module: string): boolean => {
    // Si es owner, acceso completo
    if (permissions.isOwner) {
      return true
    }

    // Para empleados, solo permitir módulos específicos basados en permisos
    switch (module) {
      case 'dashboard':
        return true // Dashboard básico siempre permitido
      
      case 'invoices':
      case 'invoices/new':
        return permissions.canCreateInvoices
      
      case 'clients':
        return permissions.canManageClients
      
      case 'products':
        return true // Los empleados siempre pueden ver productos
      
      case 'inventory':
        return permissions.canManageInventory
      
      case 'services':
        return permissions.canManageInventory // Servicios vinculados al inventario
      
      case 'projects':
        return permissions.canManageClients // Proyectos vinculados a clientes
      
      case 'expenses':
      case 'gastos':
        return false // Empleados NO pueden ver gastos
      
      case 'reports':
      case 'monthly-reports':
      case 'dgii-reports':
      case 'reportes':
        return permissions.canViewFinances
      
      case 'thermal-receipts':
      case 'payment-receipts':
      case 'recibos':
        return permissions.canCreateInvoices // Solo si pueden facturar
      
      case 'agenda':
        return permissions.canManageClients // Solo si manejan clientes
      
      case 'settings':
      case 'configuracion':
        return permissions.isOwner // Solo owners pueden cambiar configuración
      
      case 'faq':
        return true // FAQ siempre accesible
      
      default:
        return false // Por defecto, denegar acceso
    }
  }

  const validateInvoiceAmount = (amount: number): boolean => {
    if (permissions.maxInvoiceAmount === null) {
      return true // Sin límite
    }
    return amount <= permissions.maxInvoiceAmount
  }

  return {
    permissions,
    loading,
    hasPermission,
    canAccessModule,
    validateInvoiceAmount,
    refresh: loadUserPermissions
  }
}