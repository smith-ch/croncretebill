"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { Loader2, Plus, Edit, Trash2, Ban, CheckCircle, XCircle } from 'lucide-react'

interface SubscriptionPlan {
  id: string
  name: string
  display_name: string
  description: string
  price_monthly: number
  price_yearly: number
  max_users: number | null
  max_invoices_per_month: number | null
  max_products: number | null
  max_clients: number | null
  is_active: boolean
  is_default: boolean
}

interface UserSubscription {
  id: string
  user_id: string
  plan_id: string
  start_date: string
  end_date: string | null
  status: 'active' | 'inactive' | 'expired' | 'cancelled' | 'trial' | 'suspended'
  billing_cycle: 'monthly' | 'yearly' | 'lifetime' | 'custom'
  notes: string | null
  user_email?: string
  plan_name?: string
  plan_display_name?: string
  current_users_count: number
  current_invoices_count: number
  current_products_count: number
  current_clients_count: number
}

interface SubscriptionHistory {
  id: string
  subscription_id: string
  action: string
  old_status: string | null
  new_status: string | null
  reason: string | null
  changed_by_email: string | null
  created_at: string
}

interface PaymentNotification {
  id: string
  user_id: string
  user_email: string
  subscription_id: string | null
  payment_note: string
  status: 'pending' | 'reviewed' | 'processed' | 'rejected'
  admin_notes: string | null
  created_at: string
  reviewed_at: string | null
  subscription?: {
    plan_name: string
    plan_display_name: string
  }
}

export default function SubscriptionsManagementPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isManager, setIsManager] = useState(false)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([])
  const [history, setHistory] = useState<SubscriptionHistory[]>([])
  const [paymentNotifications, setPaymentNotifications] = useState<PaymentNotification[]>([])
  const [allUsers, setAllUsers] = useState<{user_id: string, email: string, display_name: string}[]>([])
  const [selectedSubscription, setSelectedSubscription] = useState<UserSubscription | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [selectedNotification, setSelectedNotification] = useState<PaymentNotification | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showEditPlanDialog, setShowEditPlanDialog] = useState(false)
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false)
  const [showExtendDialog, setShowExtendDialog] = useState(false)
  const [showProcessPaymentDialog, setShowProcessPaymentDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [newSubEmail, setNewSubEmail] = useState('')
  const [newSubPlan, setNewSubPlan] = useState('')
  const [newSubStatus, setNewSubStatus] = useState<'active' | 'trial'>('active')
  const [newSubBillingCycle, setNewSubBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [newSubEndDate, setNewSubEndDate] = useState('')
  const [newSubNotes, setNewSubNotes] = useState('')

  const [editStatus, setEditStatus] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editReason, setEditReason] = useState('')

  // Edit Plan states
  const [editPlanName, setEditPlanName] = useState('')
  const [editPlanDisplayName, setEditPlanDisplayName] = useState('')
  const [editPlanDescription, setEditPlanDescription] = useState('')
  const [editPlanPriceMonthly, setEditPlanPriceMonthly] = useState('')
  const [editPlanPriceYearly, setEditPlanPriceYearly] = useState('')
  const [editPlanMaxUsers, setEditPlanMaxUsers] = useState('')
  const [editPlanMaxInvoices, setEditPlanMaxInvoices] = useState('')
  const [editPlanMaxProducts, setEditPlanMaxProducts] = useState('')
  const [editPlanMaxClients, setEditPlanMaxClients] = useState('')

  // Change Plan states
  const [changePlanNewPlan, setChangePlanNewPlan] = useState('')
  const [changePlanReason, setChangePlanReason] = useState('')

  // Extend Subscription states
  const [extendMonths, setExtendMonths] = useState('1')
  const [extendReason, setExtendReason] = useState('')

  // Process Payment states
  const [processPaymentAction, setProcessPaymentAction] = useState<'approve' | 'reject'>('approve')
  const [processPaymentMonths, setProcessPaymentMonths] = useState('1')
  const [processPaymentNotes, setProcessPaymentNotes] = useState('')

  useEffect(() => {
    checkManagerPermissions()
  }, [])

  async function checkManagerPermissions() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Verificar si es subscription manager
      const { data, error } = await supabase.rpc('is_subscription_manager', {
        p_user_id: user.id
      })

      if (error) throw error

      if (!data) {
        toast({
          title: "Acceso Denegado",
          description: "No tienes permisos para acceder a esta página",
          variant: "destructive"
        })
        router.push('/dashboard')
        return
      }

      setIsManager(true)
      await loadData()
      await loadAllUsers()
    } catch (error: any) {
      console.error('Error checking permissions:', error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function loadAllUsers() {
    try {
      const { data: allProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, email, display_name')
        .order('email')

      if (profilesError) throw profilesError
      setAllUsers(allProfiles || [])
    } catch (error: any) {
      console.error('Error loading users:', error)
    }
  }

  async function loadData() {
    try {
      // Cargar planes
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly')

      if (plansError) throw plansError
      setPlans(plansData || [])

      // Cargar solo usuarios CON suscripciones
      const { data: subsData, error: subsError } = await supabase
        .from('user_subscriptions')
        .select('*')

      if (subsError) throw subsError
      
      // Obtener emails de los usuarios con suscripción
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, email, display_name')
        .in('user_id', subsData?.map((s: any) => s.user_id) || [])

      if (profilesError) throw profilesError

      // Combinar suscripciones con información de usuario
      const formattedSubs = (subsData || []).map((subscription: any) => {
        const profile = profiles?.find((p: any) => p.user_id === subscription.user_id)
        const plan = plansData?.find(p => p.id === subscription.plan_id)
        
        return {
          ...subscription,
          user_email: profile?.email || 'Sin email',
          plan_name: plan?.name || 'N/A',
          plan_display_name: plan?.display_name || 'N/A'
        }
      })
      
      setSubscriptions(formattedSubs)

      // Cargar historial reciente
      const { data: historyData, error: historyError } = await supabase
        .from('subscription_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (historyError) throw historyError
      setHistory(historyData || [])

      // Cargar notificaciones de pago pendientes
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('payment_notifications')
        .select(`
          *,
          subscription:subscription_id (
            plan:plan_id (
              name,
              display_name
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (notificationsError) throw notificationsError
      
      const formattedNotifications = (notificationsData || []).map((notif: any) => ({
        ...notif,
        subscription: notif.subscription ? {
          plan_name: notif.subscription.plan?.name || 'N/A',
          plan_display_name: notif.subscription.plan?.display_name || 'N/A'
        } : undefined
      }))
      
      setPaymentNotifications(formattedNotifications)

    } catch (error: any) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Error al cargar los datos: " + error.message,
        variant: "destructive"
      })
    }
  }

  async function handleCreateSubscription() {
    if (!newSubEmail || !newSubPlan) {
      toast({
        title: "Error",
        description: "Email y plan son requeridos",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error } = await supabase.rpc('create_manual_subscription', {
        p_user_email: newSubEmail,
        p_plan_name: newSubPlan,
        p_start_date: new Date().toISOString(),
        p_end_date: newSubEndDate || null,
        p_status: newSubStatus,
        p_billing_cycle: newSubBillingCycle,
        p_manager_email: user?.email || 'smithrodriguez345@gmail.com',
        p_notes: newSubNotes || null
      })

      if (error) throw error

      const result = data as any
      if (!result.success) {
        throw new Error(result.message)
      }

      toast({
        title: "✅ Suscripción Creada",
        description: "La suscripción ha sido creada correctamente"
      })

      // Reset form
      setNewSubEmail('')
      setNewSubPlan('')
      setNewSubStatus('active')
      setNewSubBillingCycle('monthly')
      setNewSubEndDate('')
      setNewSubNotes('')
      setShowCreateDialog(false)

      // Reload data
      await loadData()
    } catch (error: any) {
      console.error('Error creating subscription:', error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdateStatus(subscription: UserSubscription, newStatus: string) {
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Si el usuario no tiene suscripción (sin plan_id o plan_name === 'Ninguno'), crear una automáticamente
      if (!subscription.plan_id || subscription.plan_name === 'Ninguno' || subscription.plan_display_name === 'Sin Plan') {
        const { data: createData, error: createError } = await supabase.rpc('create_manual_subscription', {
          p_user_email: subscription.user_email,
          p_plan_name: 'free',
          p_start_date: new Date().toISOString(),
          p_end_date: null, // Sin límite para plan gratuito
          p_status: newStatus,
          p_billing_cycle: 'monthly',
          p_manager_email: user?.email || 'smithrodriguez345@gmail.com',
          p_notes: `Suscripción gratuita creada automáticamente con estado ${newStatus}`
        })

        if (createError) throw createError

        const result = createData as any
        if (!result.success) {
          throw new Error(result.message)
        }

        toast({
          title: "✅ Suscripción Creada",
          description: `Plan gratuito asignado con estado ${newStatus}`
        })
      } else {
        // Usuario ya tiene suscripción, solo actualizar estado
        const { data, error } = await supabase.rpc('update_subscription_status', {
          p_user_email: subscription.user_email,
          p_new_status: newStatus,
          p_reason: editReason || `Estado cambiado a ${newStatus}`,
          p_manager_email: user?.email || 'smithrodriguez345@gmail.com'
        })

        if (error) throw error

        const result = data as any
        if (!result.success) {
          throw new Error(result.message)
        }

        toast({
          title: "✅ Estado Actualizado",
          description: `Suscripción actualizada a ${newStatus}`
        })
      }

      setShowEditDialog(false)
      setSelectedSubscription(null)
      setEditReason('')
      
      await loadData()
    } catch (error: any) {
      console.error('Error updating status:', error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdatePlan() {
    if (!selectedPlan) return
    
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({
          display_name: editPlanDisplayName,
          description: editPlanDescription,
          price_monthly: parseFloat(editPlanPriceMonthly),
          price_yearly: parseFloat(editPlanPriceYearly),
          max_users: editPlanMaxUsers ? parseInt(editPlanMaxUsers) : null,
          max_invoices_per_month: editPlanMaxInvoices ? parseInt(editPlanMaxInvoices) : null,
          max_products: editPlanMaxProducts ? parseInt(editPlanMaxProducts) : null,
          max_clients: editPlanMaxClients ? parseInt(editPlanMaxClients) : null,
        })
        .eq('id', selectedPlan.id)

      if (error) throw error

      toast({
        title: "✅ Plan Actualizado",
        description: "El plan ha sido actualizado correctamente"
      })

      setShowEditPlanDialog(false)
      setSelectedPlan(null)
      await loadData()
    } catch (error: any) {
      console.error('Error updating plan:', error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleChangePlan() {
    if (!selectedSubscription || !changePlanNewPlan) return
    
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const newPlan = plans.find(p => p.name === changePlanNewPlan)
      
      if (!newPlan) throw new Error('Plan no encontrado')

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          plan_id: newPlan.id,
          current_max_users: newPlan.max_users,
          current_max_invoices: newPlan.max_invoices_per_month,
          current_max_products: newPlan.max_products,
          current_max_clients: newPlan.max_clients,
          notes: (selectedSubscription.notes || '') + `\n[${new Date().toLocaleString()}] Plan cambiado a ${newPlan.display_name}. Razón: ${changePlanReason}`,
          managed_by: user?.id
        })
        .eq('id', selectedSubscription.id)

      if (error) throw error

      toast({
        title: "✅ Plan Cambiado",
        description: `Plan actualizado a ${newPlan.display_name}`
      })

      setShowChangePlanDialog(false)
      setSelectedSubscription(null)
      setChangePlanNewPlan('')
      setChangePlanReason('')
      await loadData()
    } catch (error: any) {
      console.error('Error changing plan:', error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleExtendSubscription() {
    if (!selectedSubscription) return
    
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const currentEndDate = selectedSubscription.end_date ? new Date(selectedSubscription.end_date) : new Date()
      const newEndDate = new Date(currentEndDate)
      newEndDate.setMonth(newEndDate.getMonth() + parseInt(extendMonths))

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          end_date: newEndDate.toISOString(),
          notes: (selectedSubscription.notes || '') + `\n[${new Date().toLocaleString()}] Suscripción extendida por ${extendMonths} mes(es). Razón: ${extendReason}`,
          managed_by: user?.id
        })
        .eq('id', selectedSubscription.id)

      if (error) throw error

      toast({
        title: "✅ Suscripción Extendida",
        description: `Suscripción extendida hasta ${newEndDate.toLocaleDateString()}`
      })

      setShowExtendDialog(false)
      setSelectedSubscription(null)
      setExtendMonths('1')
      setExtendReason('')
      await loadData()
    } catch (error: any) {
      console.error('Error extending subscription:', error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleTogglePlanStatus(planId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ is_active: !currentStatus })
        .eq('id', planId)

      if (error) throw error

      toast({
        title: "✅ Estado Actualizado",
        description: `Plan ${!currentStatus ? 'activado' : 'desactivado'} correctamente`
      })

      await loadData()
    } catch (error: any) {
      console.error('Error toggling plan status:', error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  async function handleProcessPayment() {
    if (!selectedNotification) return

    if (processPaymentAction === 'approve' && !processPaymentMonths) {
      toast({
        title: "Error",
        description: "Especifica los meses a extender",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    try {
      const { data, error } = await supabase.rpc('process_payment_notification', {
        p_notification_id: selectedNotification.id,
        p_action: processPaymentAction,
        p_admin_notes: processPaymentNotes || null,
        p_extend_months: processPaymentAction === 'approve' ? parseInt(processPaymentMonths) : 1
      })

      if (error) throw error

      toast({
        title: "✅ Notificación Procesada",
        description: processPaymentAction === 'approve' 
          ? `Pago aprobado. Suscripción extendida por ${processPaymentMonths} mes(es).`
          : "Notificación rechazada"
      })

      setShowProcessPaymentDialog(false)
      setProcessPaymentNotes('')
      setProcessPaymentMonths('1')
      setProcessPaymentAction('approve')
      await loadData()
    } catch (error: any) {
      console.error('Error processing payment:', error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, { variant: any; icon: any }> = {
      active: { variant: 'default', icon: CheckCircle },
      trial: { variant: 'secondary', icon: CheckCircle },
      inactive: { variant: 'secondary', icon: XCircle },
      expired: { variant: 'destructive', icon: XCircle },
      cancelled: { variant: 'destructive', icon: Ban },
      suspended: { variant: 'destructive', icon: Ban }
    }

    const config = variants[status] || variants.inactive
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.toUpperCase()}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!isManager) {
    return null
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🔐 Gestión de Suscripciones</h1>
        <p className="text-muted-foreground">
          Panel de control para gestionar suscripciones de usuarios
        </p>
      </div>

      <Tabs defaultValue="subscriptions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="subscriptions">Suscripciones</TabsTrigger>
          <TabsTrigger value="plans">Planes</TabsTrigger>
          <TabsTrigger value="notifications" className="relative">
            Notificaciones de Pago
            {paymentNotifications.filter(n => n.status === 'pending').length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                {paymentNotifications.filter(n => n.status === 'pending').length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Suscripciones de Usuarios</h2>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Suscripción
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Crear Nueva Suscripción</DialogTitle>
                  <DialogDescription>
                    Asignar una suscripción manualmente a un usuario
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Seleccionar Usuario</Label>
                    <Select value={newSubEmail} onValueChange={setNewSubEmail}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un usuario..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {allUsers.map(user => (
                          <SelectItem key={user.user_id} value={user.email}>
                            {user.email} {user.display_name ? `(${user.display_name})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="plan">Plan</Label>
                    <Select value={newSubPlan} onValueChange={setNewSubPlan}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.filter(p => p.is_active).map(plan => (
                          <SelectItem key={plan.id} value={plan.name}>
                            {plan.display_name} - ${plan.price_monthly}/mes
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="status">Estado</Label>
                      <Select value={newSubStatus} onValueChange={(v: any) => setNewSubStatus(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Activa</SelectItem>
                          <SelectItem value="trial">Prueba</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="billing">Ciclo de Facturación</Label>
                      <Select value={newSubBillingCycle} onValueChange={(v: any) => setNewSubBillingCycle(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Mensual</SelectItem>
                          <SelectItem value="yearly">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endDate">Fecha de Expiración (Opcional)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={newSubEndDate}
                      onChange={(e) => setNewSubEndDate(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notas</Label>
                    <Textarea
                      id="notes"
                      placeholder="Notas sobre esta suscripción..."
                      value={newSubNotes}
                      onChange={(e) => setNewSubNotes(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateSubscription} disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crear Suscripción
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Ciclo</TableHead>
                    <TableHead>Fecha Inicio</TableHead>
                    <TableHead>Fecha Fin</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.user_email}</TableCell>
                      <TableCell>{sub.plan_display_name}</TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell className="capitalize">{sub.billing_cycle}</TableCell>
                      <TableCell>{new Date(sub.start_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {sub.end_date ? new Date(sub.end_date).toLocaleDateString() : 'Sin límite'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Editar Estado"
                            onClick={() => {
                              setSelectedSubscription(sub)
                              setEditStatus(sub.status)
                              setEditNotes(sub.notes || '')
                              setShowEditDialog(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Cambiar Plan"
                            onClick={() => {
                              setSelectedSubscription(sub)
                              setChangePlanNewPlan('')
                              setShowChangePlanDialog(true)
                            }}
                          >
                            📦
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Extender Suscripción"
                            onClick={() => {
                              setSelectedSubscription(sub)
                              setExtendMonths('1')
                              setShowExtendDialog(true)
                            }}
                          >
                            📅
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <h2 className="text-2xl font-bold">Planes de Suscripción</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <Card key={plan.id} className={!plan.is_active ? 'opacity-50' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.display_name}
                    {plan.is_default && <Badge>Por defecto</Badge>}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-3xl font-bold">${plan.price_monthly}</p>
                    <p className="text-sm text-muted-foreground">por mes</p>
                    <div className="pt-4 space-y-1 text-sm">
                      <p>👥 Usuarios: {plan.max_users || 'Ilimitados'}</p>
                      <p>📄 Facturas/mes: {plan.max_invoices_per_month || 'Ilimitadas'}</p>
                      <p>📦 Productos: {plan.max_products || 'Ilimitados'}</p>
                      <p>👤 Clientes: {plan.max_clients || 'Ilimitados'}</p>
                    </div>
                    <div className="pt-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setSelectedPlan(plan)
                          setEditPlanName(plan.name)
                          setEditPlanDisplayName(plan.display_name)
                          setEditPlanDescription(plan.description || '')
                          setEditPlanPriceMonthly(plan.price_monthly.toString())
                          setEditPlanPriceYearly(plan.price_yearly.toString())
                          setEditPlanMaxUsers(plan.max_users?.toString() || '')
                          setEditPlanMaxInvoices(plan.max_invoices_per_month?.toString() || '')
                          setEditPlanMaxProducts(plan.max_products?.toString() || '')
                          setEditPlanMaxClients(plan.max_clients?.toString() || '')
                          setShowEditPlanDialog(true)
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant={plan.is_active ? "destructive" : "default"}
                        onClick={() => handleTogglePlanStatus(plan.id, plan.is_active)}
                      >
                        {plan.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Notificaciones de Pago</h2>
            <Badge variant={paymentNotifications.filter(n => n.status === 'pending').length > 0 ? 'destructive' : 'secondary'}>
              {paymentNotifications.filter(n => n.status === 'pending').length} Pendiente(s)
            </Badge>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Detalles del Pago</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentNotifications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No hay notificaciones de pago
                      </TableCell>
                    </TableRow>
                  ) : (
                    paymentNotifications.map((notification) => (
                      <TableRow key={notification.id} className={notification.status === 'pending' ? 'bg-yellow-50' : ''}>
                        <TableCell>
                          {new Date(notification.created_at).toLocaleString('es-DO', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{notification.user_email}</p>
                            {notification.subscription && (
                              <p className="text-xs text-muted-foreground">
                                {notification.subscription.plan_display_name}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {notification.subscription ? (
                            <Badge variant="outline">
                              {notification.subscription.plan_display_name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Sin plan</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm truncate" title={notification.payment_note}>
                            {notification.payment_note}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            notification.status === 'pending' ? 'default' :
                            notification.status === 'processed' ? 'secondary' :
                            notification.status === 'rejected' ? 'destructive' :
                            'outline'
                          }>
                            {notification.status === 'pending' ? '⏳ Pendiente' :
                             notification.status === 'processed' ? '✅ Procesado' :
                             notification.status === 'rejected' ? '❌ Rechazado' :
                             notification.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {notification.status === 'pending' ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedNotification(notification)
                                setProcessPaymentAction('approve')
                                setProcessPaymentMonths('1')
                                setProcessPaymentNotes('')
                                setShowProcessPaymentDialog(true)
                              }}
                            >
                              Procesar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                toast({
                                  title: "Información",
                                  description: notification.admin_notes || 'Sin notas adicionales'
                                })
                              }}
                            >
                              Ver Detalles
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <h2 className="text-2xl font-bold">Historial de Cambios</h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Estado Anterior</TableHead>
                    <TableHead>Estado Nuevo</TableHead>
                    <TableHead>Modificado Por</TableHead>
                    <TableHead>Razón</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {new Date(item.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="capitalize">{item.action}</TableCell>
                      <TableCell>{item.old_status || '-'}</TableCell>
                      <TableCell>{item.new_status || '-'}</TableCell>
                      <TableCell>{item.changed_by_email || '-'}</TableCell>
                      <TableCell>{item.reason || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Subscription Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Suscripción</DialogTitle>
            <DialogDescription>
              Cambiar estado de la suscripción de {selectedSubscription?.user_email}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editStatus">Nuevo Estado</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="trial">Prueba</SelectItem>
                  <SelectItem value="inactive">Inactiva</SelectItem>
                  <SelectItem value="suspended">Suspendida</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                  <SelectItem value="expired">Expirada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editReason">Razón del Cambio</Label>
              <Textarea
                id="editReason"
                placeholder="Motivo del cambio de estado..."
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => selectedSubscription && handleUpdateStatus(selectedSubscription, editStatus)}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Actualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={showEditPlanDialog} onOpenChange={setShowEditPlanDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Plan: {selectedPlan?.display_name}</DialogTitle>
            <DialogDescription>
              Modificar precios, límites y características del plan
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[500px] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Nombre para mostrar</Label>
                <Input
                  value={editPlanDisplayName}
                  onChange={(e) => setEditPlanDisplayName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Nombre técnico</Label>
                <Input value={editPlanName} disabled />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label>Descripción</Label>
              <Textarea
                value={editPlanDescription}
                onChange={(e) => setEditPlanDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Precio Mensual ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editPlanPriceMonthly}
                  onChange={(e) => setEditPlanPriceMonthly(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Precio Anual ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editPlanPriceYearly}
                  onChange={(e) => setEditPlanPriceYearly(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Máx. Usuarios (vacío = ilimitado)</Label>
                <Input
                  type="number"
                  value={editPlanMaxUsers}
                  onChange={(e) => setEditPlanMaxUsers(e.target.value)}
                  placeholder="Ilimitado"
                />
              </div>
              <div className="grid gap-2">
                <Label>Máx. Facturas/mes (vacío = ilimitado)</Label>
                <Input
                  type="number"
                  value={editPlanMaxInvoices}
                  onChange={(e) => setEditPlanMaxInvoices(e.target.value)}
                  placeholder="Ilimitado"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Máx. Productos (vacío = ilimitado)</Label>
                <Input
                  type="number"
                  value={editPlanMaxProducts}
                  onChange={(e) => setEditPlanMaxProducts(e.target.value)}
                  placeholder="Ilimitado"
                />
              </div>
              <div className="grid gap-2">
                <Label>Máx. Clientes (vacío = ilimitado)</Label>
                <Input
                  type="number"
                  value={editPlanMaxClients}
                  onChange={(e) => setEditPlanMaxClients(e.target.value)}
                  placeholder="Ilimitado"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditPlanDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdatePlan} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={showChangePlanDialog} onOpenChange={setShowChangePlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Plan de Suscripción</DialogTitle>
            <DialogDescription>
              Cambiar el plan de {selectedSubscription?.user_email}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Plan Actual</Label>
              <Input value={selectedSubscription?.plan_display_name || ''} disabled />
            </div>
            <div className="grid gap-2">
              <Label>Nuevo Plan</Label>
              <Select value={changePlanNewPlan} onValueChange={setChangePlanNewPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar nuevo plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.filter(p => p.is_active && p.id !== selectedSubscription?.plan_id).map(plan => (
                    <SelectItem key={plan.id} value={plan.name}>
                      {plan.display_name} - ${plan.price_monthly}/mes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Razón del Cambio</Label>
              <Textarea
                placeholder="¿Por qué se cambia el plan?"
                value={changePlanReason}
                onChange={(e) => setChangePlanReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePlanDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleChangePlan} disabled={submitting || !changePlanNewPlan}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cambiar Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Subscription Dialog */}
      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extender Suscripción</DialogTitle>
            <DialogDescription>
              Extender la suscripción de {selectedSubscription?.user_email}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Fecha de Vencimiento Actual</Label>
              <Input 
                value={selectedSubscription?.end_date ? new Date(selectedSubscription.end_date).toLocaleDateString() : 'Sin límite'} 
                disabled 
              />
            </div>
            <div className="grid gap-2">
              <Label>Extender por (meses)</Label>
              <Select value={extendMonths} onValueChange={setExtendMonths}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 mes</SelectItem>
                  <SelectItem value="2">2 meses</SelectItem>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses (1 año)</SelectItem>
                  <SelectItem value="24">24 meses (2 años)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Razón de la Extensión</Label>
              <Textarea
                placeholder="¿Por qué se extiende la suscripción?"
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtendDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExtendSubscription} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Extender Suscripción
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Procesar Notificación de Pago */}
      <Dialog open={showProcessPaymentDialog} onOpenChange={setShowProcessPaymentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Procesar Notificación de Pago</DialogTitle>
            <DialogDescription>
              Revisa los detalles del pago y decide aprobar o rechazar la notificación.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedNotification && (
              <>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Usuario:</span> {selectedNotification.user_email}
                    </div>
                    <div>
                      <span className="font-medium">Fecha:</span>{' '}
                      {new Date(selectedNotification.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-sm">Detalles del Pago:</span>
                    <p className="text-sm mt-1 p-2 bg-white rounded border">
                      {selectedNotification.payment_note}
                    </p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Acción</Label>
                  <Select
                    value={processPaymentAction}
                    onValueChange={(value: 'approve' | 'reject') => setProcessPaymentAction(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approve">✅ Aprobar y Extender Suscripción</SelectItem>
                      <SelectItem value="reject">❌ Rechazar Notificación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {processPaymentAction === 'approve' && (
                  <div className="grid gap-2">
                    <Label>Extender Suscripción Por</Label>
                    <Select value={processPaymentMonths} onValueChange={setProcessPaymentMonths}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 mes</SelectItem>
                        <SelectItem value="2">2 meses</SelectItem>
                        <SelectItem value="3">3 meses</SelectItem>
                        <SelectItem value="6">6 meses</SelectItem>
                        <SelectItem value="12">12 meses (1 año)</SelectItem>
                        <SelectItem value="24">24 meses (2 años)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label>Notas del Administrador (opcional)</Label>
                  <Textarea
                    placeholder="Agrega notas sobre esta transacción..."
                    value={processPaymentNotes}
                    onChange={(e) => setProcessPaymentNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProcessPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleProcessPayment} 
              disabled={submitting}
              variant={processPaymentAction === 'approve' ? 'default' : 'destructive'}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {processPaymentAction === 'approve' ? 'Aprobar y Extender' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
