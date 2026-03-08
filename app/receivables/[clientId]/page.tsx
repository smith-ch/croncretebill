'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useCurrency } from '@/hooks/use-currency'
import { useDataUserId } from '@/hooks/use-data-user-id'
import {
    ArrowLeft,
    RefreshCcw,
    DollarSign,
    Plus,
    FileText,
    Calendar,
    Phone,
    Mail,
    Clock,
    CheckCircle2,
    AlertTriangle,
    CreditCard,
    Banknote,
    Receipt,
    History,
    Building2,
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

interface Client {
    id: string
    name: string
    rnc_cedula: string | null
    phone: string | null
    email: string | null
    address: string | null
}

interface AccountReceivable {
    id: string
    invoice_id: string | null
    thermal_receipt_id: string | null
    document_number: string | null
    description: string | null
    total_amount: number
    paid_amount: number
    balance: number
    issue_date: string
    due_date: string
    status: string
    notes: string | null
}

interface Payment {
    id: string
    payment_number: string
    amount: number
    payment_method: string
    reference_number: string | null
    payment_date: string
    notes: string | null
}

export default function ClientReceivablesPage() {
    const router = useRouter()
    const params = useParams()
    const clientId = params.clientId as string
    const { toast } = useToast()
    const { formatCurrency, currencySymbol } = useCurrency()
    const { dataUserId, loading: userLoading } = useDataUserId()

    const [loading, setLoading] = useState(true)
    const [client, setClient] = useState<Client | null>(null)
    const [accounts, setAccounts] = useState<AccountReceivable[]>([])
    const [payments, setPayments] = useState<Payment[]>([])
    
    // Payment form state
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
    const [paymentAmount, setPaymentAmount] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const [paymentReference, setPaymentReference] = useState('')
    const [paymentNotes, setPaymentNotes] = useState('')
    const [useFIFO, setUseFIFO] = useState(true)
    const [selectedAccountId, setSelectedAccountId] = useState<string>('')
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
    const [submitting, setSubmitting] = useState(false)
    
    // Cash register shift (Módulo G)
    const [activeCashShiftId, setActiveCashShiftId] = useState<string | null>(null)

    const fetchClientData = useCallback(async () => {
        if (!dataUserId || !clientId) {
            return
        }
        
        setLoading(true)
        try {
            // Fetch client info
            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .select('*')
                .eq('id', clientId)
                .single()

            if (clientError) {
                throw clientError
            }
            setClient(clientData as Client)

            // Fetch accounts receivable
            const { data: accountsData, error: accountsError } = await supabase
                .from('accounts_receivable')
                .select('*')
                .eq('user_id', dataUserId)
                .eq('client_id', clientId)
                .order('due_date', { ascending: true })

            if (accountsError) {
                throw accountsError
            }
            setAccounts((accountsData || []) as AccountReceivable[])

            // Fetch payment history
            const { data: paymentsData, error: paymentsError } = await supabase
                .from('ar_payments')
                .select('*')
                .eq('user_id', dataUserId)
                .eq('client_id', clientId)
                .order('payment_date', { ascending: false })
                .limit(50)

            if (paymentsError) {
                throw paymentsError
            }
            setPayments((paymentsData || []) as Payment[])

            // Fetch active cash shift (Módulo G)
            try {
                const { data: shiftData, error: shiftErr } = await supabase
                    .from('cash_register_shifts')
                    .select('id')
                    .eq('user_id', dataUserId)
                    .eq('status', 'abierta')
                    .maybeSingle()
                
                if (!shiftErr && shiftData?.id) {
                    setActiveCashShiftId(shiftData.id)
                }
            } catch {
                // No active shift - this is ok
            }

        } catch (error: any) {
            console.error('Error fetching client data:', error)
            toast({
                title: "Error",
                description: "No se pudo cargar la información del cliente.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }, [dataUserId, clientId, toast])

    useEffect(() => {
        if (dataUserId && clientId) {
            fetchClientData()
        }
    }, [dataUserId, clientId, fetchClientData])

    // Summary calculations
    const summary = useMemo(() => {
        const today = new Date()
        return accounts.reduce((acc, ar) => {
            const balance = parseFloat(String(ar.balance)) || 0
            const daysOverdue = differenceInDays(today, new Date(ar.due_date))
            
            return {
                totalInvoiced: acc.totalInvoiced + (parseFloat(String(ar.total_amount)) || 0),
                totalPaid: acc.totalPaid + (parseFloat(String(ar.paid_amount)) || 0),
                totalBalance: acc.totalBalance + balance,
                overdueBalance: acc.overdueBalance + (daysOverdue > 0 ? balance : 0),
                overdueCount: acc.overdueCount + (daysOverdue > 0 && balance > 0 ? 1 : 0)
            }
        }, {
            totalInvoiced: 0,
            totalPaid: 0,
            totalBalance: 0,
            overdueBalance: 0,
            overdueCount: 0
        })
    }, [accounts])

    const pendingAccounts = useMemo(() => 
        accounts.filter(ar => parseFloat(String(ar.balance)) > 0)
            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
        [accounts]
    )

    // Cuentas ya pagadas (historial)
    const paidAccounts = useMemo(() => 
        accounts.filter(ar => parseFloat(String(ar.balance)) <= 0 && ar.status === 'pagado')
            .sort((a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime()),
        [accounts]
    )

    const getAgingBadge = (dueDate: string) => {
        const daysOverdue = differenceInDays(new Date(), new Date(dueDate))
        if (daysOverdue <= 0) {
            return <Badge className="bg-emerald-500 text-white">Al día</Badge>
        }
        if (daysOverdue <= 7) {
            return <Badge className="bg-yellow-500 text-black">+{daysOverdue}d</Badge>
        }
        if (daysOverdue <= 15) {
            return <Badge className="bg-amber-500 text-white">+{daysOverdue}d</Badge>
        }
        if (daysOverdue <= 30) {
            return <Badge className="bg-orange-500 text-white">+{daysOverdue}d</Badge>
        }
        return <Badge variant="destructive">+{daysOverdue}d</Badge>
    }

    const handleSubmitPayment = async () => {
        const amount = parseFloat(paymentAmount)
        if (!amount || amount <= 0) {
            toast({
                title: "Error",
                description: "Ingrese un monto válido.",
                variant: "destructive"
            })
            return
        }

        // Validate selection when not using FIFO
        if (!useFIFO && !selectedAccountId) {
            toast({
                title: "Error",
                description: "Seleccione un crédito a pagar.",
                variant: "destructive"
            })
            return
        }

        // Validate amount against selected account or total balance
        const maxAmount = !useFIFO && selectedAccountId 
            ? (pendingAccounts.find(a => a.id === selectedAccountId)?.balance || 0)
            : summary.totalBalance
        
        if (amount > maxAmount) {
            toast({
                title: "Error",
                description: `El monto excede el balance pendiente (${formatCurrency(maxAmount)}).`,
                variant: "destructive"
            })
            return
        }

        setSubmitting(true)
        try {
            // Generate payment number
            const paymentNumber = `PAG-${Date.now().toString(36).toUpperCase()}`

            // Create payment record
            const { data: paymentData, error: paymentError } = await supabase
                .from('ar_payments')
                .insert({
                    user_id: dataUserId,
                    client_id: clientId,
                    payment_number: paymentNumber,
                    amount: amount,
                    payment_method: paymentMethod,
                    reference_number: paymentReference || null,
                    notes: paymentNotes || null,
                    payment_date: new Date().toISOString(),
                    cash_shift_id: activeCashShiftId
                })
                .select()
                .single()

            if (paymentError) {
                throw paymentError
            }

            const paymentId = (paymentData as { id: string }).id

            // Apply payment using FIFO
            if (useFIFO) {
                let remainingAmount = amount

                for (const ar of pendingAccounts) {
                    if (remainingAmount <= 0) {
                        break
                    }
                    const arBalance = parseFloat(String(ar.balance))
                    if (arBalance <= 0) {
                        continue
                    }

                    const applyAmount = Math.min(remainingAmount, arBalance)

                    // Create payment application record
                    await supabase.from('ar_payment_applications').insert({
                        payment_id: paymentId,
                        account_receivable_id: ar.id,
                        amount_applied: applyAmount
                    })

                    // Update account receivable (balance is GENERATED, don't update it directly)
                    const newPaidAmount = (parseFloat(String(ar.paid_amount)) || 0) + applyAmount
                    const totalAmount = parseFloat(String(ar.total_amount)) || 0
                    const newStatus = (totalAmount - newPaidAmount) <= 0.01 ? 'pagado' : 'parcial'

                    await supabase
                        .from('accounts_receivable')
                        .update({
                            paid_amount: newPaidAmount,
                            status: newStatus,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', ar.id)

                    // Si la cuenta está completamente pagada, actualizar factura/recibo
                    if (newStatus === 'pagado') {
                        if (ar.invoice_id) {
                            await supabase
                                .from('invoices')
                                .update({ status: 'pagada' })
                                .eq('id', ar.invoice_id)
                        }
                        if (ar.thermal_receipt_id) {
                            // Actualizar el recibo térmico para indicar que fue pagado
                            await supabase
                                .from('thermal_receipts')
                                .update({ 
                                    status: 'active', 
                                    payment_method: 'paid_credit', 
                                    notes: `Crédito pagado - ${new Date().toLocaleDateString()}` 
                                })
                                .eq('id', ar.thermal_receipt_id)
                        }
                    }

                    remainingAmount -= applyAmount
                }
            } else if (selectedAccountId) {
                // Apply to specific selected account
                const ar = pendingAccounts.find(a => a.id === selectedAccountId)
                if (ar) {
                    const arBalance = parseFloat(String(ar.balance))
                    const applyAmount = Math.min(amount, arBalance)

                    await supabase.from('ar_payment_applications').insert({
                        payment_id: paymentId,
                        account_receivable_id: ar.id,
                        amount_applied: applyAmount
                    })

                    const newPaidAmount = (parseFloat(String(ar.paid_amount)) || 0) + applyAmount
                    const totalAmount = parseFloat(String(ar.total_amount)) || 0
                    const newStatus = (totalAmount - newPaidAmount) <= 0.01 ? 'pagado' : 'parcial'

                    await supabase
                        .from('accounts_receivable')
                        .update({
                            paid_amount: newPaidAmount,
                            status: newStatus,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', ar.id)

                    // Si la cuenta está completamente pagada, actualizar factura/recibo
                    if (newStatus === 'pagado') {
                        if (ar.invoice_id) {
                            await supabase
                                .from('invoices')
                                .update({ status: 'pagada' })
                                .eq('id', ar.invoice_id)
                        }
                        if (ar.thermal_receipt_id) {
                            await supabase
                                .from('thermal_receipts')
                                .update({ 
                                    status: 'active', 
                                    payment_method: 'paid_credit', 
                                    notes: `Crédito pagado - ${new Date().toLocaleDateString()}` 
                                })
                                .eq('id', ar.thermal_receipt_id)
                        }
                    }
                }
            }

            toast({
                title: "Pago registrado",
                description: `Se registró el pago ${paymentNumber} por ${formatCurrency(amount)}.`
            })

            // Reset form and refresh
            setPaymentDialogOpen(false)
            setPaymentAmount('')
            setPaymentReference('')
            setPaymentNotes('')
            setSelectedAccountId('')
            setSelectedAccounts([])
            setUseFIFO(true)
            fetchClientData()

        } catch (error: any) {
            console.error('Error submitting payment:', error)
            toast({
                title: "Error",
                description: "No se pudo registrar el pago.",
                variant: "destructive"
            })
        } finally {
            setSubmitting(false)
        }
    }

    if (userLoading || loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <RefreshCcw className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        )
    }

    if (!client) {
        return (
            <div className="text-center p-12">
                <p className="text-slate-400">Cliente no encontrado.</p>
                <Button onClick={() => router.back()} className="mt-4">Volver</Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex items-start gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/receivables')}
                        className="text-slate-400 hover:text-slate-100"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                            <Building2 className="h-6 w-6 text-blue-500" />
                            {client.name}
                        </h1>
                        <div className="flex flex-wrap gap-4 mt-1 text-sm text-slate-400">
                            {client.rnc_cedula && (
                                <span className="flex items-center gap-1">
                                    <FileText className="h-4 w-4" />
                                    {client.rnc_cedula}
                                </span>
                            )}
                            {client.phone && (
                                <span className="flex items-center gap-1">
                                    <Phone className="h-4 w-4" />
                                    {client.phone}
                                </span>
                            )}
                            {client.email && (
                                <span className="flex items-center gap-1">
                                    <Mail className="h-4 w-4" />
                                    {client.email}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                            disabled={summary.totalBalance <= 0}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Registrar Pago
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-950 border-slate-800 w-full max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-slate-100">Nuevo Pago</DialogTitle>
                            <DialogDescription>
                                Balance pendiente: {formatCurrency(summary.totalBalance)}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 mt-4">
                            {/* Amount */}
                            <div className="space-y-2">
                                <Label className="text-slate-200">Monto del Pago *</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                        {currencySymbol}
                                    </span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max={summary.totalBalance}
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="pl-10 bg-slate-900 border-slate-700 text-slate-100"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPaymentAmount(summary.totalBalance.toFixed(2))}
                                        className="text-xs bg-slate-900 border-slate-700"
                                    >
                                        Pagar todo
                                    </Button>
                                    {pendingAccounts[0] && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPaymentAmount(String(pendingAccounts[0].balance))}
                                            className="text-xs bg-slate-900 border-slate-700"
                                        >
                                            Pagar más antiguo ({formatCurrency(pendingAccounts[0].balance)})
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="space-y-2">
                                <Label className="text-slate-200">Método de Pago</Label>
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger className="bg-slate-900 border-slate-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">
                                            <span className="flex items-center gap-2">
                                                <Banknote className="h-4 w-4" />
                                                Efectivo
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="transfer">
                                            <span className="flex items-center gap-2">
                                                <CreditCard className="h-4 w-4" />
                                                Transferencia
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="check">
                                            <span className="flex items-center gap-2">
                                                <Receipt className="h-4 w-4" />
                                                Cheque
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="card">
                                            <span className="flex items-center gap-2">
                                                <CreditCard className="h-4 w-4" />
                                                Tarjeta
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Reference Number */}
                            <div className="space-y-2">
                                <Label className="text-slate-200">No. Referencia (opcional)</Label>
                                <Input
                                    value={paymentReference}
                                    onChange={(e) => setPaymentReference(e.target.value)}
                                    placeholder="Número de transferencia, cheque, etc."
                                    className="bg-slate-900 border-slate-700 text-slate-100"
                                />
                            </div>

                            {/* FIFO Option */}
                            <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="fifo" 
                                        checked={useFIFO} 
                                        onCheckedChange={(checked) => {
                                            setUseFIFO(checked as boolean)
                                            if (checked) {
                                                setSelectedAccountId('')
                                            }
                                        }}
                                    />
                                    <Label htmlFor="fifo" className="text-slate-200 cursor-pointer">
                                        Aplicar automáticamente (FIFO)
                                    </Label>
                                </div>
                                <p className="text-xs text-slate-500">
                                    El pago se aplicará primero a las facturas más antiguas.
                                </p>
                            </div>

                            {/* Invoice Selector - when FIFO is off */}
                            {!useFIFO && (
                                <div className="space-y-2">
                                    <Label className="text-slate-200">Seleccionar Crédito a Pagar *</Label>
                                    <Select 
                                        value={selectedAccountId} 
                                        onValueChange={(value) => {
                                            setSelectedAccountId(value)
                                            const selected = pendingAccounts.find(a => a.id === value)
                                            if (selected) {
                                                setPaymentAmount(String(selected.balance))
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="bg-slate-900 border-slate-700">
                                            <SelectValue placeholder="Seleccione un crédito..." />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60">
                                            {pendingAccounts.map((ar) => (
                                                <SelectItem key={ar.id} value={ar.id}>
                                                    <span className="flex items-center justify-between gap-4">
                                                        <span className="font-medium">{ar.document_number || 'Sin número'}</span>
                                                        <span className="text-amber-400">{formatCurrency(ar.balance)}</span>
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {selectedAccountId && (
                                        <p className="text-xs text-emerald-400">
                                            Saldo de este crédito: {formatCurrency(pendingAccounts.find(a => a.id === selectedAccountId)?.balance || 0)}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label className="text-slate-200">Notas (opcional)</Label>
                                <Input
                                    value={paymentNotes}
                                    onChange={(e) => setPaymentNotes(e.target.value)}
                                    placeholder="Observaciones adicionales"
                                    className="bg-slate-900 border-slate-700 text-slate-100"
                                />
                            </div>

                            {/* Submit */}
                            <Button
                                onClick={handleSubmitPayment}
                                disabled={submitting || !paymentAmount || (!useFIFO && !selectedAccountId)}
                                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                            >
                                {submitting ? (
                                    <>
                                        <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Registrar Pago
                                    </>
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-400 mb-1">Total Facturado</p>
                                <h3 className="text-2xl font-bold text-blue-400">{formatCurrency(summary.totalInvoiced)}</h3>
                            </div>
                            <div className="p-3 bg-blue-500/10 rounded-xl">
                                <FileText className="h-5 w-5 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-400 mb-1">Total Pagado</p>
                                <h3 className="text-2xl font-bold text-emerald-400">{formatCurrency(summary.totalPaid)}</h3>
                            </div>
                            <div className="p-3 bg-emerald-500/10 rounded-xl">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-400 mb-1">Balance Pendiente</p>
                                <h3 className="text-2xl font-bold text-amber-400">{formatCurrency(summary.totalBalance)}</h3>
                            </div>
                            <div className="p-3 bg-amber-500/10 rounded-xl">
                                <DollarSign className="h-5 w-5 text-amber-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-400 mb-1">Vencido</p>
                                <h3 className="text-2xl font-bold text-red-400">{formatCurrency(summary.overdueBalance)}</h3>
                                <p className="text-xs text-slate-500">{summary.overdueCount} doc. vencidos</p>
                            </div>
                            <div className="p-3 bg-red-500/10 rounded-xl">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs: Pendientes / Pagadas / Historial de Pagos */}
            <Tabs defaultValue="pendientes" className="w-full">
                <TabsList className="bg-slate-900 border-slate-800 w-full grid grid-cols-3 mb-4">
                    <TabsTrigger value="pendientes" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                        <Clock className="h-4 w-4 mr-2" />
                        Pendientes ({pendingAccounts.length})
                    </TabsTrigger>
                    <TabsTrigger value="pagadas" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Pagadas ({paidAccounts.length})
                    </TabsTrigger>
                    <TabsTrigger value="pagos" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                        <History className="h-4 w-4 mr-2" />
                        Pagos ({payments.length})
                    </TabsTrigger>
                </TabsList>

                {/* Tab: Pendientes */}
                <TabsContent value="pendientes">
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader className="border-b border-slate-800">
                            <CardTitle className="text-lg text-slate-200 flex items-center gap-2">
                                <Clock className="h-5 w-5 text-amber-400" />
                                Documentos Pendientes
                            </CardTitle>
                            <CardDescription>
                                Facturas y documentos con saldo pendiente, ordenados por antigüedad
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {pendingAccounts.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-300">Sin saldos pendientes</h3>
                                    <p className="text-slate-500">Este cliente no tiene facturas pendientes de pago.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-800 text-slate-400 text-sm">
                                                <th className="text-left p-4 font-medium">Referencia</th>
                                                <th className="text-left p-4 font-medium">Fecha</th>
                                                <th className="text-left p-4 font-medium">Vencimiento</th>
                                                <th className="text-right p-4 font-medium">Total</th>
                                                <th className="text-right p-4 font-medium">Pagado</th>
                                                <th className="text-right p-4 font-medium">Saldo</th>
                                                <th className="text-center p-4 font-medium">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                            {pendingAccounts.map((ar) => {
                                                const daysOverdue = differenceInDays(new Date(), new Date(ar.due_date))
                                                return (
                                                    <tr 
                                                        key={ar.id} 
                                                        className={`hover:bg-slate-800/30 transition-colors ${
                                                            daysOverdue > 15 ? 'bg-red-950/10' : ''
                                                        }`}
                                                    >
                                                        <td className="p-4">
                                                            <div>
                                                                <p className="font-medium text-slate-200">{ar.document_number}</p>
                                                                <p className="text-xs text-slate-500">{ar.description}</p>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-slate-300">
                                                            {format(new Date(ar.issue_date), 'dd/MM/yyyy', { locale: es })}
                                                        </td>
                                                        <td className="p-4 text-slate-300">
                                                            {format(new Date(ar.due_date), 'dd/MM/yyyy', { locale: es })}
                                                        </td>
                                                        <td className="p-4 text-right text-slate-300">
                                                            {formatCurrency(ar.total_amount)}
                                                        </td>
                                                        <td className="p-4 text-right text-emerald-400">
                                                            {formatCurrency(ar.paid_amount)}
                                                        </td>
                                                        <td className="p-4 text-right font-bold text-amber-400">
                                                            {formatCurrency(ar.balance)}
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            {getAgingBadge(ar.due_date)}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Pagadas */}
                <TabsContent value="pagadas">
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader className="border-b border-slate-800">
                            <CardTitle className="text-lg text-slate-200 flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                Facturas Pagadas
                            </CardTitle>
                            <CardDescription>
                                Historial de créditos que el cliente ya saldó completamente
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {paidAccounts.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FileText className="h-8 w-8 text-slate-500" />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-300">Sin historial de pagos</h3>
                                    <p className="text-slate-500">Este cliente aún no ha saldado ningún crédito.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-800 text-slate-400 text-sm">
                                                <th className="text-left p-4 font-medium">Referencia</th>
                                                <th className="text-left p-4 font-medium">Fecha Emisión</th>
                                                <th className="text-right p-4 font-medium">Total</th>
                                                <th className="text-center p-4 font-medium">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                            {paidAccounts.map((ar) => (
                                                <tr key={ar.id} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-4">
                                                        <div>
                                                            <p className="font-medium text-slate-200">{ar.document_number}</p>
                                                            <p className="text-xs text-slate-500">{ar.description}</p>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-slate-300">
                                                        {format(new Date(ar.issue_date), 'dd/MM/yyyy', { locale: es })}
                                                    </td>
                                                    <td className="p-4 text-right text-slate-300">
                                                        {formatCurrency(ar.total_amount)}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                                            Pagada
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Historial de Pagos */}
                <TabsContent value="pagos">
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader className="border-b border-slate-800">
                            <CardTitle className="text-lg text-slate-200 flex items-center gap-2">
                                <History className="h-5 w-5 text-blue-400" />
                                Historial de Pagos/Abonos
                            </CardTitle>
                            <CardDescription>
                                Todos los pagos realizados por este cliente
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {payments.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    No hay pagos registrados para este cliente.
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-800/50">
                                    {payments.map((payment) => (
                                        <div key={payment.id} className="p-4 flex justify-between items-center hover:bg-slate-800/30">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                                    <Banknote className="h-5 w-5 text-emerald-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-200">{payment.payment_number}</p>
                                                    <p className="text-sm text-slate-500 flex items-center gap-2">
                                                        <Calendar className="h-3 w-3" />
                                                        {format(new Date(payment.payment_date), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                                                        <span className="capitalize">• {payment.payment_method}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-lg font-bold text-emerald-400">
                                                +{formatCurrency(payment.amount)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
