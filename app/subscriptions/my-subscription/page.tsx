"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useSubscriptionLimits } from "@/hooks/use-subscription-limits"
import { Calendar, CheckCircle, XCircle, Clock, AlertTriangle, CreditCard, Send, Users, FileText, Package, UserCheck, ArrowUp, DollarSign, Sparkles } from "lucide-react"

interface Subscription {
  id: string
  status: string
  start_date: string
  end_date: string | null
  billing_cycle: string
  current_max_users: number | null
  current_max_invoices: number | null
  current_max_products: number | null
  current_max_clients: number | null
  notes: string | null
  plan_id: string
  subscription_plans: {
    id: string
    name: string
    display_name: string
    description: string
    price_monthly: number
    price_yearly: number
    features: any
  } | null
}

interface AvailablePlan {
  id: string
  name: string
  display_name: string
  description: string
  price_monthly: number
  price_yearly: number
  max_users: number
  max_invoices: number
  max_products: number
  max_clients: number
}

export default function MySubscriptionPage() {
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [availablePlans, setAvailablePlans] = useState<AvailablePlan[]>([])

  // Diálogos
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [showExtendDialog, setShowExtendDialog] = useState(false)
  const [showCycleChangeDialog, setShowCycleChangeDialog] = useState(false)
  const [showCustomDialog, setShowCustomDialog] = useState(false)

  // Estados de formularios
  const [paymentNote, setPaymentNote] = useState("")
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<string>("")
  const [extendMonths, setExtendMonths] = useState<string>("1")
  const [extendReason, setExtendReason] = useState("")
  const [customRequest, setCustomRequest] = useState("")

  const [sending, setSending] = useState(false)
  const { toast } = useToast()
  const { limits, usage, remainingUsers, remainingInvoices, remainingProducts, remainingClients } = useSubscriptionLimits()

  useEffect(() => {
    loadSubscription()
    loadAvailablePlans()

    // Suscribirse a cambios en tiempo real en la suscripción del usuario
    const subscriptionChannel = supabase
      .channel('my-subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuchar todos los eventos
          schema: 'public',
          table: 'user_subscriptions'
        },
        (payload) => {
          console.log('🔄 Realtime: Mi suscripción cambió', payload)
          // Recargar la suscripción cuando hay cambios
          loadSubscription()
        }
      )
      .subscribe()

    // Cleanup al desmontar
    return () => {
      supabase.removeChannel(subscriptionChannel)
    }
  }, [])

  const loadSubscription = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        toast({
          title: "Error",
          description: "Debes iniciar sesión",
          variant: "destructive",
        })
        return
      }

      setUserId(session.user.id)
      setUserEmail(session.user.email || "")

      // Obtener suscripción del usuario
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          status,
          start_date,
          end_date,
          current_max_users,
          current_max_invoices,
          current_max_products,
          current_max_clients,
          notes,
          subscription_plans!plan_id (
            name,
            display_name,
            description,
            price_monthly,
            price_yearly,
            features
          )
        `)
        .eq('user_id', session.user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error cargando suscripción:', error)
        throw error
      }

      if (!data) {
        toast({
          title: "Sin suscripción",
          description: "No tienes una suscripción activa. Contacta al administrador.",
          variant: "destructive"
        })
        return
      }

      console.log('📦 Datos de suscripción recibidos:', data)
      console.log('📋 Plan:', data.subscription_plans)
      setSubscription(data)
    } catch (error: any) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "No se pudo cargar tu suscripción",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  const loadAvailablePlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select(`
          id,
          name,
          display_name,
          description,
          price_monthly,
          price_yearly,
          max_users,
          max_invoices,
          max_products,
          max_clients
        `)
        .eq('is_active', true)
        .order('price_monthly')

      if (error) throw error
      setAvailablePlans(data || [])
    } catch (error) {
      console.error('Error loading plans:', error)
    }
  }

  const handleUpgradePlan = async () => {
    if (!selectedUpgradePlan) {
      toast({
        title: "Selecciona un plan",
        description: "Por favor elige el plan al que deseas actualizar",
        variant: "destructive",
      })
      return
    }

    try {
      setSending(true)
      const plan = availablePlans.find(p => p.id === selectedUpgradePlan)

      const { error } = await supabase
        .from('subscription_requests')
        .insert({
          user_id: userId,
          plan_id: selectedUpgradePlan,
          message: `Solicitud de upgrade desde ${subscription?.subscription_plans?.display_name || 'plan actual'} a ${plan?.display_name}`,
          status: 'pending'
        })

      if (error) throw error

      toast({
        title: "✅ Solicitud enviada",
        description: `Tu solicitud para actualizar a ${plan?.display_name} ha sido enviada al administrador.`,
      })

      setShowUpgradeDialog(false)
      setSelectedUpgradePlan("")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al enviar la solicitud",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const handleExtendSubscription = async () => {
    if (!extendMonths || parseInt(extendMonths) < 1) {
      toast({
        title: "Meses inválidos",
        description: "Indica cuántos meses deseas extender tu suscripción",
        variant: "destructive",
      })
      return
    }

    try {
      setSending(true)

      const { error } = await supabase
        .from('subscription_requests')
        .insert({
          user_id: userId,
          plan_id: subscription?.plan_id,
          message: `Solicitud de extensión por ${extendMonths} mes(es). ${extendReason ? 'Motivo: ' + extendReason : ''}`,
          status: 'pending'
        })

      if (error) throw error

      toast({
        title: "✅ Solicitud enviada",
        description: `Tu solicitud para extender tu suscripción por ${extendMonths} mes(es) ha sido enviada.`,
      })

      setShowExtendDialog(false)
      setExtendMonths("1")
      setExtendReason("")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al enviar la solicitud",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const handleCycleChange = async () => {
    const newCycle = subscription?.billing_cycle === 'monthly' ? 'yearly' : 'monthly'

    try {
      setSending(true)

      const { error } = await supabase
        .from('subscription_requests')
        .insert({
          user_id: userId,
          plan_id: subscription?.plan_id,
          message: `Solicitud de cambio de ciclo de facturación de ${subscription?.billing_cycle} a ${newCycle}`,
          status: 'pending'
        })

      if (error) throw error

      toast({
        title: "✅ Solicitud enviada",
        description: `Tu solicitud para cambiar a pago ${newCycle === 'yearly' ? 'anual' : 'mensual'} ha sido enviada.`,
      })

      setShowCycleChangeDialog(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al enviar la solicitud",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const handleCustomRequest = async () => {
    if (!customRequest.trim()) {
      toast({
        title: "Campo requerido",
        description: "Describe tu solicitud personalizada",
        variant: "destructive",
      })
      return
    }

    try {
      setSending(true)

      const { error } = await supabase
        .from('subscription_requests')
        .insert({
          user_id: userId,
          plan_id: subscription?.plan_id,
          message: `Solicitud personalizada: ${customRequest}`,
          status: 'pending'
        })

      if (error) throw error

      toast({
        title: "✅ Solicitud enviada",
        description: "Tu solicitud personalizada ha sido enviada al administrador.",
      })

      setShowCustomDialog(false)
      setCustomRequest("")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al enviar la solicitud",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }
  const handlePaymentNotification = async () => {
    if (!paymentNote.trim()) {
      toast({
        title: "Campo requerido",
        description: "Por favor describe el método de pago utilizado",
        variant: "destructive",
      })
      return
    }

    try {
      setSending(true)

      // Crear notificación para el administrador
      const { error } = await supabase
        .from('payment_notifications')
        .insert({
          user_id: userId,
          user_email: userEmail,
          subscription_id: subscription?.id,
          payment_note: paymentNote,
          status: 'pending',
          created_at: new Date().toISOString()
        })

      if (error) throw error

      toast({
        title: "✅ Notificación enviada",
        description: "El administrador ha sido notificado sobre tu pago. Te contactaremos pronto.",
      })

      setShowPaymentDialog(false)
      setPaymentNote("")
    } catch (error: any) {
      console.error('Error enviando notificación:', error)
      toast({
        title: "Error",
        description: "No se pudo enviar la notificación. Intenta de nuevo.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      active: { label: "Activa", variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
      expired: { label: "Expirada", variant: "destructive" as const, icon: XCircle, color: "text-red-600" },
      cancelled: { label: "Cancelada", variant: "secondary" as const, icon: XCircle, color: "text-slate-400" },
      suspended: { label: "Suspendida", variant: "secondary" as const, icon: Clock, color: "text-orange-600" },
    }
    const conf = config[status as keyof typeof config] || config.active
    const Icon = conf.icon
    return (
      <Badge variant={conf.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {conf.label}
      </Badge>
    )
  }

  const getDaysUntilExpiry = () => {
    if (!subscription?.end_date) return null
    const days = Math.ceil(
      (new Date(subscription.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )
    return days
  }

  const getExpiryWarning = () => {
    const days = getDaysUntilExpiry()
    if (days === null || days < 0) return null

    if (days <= 3) {
      return (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-300">¡Atención! Tu suscripción expira en {days} día(s)</h4>
            <p className="text-sm text-red-400 mt-1">
              Realiza tu pago lo antes posible para evitar la interrupción del servicio.
            </p>
          </div>
        </div>
      )
    } else if (days <= 7) {
      return (
        <div className="bg-orange-900/30 border border-orange-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-orange-300">Tu suscripción expira en {days} días</h4>
            <p className="text-sm text-orange-400 mt-1">
              Te recomendamos renovar pronto para mantener el servicio sin interrupciones.
            </p>
          </div>
        </div>
      )
    } else if (days <= 15) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-900">Tu suscripción expira en {days} días</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Considera renovar tu suscripción próximamente.
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-slate-400">Cargando suscripción...</p>
        </div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <XCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-200 mb-2">Sin suscripción activa</h2>
          <p className="text-slate-400 mb-6">
            No tienes una suscripción asignada. Contacta al administrador para activar tu cuenta.
          </p>
          <Button onClick={() => window.location.href = "mailto:smithrodriguez345@gmail.com"}>
            <Send className="h-4 w-4 mr-2" />
            Contactar administrador
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-200">Mi Suscripción</h1>
        <p className="text-slate-400 mt-2">Gestiona y visualiza el estado de tu suscripción</p>
      </div>

      {getExpiryWarning()}

      <div className="grid gap-6 mt-6">
        {/* Estado General */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-200">
                Plan {subscription.subscription_plans?.display_name || subscription.subscription_plans?.name || 'Desconocido'}
              </h2>
              <p className="text-sm text-slate-400 mt-1">{subscription.subscription_plans?.description || ''}</p>
            </div>
            {getStatusBadge(subscription.status)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">Fecha de inicio</span>
              </div>
              <p className="text-lg font-semibold">
                {new Date(subscription.start_date).toLocaleDateString('es-DO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            {subscription.end_date && (
              <div>
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Fecha de expiración</span>
                </div>
                <p className="text-lg font-semibold">
                  {new Date(subscription.end_date).toLocaleDateString('es-DO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                {getDaysUntilExpiry() !== null && getDaysUntilExpiry()! > 0 && (
                  <p className="text-sm text-slate-400 mt-1">
                    ({getDaysUntilExpiry()} días restantes)
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Límites de la Suscripción */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Límites del Plan</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            <div className="text-center p-4 bg-slate-900 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {subscription.current_max_users === null ? "∞" : subscription.current_max_users}
              </p>
              <p className="text-sm text-slate-400 mt-1">Usuarios</p>
            </div>
            <div className="text-center p-4 bg-green-900/30 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {subscription.current_max_invoices === null ? "∞" : subscription.current_max_invoices}
              </p>
              <p className="text-sm text-slate-400 mt-1">Facturas/mes</p>
            </div>
            <div className="text-center p-4 bg-purple-900/30 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {subscription.current_max_products === null ? "∞" : subscription.current_max_products}
              </p>
              <p className="text-sm text-slate-400 mt-1">Productos</p>
            </div>
            <div className="text-center p-4 bg-orange-900/30 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {subscription.current_max_clients === null ? "∞" : subscription.current_max_clients}
              </p>
              <p className="text-sm text-slate-400 mt-1">Clientes</p>
            </div>
          </div>
        </Card>

        {/* Uso Actual vs Límites */}
        {!limits.isLoading && (
          <Card className="p-6 bg-slate-900/50 border-slate-800">
            <h3 className="text-lg font-semibold text-slate-200 mb-1">Uso Actual de Recursos</h3>
            <p className="text-sm text-slate-400 mb-6">Monitorea tu consumo mensual y límites disponibles</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Usuarios/Empleados */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-800 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200">Usuarios</p>
                      <p className="text-xs text-gray-500">Empleados activos</p>
                    </div>
                  </div>
                  <Badge variant={remainingUsers <= 0 ? "destructive" : remainingUsers <= 1 ? "secondary" : "outline"}>
                    {usage.users}/{limits.maxUsers}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Disponibles</span>
                    <span className={`font-semibold ${remainingUsers <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {remainingUsers}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${remainingUsers <= 0 ? 'bg-red-500' :
                        remainingUsers <= 1 ? 'bg-amber-500' :
                          'bg-blue-500'
                        }`}
                      style={{ width: `${Math.min((usage.users / limits.maxUsers) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Facturas */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-900/30 rounded-lg">
                      <FileText className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200">Facturas</p>
                      <p className="text-xs text-gray-500">Este mes</p>
                    </div>
                  </div>
                  <Badge variant={remainingInvoices <= 0 ? "destructive" : remainingInvoices <= 2 ? "secondary" : "outline"}>
                    {usage.invoices}/{limits.maxInvoices}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Disponibles</span>
                    <span className={`font-semibold ${remainingInvoices <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {remainingInvoices}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${remainingInvoices <= 0 ? 'bg-red-500' :
                        remainingInvoices <= 2 ? 'bg-amber-500' :
                          'bg-green-500'
                        }`}
                      style={{ width: `${Math.min((usage.invoices / limits.maxInvoices) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Productos */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-900/30 rounded-lg">
                      <Package className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200">Productos</p>
                      <p className="text-xs text-gray-500">Total en catálogo</p>
                    </div>
                  </div>
                  <Badge variant={remainingProducts <= 0 ? "destructive" : remainingProducts <= 5 ? "secondary" : "outline"}>
                    {usage.products}/{limits.maxProducts}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Disponibles</span>
                    <span className={`font-semibold ${remainingProducts <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {remainingProducts}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${remainingProducts <= 0 ? 'bg-red-500' :
                        remainingProducts <= 5 ? 'bg-amber-500' :
                          'bg-purple-500'
                        }`}
                      style={{ width: `${Math.min((usage.products / limits.maxProducts) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Clientes */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-orange-900/30 rounded-lg">
                      <UserCheck className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200">Clientes</p>
                      <p className="text-xs text-gray-500">Total registrados</p>
                    </div>
                  </div>
                  <Badge variant={remainingClients <= 0 ? "destructive" : remainingClients <= 2 ? "secondary" : "outline"}>
                    {usage.clients}/{limits.maxClients}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Disponibles</span>
                    <span className={`font-semibold ${remainingClients <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {remainingClients}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${remainingClients <= 0 ? 'bg-red-500' :
                        remainingClients <= 2 ? 'bg-amber-500' :
                          'bg-orange-500'
                        }`}
                      style={{ width: `${Math.min((usage.clients / limits.maxClients) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {(remainingUsers <= 0 || remainingInvoices <= 0 || remainingProducts <= 0 || remainingClients <= 0) && (
              <div className="mt-6 p-4 bg-red-900/30 border border-red-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-red-300">Has alcanzado el límite en algunos recursos</p>
                    <p className="text-sm text-red-400 mt-1">
                      Considera actualizar tu plan para continuar usando el sistema sin restricciones.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Características del Plan */}
        {subscription.subscription_plans?.features && Object.keys(subscription.subscription_plans.features).length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Características Incluidas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(subscription.subscription_plans.features).map(([key, value]) => {
                if (typeof value === 'boolean' && value) {
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-slate-300 capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )
                }
                return null
              })}
            </div>
          </Card>
        )}

        {/* Precios */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Opciones de Pago</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-slate-400 mb-1">Pago Mensual</p>
              <p className="text-3xl font-bold text-slate-200">
                ${(subscription.subscription_plans?.price_monthly || 0).toFixed(2)}
                <span className="text-sm text-slate-400 font-normal">/mes</span>
              </p>
            </div>
            <div className="border rounded-lg p-4 bg-slate-900">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-slate-400">Pago Anual</p>
                <Badge variant="secondary" className="text-xs">Ahorra</Badge>
              </div>
              <p className="text-3xl font-bold text-blue-600">
                ${(subscription.subscription_plans?.price_yearly || 0).toFixed(2)}
                <span className="text-sm text-slate-400 font-normal">/año</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                (${((subscription.subscription_plans?.price_yearly || 0) / 12).toFixed(2)}/mes)
              </p>
            </div>
          </div>
        </Card>

        {/* Notas del Administrador */}
        {subscription.notes && (
          <Card className="p-6 bg-slate-950">
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Notas</h3>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{subscription.notes}</p>
          </Card>
        )}

        {/* Botón de Pago */}
        <Card className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-1">
                ¿Ya realizaste tu pago?
              </h3>
              <p className="text-sm text-slate-400">
                Notifica al administrador para que extienda tu suscripción
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => setShowPaymentDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              He realizado el pago
            </Button>
          </div>
        </Card>

        {/* Opciones de Gestión de Suscripción */}
        <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-slate-700">
          <h3 className="text-xl font-bold text-slate-200 mb-4">
            Gestiona tu Suscripción
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Solicitar Upgrade */}
            <div className="bg-slate-900 p-4 rounded-lg shadow-sm border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm"><ArrowUp className="h-4 w-4" /></span>
                </div>
                <h4 className="font-semibold text-slate-200">Mejorar Plan</h4>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Actualiza a un plan superior con más recursos
              </p>
              <Button
                variant="outline"
                className="w-full border-purple-300 hover:bg-purple-900/30"
                onClick={() => setShowUpgradeDialog(true)}
              >
                Ver Planes Superiores
              </Button>
            </div>

            {/* Extender Suscripción */}
            <div className="bg-slate-900 p-4 rounded-lg shadow-sm border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <h4 className="font-semibold text-slate-200">Extender Tiempo</h4>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Añade más meses a tu suscripción actual
              </p>
              <Button
                variant="outline"
                className="w-full border-blue-300 hover:bg-slate-900"
                onClick={() => setShowExtendDialog(true)}
              >
                Solicitar Extensión
              </Button>
            </div>

            {/* Cambiar Ciclo */}
            <div className="bg-slate-900 p-4 rounded-lg shadow-sm border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm"><DollarSign className="h-4 w-4" /></span>
                </div>
                <h4 className="font-semibold text-slate-200">Cambiar Ciclo</h4>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                {subscription?.billing_cycle === 'monthly' ? 'Cambia a pago anual y ahorra' : 'Cambia a pago mensual'}
              </p>
              <Button
                variant="outline"
                className="w-full border-green-300 hover:bg-green-900/30"
                onClick={() => setShowCycleChangeDialog(true)}
              >
                {subscription?.billing_cycle === 'monthly' ? 'Cambiar a Anual' : 'Cambiar a Mensual'}
              </Button>
            </div>

            {/* Solicitud Personalizada */}
            <div className="bg-slate-900 p-4 rounded-lg shadow-sm border border-amber-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center">
                  <Send className="h-4 w-4 text-white" />
                </div>
                <h4 className="font-semibold text-slate-200">Solicitud Especial</h4>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Necesitas algo específico? Contáctanos
              </p>
              <Button
                variant="outline"
                className="w-full border-amber-300 hover:bg-amber-900/30"
                onClick={() => setShowCustomDialog(true)}
              >
                Enviar Solicitud
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Dialog de Notificación de Pago */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notificar Pago Realizado</DialogTitle>
            <DialogDescription>
              Envía una notificación al administrador indicando que has realizado el pago de tu suscripción.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="payment-note">Detalles del Pago</Label>
              <Textarea
                id="payment-note"
                placeholder="Ejemplo: Transferencia bancaria realizada el 2 de enero por $49.99 desde cuenta ****1234"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                rows={4}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-2">
                Incluye: método de pago, fecha, monto y cualquier referencia útil
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              disabled={sending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePaymentNotification}
              disabled={sending || !paymentNote.trim()}
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Notificación
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Upgrade de Plan */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Actualizar a un Plan Superior</DialogTitle>
            <DialogDescription>
              Selecciona el plan al que deseas actualizar. El administrador procesará tu solicitud.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-slate-900 p-3 rounded-lg">
              <p className="text-sm text-blue-300">
                <strong>Plan Actual:</strong> {subscription?.subscription_plans?.display_name || 'N/A'}
              </p>
            </div>

            <div className="grid gap-3">
              {availablePlans
                .filter(plan => {
                  const currentPrice = subscription?.subscription_plans?.price_monthly || 0
                  return plan.price_monthly > currentPrice
                })
                .map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedUpgradePlan(plan.id)}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${selectedUpgradePlan === plan.id
                      ? 'border-purple-600 bg-purple-900/30'
                      : 'border-slate-800 hover:border-purple-300'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-lg">{plan.display_name}</h4>
                      <Badge variant={selectedUpgradePlan === plan.id ? "default" : "secondary"}>
                        ${plan.price_monthly}/mes
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400 mb-3">{plan.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        {plan.max_users} usuarios
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        {plan.max_invoices} facturas/mes
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        {plan.max_products} productos
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        {plan.max_clients} clientes
                      </div>
                    </div>
                  </button>
                ))}
            </div>

            {availablePlans.filter(p => p.price_monthly > (subscription?.subscription_plans?.price_monthly || 0)).length === 0 && (
              <p className="text-center text-gray-500 py-4">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 font-bold">¡Todo listo!</span>
                  <span>Ya tienes el plan más alto disponible</span>
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </div>
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowUpgradeDialog(false)
              setSelectedUpgradePlan("")
            }} disabled={sending}>
              Cancelar
            </Button>
            <Button onClick={handleUpgradePlan} disabled={sending || !selectedUpgradePlan}>
              {sending ? "Enviando..." : "Solicitar Upgrade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Extensión de Suscripción */}
      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extender Suscripción</DialogTitle>
            <DialogDescription>
              Solicita extender tu suscripción por más meses
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="extend-months">Número de meses</Label>
              <select
                id="extend-months"
                value={extendMonths}
                onChange={(e) => setExtendMonths(e.target.value)}
                className="w-full mt-2 p-2 border rounded-lg"
              >
                <option value="1">1 mes</option>
                <option value="2">2 meses</option>
                <option value="3">3 meses</option>
                <option value="6">6 meses</option>
                <option value="12">12 meses</option>
              </select>
            </div>

            <div>
              <Label htmlFor="extend-reason">Motivo (opcional)</Label>
              <Textarea
                id="extend-reason"
                placeholder="¿Por qué deseas extender tu suscripción?"
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>

            <div className="bg-slate-900 p-3 rounded-lg">
              <p className="text-sm text-blue-300">
                💡 Tu suscripción actual expira el {subscription?.end_date ? new Date(subscription.end_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowExtendDialog(false)
              setExtendMonths("1")
              setExtendReason("")
            }} disabled={sending}>
              Cancelar
            </Button>
            <Button onClick={handleExtendSubscription} disabled={sending}>
              {sending ? "Enviando..." : "Solicitar Extensión"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Cambio de Ciclo */}
      <Dialog open={showCycleChangeDialog} onOpenChange={setShowCycleChangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Ciclo de Facturación</DialogTitle>
            <DialogDescription>
              {subscription?.billing_cycle === 'monthly'
                ? 'Cambia a facturación anual y ahorra hasta un 17%'
                : 'Cambia a facturación mensual para mayor flexibilidad'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg border-2 ${subscription?.billing_cycle === 'monthly' ? 'border-slate-700 bg-slate-950' : 'border-blue-600 bg-slate-900'
                }`}>
                <h4 className="font-bold mb-1">Actual</h4>
                <p className="text-2xl font-bold mb-1">
                  ${subscription?.subscription_plans?.price_monthly.toFixed(2)}
                </p>
                <p className="text-sm text-slate-400">por mes</p>
              </div>

              <div className={`p-4 rounded-lg border-2 ${subscription?.billing_cycle === 'yearly' ? 'border-slate-700 bg-slate-950' : 'border-green-600 bg-green-900/30'
                }`}>
                <h4 className="font-bold mb-1">Nuevo</h4>
                <p className="text-2xl font-bold mb-1">
                  ${subscription?.billing_cycle === 'monthly'
                    ? subscription?.subscription_plans?.price_yearly.toFixed(2)
                    : subscription?.subscription_plans?.price_monthly.toFixed(2)}
                </p>
                <p className="text-sm text-slate-400">
                  por {subscription?.billing_cycle === 'monthly' ? 'año' : 'mes'}
                </p>
              </div>
            </div>

            {subscription?.billing_cycle === 'monthly' && (
              <div className="bg-green-900/30 p-3 rounded-lg border border-green-800">
                <p className="text-sm text-green-300">
                  <DollarSign className="h-4 w-4 text-green-500 mr-1" /> Ahorro: ${((subscription.subscription_plans?.price_monthly * 12) - (subscription.subscription_plans?.price_yearly || 0)).toFixed(2)} al año
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCycleChangeDialog(false)} disabled={sending}>
              Cancelar
            </Button>
            <Button onClick={handleCycleChange} disabled={sending}>
              {sending ? "Enviando..." : "Solicitar Cambio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Solicitud Personalizada */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitud Personalizada</DialogTitle>
            <DialogDescription>
              ¿Necesitas algo específico? Envía tu solicitud al administrador
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="custom-request">Tu Solicitud</Label>
              <Textarea
                id="custom-request"
                placeholder="Ejemplo: Necesito aumentar el límite de productos a 1000, o quiero agregar una funcionalidad específica..."
                value={customRequest}
                onChange={(e) => setCustomRequest(e.target.value)}
                rows={5}
                className="mt-2"
              />
            </div>

            <div className="bg-amber-900/30 p-3 rounded-lg border border-amber-800">
              <p className="text-sm text-amber-300">
                💡 <strong>Tip:</strong> Sé lo más específico posible. El administrador revisará tu solicitud y se pondrá en contacto contigo.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCustomDialog(false)
              setCustomRequest("")
            }} disabled={sending}>
              Cancelar
            </Button>
            <Button onClick={handleCustomRequest} disabled={sending || !customRequest.trim()}>
              {sending ? "Enviando..." : "Enviar Solicitud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
