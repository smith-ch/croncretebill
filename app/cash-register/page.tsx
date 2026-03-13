'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useCurrency } from '@/hooks/use-currency'
import { useDataUserId } from '@/hooks/use-data-user-id'
import { useUserPermissions } from '@/hooks/use-user-permissions-simple'
import {
    RefreshCcw,
    DollarSign,
    Plus,
    Minus,
    Lock,
    Unlock,
    Clock,
    CheckCircle2,
    AlertTriangle,
    Calculator,
    Receipt,
    FileText,
    ArrowDownCircle,
    History,
    XCircle,
    Banknote,
    CreditCard,
    Building2,
    User,
} from 'lucide-react'
import { format, differenceInHours } from 'date-fns'
import { es } from 'date-fns/locale'

interface CashShift {
    id: string
    opened_by: string
    opened_at: string
    closed_at: string | null
    opening_amount: number
    reported_cash: number | null
    expected_cash: number | null
    variance: number | null
    status: 'abierta' | 'cerrada' | 'forzada'
    total_cash_sales: number
    total_card_sales: number
    total_transfer_sales: number
    total_credit_sales: number
    total_cash_payments: number
    total_cash_withdrawals: number
    opening_notes: string | null
    closing_notes: string | null
}

interface Withdrawal {
    id: string
    amount: number
    reason: string
    category: string
    created_at: string
}

interface ShiftTransaction {
    id: string
    type: 'sale' | 'payment' | 'withdrawal'
    receipt_number?: string
    client_name?: string
    amount: number
    payment_method: string
    created_at: string
    isPending?: boolean  // Para recibos pendientes de pago
}

export default function CashRegisterPage() {
    const router = useRouter()
    const { toast } = useToast()
    const { formatCurrency, currencySymbol } = useCurrency()
    const { dataUserId, loading: userLoading } = useDataUserId()
    const { permissions } = useUserPermissions()

    const [loading, setLoading] = useState(true)
    const [activeShift, setActiveShift] = useState<CashShift | null>(null)
    const [pendingShift, setPendingShift] = useState<CashShift | null>(null) // Turno anterior sin cerrar
    const [recentShifts, setRecentShifts] = useState<CashShift[]>([])
    const [transactions, setTransactions] = useState<ShiftTransaction[]>([])
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
    
    // Open shift form
    const [openDialogOpen, setOpenDialogOpen] = useState(false)
    const [openingAmount, setOpeningAmount] = useState('500.00')
    const [openingNotes, setOpeningNotes] = useState('')
    
    // Withdrawal form
    const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false)
    const [withdrawalAmount, setWithdrawalAmount] = useState('')
    const [withdrawalReason, setWithdrawalReason] = useState('')
    const [withdrawalCategory, setWithdrawalCategory] = useState('gasto_menor')
    
    const [submitting, setSubmitting] = useState(false)

    const fetchData = useCallback(async () => {
        if (!dataUserId) { return }
        
        setLoading(true)
        try {
            // Check for active shift
            const { data: activeData, error: activeError } = await supabase
                .from('cash_register_shifts')
                .select('*')
                .eq('user_id', dataUserId)
                .eq('status', 'abierta')
                .single()

            if (activeError && activeError.code !== 'PGRST116') {
                // Check if table doesn't exist
                if (activeError.code === '42P01') {
                    toast({
                        title: "Módulo no configurado",
                        description: "Ejecuta el script SQL del Módulo G para habilitar el control de caja.",
                        variant: "destructive"
                    })
                    setLoading(false)
                    return
                }
            }

            if (activeData) {
                setActiveShift(activeData as unknown as CashShift)
                
                // Fetch transactions for active shift - thermal receipts
                const { data: salesData } = await supabase
                    .from('thermal_receipts')
                    .select('id, receipt_number, client_name, total_amount, payment_method, status, created_at')
                    .eq('cash_shift_id', activeData.id)
                    .order('created_at', { ascending: false })

                // Fetch transactions for active shift - invoices
                const { data: invoicesData } = await supabase
                    .from('invoices')
                    .select('id, invoice_number, total, payment_method, created_at, clients(name)')
                    .eq('cash_shift_id', activeData.id)
                    .order('created_at', { ascending: false })

                const { data: paymentsData } = await supabase
                    .from('ar_payments')
                    .select('id, payment_number, amount, payment_method, payment_date, client_id')
                    .eq('cash_shift_id', activeData.id)
                    .order('payment_date', { ascending: false })

                const txns: ShiftTransaction[] = []
                
                if (salesData) {
                    salesData.forEach((s: any) => txns.push({
                        id: s.id,
                        type: 'sale',
                        receipt_number: s.receipt_number,
                        client_name: s.client_name,
                        amount: s.total_amount,
                        payment_method: s.payment_method,
                        created_at: s.created_at,
                        isPending: s.status === 'pendiente'
                    }))
                }

                if (invoicesData) {
                    invoicesData.forEach((inv: any) => txns.push({
                        id: inv.id,
                        type: 'sale',
                        receipt_number: inv.invoice_number,
                        client_name: inv.clients?.name || 'Cliente General',
                        amount: inv.total,
                        payment_method: inv.payment_method === 'credito' ? 'credit' : inv.payment_method,
                        created_at: inv.created_at
                    }))
                }
                
                if (paymentsData) {
                    paymentsData.forEach(p => txns.push({
                        id: p.id,
                        type: 'payment',
                        receipt_number: p.payment_number,
                        amount: p.amount,
                        payment_method: p.payment_method,
                        created_at: p.payment_date
                    }))
                }
                
                txns.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                setTransactions(txns)

                // Fetch withdrawals
                const { data: withdrawalsData } = await supabase
                    .from('cash_register_withdrawals')
                    .select('*')
                    .eq('shift_id', (activeData as any).id)
                    .order('created_at', { ascending: false })

                setWithdrawals((withdrawalsData as unknown as Withdrawal[]) || [])
            } else {
                setActiveShift(null)
                setTransactions([])
                setWithdrawals([])
                
                // Check for pending shift from previous day
                const { data: pendingData } = await supabase
                    .from('cash_register_shifts')
                    .select('*')
                    .eq('user_id', dataUserId)
                    .eq('status', 'abierta')
                    .lt('opened_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
                    .single()

                if (pendingData) {
                    setPendingShift(pendingData as unknown as CashShift)
                }
            }

            // Fetch recent closed shifts
            const { data: recentData } = await supabase
                .from('cash_register_shifts')
                .select('*')
                .eq('user_id', dataUserId)
                .in('status', ['cerrada', 'forzada'])
                .order('closed_at', { ascending: false })
                .limit(10)

            setRecentShifts((recentData as unknown as CashShift[]) || [])

        } catch (error: any) {
            console.error('Error fetching cash register data:', error)
            toast({
                title: "Error",
                description: "No se pudo cargar la información de caja.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }, [dataUserId, toast])

    useEffect(() => {
        if (dataUserId) {
            fetchData()
        }
    }, [dataUserId, fetchData])

    const handleOpenShift = async () => {
        const amount = parseFloat(openingAmount)
        if (isNaN(amount) || amount < 0) {
            toast({
                title: "Error",
                description: "El fondo inicial debe ser un número válido.",
                variant: "destructive"
            })
            return
        }

        setSubmitting(true)
        try {
            const { error } = await supabase
                .from('cash_register_shifts')
                .insert({
                    user_id: dataUserId,
                    opened_by: dataUserId,
                    opening_amount: amount,
                    opening_notes: openingNotes.trim() || null
                })
                .select()
                .single()

            if (error) { throw error }

            toast({
                title: "Caja abierta",
                description: `Turno iniciado con fondo de ${formatCurrency(amount)}.`
            })

            setOpenDialogOpen(false)
            setOpeningAmount('500.00')
            setOpeningNotes('')
            fetchData()

        } catch (error: any) {
            console.error('Error opening shift:', error)
            toast({
                title: "Error",
                description: error.message || "No se pudo abrir el turno.",
                variant: "destructive"
            })
        } finally {
            setSubmitting(false)
        }
    }

    const handleAddWithdrawal = async () => {
        if (!activeShift) { return }
        
        const amount = parseFloat(withdrawalAmount)
        if (isNaN(amount) || amount <= 0) {
            toast({
                title: "Error",
                description: "Ingrese un monto válido.",
                variant: "destructive"
            })
            return
        }

        if (!withdrawalReason.trim()) {
            toast({
                title: "Error",
                description: "Debe especificar el motivo de la salida.",
                variant: "destructive"
            })
            return
        }

        setSubmitting(true)
        try {
            const { error } = await supabase
                .from('cash_register_withdrawals')
                .insert({
                    user_id: dataUserId,
                    shift_id: activeShift.id,
                    amount: amount,
                    reason: withdrawalReason.trim(),
                    category: withdrawalCategory,
                    authorized_by: dataUserId
                })

            if (error) { throw error }

            toast({
                title: "Salida registrada",
                description: `Se registró una salida de ${formatCurrency(amount)}.`
            })

            setWithdrawalDialogOpen(false)
            setWithdrawalAmount('')
            setWithdrawalReason('')
            setWithdrawalCategory('gasto_menor')
            fetchData()

        } catch (error: any) {
            console.error('Error adding withdrawal:', error)
            toast({
                title: "Error",
                description: error.message || "No se pudo registrar la salida.",
                variant: "destructive"
            })
        } finally {
            setSubmitting(false)
        }
    }

    // Calculate running totals for active shift (shown after closing only)
    const shiftTotals = React.useMemo(() => {
        if (!activeShift) { return null }
        
        const cashSales = transactions
            .filter(t => t.type === 'sale' && t.payment_method === 'cash')
            .reduce((sum, t) => sum + t.amount, 0)
        
        const cashPayments = transactions
            .filter(t => t.type === 'payment' && t.payment_method === 'cash')
            .reduce((sum, t) => sum + t.amount, 0)
        
        const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0)
        
        return {
            cashSales,
            cashPayments,
            totalWithdrawals,
            transactionCount: transactions.length
        }
    }, [activeShift, transactions, withdrawals])

    const getPaymentMethodBadge = (method: string) => {
        switch (method) {
            case 'cash':
                return <Badge className="bg-green-600"><Banknote className="w-3 h-3 mr-1" />Efectivo</Badge>
            case 'card':
                return <Badge className="bg-blue-600"><CreditCard className="w-3 h-3 mr-1" />Tarjeta</Badge>
            case 'transfer':
                return <Badge className="bg-purple-600"><Building2 className="w-3 h-3 mr-1" />Transferencia</Badge>
            case 'credit':
                return <Badge variant="outline" className="border-amber-500 text-amber-400">Crédito</Badge>
            case 'paid_credit':
                return <Badge variant="outline" className="border-slate-500 text-slate-400">paid_credit</Badge>
            default:
                return <Badge variant="outline">{method}</Badge>
        }
    }

    // Check if a payment method counts as cash income
    const countsToCash = (method: string) => method === 'cash'

    const getVarianceBadge = (variance: number | null) => {
        if (variance === null) { return null }
        if (variance === 0) {
            return <Badge className="bg-green-600 text-lg px-4 py-1">✓ Cuadre Exacto</Badge>
        } else if (variance < 0) {
            return <Badge className="bg-red-600 text-lg px-4 py-1">⚠ Faltante: {formatCurrency(Math.abs(variance))}</Badge>
        } else {
            return <Badge className="bg-amber-600 text-lg px-4 py-1">+ Sobrante: {formatCurrency(variance)}</Badge>
        }
    }

    if (userLoading || loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <RefreshCcw className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        )
    }

    // Blocked state - pending shift from previous day
    if (pendingShift) {
        const hoursOpen = differenceInHours(new Date(), new Date(pendingShift.opened_at))
        
        return (
            <div className="space-y-6 p-4 md:p-6">
                <Card className="bg-red-950/50 border-red-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-400">
                            <Lock className="w-6 h-6" />
                            Turno Anterior Sin Cerrar
                        </CardTitle>
                        <CardDescription className="text-red-300">
                            Tiene un turno abierto desde hace {hoursOpen} horas que debe cerrar antes de continuar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-red-900/30 p-4 rounded-lg">
                            <p className="text-slate-300">
                                <strong>Turno iniciado:</strong> {format(new Date(pendingShift.opened_at), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
                            </p>
                            <p className="text-slate-300">
                                <strong>Fondo inicial:</strong> {formatCurrency(pendingShift.opening_amount)}
                            </p>
                        </div>
                        {permissions.isOwner ? (
                            <Button 
                                onClick={() => router.push(`/cash-register/close?shift=${pendingShift.id}`)}
                                className="w-full bg-red-600 hover:bg-red-700"
                            >
                                <Lock className="w-4 h-4 mr-2" />
                                Cerrar Turno Pendiente
                            </Button>
                        ) : (
                            <div className="bg-amber-900/30 border border-amber-700 p-4 rounded-lg text-center">
                                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                                <p className="text-amber-300 font-medium">Contacte al administrador para cerrar este turno</p>
                                <p className="text-slate-400 text-sm mt-1">Solo el propietario puede cerrar turnos de caja</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <Calculator className="w-7 h-7 text-emerald-500" />
                        Control de Caja
                    </h1>
                    <p className="text-slate-400">
                        Gestión de turnos y efectivo en mostrador
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={fetchData} variant="outline" className="bg-slate-900 border-slate-700">
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Actualizar
                    </Button>
                </div>
            </div>

            {/* Active Shift or Open Button */}
            {activeShift ? (
                <Tabs defaultValue="estado" className="w-full">
                    <TabsList className="bg-slate-900 border-slate-800 w-full grid grid-cols-3 mb-4">
                        <TabsTrigger value="estado" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                            <Clock className="h-4 w-4 mr-2" />
                            Estado Actual
                        </TabsTrigger>
                        <TabsTrigger value="transacciones" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                            <Receipt className="h-4 w-4 mr-2" />
                            Transacciones ({transactions.length})
                        </TabsTrigger>
                        <TabsTrigger value="salidas" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                            <ArrowDownCircle className="h-4 w-4 mr-2" />
                            Salidas ({withdrawals.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="estado">
                        <Card className="bg-gradient-to-br from-emerald-900/30 to-slate-900 border-emerald-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-emerald-400">
                                    <Unlock className="w-5 h-5" />
                                    Caja Abierta
                                </CardTitle>
                                <CardDescription>
                                    Turno activo desde {format(new Date(activeShift.opened_at), "HH:mm 'hrs'", { locale: es })}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-slate-900/50 p-4 rounded-lg text-center">
                                        <p className="text-xs text-slate-400 mb-1">Fondo Inicial</p>
                                        <p className="text-xl font-bold text-emerald-400">
                                            {formatCurrency(activeShift.opening_amount)}
                                        </p>
                                    </div>
                                    <div className="bg-slate-900/50 p-4 rounded-lg text-center">
                                        <p className="text-xs text-slate-400 mb-1">Transacciones</p>
                                        <p className="text-xl font-bold text-blue-400">
                                            {shiftTotals?.transactionCount || 0}
                                        </p>
                                    </div>
                                    <div className="bg-slate-900/50 p-4 rounded-lg text-center">
                                        <p className="text-xs text-slate-400 mb-1">Salidas</p>
                                        <p className="text-xl font-bold text-amber-400">
                                            {withdrawals.length}
                                        </p>
                                    </div>
                                    <div className="bg-slate-900/50 p-4 rounded-lg text-center">
                                        <p className="text-xs text-slate-400 mb-1">Tiempo Abierto</p>
                                        <p className="text-xl font-bold text-slate-200">
                                            {differenceInHours(new Date(), new Date(activeShift.opened_at))}h
                                        </p>
                                    </div>
                                </div>

                                {/* Important: No cash total shown to maintain blind close */}
                                <div className="bg-amber-900/20 border border-amber-800/50 p-4 rounded-lg">
                                    <p className="text-amber-400 text-sm flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        <strong>Cierre Ciego:</strong> El total esperado se mostrará después de cerrar el turno.
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="flex-1 border-amber-700 text-amber-400 hover:bg-amber-900/30">
                                                <Minus className="w-4 h-4 mr-2" />
                                                Registrar Salida de Caja
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="bg-slate-900 border-slate-700">
                                            <DialogHeader>
                                                <DialogTitle>Salida / Gasto de Caja</DialogTitle>
                                                <DialogDescription>
                                                    Registre cualquier salida de efectivo de la gaveta.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label>Monto *</Label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                            {currencySymbol}
                                                        </span>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={withdrawalAmount}
                                                            onChange={(e) => setWithdrawalAmount(e.target.value)}
                                                            placeholder="0.00"
                                                            className="pl-10 bg-slate-800 border-slate-700"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Categoría</Label>
                                                    <Select value={withdrawalCategory} onValueChange={setWithdrawalCategory}>
                                                        <SelectTrigger className="bg-slate-800 border-slate-700">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="gasto_menor">Gasto Menor</SelectItem>
                                                            <SelectItem value="devolucion">Devolución a Cliente</SelectItem>
                                                            <SelectItem value="cambio">Cambio / Feria</SelectItem>
                                                            <SelectItem value="otro">Otro</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Motivo / Descripción *</Label>
                                                    <Textarea
                                                        value={withdrawalReason}
                                                        onChange={(e) => setWithdrawalReason(e.target.value)}
                                                        placeholder="Ej: Compra de agua para el personal"
                                                        className="bg-slate-800 border-slate-700"
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setWithdrawalDialogOpen(false)}>
                                                    Cancelar
                                                </Button>
                                                <Button 
                                                    onClick={handleAddWithdrawal}
                                                    disabled={submitting}
                                                    className="bg-amber-600 hover:bg-amber-700"
                                                >
                                                    {submitting && <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />}
                                                    Registrar Salida
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

                                    {permissions.isOwner && (
                                        <Button 
                                            onClick={() => router.push(`/cash-register/close?shift=${activeShift.id}`)}
                                            className="flex-1 bg-red-600 hover:bg-red-700"
                                        >
                                            <Lock className="w-4 h-4 mr-2" />
                                            Cerrar Turno
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="transacciones">
                        <Card className="bg-slate-900/50 border-slate-800">
                            <CardHeader>
                                <CardTitle className="text-slate-200">Transacciones del Turno</CardTitle>
                                <CardDescription>
                                    Ventas y pagos registrados en este turno
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {transactions.length === 0 ? (
                                    <p className="text-center text-slate-500 py-8">
                                        No hay transacciones registradas en este turno.
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-slate-800">
                                                    <TableHead className="text-slate-400">Hora</TableHead>
                                                    <TableHead className="text-slate-400">Tipo</TableHead>
                                                    <TableHead className="text-slate-400">Referencia</TableHead>
                                                    <TableHead className="text-slate-400">Método</TableHead>
                                                    <TableHead className="text-slate-400 text-right">Monto</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {transactions.map((txn) => (
                                                    <TableRow key={txn.id} className="border-slate-800">
                                                        <TableCell className="text-slate-300">
                                                            {format(new Date(txn.created_at), 'HH:mm')}
                                                        </TableCell>
                                                        <TableCell>
                                                            {txn.type === 'sale' ? (
                                                                <Badge className="bg-blue-600">Venta</Badge>
                                                            ) : (
                                                                <Badge className="bg-emerald-600">Abono CXC</Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-slate-300">
                                                            {txn.receipt_number}
                                                            {txn.client_name && (
                                                                <span className="text-xs text-slate-500 block">
                                                                    {txn.client_name}
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {txn.isPending ? (
                                                                <Badge variant="outline" className="border-amber-500 text-amber-400">⏰ Pendiente</Badge>
                                                            ) : (
                                                                getPaymentMethodBadge(txn.payment_method)
                                                            )}
                                                        </TableCell>
                                                        <TableCell className={`text-right font-medium ${txn.type === 'sale' && (txn.payment_method === 'credit' || txn.payment_method === 'paid_credit' || txn.isPending) ? 'text-slate-500' : 'text-emerald-400'}`}>
                                                            {formatCurrency(txn.amount)}
                                                            {txn.type === 'sale' && (txn.payment_method === 'credit' || txn.payment_method === 'paid_credit' || txn.isPending) && (
                                                                <span className="text-xs block text-slate-500">No cuenta a efectivo</span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="salidas">
                        <Card className="bg-slate-900/50 border-slate-800">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-slate-200">Salidas de Caja</CardTitle>
                                    <CardDescription>
                                        Gastos y retiros registrados en este turno
                                    </CardDescription>
                                </div>
                                <Button
                                    onClick={() => setWithdrawalDialogOpen(true)}
                                    size="sm"
                                    className="bg-amber-600 hover:bg-amber-700"
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Nueva Salida
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {withdrawals.length === 0 ? (
                                    <p className="text-center text-slate-500 py-8">
                                        No hay salidas registradas en este turno.
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-slate-800">
                                                    <TableHead className="text-slate-400">Hora</TableHead>
                                                    <TableHead className="text-slate-400">Categoría</TableHead>
                                                    <TableHead className="text-slate-400">Motivo</TableHead>
                                                    <TableHead className="text-slate-400 text-right">Monto</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {withdrawals.map((w) => (
                                                    <TableRow key={w.id} className="border-slate-800">
                                                        <TableCell className="text-slate-300">
                                                            {format(new Date(w.created_at), 'HH:mm')}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="capitalize">
                                                                {w.category.replace('_', ' ')}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-slate-300 max-w-xs truncate">
                                                            {w.reason}
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium text-red-400">
                                                            -{formatCurrency(w.amount)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            ) : (
                /* No Active Shift - Show Open Button */
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Lock className="w-16 h-16 text-slate-600 mb-4" />
                        <h2 className="text-xl font-semibold text-slate-300 mb-2">Caja Cerrada</h2>
                        <p className="text-slate-500 mb-6 text-center max-w-md">
                            No hay un turno de caja activo. Inicie un nuevo turno para comenzar a registrar ventas y pagos.
                        </p>
                        <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-emerald-600 hover:bg-emerald-700 px-8">
                                    <Unlock className="w-5 h-5 mr-2" />
                                    Abrir Caja
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-slate-900 border-slate-700">
                                <DialogHeader>
                                    <DialogTitle>Abrir Turno de Caja</DialogTitle>
                                    <DialogDescription>
                                        Ingrese el fondo inicial de caja para comenzar el turno.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Fondo Inicial de Caja</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                {currencySymbol}
                                            </span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={openingAmount}
                                                onChange={(e) => setOpeningAmount(e.target.value)}
                                                className="pl-10 bg-slate-800 border-slate-700 text-2xl h-14"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Notas (opcional)</Label>
                                        <Textarea
                                            value={openingNotes}
                                            onChange={(e) => setOpeningNotes(e.target.value)}
                                            placeholder="Observaciones al iniciar el turno..."
                                            className="bg-slate-800 border-slate-700"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setOpenDialogOpen(false)}>
                                        Cancelar
                                    </Button>
                                    <Button 
                                        onClick={handleOpenShift}
                                        disabled={submitting}
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        {submitting && <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />}
                                        Abrir Caja
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>
            )}

            {/* Recent Shifts History */}
            {recentShifts.length > 0 && (
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-200">
                            <History className="w-5 h-5" />
                            Historial de Turnos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-800">
                                        <TableHead className="text-slate-400">Fecha</TableHead>
                                        <TableHead className="text-slate-400">Horario</TableHead>
                                        <TableHead className="text-slate-400">Fondo</TableHead>
                                        <TableHead className="text-slate-400">Esperado</TableHead>
                                        <TableHead className="text-slate-400">Declarado</TableHead>
                                        <TableHead className="text-slate-400">Resultado</TableHead>
                                        <TableHead className="text-slate-400"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentShifts.map((shift) => (
                                        <TableRow key={shift.id} className="border-slate-800">
                                            <TableCell className="text-slate-300">
                                                {format(new Date(shift.opened_at), 'dd/MM/yyyy')}
                                            </TableCell>
                                            <TableCell className="text-slate-400 text-sm">
                                                {format(new Date(shift.opened_at), 'HH:mm')} - {shift.closed_at ? format(new Date(shift.closed_at), 'HH:mm') : '--:--'}
                                            </TableCell>
                                            <TableCell className="text-slate-300">
                                                {formatCurrency(shift.opening_amount)}
                                            </TableCell>
                                            <TableCell className="text-blue-400">
                                                {shift.expected_cash !== null ? formatCurrency(shift.expected_cash) : '-'}
                                            </TableCell>
                                            <TableCell className="text-emerald-400">
                                                {shift.reported_cash !== null ? formatCurrency(shift.reported_cash) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {shift.variance !== null && (
                                                    shift.variance === 0 ? (
                                                        <Badge className="bg-green-600">Cuadrado</Badge>
                                                    ) : shift.variance < 0 ? (
                                                        <Badge className="bg-red-600">-{formatCurrency(Math.abs(shift.variance))}</Badge>
                                                    ) : (
                                                        <Badge className="bg-amber-600">+{formatCurrency(shift.variance)}</Badge>
                                                    )
                                                )}
                                                {shift.status === 'forzada' && (
                                                    <Badge variant="outline" className="ml-1">Forzado</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => router.push(`/cash-register/report/${shift.id}`)}
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
