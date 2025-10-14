"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Crown, User, EyeOff } from 'lucide-react'
import { useUserPermissions } from '@/hooks/use-user-permissions-simple'
import { RolePasswordVerification } from './role-password-verification'

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
    <div className="flex items-center gap-2">
      {/* Badge de estado compacto */}
      <Badge 
        variant={isEmployeeMode ? "secondary" : "default"}
        className={`${
          isEmployeeMode 
            ? 'bg-blue-500 text-white hover:bg-blue-600' 
            : 'bg-amber-500 text-white hover:bg-amber-600'
        } px-2 py-1 text-xs font-medium flex items-center gap-1`}
      >
        {isEmployeeMode ? (
          <User className="h-3 w-3" />
        ) : (
          <Crown className="h-3 w-3" />
        )}
        {isEmployeeMode ? 'EMPLEADO' : 'COMPLETO'}
      </Badge>
      
      {/* Controles compactos */}
      {!isRealEmployee && (
        <>
          {isEmployeeMode ? (
            <RolePasswordVerification onVerified={backToOwnerMode} action="switch_to_owner">
              <Button 
                variant="outline" 
                size="sm"
                className="h-6 px-2 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                <Crown className="h-3 w-3" />
              </Button>
            </RolePasswordVerification>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleToEmployee}
              className="h-6 px-2 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <EyeOff className="h-3 w-3" />
            </Button>
          )}
        </>
      )}
      
      {/* Reset de emergencia compacto - solo para propietario */}
      {!isRealEmployee && !isEmployeeMode && (
        <RolePasswordVerification onVerified={handleEmergencyResetVerified} action="emergency_reset">
          <Button
            variant="destructive"
            size="sm"
            className="h-6 px-2 text-xs bg-red-500 hover:bg-red-600"
          >
            ⚡
          </Button>
        </RolePasswordVerification>
      )}
    </div>
  )
}