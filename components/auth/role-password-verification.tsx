"use client"

import React, { useState, useEffect } from 'react'
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
import { Crown, Eye, Lock, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface RolePasswordVerificationProps {
  onVerified: () => void
  children: React.ReactNode
  action?: 'switch_to_owner' | 'emergency_reset'
}

export function RolePasswordVerification({ onVerified, children, action = 'switch_to_owner' }: RolePasswordVerificationProps) {
  const [password, setPassword] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [rolePassword, setRolePassword] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchRolePassword()
    }
  }, [isOpen])

  const fetchRolePassword = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) {
        return
      }

      const { data } = await supabase
        .from('company_settings')
        .select('role_switch_password, role_password_attempts, role_password_locked_until')
        .eq('user_id', user.id)
        .single() as any

      if (data) {
        // Verificar si está bloqueado
        const lockedUntil = data.role_password_locked_until ? new Date(data.role_password_locked_until) : null
        if (lockedUntil && lockedUntil > new Date()) {
          setError(`Acceso bloqueado hasta: ${lockedUntil.toLocaleString()}`)
          return
        }

        setRolePassword(data.role_switch_password || 'admin123')
      } else {
        // Si no existe contraseña específica, usar una por defecto
        setRolePassword('admin123') // Contraseña por defecto
      }
    } catch (error) {
      console.error('Error fetching role password:', error)
      setRolePassword('admin123') // Fallback
    }
  }

  const handleVerify = async () => {
    if (!password.trim()) {
      setError('Por favor ingresa la contraseña de role')
      return
    }

    if (!rolePassword) {
      setError('Error al cargar la configuración de seguridad')
      return
    }

    setIsVerifying(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) {
        throw new Error('Usuario no encontrado')
      }

      // Verificar la contraseña específica del role switcher
      if (password !== rolePassword) {
        // Incrementar intentos fallidos
        const { data: currentData } = await supabase
          .from('company_settings')
          .select('role_password_attempts')
          .eq('user_id', user.id)
          .single() as any

        const attempts = (currentData?.role_password_attempts || 0) + 1
        const shouldLock = attempts >= 3

        await supabase
          .from('company_settings')
          .update({
            role_password_attempts: attempts,
            role_password_locked_until: shouldLock ? new Date(Date.now() + 30 * 60 * 1000) : null // 30 minutos
          } as any)
          .eq('user_id', user.id)

        if (shouldLock) {
          throw new Error('Demasiados intentos fallidos. Acceso bloqueado por 30 minutos.')
        } else {
          throw new Error(`Contraseña incorrecta. Intentos restantes: ${3 - attempts}`)
        }
      }

      // Si llegamos aquí, la contraseña es correcta - resetear intentos
      await supabase
        .from('company_settings')
        .update({
          role_password_attempts: 0,
          role_password_locked_until: null
        } as any)
        .eq('user_id', user.id)

      setIsOpen(false)
      setPassword('')
      onVerified()

    } catch (error: any) {
      console.error('Error verifying role password:', error)
      setError(error.message || 'Error al verificar la contraseña de role')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setPassword('')
    setError('')
  }

  const getDialogContent = () => {
    switch (action) {
      case 'emergency_reset':
        return {
          title: 'Reset de Emergencia',
          description: 'Esta acción eliminará todas las configuraciones de role. Confirma la contraseña de administración.',
          icon: <Shield className="h-5 w-5 text-red-600" />
        }
      default:
        return {
          title: 'Verificación de Role',
          description: 'Para cambiar el modo de visualización, confirma la contraseña de administración de roles.',
          icon: <Crown className="h-5 w-5 text-yellow-600" />
        }
    }
  }

  const content = getDialogContent()

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {content.icon}
            <span>{content.title}</span>
          </DialogTitle>
          <DialogDescription>
            {content.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role-password">Contraseña de Administración</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="role-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleVerify()
                  }
                }}
                placeholder="Contraseña de role"
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

          <div className="bg-red-900/30 p-3 rounded-md border border-red-800">
            <div className="flex items-start space-x-2">
              <Shield className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-300">
                <div className="font-semibold mb-1">🔐 Contraseña de Administración</div>
                <ul className="text-xs space-y-1">
                  <li>• Independiente de tu contraseña de usuario</li>
                  <li>• Solo el propietario debe conocerla</li>
                  <li>• Se bloquea tras 3 intentos fallidos</li>
                  <li>• Nunca visible por seguridad</li>
                </ul>
              </div>
            </div>
          </div>

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
              className={action === 'emergency_reset' 
                ? "bg-red-600 hover:bg-red-700" 
                : "bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800"
              }
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