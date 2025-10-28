"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export function EmergencyReset() {
  const handleEmergencyReset = () => {
    // Limpiar todos los estados problemáticos del localStorage
    const keysToRemove = [
      'employee-view-mode',
      'was-originally-owner',
      'role-password-verified'
    ]
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
    })
    
    // Mostrar mensaje de confirmación
    const confirmed = confirm(
      'Se han limpiado los datos de sesión. La página se recargará para aplicar los cambios. ¿Continuar?'
    )
    
    if (confirmed) {
      window.location.reload()
    }
  }

  return (
    <Button 
      onClick={handleEmergencyReset}
      variant="destructive"
      size="sm"
      className="fixed bottom-4 left-4 z-50 opacity-75 hover:opacity-100"
    >
      <AlertTriangle className="h-4 w-4 mr-2" />
      Reset Emergencia
    </Button>
  )
}