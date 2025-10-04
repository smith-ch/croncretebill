"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Crown, Eye, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface PasswordVerificationProps {
  onVerified: () => void
  children: React.ReactNode
}

export function PasswordVerification({ onVerified, children }: PasswordVerificationProps) {
  const [password, setPassword] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const handleVerify = async () => {
    if (!password.trim()) {
      setError('Por favor ingresa tu contraseña')
      return
    }

    setIsVerifying(true)
    setError('')

    try {
      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) {
        throw new Error('No se pudo obtener el usuario actual')
      }

      // Intentar hacer signin con las credenciales actuales para verificar la contraseña
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password
      })

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('Contraseña incorrecta')
        }
        throw signInError
      }

      // Si llegamos aquí, la contraseña es correcta
      setIsOpen(false)
      setPassword('')
      onVerified()

    } catch (error: any) {
      console.error('Error verifying password:', error)
      setError(error.message || 'Error al verificar la contraseña')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setPassword('')
    setError('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-yellow-600" />
            <span>Verificación de Propietario</span>
          </DialogTitle>
          <DialogDescription>
            Para volver al modo propietario, confirma tu contraseña por seguridad.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleVerify()
                  }
                }}
                placeholder="Ingresa tu contraseña"
                className="pl-10"
                disabled={isVerifying}
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isVerifying}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleVerify}
              disabled={isVerifying || !password.trim()}
              className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800"
            >
              {isVerifying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Verificando...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Verificar y Continuar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}