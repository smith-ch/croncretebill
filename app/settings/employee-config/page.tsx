"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Plus, UserCheck, UserX } from "lucide-react"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"

export default function EmployeeConfigPage() {
  const { permissions } = useUserPermissions()
  const [newEmail, setNewEmail] = useState("")

  // Solo owners reales pueden acceder a esta página
  if (permissions.isRealEmployee || permissions.role === 'employee') {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <UserX className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acceso Denegado</h2>
            <p className="text-slate-600">
              Solo los propietarios pueden configurar empleados.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Configuración de Empleados</h1>
        <p className="text-slate-600">
          Configura qué usuarios serán identificados automáticamente como empleados.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5" />
            <span>Identificación de Empleados</span>
          </CardTitle>
          <CardDescription>
            Los usuarios con estos emails automáticamente tendrán vista de empleado sin controles de cambio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Información actual */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">📋 Instrucciones</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Propietarios:</strong> Pueden cambiar entre modo owner y empleado</li>
              <li>• <strong>Empleados:</strong> Automáticamente en modo empleado (sin controles)</li>
              <li>• <strong>Fácil para empleados solos:</strong> Se identifican automáticamente al entrar</li>
            </ul>
          </div>

          {/* Formulario para agregar empleado */}
          <div className="space-y-4">
            <Label htmlFor="employee-email">Agregar Email de Empleado</Label>
            <div className="flex space-x-2">
              <Input
                id="employee-email"
                type="email"
                placeholder="empleado@ejemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => {
                  if (newEmail.trim()) {
                    // Aquí implementarías la lógica para agregar el email
                    console.log("Agregar empleado:", newEmail)
                    setNewEmail("")
                  }
                }}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Agregar</span>
              </Button>
            </div>
          </div>

          {/* Lista de empleados actuales */}
          <div className="space-y-4">
            <h3 className="font-medium">Empleados Configurados</h3>
            <div className="space-y-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600 text-center">
                  📝 <strong>Para configurar empleados:</strong>
                  <br />
                  Edita el archivo <code>lib/employee-config.ts</code> y agrega los emails en <code>EMPLOYEE_EMAILS</code>
                </p>
              </div>
            </div>
          </div>

          {/* Estado actual del usuario */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-medium text-green-900 mb-2">👤 Tu Estado Actual</h3>
            <div className="text-sm text-green-800 space-y-1">
              <p><strong>Rol:</strong> {permissions.role}</p>
              <p><strong>Tipo:</strong> {permissions.isRealEmployee ? 'Empleado Real' : 'Propietario'}</p>
              <p><strong>Puede cambiar modos:</strong> {!permissions.isRealEmployee ? 'Sí' : 'No'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}