"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Trash2, Plus, UserCheck, UserX, Mail, Edit2, Shield, Eye, EyeOff, Loader2, CheckCircle, XCircle, Target, AlertCircle, Package } from "lucide-react"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useSubscriptionLimits } from "@/hooks/use-subscription-limits"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

interface Employee {
  id: string
  user_id: string
  email: string
  display_name: string
  role_name: string
  can_create_invoices: boolean
  can_view_finances: boolean
  can_manage_inventory: boolean
  can_manage_clients: boolean
  is_active: boolean
  created_at: string
}

export default function EmployeeConfigPage() {
  const { permissions } = useUserPermissions()
  const { toast } = useToast()
  const { limits, usage, canAddUsers, remainingUsers, refreshUsage } = useSubscriptionLimits()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string, name: string} | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [editPermissions, setEditPermissions] = useState({
    canCreateInvoices: false,
    canViewFinances: false,
    canManageInventory: false,
    canManageClients: false
  })
  const [updating, setUpdating] = useState(false)
  
  // Formulario de nuevo empleado
  const [newEmployee, setNewEmployee] = useState({
    email: "",
    password: "",
    displayName: "",
    department: "",
    jobPosition: "",
    canCreateInvoices: true,  // Por defecto activado
    canViewFinances: false,   // Por defecto desactivado
    canManageInventory: false, // Por defecto desactivado (owner decide)
    canManageClients: true    // Por defecto activado
  })

  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUserId && permissions.isOwner) {
      loadEmployees()
    }
  }, [currentUserId, permissions.isOwner])

  const loadCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      setCurrentUserId(session.user.id)
    }
  }

  const loadEmployees = async () => {
    try {
      setLoading(true)
      
      // Obtener empleados del owner actual (usuarios con parent_user_id = current user)
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          user_id,
          email,
          display_name,
          can_create_invoices,
          can_view_finances,
          can_manage_inventory,
          can_manage_clients,
          is_active,
          created_at,
          role_id,
          user_roles (
            name
          )
        `)
        .eq('parent_user_id', currentUserId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Mapear los datos directamente sin llamar Admin API
      const employeesData = (data || []).map((emp) => ({
        id: emp.id,
        user_id: emp.user_id,
        email: emp.email || 'Email no disponible',
        display_name: emp.display_name,
        role_name: (emp.user_roles as any)?.name || 'employee',
        can_create_invoices: emp.can_create_invoices,
        can_view_finances: emp.can_view_finances,
        can_manage_inventory: emp.can_manage_inventory,
        can_manage_clients: emp.can_manage_clients,
        is_active: emp.is_active,
        created_at: emp.created_at
      }))

      setEmployees(employeesData)
      refreshUsage()
    } catch (error: any) {
      console.error('Error loading employees:', error)
      // No mostrar error si no hay empleados todavía
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEmployee = async () => {
    if (!newEmployee.email || !newEmployee.displayName || !newEmployee.password) {
      toast({
        title: "Campos requeridos",
        description: "Email, nombre y contraseña son obligatorios",
        variant: "destructive"
      })
      return
    }

    if (newEmployee.password.length < 6) {
      toast({
        title: "Contraseña débil",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive"
      })
      return
    }

    try {
      setSubmitting(true)

      // Obtener el token de sesión
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No hay sesión activa')
      }

      // Llamar a la API de creación de empleado
      const response = await fetch('/api/employees/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: newEmployee.email,
          password: newEmployee.password,
          displayName: newEmployee.displayName,
          department: newEmployee.department || null,
          jobPosition: newEmployee.jobPosition || null,
          canCreateInvoices: newEmployee.canCreateInvoices,
          canViewFinances: newEmployee.canViewFinances,
          canManageInventory: newEmployee.canManageInventory,
          canManageClients: newEmployee.canManageClients,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear el empleado')
      }

      toast({
        title: "¡Empleado creado!",
        description: `${newEmployee.displayName} puede iniciar sesión con su email y contraseña`,
      })

      // Limpiar formulario
      setNewEmployee({
        email: "",
        password: "",
        displayName: "",
        department: "",
        jobPosition: "",
        canCreateInvoices: true,  // Mantener permisos por defecto
        canViewFinances: false,
        canManageInventory: false,
        canManageClients: true
      })

      // Recargar lista
      loadEmployees()
    } catch (error: any) {
      console.error('Error creating employee:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el empleado",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (employeeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', employeeId)

      if (error) throw error

      toast({
        title: "Estado actualizado",
        description: `Empleado ${!currentStatus ? 'activado' : 'desactivado'} exitosamente`
      })

      loadEmployees()
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive"
      })
    }
  }

  const handleDeleteEmployee = async () => {
    if (!deleteConfirm) return

    setDeleting(true)
    try {
      // Obtener el token de sesión
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No hay sesión activa')
      }

      const response = await fetch('/api/employees/delete', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId: deleteConfirm.id })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar empleado')
      }

      toast({
        title: "Empleado eliminado",
        description: `${deleteConfirm.name} ha sido eliminado exitosamente`
      })

      setDeleteConfirm(null)
      loadEmployees()
    } catch (error: any) {
      console.error('Error deleting employee:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el empleado",
        variant: "destructive"
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee)
    setEditPermissions({
      canCreateInvoices: employee.can_create_invoices,
      canViewFinances: employee.can_view_finances,
      canManageInventory: employee.can_manage_inventory,
      canManageClients: employee.can_manage_clients
    })
  }

  const handleUpdatePermissions = async () => {
    if (!editingEmployee) return

    setUpdating(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          can_create_invoices: editPermissions.canCreateInvoices,
          can_view_finances: editPermissions.canViewFinances,
          can_manage_inventory: editPermissions.canManageInventory,
          can_manage_clients: editPermissions.canManageClients
        })
        .eq('id', editingEmployee.id)

      if (error) throw error

      toast({
        title: "Permisos actualizados",
        description: `Los permisos de ${editingEmployee.display_name} han sido actualizados exitosamente`
      })

      setEditingEmployee(null)
      loadEmployees()
    } catch (error: any) {
      console.error('Error updating permissions:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudieron actualizar los permisos",
        variant: "destructive"
      })
    } finally {
      setUpdating(false)
    }
  }

  if (loading && !currentUserId) {
    return (
      <div className="container max-w-4xl mx-auto py-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  // Solo owners pueden acceder
  if (!permissions.isOwner) {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <UserX className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acceso Denegado</h2>
            <p className="text-slate-600">
              Solo los propietarios pueden gestionar empleados.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Gestión de Empleados</h1>
          <p className="text-slate-600">
            Administra los empleados de tu empresa y sus permisos de acceso.
          </p>
        </div>
        <Link href="/settings/employee-goals">
          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            <Target className="h-4 w-4 mr-2" />
            Metas de Empleados
          </Button>
        </Link>
      </div>

      {/* Formulario para crear nuevo empleado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Crear Nuevo Empleado</span>
          </CardTitle>
          <CardDescription>
            Crea un empleado con acceso inmediato al sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alerta si no puede agregar empleados */}
          {!canAddUsers && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Tu plan "{limits.planDisplayName}" no permite crear empleados.</strong>
                <br />
                Actualiza tu plan de suscripción para agregar empleados a tu equipo.
              </AlertDescription>
            </Alert>
          )}

          {/* Mostrar límite alcanzado */}
          {canAddUsers && remainingUsers <= 0 && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Has alcanzado el límite de {limits.maxUsers - 1} empleado(s).</strong>
                <br />
                Actualiza tu plan para agregar más empleados.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="empleado@ejemplo.com"
                value={newEmployee.email}
                onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                disabled={!canAddUsers || remainingUsers <= 0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Nombre Completo *</Label>
              <Input
                id="displayName"
                placeholder="Juan Pérez"
                value={newEmployee.displayName}
                onChange={(e) => setNewEmployee({...newEmployee, displayName: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña *</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={newEmployee.password}
              onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
            />
            <p className="text-xs text-slate-500">El empleado usará esta contraseña para iniciar sesión</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Departamento</Label>
              <Input
                id="department"
                placeholder="Ventas, Producción, etc."
                value={newEmployee.department}
                onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobPosition">Puesto</Label>
              <Input
                id="jobPosition"
                placeholder="Vendedor, Operador, etc."
                value={newEmployee.jobPosition}
                onChange={(e) => setNewEmployee({...newEmployee, jobPosition: e.target.value})}
              />
            </div>
          </div>

          {/* Permisos */}
          <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <Label className="text-base font-semibold text-blue-900">Permisos del Empleado</Label>
            </div>
            <p className="text-sm text-blue-800 mb-4">Selecciona los permisos que tendrá este empleado:</p>
            
            <div className="space-y-3">
              {/* Permiso: Crear Facturas */}
              <div className="flex items-start space-x-3 p-3 bg-white rounded border border-blue-100">
                <Checkbox 
                  id="canCreateInvoices"
                  checked={newEmployee.canCreateInvoices}
                  onCheckedChange={(checked) => 
                    setNewEmployee({...newEmployee, canCreateInvoices: checked as boolean})
                  }
                  disabled={!canAddUsers || remainingUsers <= 0}
                />
                <div className="flex-1">
                  <Label htmlFor="canCreateInvoices" className="text-sm font-medium cursor-pointer">
                    Crear Facturas
                  </Label>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Permite crear, editar y eliminar facturas
                  </p>
                </div>
              </div>

              {/* Permiso: Gestionar Clientes */}
              <div className="flex items-start space-x-3 p-3 bg-white rounded border border-blue-100">
                <Checkbox 
                  id="canManageClients"
                  checked={newEmployee.canManageClients}
                  onCheckedChange={(checked) => 
                    setNewEmployee({...newEmployee, canManageClients: checked as boolean})
                  }
                  disabled={!canAddUsers || remainingUsers <= 0}
                />
                <div className="flex-1">
                  <Label htmlFor="canManageClients" className="text-sm font-medium cursor-pointer">
                    Gestionar Clientes
                  </Label>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Permite ver, agregar y editar clientes
                  </p>
                </div>
              </div>

              {/* Permiso: Gestionar Inventario */}
              <div className="flex items-start space-x-3 p-3 bg-white rounded border border-blue-100">
                <Checkbox 
                  id="canManageInventory"
                  checked={newEmployee.canManageInventory}
                  onCheckedChange={(checked) => 
                    setNewEmployee({...newEmployee, canManageInventory: checked as boolean})
                  }
                  disabled={!canAddUsers || remainingUsers <= 0}
                />
                <div className="flex-1">
                  <Label htmlFor="canManageInventory" className="text-sm font-medium cursor-pointer flex items-center">
                    <Package className="h-4 w-4 mr-1.5 text-indigo-600" />
                    Gestionar Inventario
                  </Label>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Permite ver stock, agregar productos y actualizar inventario
                  </p>
                </div>
              </div>

              {/* Permiso: Ver Finanzas */}
              <div className="flex items-start space-x-3 p-3 bg-white rounded border border-blue-100">
                <Checkbox 
                  id="canViewFinances"
                  checked={newEmployee.canViewFinances}
                  onCheckedChange={(checked) => 
                    setNewEmployee({...newEmployee, canViewFinances: checked as boolean})
                  }
                  disabled={!canAddUsers || remainingUsers <= 0}
                />
                <div className="flex-1">
                  <Label htmlFor="canViewFinances" className="text-sm font-medium cursor-pointer">
                    Ver Finanzas
                  </Label>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Permite ver reportes financieros y estadísticas sensibles
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={() => {
              if (!canAddUsers()) {
                toast({
                  title: "Empleados no permitidos",
                  description: `Tu plan "${limits.planDisplayName}" no permite crear empleados. Actualiza tu plan para agregar empleados a tu equipo.`,
                  variant: "destructive",
                })
              } else {
                handleCreateEmployee()
              }
            }}
            disabled={submitting || !newEmployee.email || !newEmployee.displayName || !newEmployee.password || !canAddUsers()}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creando empleado...
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                {canAddUsers() ? "Crear Empleado" : "Plan no permite empleados"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {!limits.isLoading && remainingUsers <= 1 && (
        <Alert className={remainingUsers === 0 ? "border-red-500 bg-red-50" : "border-amber-500 bg-amber-50"}>
          <AlertCircle className={remainingUsers === 0 ? "h-4 w-4 text-red-600" : "h-4 w-4 text-amber-600"} />
          <AlertDescription className={remainingUsers === 0 ? "text-red-800" : "text-amber-800"}>
            {remainingUsers === 0 ? (
              <span>
                <strong>Límite alcanzado:</strong> Has usado todos los {limits.maxUsers} usuarios de tu {limits.planDisplayName}. 
                <Link href="/subscriptions/my-subscription" className="underline font-semibold ml-1">Actualiza tu plan</Link>
              </span>
            ) : (
              <span>
                <strong>Atención:</strong> Te queda solo {remainingUsers} usuario disponible en tu {limits.planDisplayName}. 
                <Link href="/subscriptions/my-subscription" className="underline font-semibold ml-1">Ver planes</Link>
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Lista de empleados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5" />
            <span>Empleados Actuales</span>
          </CardTitle>
          <CardDescription>
            {employees.length} empleado{employees.length !== 1 ? 's' : ''} registrado{employees.length !== 1 ? 's' : ''} de {limits.maxUsers} disponibles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <UserX className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay empleados registrados aún</p>
              <p className="text-sm mt-1">Usa el formulario de arriba para invitar a tu primer empleado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${employee.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <div>
                        <h3 className="font-medium">{employee.display_name}</h3>
                        <p className="text-sm text-slate-500">{employee.email}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {employee.can_create_invoices && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          Crear Facturas
                        </span>
                      )}
                      {employee.can_view_finances && (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                          Ver Finanzas
                        </span>
                      )}
                      {employee.can_manage_inventory && (
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                          Inventario
                        </span>
                      )}
                      {employee.can_manage_clients && (
                        <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">
                          Clientes
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditEmployee(employee)}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(employee.id, employee.is_active)}
                    >
                      {employee.is_active ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-1" />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          Activar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteConfirm({ id: employee.user_id, name: employee.display_name })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de edición de permisos */}
      <Dialog open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Permisos</DialogTitle>
            <DialogDescription>
              Actualiza los permisos de {editingEmployee?.display_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {/* Permiso: Crear Facturas */}
            <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded border">
              <Checkbox 
                id="edit-canCreateInvoices"
                checked={editPermissions.canCreateInvoices}
                onCheckedChange={(checked) => 
                  setEditPermissions({...editPermissions, canCreateInvoices: checked as boolean})
                }
              />
              <div className="flex-1">
                <Label htmlFor="edit-canCreateInvoices" className="text-sm font-medium cursor-pointer">
                  Crear Facturas
                </Label>
                <p className="text-xs text-slate-600 mt-0.5">
                  Permite crear, editar y eliminar facturas
                </p>
              </div>
            </div>

            {/* Permiso: Gestionar Clientes */}
            <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded border">
              <Checkbox 
                id="edit-canManageClients"
                checked={editPermissions.canManageClients}
                onCheckedChange={(checked) => 
                  setEditPermissions({...editPermissions, canManageClients: checked as boolean})
                }
              />
              <div className="flex-1">
                <Label htmlFor="edit-canManageClients" className="text-sm font-medium cursor-pointer">
                  Gestionar Clientes
                </Label>
                <p className="text-xs text-slate-600 mt-0.5">
                  Permite ver, agregar y editar clientes
                </p>
              </div>
            </div>

            {/* Permiso: Gestionar Inventario */}
            <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded border">
              <Checkbox 
                id="edit-canManageInventory"
                checked={editPermissions.canManageInventory}
                onCheckedChange={(checked) => 
                  setEditPermissions({...editPermissions, canManageInventory: checked as boolean})
                }
              />
              <div className="flex-1">
                <Label htmlFor="edit-canManageInventory" className="text-sm font-medium cursor-pointer flex items-center">
                  <Package className="h-4 w-4 mr-1.5 text-indigo-600" />
                  Gestionar Inventario
                </Label>
                <p className="text-xs text-slate-600 mt-0.5">
                  Permite ver stock, agregar productos y actualizar inventario
                </p>
              </div>
            </div>

            {/* Permiso: Ver Finanzas */}
            <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded border">
              <Checkbox 
                id="edit-canViewFinances"
                checked={editPermissions.canViewFinances}
                onCheckedChange={(checked) => 
                  setEditPermissions({...editPermissions, canViewFinances: checked as boolean})
                }
              />
              <div className="flex-1">
                <Label htmlFor="edit-canViewFinances" className="text-sm font-medium cursor-pointer">
                  Ver Finanzas
                </Label>
                <p className="text-xs text-slate-600 mt-0.5">
                  Permite ver reportes financieros y estadísticas sensibles
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingEmployee(null)}
              disabled={updating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdatePermissions}
              disabled={updating}
            >
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Información */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-900 space-y-1">
              <p className="font-medium">Cómo funciona:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Los empleados se crean inmediatamente con su email y contraseña</li>
                <li>Pueden iniciar sesión de inmediato sin necesidad de confirmación por email</li>
                <li>Tendrán acceso según los permisos que configures</li>
                <li>Puedes desactivar empleados temporalmente sin eliminar su cuenta</li>
                <li>Los empleados solo ven los datos de tu empresa</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de confirmación de eliminación */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                <span>Confirmar Eliminación</span>
              </CardTitle>
              <CardDescription>
                Esta acción no se puede deshacer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                ¿Estás seguro de que deseas eliminar a <strong>{deleteConfirm.name}</strong>?
              </p>
              <p className="text-sm text-slate-600">
                Se eliminará permanentemente:
              </p>
              <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
                <li>Su cuenta de usuario</li>
                <li>Su perfil y permisos</li>
                <li>Su acceso al sistema</li>
              </ul>
              <div className="flex space-x-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteEmployee}
                  disabled={deleting}
                  className="flex-1"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}