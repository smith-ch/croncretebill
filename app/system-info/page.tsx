"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Building2, 
  Code, 
  Mail, 
  Phone, 
  Globe, 
  CheckCircle,
  Star,
  Github,
  Linkedin,
  ArrowLeft,
  Receipt,
  User,
  XCircle,
  Download,
  RefreshCw,
  Smartphone,
  Calendar,
  Award
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface PWACheck {
  name: string
  status: boolean
  description: string
}

export default function SystemInfoPage() {
  const router = useRouter()
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-3 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => router.back()} className="hover:bg-slate-100">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-slate-800 bg-clip-text text-transparent">
                  Información del Sistema
                </h1>
                <p className="text-slate-600 mt-1 text-sm lg:text-base">Sistema de Facturación y Gestión Empresarial</p>
              </div>
            </div>
          </div>
        </div>

        {/* Developer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-6 h-6 text-blue-600" />
              Desarrollador
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Smith Rodríguez</h3>
                    <p className="text-sm text-slate-600">Desarrollador Full Stack</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium">Experiencia</p>
                    <p className="text-sm text-slate-600">2 años de experiencia en desarrollo</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Teléfono</p>
                    <p className="text-sm text-slate-600">+1 829-987-4447</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-slate-600">smithrodriguezz345@gmail.com</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Linkedin className="w-5 h-5 text-blue-700" />
                  <div>
                    <p className="font-medium">LinkedIn</p>
                    <p className="text-sm text-slate-600">Perfil de LinkedIn disponible</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PWA Install Button */}
        {canInstall && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Download className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-800 dark:text-green-200">
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

        {/* PWA Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-6 h-6 text-purple-600" />
                Estado PWA
              </div>
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
                      <p className="text-sm text-gray-600 dark:text-gray-300">
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

        {/* Installation Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-6 h-6 text-green-600" />
              Instrucciones de Instalación PWA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Chrome/Edge (Escritorio):
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 ml-6">
                Busca el ícono de instalación en la barra de direcciones o ve a Menú → Instalar ConcreteBill
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Safari (iOS):
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 ml-6">
                Toca el botón Compartir → Añadir a pantalla de inicio
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Chrome (Android):
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 ml-6">
                Toca el menú (⋮) → Añadir a pantalla de inicio
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Main System Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              Sistema ConcreTeBill
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Acerca del Sistema</h3>
                  <p className="text-slate-600">
                    ConcreTeBill es un sistema completo de facturación y gestión empresarial diseñado para 
                    optimizar los procesos administrativos y contables de tu negocio.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Características principales:</h4>
                  <ul className="space-y-1 text-sm text-slate-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Facturación electrónica
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Gestión de inventario
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Recibos térmicos
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Reportes DGII
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Precios múltiples por producto
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Gestión de clientes y proyectos
                    </li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Información Técnica</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Versión:</span>
                      <Badge variant="outline">v2.1.0</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tecnología:</span>
                      <Badge variant="outline">Next.js + TypeScript</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Base de datos:</span>
                      <Badge variant="outline">Supabase PostgreSQL</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Última actualización:</span>
                      <Badge variant="outline">Octubre 2025</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Estado del sistema:</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-slate-600">Sistema operativo</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Developer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-6 h-6 text-purple-600" />
              Desarrollador
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">Smith Rodríguez</h3>
                  <p className="text-lg text-blue-600 font-medium">Desarrollador Full Stack</p>
                </div>
                
                <p className="text-slate-600">
                  Especialista en desarrollo de aplicaciones web modernas con 2 años de experiencia 
                  en tecnologías como React, Next.js, TypeScript y bases de datos PostgreSQL.
                </p>

                <div className="space-y-2">
                  <h4 className="font-medium">Especialidades:</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">React/Next.js</Badge>
                    <Badge variant="secondary">TypeScript</Badge>
                    <Badge variant="secondary">Node.js</Badge>
                    <Badge variant="secondary">PostgreSQL</Badge>
                    <Badge variant="secondary">Supabase</Badge>
                    <Badge variant="secondary">Tailwind CSS</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">2 años de experiencia</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">20+ proyectos completados</span>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="border-t pt-6">
              <h4 className="font-medium mb-4">Información de contacto:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-slate-600">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">smithrodriguezz345@gmail.com</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">+1 829-987-4447</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Github className="w-4 h-4" />
                  <span className="text-sm">github.com/smith-ch</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Linkedin className="w-4 h-4" />
                  <span className="text-sm">linkedin.com/in/smith-rodriguez</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-6 h-6 text-green-600" />
              Servicios y Soporte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Code className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-medium mb-1">Desarrollo Custom</h4>
                <p className="text-sm text-slate-600">Funcionalidades personalizadas para tu negocio</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-medium mb-1">Soporte Técnico</h4>
                <p className="text-sm text-slate-600">Asistencia y mantenimiento continuo</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Star className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <h4 className="font-medium mb-1">Capacitación</h4>
                <p className="text-sm text-slate-600">Entrenamiento en el uso del sistema</p>
              </div>
            </div>

            <div className="border-t pt-4 text-center">
              <p className="text-sm text-slate-500">
                © 2025 ConcreTeBill - Desarrollado por Smith Rodríguez. Todos los derechos reservados.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <Building2 className="h-4 w-4 mr-2" />
              Ir al Dashboard
            </Link>
          </Button>
          <Button asChild>
            <Link href="/thermal-receipts">
              <Receipt className="h-4 w-4 mr-2" />
              Recibos Térmicos
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}