"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Download, RefreshCw } from 'lucide-react'

interface PWACheck {
  name: string
  status: boolean
  description: string
}

export default function PWAStatusPage() {
  const [checks, setChecks] = useState<PWACheck[]>([])
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    const runChecks = async () => {
      const results: PWACheck[] = []

      // Check HTTPS
      results.push({
        name: 'HTTPS',
        status: location.protocol === 'https:' || location.hostname === 'localhost',
        description: 'La PWA requiere HTTPS para ser installable'
      })

      // Check Service Worker
      const swSupported = 'serviceWorker' in navigator
      let swRegistered = false
      if (swSupported) {
        try {
          const registration = await navigator.serviceWorker.getRegistration()
          swRegistered = !!registration
        } catch (e) {
          swRegistered = false
        }
      }
      results.push({
        name: 'Service Worker',
        status: swSupported && swRegistered,
        description: 'Service Worker registrado y funcionando'
      })

      // Check Manifest
      let manifestValid = false
      try {
        const response = await fetch('/manifest.json')
        const manifest = await response.json()
        manifestValid = !!(manifest.name && manifest.start_url && manifest.icons && manifest.icons.length > 0)
      } catch (e) {
        manifestValid = false
      }
      results.push({
        name: 'Web App Manifest',
        status: manifestValid,
        description: 'Manifest válido con nombre, start_url e iconos'
      })

      // Check Icons
      let iconsValid = false
      try {
        const response = await fetch('/manifest.json')
        const manifest = await response.json()
        const has192 = manifest.icons.some((icon: any) => 
          icon.sizes && icon.sizes.includes('192') && icon.type === 'image/png'
        )
        const has512 = manifest.icons.some((icon: any) => 
          icon.sizes && icon.sizes.includes('512') && icon.type === 'image/png'
        )
        iconsValid = has192 && has512
      } catch (e) {
        iconsValid = false
      }
      results.push({
        name: 'Iconos PNG',
        status: iconsValid,
        description: 'Iconos 192x192 y 512x512 PNG disponibles'
      })

      // Check if installable
      const allPassed = results.every(check => check.status)
      results.push({
        name: 'Installable',
        status: allPassed,
        description: 'La PWA cumple todos los requisitos para instalación'
      })

      setChecks(results)
    }

    runChecks()

    // Listen for beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setCanInstall(true)
    })

    // Check if already installed
    window.addEventListener('appinstalled', () => {
      setCanInstall(false)
      setInstallPrompt(null)
    })

  }, [])

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') {
        setCanInstall(false)
        setInstallPrompt(null)
      }
    }
  }

  const forceReload = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister()
        })
        window.location.reload()
      })
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-200 dark:text-white mb-2">
          Estado PWA - ConcreteBill
        </h1>
        <p className="text-slate-400 dark:text-gray-300">
          Verificación de requisitos para Progressive Web App
        </p>
      </div>

      {canInstall && (
        <Card className="border-green-800 bg-green-900/30 dark:bg-green-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Download className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-300 dark:text-green-200">
                    ¡PWA Lista para Instalar!
                  </h3>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    Puedes instalar ConcreteBill como aplicación
                  </p>
                </div>
              </div>
              <Button onClick={handleInstall} className="bg-green-600 hover:bg-green-700">
                <Download className="h-4 w-4 mr-2" />
                Instalar App
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Verificación de Requisitos PWA
            <Button onClick={forceReload} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Recargar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {checks.map((check, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  {check.status ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <h4 className="font-medium">{check.name}</h4>
                    <p className="text-sm text-slate-400 dark:text-gray-300">
                      {check.description}
                    </p>
                  </div>
                </div>
                <Badge variant={check.status ? "default" : "destructive"}>
                  {check.status ? "✓ Pasó" : "✗ Falló"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instrucciones de Instalación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Chrome/Edge (Escritorio):</h4>
            <p className="text-sm text-slate-400 dark:text-gray-300">
              Busca el ícono de instalación en la barra de direcciones o ve a Menú → Instalar ConcreteBill
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Safari (iOS):</h4>
            <p className="text-sm text-slate-400 dark:text-gray-300">
              Toca el botón Compartir → Añadir a pantalla de inicio
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Chrome (Android):</h4>
            <p className="text-sm text-slate-400 dark:text-gray-300">
              Toca el menú (⋮) → Añadir a pantalla de inicio
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}