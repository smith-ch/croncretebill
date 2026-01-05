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
import { Calendar, CheckCircle, XCircle, Clock, AlertTriangle, CreditCard, Send } from "lucide-react"

interface Subscription {
  id: string
  status: string
  start_date: string
  end_date: string | null
  max_users: number | null
  max_invoices: number | null
  max_products: number | null
  max_clients: number | null
  notes: string | null
  subscription_plans: {
    name: string
    display_name: string
    description: string
    price_monthly: number
    price_yearly: number
    features: any
  } | null
}

export default function MySubscriptionPage() {
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentNote, setPaymentNote] = useState("")
  const [sending, setSending] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadSubscription()
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
      cancelled: { label: "Cancelada", variant: "secondary" as const, icon: XCircle, color: "text-gray-600" },
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-900">¡Atención! Tu suscripción expira en {days} día(s)</h4>
            <p className="text-sm text-red-700 mt-1">
              Realiza tu pago lo antes posible para evitar la interrupción del servicio.
            </p>
          </div>
        </div>
      )
    } else if (days <= 7) {
      return (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-orange-900">Tu suscripción expira en {days} días</h4>
            <p className="text-sm text-orange-700 mt-1">
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
          <p className="text-sm text-gray-600">Cargando suscripción...</p>
        </div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <XCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sin suscripción activa</h2>
          <p className="text-gray-600 mb-6">
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
        <h1 className="text-3xl font-bold text-gray-900">Mi Suscripción</h1>
        <p className="text-gray-600 mt-2">Gestiona y visualiza el estado de tu suscripción</p>
      </div>

      {getExpiryWarning()}

      <div className="grid gap-6 mt-6">
        {/* Estado General */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Plan {subscription.subscription_plans?.display_name || subscription.subscription_plans?.name || 'Desconocido'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">{subscription.subscription_plans?.description || ''}</p>
            </div>
            {getStatusBadge(subscription.status)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 text-gray-600 mb-2">
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
                <div className="flex items-center gap-2 text-gray-600 mb-2">
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
                  <p className="text-sm text-gray-600 mt-1">
                    ({getDaysUntilExpiry()} días restantes)
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Límites de la Suscripción */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Límites del Plan</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {subscription.current_max_users === null ? "∞" : subscription.current_max_users}
              </p>
              <p className="text-sm text-gray-600 mt-1">Usuarios</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {subscription.current_max_invoices === null ? "∞" : subscription.current_max_invoices}
              </p>
              <p className="text-sm text-gray-600 mt-1">Facturas/mes</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {subscription.current_max_products === null ? "∞" : subscription.current_max_products}
              </p>
              <p className="text-sm text-gray-600 mt-1">Productos</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {subscription.current_max_clients === null ? "∞" : subscription.current_max_clients}
              </p>
              <p className="text-sm text-gray-600 mt-1">Clientes</p>
            </div>
          </div>
        </Card>

        {/* Características del Plan */}
        {subscription.subscription_plans?.features && Object.keys(subscription.subscription_plans.features).length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Características Incluidas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(subscription.subscription_plans.features).map(([key, value]) => {
                if (typeof value === 'boolean' && value) {
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-gray-700 capitalize">
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Opciones de Pago</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Pago Mensual</p>
              <p className="text-3xl font-bold text-gray-900">
                ${(subscription.subscription_plans?.price_monthly || 0).toFixed(2)}
                <span className="text-sm text-gray-600 font-normal">/mes</span>
              </p>
            </div>
            <div className="border rounded-lg p-4 bg-blue-50">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-gray-600">Pago Anual</p>
                <Badge variant="secondary" className="text-xs">Ahorra</Badge>
              </div>
              <p className="text-3xl font-bold text-blue-600">
                ${(subscription.subscription_plans?.price_yearly || 0).toFixed(2)}
                <span className="text-sm text-gray-600 font-normal">/año</span>
              </p>
              <p className="text-xs text-gray-600 mt-1">
                (${((subscription.subscription_plans?.price_yearly || 0) / 12).toFixed(2)}/mes)
              </p>
            </div>
          </div>
        </Card>

        {/* Notas del Administrador */}
        {subscription.notes && (
          <Card className="p-6 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Notas</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{subscription.notes}</p>
          </Card>
        )}

        {/* Botón de Pago */}
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                ¿Ya realizaste tu pago?
              </h3>
              <p className="text-sm text-gray-600">
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
    </div>
  )
}
