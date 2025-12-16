"use client"

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from './use-toast'

interface ShortcutConfig {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: () => void
  description: string
  disabled?: boolean
}

export function useKeyboardShortcuts() {
  const router = useRouter()

  const shortcuts: ShortcutConfig[] = [
    {
      key: 'd',
      ctrlKey: true,
      action: () => router.push('/dashboard'),
      description: 'Ir al Dashboard'
    },
    {
      key: 'f',
      ctrlKey: true,
      action: () => router.push('/invoices/new'),
      description: 'Nueva Factura'
    },
    {
      key: 'c',
      ctrlKey: true,
      action: () => router.push('/clients'),
      description: 'Gestionar Clientes'
    },
    {
      key: 'p',
      ctrlKey: true,
      action: () => router.push('/products'),
      description: 'Gestionar Productos'
    },
    {
      key: 'r',
      ctrlKey: true,
      action: () => router.push('/monthly-reports'),
      description: 'Ver Reportes'
    },
    {
      key: 's',
      ctrlKey: true,
      action: () => router.push('/settings'),
      description: 'Configuración'
    },
    {
      key: '/',
      ctrlKey: true,
      action: () => {
        toast({
          title: "⌨️ Atajos de Teclado",
          description: "Ctrl+D: Dashboard | Ctrl+F: Nueva Factura | Ctrl+C: Clientes | Ctrl+P: Productos | Ctrl+R: Reportes | Ctrl+S: Configuración",
          duration: 8000,
        })
      },
      description: 'Mostrar Ayuda de Atajos'
    }
  ]

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // No activar atajos si estamos en un campo de entrada
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return
    }

    for (const shortcut of shortcuts) {
      if (shortcut.disabled) continue

      const ctrlMatch = shortcut.ctrlKey ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey
      const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey
      const altMatch = shortcut.altKey ? event.altKey : !event.altKey

      if (
        event.key.toLowerCase() === shortcut.key.toLowerCase() &&
        ctrlMatch &&
        shiftMatch &&
        altMatch
      ) {
        event.preventDefault()
        shortcut.action()
        return
      }
    }
  }, [shortcuts])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])

  return { shortcuts }
}

// Hook para usar en componentes específicos con atajos personalizados
export function useCustomShortcut(
  key: string,
  action: () => void,
  options: {
    ctrlKey?: boolean
    shiftKey?: boolean
    altKey?: boolean
    disabled?: boolean
  } = {}
) {
  useEffect(() => {
    if (options.disabled) return

    const handleKeyPress = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const ctrlMatch = options.ctrlKey ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey
      const shiftMatch = options.shiftKey ? event.shiftKey : !event.shiftKey
      const altMatch = options.altKey ? event.altKey : !event.altKey

      if (
        event.key.toLowerCase() === key.toLowerCase() &&
        ctrlMatch &&
        shiftMatch &&
        altMatch
      ) {
        event.preventDefault()
        action()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [key, action, options])
}
