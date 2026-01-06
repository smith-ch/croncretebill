"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Building2, 
  Code, 
  Mail, 
  Globe, 
  CheckCircle,
  Star,
  Github,
  Linkedin,
  ArrowLeft,
  Receipt,
  User,
  Award,
  AlertTriangle,
  Sparkles,
  CreditCard,
  Calendar,
  Send,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface PWACheck {
  name: string
  status: boolean
  description: string
}

interface SubscriptionPlan {
  id: string
  name: string
  display_name: string
  description: string
  price_monthly: number
  price_yearly: number
}

export default function SystemInfoPage() {
  const router = useRouter()
  const [checks, setChecks] = useState<PWACheck[]>([])
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [showRequestDialog, setShowRequestDialog] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [requestMessage, setRequestMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadPlansAndUser()
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

  async function loadPlansAndUser() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }

      // Load subscription plans
      const { data: plansData, error } = await supabase
        .from('subscription_plans')
        .select('id, name, display_name, description, price_monthly, price_yearly')
        .eq('is_active', true)
        .order('price_monthly')

      if (error) throw error
      setPlans(plansData || [])
    } catch (error) {
      console.error('Error loading plans:', error)
    }
  }

  async function handleRequestSubscription(plan: SubscriptionPlan) {
    if (!userId) {
      toast({
        title: "Inicia sesión",
        description: "Debes estar registrado e iniciar sesión para solicitar una suscripción",
        variant: "destructive"
      })
      router.push('/login')
      return
    }

    setSelectedPlan(plan)
    setShowRequestDialog(true)
  }

  async function submitSubscriptionRequest() {
    if (!selectedPlan || !userId) return

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('subscription_requests')
        .insert({
          user_id: userId,
          plan_id: selectedPlan.id,
          message: requestMessage || null,
          status: 'pending'
        })

      if (error) throw error

      toast({
        title: "✅ Solicitud Enviada",
        description: `Tu solicitud para el ${selectedPlan.display_name} ha sido enviada. El administrador la revisará pronto.`,
      })

      setShowRequestDialog(false)
      setSelectedPlan(null)
      setRequestMessage('')
    } catch (error: any) {
      console.error('Error creating request:', error)
      toast({
        title: "Error",
        description: error.message || "Error al enviar la solicitud",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

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

        {/* Aviso de Modelo de Suscripción */}
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50 dark:bg-orange-900/20 relative overflow-hidden">
          {/* Icono flotante animado */}
          <div className="absolute top-4 right-4 animate-bounce">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full flex items-center justify-center shadow-2xl">
                <Sparkles className="h-6 w-6 text-white animate-pulse" />
              </div>
            </div>
          </div>
          
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg relative">
                  <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-20"></div>
                  <AlertTriangle className="h-10 w-10 text-white relative z-10" />
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h3 className="text-2xl font-bold text-orange-900 dark:text-orange-200">
                    ⚠️ Próximamente: Sistema por Suscripción
                  </h3>
                  <Badge className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg w-fit">
                    🆕 Novedad Importante
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <p className="text-orange-800 dark:text-orange-300 leading-relaxed text-base">
                    <strong>ConcreteBill pasará a ser un servicio de pago por suscripción.</strong> Estamos trabajando para ofrecerte 
                    diferentes planes que se adapten a las necesidades específicas de tu negocio, desde pequeños emprendimientos 
                    hasta grandes empresas.
                  </p>
                  
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-l-4 border-green-500 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-green-900 dark:text-green-200 mb-1">
                          ✨ ¡Buenas Noticias para Usuarios Actuales!
                        </p>
                        <p className="text-green-800 dark:text-green-300 text-sm">
                          Todos los usuarios registrados antes del lanzamiento oficial del modelo de suscripción 
                          recibirán <strong>acceso gratuito extendido</strong> y <strong>descuentos exclusivos permanentes</strong> 
                          como agradecimiento por su confianza.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Planes de Suscripción Preview */}
                <div className="bg-white/70 dark:bg-gray-800/70 rounded-xl p-5 space-y-4 border border-orange-200">
                  <h4 className="font-bold text-orange-900 dark:text-orange-200 flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Planes de Suscripción Disponibles:
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Plan Básico */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">B</span>
                        </div>
                        <h5 className="font-bold text-blue-900 dark:text-blue-200">Plan Básico</h5>
                      </div>
                      <ul className="space-y-1 text-xs text-blue-800 dark:text-blue-300 mb-3">
                        <li className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          50 facturas/mes
                        </li>
                        <li className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          1 usuario
                        </li>
                        <li className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Recibos térmicos
                        </li>
                        <li className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Soporte por email
                        </li>
                      </ul>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mb-3 font-semibold">
                        Ideal para emprendedores
                      </p>
                      {plans.find(p => p.name === 'starter') && (
                        <Button
                          size="sm"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handleRequestSubscription(plans.find(p => p.name === 'starter')!)}
                        >
                          <Send className="h-3 w-3 mr-2" />
                          Solicitar Plan
                        </Button>
                      )}
                    </div>
                    
                    {/* Plan Profesional */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border-2 border-purple-400 relative">
                      <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                        ⭐ Popular
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">P</span>
                        </div>
                        <h5 className="font-bold text-purple-900 dark:text-purple-200">Plan Profesional</h5>
                      </div>
                      <ul className="space-y-1 text-xs text-purple-800 dark:text-purple-300 mb-3">
                        <li className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Facturas ilimitadas
                        </li>
                        
                        <li className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Multi-moneda
                        </li>
                        <li className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Reportes DGII avanzados
                        </li>
                        <li className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Soporte prioritario
                        </li>
                      </ul>
                      <p className="text-xs text-purple-600 dark:text-purple-400 mb-3 font-semibold">
                        Perfecto para negocios en crecimiento
                      </p>
                      {plans.find(p => p.name === 'professional') && (
                        <Button
                          size="sm"
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                          onClick={() => handleRequestSubscription(plans.find(p => p.name === 'professional')!)}
                        >
                          <Send className="h-3 w-3 mr-2" />
                          Solicitar Plan
                        </Button>
                      )}
                    </div>
                    
                    {/* Plan Empresarial */}
                    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg p-4 border border-amber-300">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">E</span>
                        </div>
                        <h5 className="font-bold text-amber-900 dark:text-amber-200">Plan Empresarial</h5>
                      </div>
                      <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-300 mb-3">
                        <li className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Todo ilimitado
                        </li>
                        
                        <li className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          API personalizada
                        </li>
                        <li className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Múltiples sucursales
                        </li>
                        <li className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Soporte 24/7
                        </li>
                      </ul>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 font-semibold">
                        Para grandes empresas
                      </p>
                      {plans.find(p => p.name === 'enterprise') && (
                        <Button
                          size="sm"
                          className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white"
                          onClick={() => handleRequestSubscription(plans.find(p => p.name === 'enterprise')!)}
                        >
                          <Send className="h-3 w-3 mr-2" />
                          Solicitar Plan
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Beneficios Adicionales */}
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-bold text-orange-900 dark:text-orange-200 flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Beneficios en Todos los Planes:
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-orange-900 dark:text-orange-200">
                        Facturación electrónica NCF
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-orange-900 dark:text-orange-200">
                        Gestión de inventario
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-orange-900 dark:text-orange-200">
                        App móvil incluida
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-orange-900 dark:text-orange-200">
                        Respaldos automáticos
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-orange-900 dark:text-orange-200">
                        Actualizaciones gratis
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-orange-900 dark:text-orange-200">
                        Sin contratos anuales
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Línea de tiempo */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-l-4 border-blue-500 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-blue-900 dark:text-blue-200 mb-2">
                        📅 Línea de Tiempo:
                      </p>
                      <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                        <li className="flex items-start gap-2">
                          <span className="font-bold min-w-[80px]">Ahora:</span>
                          <span>Acceso gratuito para todos los usuarios registrados</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold min-w-[80px]">Próximo:</span>
                          <span>Anuncio oficial de precios y características detalladas</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold min-w-[80px]">Después:</span>
                          <span>Periodo de transición de 30 días con notificaciones previas</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold min-w-[80px]">Futuro:</span>
                          <span>Activación del modelo de suscripción con beneficios para usuarios early adopters</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 rounded-lg p-3 border border-orange-300">
                  💡 <strong>Importante:</strong> <em>Los precios finales y características completas de cada plan se anunciarán próximamente. 
                  Sigue utilizando el sistema normalmente, te notificaremos con anticipación sobre cualquier cambio. 
                  Tu inversión de tiempo actual en el sistema será recompensada con beneficios exclusivos.</em>
                </p>
              </div>
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

      {/* Dialog de Solicitud de Suscripción */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Suscripción</DialogTitle>
            <DialogDescription>
              {selectedPlan && (
                <span>
                  Estás solicitando el <strong>{selectedPlan.display_name}</strong>. 
                  El administrador revisará tu solicitud y te otorgará acceso.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPlan && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold text-lg">{selectedPlan.display_name}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">{selectedPlan.description}</p>
                <div className="flex gap-4 text-sm">
                  <span className="font-medium">
                    ${selectedPlan.price_monthly.toFixed(2)}/mes
                  </span>
                  <span className="text-slate-500">o</span>
                  <span className="font-medium">
                    ${selectedPlan.price_yearly.toFixed(2)}/año
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensaje adicional (opcional)</Label>
                <Textarea
                  id="message"
                  placeholder="Cuéntanos por qué necesitas este plan o alguna información adicional..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
                <p className="text-blue-800 dark:text-blue-200">
                  ℹ️ Tu solicitud será revisada por el administrador <strong>smithrodriguez345@gmail.com</strong>. 
                  Recibirás una notificación cuando se procese.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRequestDialog(false)
                setSelectedPlan(null)
                setRequestMessage('')
              }}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button 
              onClick={submitSubscriptionRequest}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Solicitud
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}