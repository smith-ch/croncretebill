'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    // Verificar si ya está instalado
    const checkIfInstalled = () => {
      // PWA instalada si se ejecuta en modo standalone
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      // iOS Safari
      const isIOSStandalone = (window.navigator as any).standalone === true
      
      setIsInstalled(isStandalone || isIOSStandalone)
    }

    // Manejar el evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setInstallPrompt(promptEvent)
      setIsInstallable(true)
    }

    // Manejar cuando la app se instala
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setInstallPrompt(null)
    }

    checkIfInstalled()

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = async () => {
    if (!installPrompt) {
      return false
    }

    try {
      await installPrompt.prompt()
      const choiceResult = await installPrompt.userChoice
      
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true)
        setIsInstallable(false)
        setInstallPrompt(null)
        return true
      }
      return false
    } catch (error) {
      console.error('Error installing PWA:', error)
      return false
    }
  }

  const getInstallInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase()
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return {
        browser: 'Safari iOS',
        steps: [
          'Toca el botón de compartir (⬆️)',
          'Selecciona "Añadir a pantalla de inicio"',
          'Toca "Añadir" para instalar la app'
        ]
      }
    } else if (userAgent.includes('android')) {
      return {
        browser: 'Android Chrome',
        steps: [
          'Toca el menú (⋮) en la esquina superior derecha',
          'Selecciona "Instalar app" o "Añadir a pantalla de inicio"',
          'Toca "Instalar" para confirmar'
        ]
      }
    } else {
      return {
        browser: 'Desktop',
        steps: [
          'Busca el ícono de instalación en la barra de direcciones',
          'Haz clic en "Instalar ConcreteBill"',
          'Confirma la instalación'
        ]
      }
    }
  }

  return {
    isInstalled,
    isInstallable,
    install,
    getInstallInstructions,
    canInstall: isInstallable && !isInstalled
  }
}