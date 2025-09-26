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
  // Permisos específicos de edición
  canEditInvoices: boolean
  canEditClients: boolean
  canEditProducts: boolean
  canEditServices: boolean
  canEditProjects: boolean
  canEditVehicles: boolean
  canEditThermalReceipts: boolean
  canEditAgendaEvents: boolean
  canEditExpenses: boolean
  // Permisos específicos de eliminación
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

export function useUserPermissions() {
  const [permissions, setPermissions] = useState<UserPermissions>({
    canCreateInvoices: true, // Default para owner
    canViewFinances: true,
    canManageInventory: true,
    canManageClients: true,
    maxInvoiceAmount: null,
    role: 'owner',
    isOwner: true,
    wasOriginallyOwner: true,
    // Permisos de edición - por defecto para owner
    canEditInvoices: true,
    canEditClients: true,
    canEditProducts: true,
    canEditServices: true,
    canEditProjects: true,
    canEditVehicles: true,
    canEditThermalReceipts: true,
    canEditAgendaEvents: true,
    canEditExpenses: true,
    // Permisos de eliminación - por defecto para owner
    canDeleteInvoices: true,
    canDeleteClients: true,
    canDeleteProducts: true,
    canDeleteServices: true,
    canDeleteProjects: true,
    canDeleteVehicles: true,
    canDeleteThermalReceipts: true,
    canDeleteAgendaEvents: true,
    canDeleteExpenses: true
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
          // Si es empleado real, forzar modo empleado
          localStorage.setItem('employee-view-mode', 'true')
        }
      }

      // Verificar si está en modo empleado DESPUÉS de la verificación de email
      const isEmployeeMode = localStorage.getItem('employee-view-mode') === 'true'

      // Usar la función RPC para obtener permisos
      const { data: permissionsData, error } = await (supabase as any)
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
          wasOriginallyOwner: true,
          // Permisos de edición para owner por defecto
          canEditInvoices: true,
          canEditClients: true,
          canEditProducts: true,
          canEditServices: true,
          canEditProjects: true,
          canEditVehicles: true,
          canEditThermalReceipts: true,
          canEditAgendaEvents: true,
          canEditExpenses: true,
          // Permisos de eliminación para owner por defecto
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

        console.log('Using default owner permissions due to error')

        // Si está en modo empleado, aplicar restricciones ESTRICTAS
        if (isEmployeeMode) {
          defaultPermissions = {
            canCreateInvoices: true,
            canViewFinances: false,
            canManageInventory: false,
            canManageClients: true,
            maxInvoiceAmount: 50000,
            role: 'employee',
            isOwner: false,
            wasOriginallyOwner: true,
            // Los empleados NO pueden editar ABSOLUTAMENTE NADA
            canEditInvoices: false,
            canEditClients: false,
            canEditProducts: false,
            canEditServices: false,
            canEditProjects: false,
            canEditVehicles: false,
            canEditThermalReceipts: false,
            canEditAgendaEvents: false,
            canEditExpenses: false,
            // Los empleados NO pueden eliminar ABSOLUTAMENTE NADA
            canDeleteInvoices: false,
            canDeleteClients: false,
            canDeleteProducts: false,
            canDeleteServices: false,
            canDeleteProjects: false,
            canDeleteVehicles: false,
            canDeleteThermalReceipts: false,
            canDeleteAgendaEvents: false,
            canDeleteExpenses: false
          }
        }

        setPermissions(defaultPermissions)
      } else if (permissionsData) {
        
        // SIEMPRE verificar si es owner de múltiples formas
        const originalIsOwner = Boolean(
          (permissionsData as any)?.isOwner || 
          (permissionsData as any)?.role === 'owner' || 
          (permissionsData as any)?.role === 'admin' ||
          localStorage.getItem('was-originally-owner') === 'true'
        )
        
        // Guardar si es owner originalmente para el RoleSwitcher
        localStorage.setItem('was-originally-owner', String(originalIsOwner))
        
        let finalPermissions = {
          canCreateInvoices: (permissionsData as any)?.canCreateInvoices || false,
          canViewFinances: (permissionsData as any)?.canViewFinances || false,
          canManageInventory: (permissionsData as any)?.canManageInventory || false,
          canManageClients: (permissionsData as any)?.canManageClients || false,
          maxInvoiceAmount: (permissionsData as any)?.maxInvoiceAmount,
          role: (permissionsData as any)?.role || 'owner',
          isOwner: originalIsOwner,
          wasOriginallyOwner: originalIsOwner, // Nuevo campo para RoleSwitcher
          isRealEmployee: isRealEmployee, // Indica si es empleado real vs propietario en modo prueba
          // Permisos de edición por defecto basados en si es owner
          canEditInvoices: originalIsOwner,
          canEditClients: originalIsOwner,
          canEditProducts: originalIsOwner,
          canEditServices: originalIsOwner,
          canEditProjects: originalIsOwner,
          canEditVehicles: originalIsOwner,
          canEditThermalReceipts: originalIsOwner,
          canEditAgendaEvents: originalIsOwner,
          canEditExpenses: originalIsOwner,
          // Permisos de eliminación por defecto basados en si es owner
          canDeleteInvoices: originalIsOwner,
          canDeleteClients: originalIsOwner,
          canDeleteProducts: originalIsOwner,
          canDeleteServices: originalIsOwner,
          canDeleteProjects: originalIsOwner,
          canDeleteVehicles: originalIsOwner,
          canDeleteThermalReceipts: originalIsOwner,
          canDeleteAgendaEvents: originalIsOwner,
          canDeleteExpenses: originalIsOwner
        }

        // VERIFICAR si está en modo empleado (role-switcher)
        const isEmployeeMode = localStorage.getItem('employee-view-mode') === 'true'
        
        // FORZAR: Si está en modo empleado O no es owner confirmado, aplicar restricciones
        if (isEmployeeMode || !originalIsOwner) {
          finalPermissions = {
            ...finalPermissions,
            canCreateInvoices: true,  // Empleados pueden facturar
            canViewFinances: false,   // NO pueden ver finanzas
            canManageInventory: false, // NO pueden manejar inventario
            canManageClients: true,   // SÍ pueden manejar clientes
            maxInvoiceAmount: 50000,
            role: 'employee',
            isOwner: false,           // IMPORTANTE: Temporalmente false en modo empleado
            wasOriginallyOwner: originalIsOwner, // Mantener el estado original
            isRealEmployee: !originalIsOwner,    // Solo true si es empleado real
            // Los empleados NO pueden editar NADA - PERMISOS TOTALMENTE ELIMINADOS
            canEditInvoices: false,
            canEditClients: false,
            canEditProducts: false,
            canEditServices: false,
            canEditProjects: false,
            canEditVehicles: false,
            canEditThermalReceipts: false,
            canEditAgendaEvents: false,
            canEditExpenses: false,
            // Los empleados NO pueden eliminar NADA - PERMISOS TOTALMENTE ELIMINADOS
            canDeleteInvoices: false,
            canDeleteClients: false,
            canDeleteProducts: false,
            canDeleteServices: false,
            canDeleteProjects: false,
            canDeleteVehicles: false,
            canDeleteThermalReceipts: false,
            canDeleteAgendaEvents: false,
            canDeleteExpenses: false
          }
        }

        // SOLO si está en modo owner Y NO en modo empleado, dar permisos completos
        if (originalIsOwner && !isEmployeeMode) {
          finalPermissions = {
            ...finalPermissions,
            canCreateInvoices: true,
            canViewFinances: true,
            canManageInventory: true,
            canManageClients: true,
            maxInvoiceAmount: null,
            role: 'owner',
            isOwner: true,
            wasOriginallyOwner: true,
            isRealEmployee: false,
            // Owners pueden editar TODO
            canEditInvoices: true,
            canEditClients: true,
            canEditProducts: true,
            canEditServices: true,
            canEditProjects: true,
            canEditVehicles: true,
            canEditThermalReceipts: true,
            canEditAgendaEvents: true,
            canEditExpenses: true,
            // Owners pueden eliminar TODO
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
          wasOriginallyOwner: true,
          // Permisos de edición para owner
          canEditInvoices: true,
          canEditClients: true,
          canEditProducts: true,
          canEditServices: true,
          canEditProjects: true,
          canEditVehicles: true,
          canEditThermalReceipts: true,
          canEditAgendaEvents: true,
          canEditExpenses: true,
          // Permisos de eliminación para owner
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

        // Si está en modo empleado, aplicar restricciones ESTRICTAS
        if (isEmployeeMode) {
          ownerPermissions = {
            canCreateInvoices: true,
            canViewFinances: false,
            canManageInventory: false,
            canManageClients: true,
            maxInvoiceAmount: 50000,
            role: 'employee',
            isOwner: false,
            wasOriginallyOwner: true,
            // Los empleados NO pueden editar ABSOLUTAMENTE NADA
            canEditInvoices: false,
            canEditClients: false,
            canEditProducts: false,
            canEditServices: false,
            canEditProjects: false,
            canEditVehicles: false,
            canEditThermalReceipts: false,
            canEditAgendaEvents: false,
            canEditExpenses: false,
            // Los empleados NO pueden eliminar ABSOLUTAMENTE NADA
            canDeleteInvoices: false,
            canDeleteClients: false,
            canDeleteProducts: false,
            canDeleteServices: false,
            canDeleteProjects: false,
            canDeleteVehicles: false,
            canDeleteThermalReceipts: false,
            canDeleteAgendaEvents: false,
            canDeleteExpenses: false
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
        isOwner: true,
        wasOriginallyOwner: true,
        isRealEmployee: false,
        // Permisos de edición para owner en caso de error
        canEditInvoices: true,
        canEditClients: true,
        canEditProducts: true,
        canEditServices: true,
        canEditProjects: true,
        canEditVehicles: true,
        canEditThermalReceipts: true,
        canEditAgendaEvents: true,
        canEditExpenses: true,
        // Permisos de eliminación para owner en caso de error
        canDeleteInvoices: true,
        canDeleteClients: true,
        canDeleteProducts: true,
        canDeleteServices: true,
        canDeleteProjects: true,
        canDeleteVehicles: true,
        canDeleteThermalReceipts: true,
        canDeleteAgendaEvents: true,
        canDeleteExpenses: true
      })
    } finally {
      setLoading(false)
    }
  }

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    return Boolean(permissions[permission])
  }

  const canDelete = (entity: 'invoices' | 'clients' | 'products' | 'services' | 'projects' | 'vehicles' | 'thermalReceipts' | 'agendaEvents' | 'expenses'): boolean => {
    // Si está en modo empleado, NO puede eliminar NADA
    const isEmployeeMode = localStorage.getItem('employee-view-mode') === 'true'
    if (isEmployeeMode) {
      return false
    }
    
    const permissionMap = {
      invoices: permissions.canDeleteInvoices,
      clients: permissions.canDeleteClients,
      products: permissions.canDeleteProducts,
      services: permissions.canDeleteServices,
      projects: permissions.canDeleteProjects,
      vehicles: permissions.canDeleteVehicles,
      thermalReceipts: permissions.canDeleteThermalReceipts,
      agendaEvents: permissions.canDeleteAgendaEvents,
      expenses: permissions.canDeleteExpenses
    }
    
    return Boolean(permissionMap[entity])
  }

  const canEdit = (entity: 'invoices' | 'clients' | 'products' | 'services' | 'projects' | 'vehicles' | 'thermalReceipts' | 'agendaEvents' | 'expenses'): boolean => {
    // Si está en modo empleado, NO puede editar NADA
    const isEmployeeMode = localStorage.getItem('employee-view-mode') === 'true'
    if (isEmployeeMode) {
      return false
    }
    
    const permissionMap = {
      invoices: permissions.canEditInvoices,
      clients: permissions.canEditClients,
      products: permissions.canEditProducts,
      services: permissions.canEditServices,
      projects: permissions.canEditProjects,
      vehicles: permissions.canEditVehicles,
      thermalReceipts: permissions.canEditThermalReceipts,
      agendaEvents: permissions.canEditAgendaEvents,
      expenses: permissions.canEditExpenses
    }
    
    return Boolean(permissionMap[entity])
  }

  const canAccessModule = (module: string): boolean => {
    // Si está en modo empleado, actuar como empleado (ignorar wasOriginallyOwner)
    const isEmployeeMode = localStorage.getItem('employee-view-mode') === 'true'
    
    // Solo dar acceso total si es owner Y NO está en modo empleado
    if ((permissions.isOwner || permissions.wasOriginallyOwner) && !isEmployeeMode) {
      return true
    }

    // Para empleados: ACCESO MUY LIMITADO - SOLO LECTURA
    // NOTA: Si no es owner confirmado O está en modo empleado, tratarlo como empleado
    switch (module) {
      case 'dashboard':
        return true // Dashboard básico siempre permitido
      
      case 'invoices':
      case 'invoices/new':
        return permissions.canCreateInvoices // Solo crear facturas, NO editar
      
      case 'clients':
        return permissions.canManageClients // Solo gestión básica, NO editar/eliminar
      
      case 'products':
        return true // Solo VER productos, NO editar/eliminar
      
      case 'budgets':
        return true // Solo VER presupuestos, NO editar/eliminar
      
      case 'services':
        return true // Solo VER servicios, NO editar/eliminar
      
      case 'thermal-receipts':
      case 'payment-receipts':
      case 'recibos':
      case 'comprobantes':
        return false // EMPLEADOS NO pueden acceder a comprobantes - COMPLETAMENTE BLOQUEADO
      
      case 'agenda':
        return false // EMPLEADOS NO pueden acceder a agenda - COMPLETAMENTE BLOQUEADO
      
      case 'faq':
        return true // FAQ siempre accesible
      
      // MÓDULOS COMPLETAMENTE BLOQUEADOS PARA EMPLEADOS
      case 'inventory':
      case 'projects':
      case 'expenses':
      case 'gastos':
      case 'reports':
      case 'monthly-reports':
      case 'dgii-reports':
      case 'reportes':
      case 'settings':
      case 'configuracion':
        return false // TOTALMENTE BLOQUEADOS para empleados
      
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
    canDelete,
    canEdit,
    canAccessModule,
    validateInvoiceAmount,
    refresh: loadUserPermissions
  }
}