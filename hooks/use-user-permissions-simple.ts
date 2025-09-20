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

        // Si está en modo empleado, aplicar restricciones
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
            // Los empleados NO pueden editar nada
            canEditInvoices: false,
            canEditClients: false,
            canEditProducts: false,
            canEditServices: false,
            canEditProjects: false,
            canEditVehicles: false,
            canEditThermalReceipts: false,
            canEditAgendaEvents: false,
            canEditExpenses: false,
            // Los empleados NO pueden eliminar nada
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
          permissionsData.isOwner || 
          permissionsData.role === 'owner' || 
          permissionsData.role === 'admin' ||
          localStorage.getItem('was-originally-owner') === 'true'
        )
        
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
            // Los empleados NO pueden editar NADA
            canEditInvoices: false,
            canEditClients: false,
            canEditProducts: false,
            canEditServices: false,
            canEditProjects: false,
            canEditVehicles: false,
            canEditThermalReceipts: false,
            canEditAgendaEvents: false,
            canEditExpenses: false,
            // Los empleados NO pueden eliminar NADA
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

        // FORZAR: Si era originalmente owner, mantener todos los permisos de owner
        if (originalIsOwner) {
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

        // Si está en modo empleado, aplicar restricciones
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
            // Los empleados NO pueden editar nada
            canEditInvoices: false,
            canEditClients: false,
            canEditProducts: false,
            canEditServices: false,
            canEditProjects: false,
            canEditVehicles: false,
            canEditThermalReceipts: false,
            canEditAgendaEvents: false,
            canEditExpenses: false,
            // Los empleados NO pueden eliminar nada
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

  const canAccessModule = (module: string): boolean => {
    // Si está en modo empleado, actuar como empleado (ignorar wasOriginallyOwner)
    const isEmployeeMode = localStorage.getItem('employee-view-mode') === 'true'
    
    // Solo dar acceso total si es owner Y NO está en modo empleado
    if ((permissions.isOwner || permissions.wasOriginallyOwner) && !isEmployeeMode) {
      return true
    }

    // Para empleados reales O modo empleado, solo permitir módulos específicos
    // NOTA: Si no es owner confirmado O está en modo empleado, tratarlo como empleado
    switch (module) {
      case 'dashboard':
        return true // Dashboard básico siempre permitido
      
      case 'invoices':
      case 'invoices/new':
        return permissions.canCreateInvoices
      
      case 'clients':
        return permissions.canManageClients
      
      case 'products':
        return true // Empleados SÍ pueden ver productos
      
      case 'budgets':
        return true // Empleados SÍ pueden ver presupuestos
      
      case 'inventory':
        return false // Empleados NO pueden ver inventario
      
      case 'services':
        return true // Empleados SÍ pueden ver servicios
      
      case 'projects':
        return false // Empleados NO pueden ver proyectos
      
      case 'expenses':
      case 'gastos':
        return false // Solo owners pueden ver gastos, empleados NO
      
      case 'reports':
      case 'monthly-reports':
      case 'dgii-reports':
      case 'reportes':
        return false // Solo owners pueden ver reportes, empleados NO
      
      case 'thermal-receipts':
      case 'payment-receipts':
      case 'recibos':
        return permissions.canCreateInvoices // Solo si pueden facturar
      
      case 'agenda':
        return permissions.canManageClients // Solo si manejan clientes
      
      case 'settings':
      case 'configuracion':
        return false // Solo owners pueden ver configuración, empleados NO
      
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
    canDelete,
    canAccessModule,
    validateInvoiceAmount,
    refresh: loadUserPermissions
  }
}