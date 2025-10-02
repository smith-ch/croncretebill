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

  useEffect(() => {
    // Mantener el estado en localStorage
    const savedMode = localStorage.getItem('employee-view-mode')
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

  if (!isOwner && !isRealEmployee && permissions.role !== 'owner' && permissions.role !== 'admin') {
    // No mostrar componente solo si definitivamente no tiene permisos
    console.log('RoleSwitcher: Ocultando componente - sin permisos')
    return null
  }

  // Fallback si hay problemas de carga
  if (!permissions || Object.keys(permissions).length === 0) {
    console.log('RoleSwitcher: Mostrando fallback - permisos no cargados')
    return (
      <Card className="w-full max-w-md mx-auto opacity-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <div className="text-sm text-gray-500">Cargando configuración de rol...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-full ${
              isEmployeeMode 
                ? 'bg-blue-100 ring-2 ring-blue-200' 
                : 'bg-amber-100 ring-2 ring-amber-200'
            }`}>
              {isEmployeeMode ? (
                <User className="h-6 w-6 text-blue-600" />
              ) : (
                <Crown className="h-6 w-6 text-amber-600" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <span className="font-semibold text-base text-gray-800">
                  {isEmployeeMode ? 'Modo Trabajo' : 'Vista Propietario'}
                </span>
                <Badge 
                  variant={isEmployeeMode ? "secondary" : "default"}
                  className={`${
                    isEmployeeMode 
                      ? 'bg-blue-500 text-white hover:bg-blue-600' 
                      : 'bg-amber-500 text-white hover:bg-amber-600'
                  } px-3 py-1 text-xs font-medium`}
                >
                  {isEmployeeMode ? 'EMPLEADO' : 'COMPLETO'}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {isEmployeeMode 
                  ? 'Permisos limitados • Solo lectura'
                  : 'Acceso total • Todas las funciones'
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
                    className="flex items-center space-x-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 transition-all duration-200"
                  >
                    <Crown className="h-4 w-4" />
                    <span className="font-medium">Restaurar</span>
                  </Button>
                </PasswordVerification>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={toggleToEmployee}
                  className="flex items-center space-x-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                >
                  <EyeOff className="h-4 w-4" />
                  <span className="font-medium">Vista Empleado</span>
                </Button>
              )}
            </div>
          )}
        </div>
        
        {/* Información de estado mejorada */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          {(isEmployeeMode || isRealEmployee) && (
            <div className={`p-4 rounded-xl ${
              isRealEmployee 
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' 
                : 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${
                  isRealEmployee ? 'bg-green-500' : 'bg-blue-500'
                } animate-pulse`}></div>
                <p className={`text-sm font-medium ${
                  isRealEmployee ? 'text-green-800' : 'text-blue-800'
                }`}>
                  {isRealEmployee ? '👤 Cuenta de Empleado' : '🔒 Modo Simulación'}
                </p>
              </div>
              <p className={`text-xs ${
                isRealEmployee ? 'text-green-700' : 'text-blue-700'
              }`}>
                {isRealEmployee 
                  ? 'Vista permanente con permisos limitados. No puede acceder a configuraciones críticas.'
                  : 'Probando la experiencia del empleado. Requiere autenticación para restaurar.'
                }
              </p>
            </div>
          )}
          
          {!isEmployeeMode && !isRealEmployee && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                <p className="text-sm font-medium text-amber-800">👑 Acceso Completo</p>
              </div>
              <p className="text-xs text-amber-700">
                Todas las funciones disponibles. Puedes cambiar a vista empleado para probar la experiencia.
              </p>
            </div>
          )}
        </div>

        {/* Botón de emergencia - solo para propietario */}
        {!isRealEmployee && !isEmployeeMode && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <PasswordVerification onVerified={handleEmergencyResetVerified}>
              <Button
                variant="destructive"
                size="sm"
                className="w-full text-xs font-medium bg-red-500 hover:bg-red-600 border-0 shadow-md transition-all duration-200"
              >
                � Reset de Emergencia
              </Button>
            </PasswordVerification>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Solo usar si hay problemas con el cambio de modo
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}