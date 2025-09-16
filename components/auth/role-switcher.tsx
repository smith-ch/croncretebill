"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Crown, User, EyeOff } from 'lucide-react'
import { useUserPermissions } from '@/hooks/use-user-permissions-simple'
import { PasswordVerification } from './password-verification'

export function RoleSwitcher() {
  const [isEmployeeMode, setIsEmployeeMode] = useState(false)
  const { permissions, refresh } = useUserPermissions()

  // Solo mostrar para owners (incluso si están en modo empleado) O empleados reales
  const isOwner = permissions.isOwner || permissions.wasOriginallyOwner
  const isRealEmployee = permissions.isRealEmployee || false

  console.log('RoleSwitcher Debug:', {
    isOwner,
    originalIsOwner: permissions.wasOriginallyOwner,
    currentIsOwner: permissions.isOwner,
    isRealEmployee,
    permissions,
    isEmployeeMode
  })

  useEffect(() => {
    // Mantener el estado en localStorage
    const savedMode = localStorage.getItem('employee-view-mode')
    console.log('Saved employee mode:', savedMode)
    if (savedMode === 'true') {
      setIsEmployeeMode(true)
    }
  }, [])

  const toggleToEmployee = () => {
    setIsEmployeeMode(true)
    localStorage.setItem('employee-view-mode', 'true')
    
    // Forzar actualización de permisos
    if (refresh) {
      refresh()
    }
    
    // Recargar la página para aplicar los cambios
    window.location.reload()
  }

  const handleEmergencyResetVerified = () => {
    // Reset de emergencia: limpiar localStorage y recargar
    localStorage.removeItem('employee-view-mode')
    localStorage.removeItem('was-originally-owner')
    window.location.reload()
  }

  const backToOwnerMode = () => {
    setIsEmployeeMode(false)
    localStorage.setItem('employee-view-mode', 'false')
    
    // Forzar actualización de permisos
    if (refresh) {
      refresh()
    }
    
    // Recargar la página para aplicar los cambios
    window.location.reload()
  }

  if (!isOwner && !isRealEmployee) {
    // No mostrar componente si no es owner ni empleado real
    return null
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isEmployeeMode ? (
              <User className="h-5 w-5 text-blue-600" />
            ) : (
              <Crown className="h-5 w-5 text-yellow-600" />
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-sm">
                  {isEmployeeMode ? 'Modo Trabajo - Empleado' : 'Vista de Propietario'}
                </span>
                <Badge variant={isEmployeeMode ? "secondary" : "default"}>
                  {isEmployeeMode ? 'Activo' : 'Completo'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                {isEmployeeMode 
                  ? 'Trabajando con permisos de empleado'
                  : 'Acceso completo como propietario'
                }
              </p>
            </div>
          </div>
          
          {/* Controles para propietarios */}
          {!isRealEmployee && (
            <div className="flex space-x-2">
              {isEmployeeMode ? (
                <PasswordVerification onVerified={backToOwnerMode}>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Crown className="h-4 w-4" />
                    <span>Volver a Owner</span>
                  </Button>
                </PasswordVerification>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={toggleToEmployee}
                  className="flex items-center space-x-2"
                >
                  <EyeOff className="h-4 w-4" />
                  <span>Cambiar a Empleado</span>
                </Button>
              )}
            </div>
          )}
        </div>
        
        {/* Botón de emergencia - solo para propietario */}
        {!isRealEmployee && !isEmployeeMode && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <PasswordVerification onVerified={handleEmergencyResetVerified}>
              <Button
                variant="destructive"
                size="sm"
                className="w-full text-xs"
              >
                🚨 Reset Modo (Emergencia)
              </Button>
            </PasswordVerification>
          </div>
        )}
        
        {(isEmployeeMode || isRealEmployee) && (
          <div className="mt-3 p-2 bg-blue-50 rounded-md">
            <p className="text-xs text-blue-700">
              <strong>{isRealEmployee ? 'Empleado - Vista de trabajo:' : 'Modo empleado activo:'}</strong> Trabajando con permisos limitados.
              {!isRealEmployee && ' Solo el propietario puede cambiar este modo.'}
            </p>
            {isRealEmployee ? (
              <div className="mt-2 p-2 bg-green-50 rounded border-l-4 border-green-400">
                <p className="text-xs text-green-700">
                  👤 <strong>Empleado:</strong> Vista automática. Se mantiene al cerrar/abrir sesión.
                </p>
              </div>
            ) : (
              <div className="mt-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                <p className="text-xs text-yellow-700">
                  🔒 <strong>Modo prueba:</strong> Requiere contraseña para cambiar. Se mantiene entre sesiones.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}