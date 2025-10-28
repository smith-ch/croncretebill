"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Zap } from 'lucide-react'

export function LoadingBypass() {
  const [showBypass, setShowBypass] = useState(false)

  useEffect(() => {
    // Mostrar el bypass después de 8 segundos de carga
    const timer = setTimeout(() => {
      setShowBypass(true)
    }, 8000)

    return () => clearTimeout(timer)
  }, [])

  const handleForceLoad = () => {
    // Limpiar localStorage problemático
    localStorage.removeItem('employee-view-mode')
    localStorage.removeItem('was-originally-owner')
    localStorage.removeItem('role-password-verified')
    
    // Forzar permisos de owner por defecto
    localStorage.setItem('emergency-override', 'true')
    
    // Recargar la página
    window.location.reload()
  }

  if (!showBypass) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4 text-center">
        <AlertTriangle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Carga Lenta Detectada</h3>
        <p className="text-sm text-gray-600 mb-4">
          La aplicación está tardando más de lo esperado. Puedes forzar la carga con permisos básicos.
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            onClick={handleForceLoad}
            variant="default"
            className="flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            Forzar Carga
          </Button>
          <Button
            onClick={() => setShowBypass(false)}
            variant="outline"
          >
            Seguir Esperando
          </Button>
        </div>
      </div>
    </div>
  )
}