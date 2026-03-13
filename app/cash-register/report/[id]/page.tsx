'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { useCurrency } from '@/hooks/use-currency'
import { useDataUserId } from '@/hooks/use-data-user-id'
import {
    RefreshCcw,
    ArrowLeft,
    FileText,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Printer,
    DollarSign,
    Clock,
    Banknote,
    CreditCard,
    Building2,
    Receipt,
    TrendingUp,
    TrendingDown,
    Calculator,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface CashShift {
    id: string
    user_id: string
    opened_by: string
    closed_by: string | null
    opened_at: string
    closed_at: string | null
    opening_amount: number
    reported_cash: number | null
    expected_cash: number | null
    variance: number | null
    total_cash_sales: number
    total_card_sales: number
    total_transfer_sales: number
    total_credit_sales: number
    total_cash_payments: number
    total_cash_withdrawals: number
    status: string
    opening_notes: string | null
    closing_notes: string | null
}

interface Transaction {
    id: string
    type: 'sale' | 'payment' | 'withdrawal'
    receipt_number?: string
    client_name?: string
    amount: number
    payment_method?: string
    reason?: string
    created_at: string
    isPending?: boolean
}

export default function CashShiftReportPage() {
    const router = useRouter()
    const params = useParams()
    const shiftId = params.id as string
    const { toast } = useToast()
    const { formatCurrency } = useCurrency()
    const { dataUserId, loading: userLoading } = useDataUserId()

    const [loading, setLoading] = useState(true)
    const [shift, setShift] = useState<CashShift | null>(null)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [openedByName, setOpenedByName] = useState<string>('')
    const [closedByName, setClosedByName] = useState<string>('')

    const fetchData = useCallback(async () => {
        if (!dataUserId || !shiftId) return
        
        setLoading(true)
        try {
            // Fetch shift details
            const { data: shiftData, error: shiftError } = await supabase
                .from('cash_register_shifts')
                .select('*')
                .eq('id', shiftId)
                .single()

            if (shiftError || !shiftData) {
                toast({
                    title: "Error",
                    description: "Reporte no encontrado.",
                    variant: "destructive"
                })
                router.push('/cash-register')
                return
            }

            setShift(shiftData)

            // Fetch user names
            if (shiftData.opened_by) {
                const { data: openedUser } = await supabase
                    .from('profiles')
                    .select('full_name, email')
                    .eq('id', shiftData.opened_by)
                    .single()
                setOpenedByName(openedUser?.full_name || openedUser?.email || 'Desconocido')
            }

            if (shiftData.closed_by) {
                const { data: closedUser } = await supabase
                    .from('profiles')
                    .select('full_name, email')
                    .eq('id', shiftData.closed_by)
                    .single()
                setClosedByName(closedUser?.full_name || closedUser?.email || 'Desconocido')
            }

            // Fetch all transactions
            const txns: Transaction[] = []

            // Sales from thermal receipts
            const { data: salesData } = await supabase
                .from('thermal_receipts')
                .select('id, receipt_number, client_name, total_amount, payment_method, status, created_at')
                .eq('cash_shift_id', shiftId)
                .order('created_at', { ascending: true })

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

            // Sales from invoices
            const { data: invoicesData } = await supabase
                .from('invoices')
                .select('id, invoice_number, total, payment_method, created_at, clients(name)')
                .eq('cash_shift_id', shiftId)
                .order('created_at', { ascending: true })

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

            // Payments (Abonos CXC)
            const { data: paymentsData } = await supabase
                .from('ar_payments')
                .select('id, payment_number, amount, payment_method, payment_date')
                .eq('cash_shift_id', shiftId)
                .order('payment_date', { ascending: true })

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

            // Withdrawals
            const { data: withdrawalsData } = await supabase
                .from('cash_register_withdrawals')
                .select('id, amount, reason, created_at')
                .eq('shift_id', shiftId)
                .order('created_at', { ascending: true })

            if (withdrawalsData) {
                withdrawalsData.forEach(w => txns.push({
                    id: w.id,
                    type: 'withdrawal',
                    amount: w.amount,
                    reason: w.reason,
                    created_at: w.created_at
                }))
            }

            // Sort by time
            txns.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            setTransactions(txns)

        } catch (error: any) {
            console.error('Error fetching report:', error)
            toast({
                title: "Error",
                description: "No se pudo cargar el reporte.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }, [dataUserId, shiftId, router, toast])

    useEffect(() => {
        if (dataUserId && shiftId) {
            fetchData()
        }
    }, [dataUserId, shiftId, fetchData])

    // Calculate totals from transactions in real-time (more accurate than stored values)
    const calculatedTotals = React.useMemo(() => {
        // Sales - only non-pending receipts/invoices
        const sales = transactions.filter(t => t.type === 'sale')
        
        const cashSales = sales
            .filter(t => t.payment_method === 'cash' && !t.isPending)
            .reduce((sum, t) => sum + t.amount, 0)
        
        const cardSales = sales
            .filter(t => t.payment_method === 'card' && !t.isPending)
            .reduce((sum, t) => sum + t.amount, 0)
        
        const transferSales = sales
            .filter(t => t.payment_method === 'transfer' && !t.isPending)
            .reduce((sum, t) => sum + t.amount, 0)
        
        const creditSales = sales
            .filter(t => t.payment_method === 'credit' || t.payment_method === 'paid_credit' || t.isPending)
            .reduce((sum, t) => sum + t.amount, 0)

        // Payments (Abonos CXC)
        const payments = transactions.filter(t => t.type === 'payment')
        const cashPayments = payments
            .filter(t => t.payment_method === 'cash')
            .reduce((sum, t) => sum + t.amount, 0)

        // Withdrawals
        const totalWithdrawals = transactions
            .filter(t => t.type === 'withdrawal')
            .reduce((sum, t) => sum + t.amount, 0)

        return {
            cashSales,
            cardSales,
            transferSales,
            creditSales,
            totalSales: cashSales + cardSales + transferSales + creditSales,
            cashPayments,
            totalWithdrawals
        }
    }, [transactions])

    const handlePrint = () => {
        window.print()
    }

    if (userLoading || loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <RefreshCcw className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        )
    }

    if (!shift) {
        return null
    }

    const totalSales = calculatedTotals.totalSales

    // Calculate expected cash for print
    const calculatedExpectedCash = shift.opening_amount + calculatedTotals.cashSales + calculatedTotals.cashPayments - calculatedTotals.totalWithdrawals

    return (
        <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto report-z-print">
            {/* Header - Hidden in print */}
            <div className="flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => router.push('/cash-register')}
                        className="bg-slate-900 border-slate-700"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                            <FileText className="w-6 h-6 text-blue-500" />
                            Reporte Z - Cierre de Caja
                        </h1>
                        <p className="text-slate-400">
                            {format(new Date(shift.opened_at), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                        </p>
                    </div>
                </div>
                <Button onClick={handlePrint} variant="outline" className="bg-slate-900 border-slate-700">
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                </Button>
            </div>

            {/* ===== PRINT VERSION ===== */}
            <div className="hidden print:block">
                {/* Print Header */}
                <div className="print-header text-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">REPORTE Z</h1>
                    <h2 className="text-xl text-gray-700 mb-2">Cierre de Caja</h2>
                    <p className="text-gray-600 capitalize">
                        {format(new Date(shift.opened_at), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                </div>

                {/* Print Result Box */}
                <div className={`print-result-box mb-6 ${
                    shift.variance === 0 ? 'success' : 
                    shift.variance !== null && shift.variance < 0 ? 'error' : 'warning'
                }`}>
                    <div className="text-4xl mb-2">
                        {shift.variance === 0 ? '✓' : shift.variance !== null && shift.variance < 0 ? '✗' : '⚠'}
                    </div>
                    <h3 className="text-2xl font-bold mb-1">
                        {shift.variance === 0 ? 'CUADRE EXACTO' : 
                         shift.variance !== null && shift.variance < 0 ? 'FALTANTE' : 'SOBRANTE'}
                    </h3>
                    {shift.variance !== 0 && (
                        <p className="text-3xl font-bold">
                            {shift.variance! >= 0 ? '+' : ''}{formatCurrency(shift.variance || 0)}
                        </p>
                    )}
                </div>

                {/* Print Info Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Shift Info */}
                    <div className="print-section">
                        <h4 className="print-section-title">📋 Información del Turno</h4>
                        <div className="print-summary-row">
                            <span>Apertura:</span>
                            <span className="font-semibold">{format(new Date(shift.opened_at), "dd/MM/yyyy HH:mm")}</span>
                        </div>
                        <div className="print-summary-row">
                            <span>Cierre:</span>
                            <span className="font-semibold">
                                {shift.closed_at ? format(new Date(shift.closed_at), "dd/MM/yyyy HH:mm") : '-'}
                            </span>
                        </div>
                        <div className="print-summary-row">
                            <span>Abierto por:</span>
                            <span className="font-semibold">{openedByName}</span>
                        </div>
                        <div className="print-summary-row">
                            <span>Cerrado por:</span>
                            <span className="font-semibold">{closedByName || '-'}</span>
                        </div>
                    </div>

                    {/* Cash Calculation */}
                    <div className="print-section">
                        <h4 className="print-section-title">🧮 Cálculo de Caja</h4>
                        <div className="print-summary-row">
                            <span>Fondo Inicial:</span>
                            <span className="font-semibold">{formatCurrency(shift.opening_amount)}</span>
                        </div>
                        <div className="print-summary-row">
                            <span>+ Ventas Efectivo:</span>
                            <span className="font-semibold text-green-700">{formatCurrency(calculatedTotals.cashSales)}</span>
                        </div>
                        <div className="print-summary-row">
                            <span>+ Abonos CXC:</span>
                            <span className="font-semibold text-green-700">{formatCurrency(calculatedTotals.cashPayments)}</span>
                        </div>
                        <div className="print-summary-row">
                            <span>- Salidas de Caja:</span>
                            <span className="font-semibold text-red-700">-{formatCurrency(calculatedTotals.totalWithdrawals)}</span>
                        </div>
                        <div className="print-summary-row total">
                            <span>= Efectivo Esperado:</span>
                            <span className="text-blue-700">{formatCurrency(calculatedExpectedCash)}</span>
                        </div>
                        <div className="print-summary-row">
                            <span>Efectivo Declarado:</span>
                            <span className="font-bold">{formatCurrency(shift.reported_cash || 0)}</span>
                        </div>
                    </div>
                </div>

                {/* Sales Breakdown Print */}
                <div className="print-section">
                    <h4 className="print-section-title">💰 Desglose de Ventas — Total: {formatCurrency(totalSales)}</h4>
                    <div className="print-grid-4">
                        <div className="print-card cash">
                            <p className="text-sm text-gray-600 mb-1">💵 Efectivo</p>
                            <p className="print-value cash">{formatCurrency(calculatedTotals.cashSales)}</p>
                        </div>
                        <div className="print-card card">
                            <p className="text-sm text-gray-600 mb-1">💳 Tarjeta</p>
                            <p className="print-value card">{formatCurrency(calculatedTotals.cardSales)}</p>
                        </div>
                        <div className="print-card transfer">
                            <p className="text-sm text-gray-600 mb-1">🏦 Transferencia</p>
                            <p className="print-value transfer">{formatCurrency(calculatedTotals.transferSales)}</p>
                        </div>
                        <div className="print-card credit">
                            <p className="text-sm text-gray-600 mb-1">📄 Crédito</p>
                            <p className="print-value credit">{formatCurrency(calculatedTotals.creditSales)}</p>
                        </div>
                    </div>
                </div>

                {/* Transactions Table Print */}
                {transactions.length > 0 && (
                    <div className="print-section">
                        <h4 className="print-section-title">📝 Detalle de Transacciones ({transactions.length})</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Hora</th>
                                    <th>Tipo</th>
                                    <th>Referencia</th>
                                    <th>Método</th>
                                    <th style={{ textAlign: 'right' }}>Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((txn) => (
                                    <tr key={`print-${txn.type}-${txn.id}`}>
                                        <td>{format(new Date(txn.created_at), 'HH:mm')}</td>
                                        <td>
                                            {txn.type === 'sale' && '📈 Venta'}
                                            {txn.type === 'payment' && '💵 Abono'}
                                            {txn.type === 'withdrawal' && '📤 Salida'}
                                        </td>
                                        <td>
                                            {txn.receipt_number || txn.reason || '-'}
                                            {txn.client_name && <span className="text-xs block text-gray-500">{txn.client_name}</span>}
                                        </td>
                                        <td>
                                            {txn.isPending ? '⏰ Pendiente' :
                                             txn.payment_method === 'cash' ? '💵 Efectivo' :
                                             txn.payment_method === 'card' ? '💳 Tarjeta' :
                                             txn.payment_method === 'transfer' ? '🏦 Transfer.' :
                                             txn.payment_method === 'credit' || txn.payment_method === 'paid_credit' ? '📄 Crédito' :
                                             txn.type === 'withdrawal' ? '-' : txn.payment_method}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                            {txn.type === 'withdrawal' ? '-' : ''}{formatCurrency(txn.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Notes Print */}
                {(shift.opening_notes || shift.closing_notes) && (
                    <div className="print-section">
                        <h4 className="print-section-title">📌 Notas</h4>
                        {shift.opening_notes && (
                            <p className="mb-2"><strong>Apertura:</strong> {shift.opening_notes}</p>
                        )}
                        {shift.closing_notes && (
                            <p><strong>Cierre:</strong> {shift.closing_notes}</p>
                        )}
                    </div>
                )}

                {/* Print Footer */}
                <div className="print-footer">
                    <p>Reporte generado el {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
                    <p className="font-semibold mt-1">ConcreteBill — Sistema de Gestión</p>
                </div>
            </div>
            {/* ===== END PRINT VERSION ===== */}

            {/* Variance Result - Big indicator (Screen only) */}
            <Card className={`print:hidden border-2 ${
                shift.variance === 0 ? 'bg-green-950/50 border-green-600' :
                shift.variance !== null && shift.variance < 0 ? 'bg-red-950/50 border-red-600' :
                'bg-amber-950/50 border-amber-600'
            }`}>
                <CardContent className="p-6 text-center">
                    {shift.variance === 0 ? (
                        <>
                            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
                            <h2 className="text-3xl font-bold text-green-400 mb-2">CUADRE EXACTO</h2>
                            <p className="text-green-300">El efectivo declarado coincide con el esperado.</p>
                        </>
                    ) : shift.variance !== null && shift.variance < 0 ? (
                        <>
                            <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
                            <h2 className="text-3xl font-bold text-red-400 mb-2">FALTANTE</h2>
                            <p className="text-5xl font-bold text-red-400 my-4">
                                -{formatCurrency(Math.abs(shift.variance))}
                            </p>
                            <p className="text-red-300">El efectivo declarado es menor al esperado.</p>
                        </>
                    ) : (
                        <>
                            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-amber-500" />
                            <h2 className="text-3xl font-bold text-amber-400 mb-2">SOBRANTE</h2>
                            <p className="text-5xl font-bold text-amber-400 my-4">
                                +{formatCurrency(shift.variance || 0)}
                            </p>
                            <p className="text-amber-300">El efectivo declarado es mayor al esperado.</p>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Shift Details (Screen only) */}
            <div className="print:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-500" />
                            Información del Turno
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Apertura:</span>
                            <span className="text-slate-200">
                                {format(new Date(shift.opened_at), "dd/MM/yyyy HH:mm")}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Cierre:</span>
                            <span className="text-slate-200">
                                {shift.closed_at ? format(new Date(shift.closed_at), "dd/MM/yyyy HH:mm") : '-'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Abierto por:</span>
                            <span className="text-slate-200">{openedByName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Cerrado por:</span>
                            <span className="text-slate-200">{closedByName || '-'}</span>
                        </div>
                        {shift.status === 'forzada' && (
                            <Badge variant="outline" className="bg-amber-900/30 text-amber-400 border-amber-700">
                                Cierre Forzado
                            </Badge>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-emerald-500" />
                            Cálculo de Caja
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Fondo Inicial:</span>
                            <span className="text-slate-200">{formatCurrency(shift.opening_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">+ Ventas Efectivo:</span>
                            <span className="text-emerald-400">{formatCurrency(calculatedTotals.cashSales)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">+ Abonos CXC Efectivo:</span>
                            <span className="text-emerald-400">{formatCurrency(calculatedTotals.cashPayments)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">- Salidas de Caja:</span>
                            <span className="text-red-400">-{formatCurrency(calculatedTotals.totalWithdrawals)}</span>
                        </div>
                        <Separator className="bg-slate-700" />
                        <div className="flex justify-between font-bold">
                            <span className="text-blue-400">= Efectivo Esperado:</span>
                            <span className="text-blue-400">{formatCurrency(shift.expected_cash || 0)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                            <span className="text-emerald-400">Efectivo Declarado:</span>
                            <span className="text-emerald-400">{formatCurrency(shift.reported_cash || 0)}</span>
                        </div>
                        <Separator className="bg-slate-700" />
                        <div className="flex justify-between font-bold text-lg">
                            <span className={shift.variance === 0 ? 'text-green-400' : shift.variance! < 0 ? 'text-red-400' : 'text-amber-400'}>
                                Diferencia:
                            </span>
                            <span className={shift.variance === 0 ? 'text-green-400' : shift.variance! < 0 ? 'text-red-400' : 'text-amber-400'}>
                                {shift.variance! >= 0 ? '+' : ''}{formatCurrency(shift.variance || 0)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sales Breakdown (Screen only) */}
            <Card className="print:hidden bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-blue-500" />
                        Desglose de Ventas
                    </CardTitle>
                    <CardDescription>
                        Total de ventas del turno: {formatCurrency(totalSales)}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-green-900/20 border border-green-800/50 p-4 rounded-lg text-center">
                            <Banknote className="w-8 h-8 mx-auto mb-2 text-green-500" />
                            <p className="text-xs text-slate-400 mb-1">Efectivo</p>
                            <p className="text-xl font-bold text-green-400">{formatCurrency(calculatedTotals.cashSales)}</p>
                        </div>
                        <div className="bg-blue-900/20 border border-blue-800/50 p-4 rounded-lg text-center">
                            <CreditCard className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                            <p className="text-xs text-slate-400 mb-1">Tarjeta</p>
                            <p className="text-xl font-bold text-blue-400">{formatCurrency(calculatedTotals.cardSales)}</p>
                        </div>
                        <div className="bg-purple-900/20 border border-purple-800/50 p-4 rounded-lg text-center">
                            <Building2 className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                            <p className="text-xs text-slate-400 mb-1">Transferencia</p>
                            <p className="text-xl font-bold text-purple-400">{formatCurrency(calculatedTotals.transferSales)}</p>
                        </div>
                        <div className="bg-amber-900/20 border border-amber-800/50 p-4 rounded-lg text-center">
                            <FileText className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                            <p className="text-xs text-slate-400 mb-1">Crédito</p>
                            <p className="text-xl font-bold text-amber-400">{formatCurrency(calculatedTotals.creditSales)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Transaction Detail (Screen only) */}
            <Card className="print:hidden bg-slate-900/50 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-lg">Detalle de Transacciones</CardTitle>
                    <CardDescription>
                        {transactions.length} movimientos registrados
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {transactions.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">
                            No hubo transacciones en este turno.
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
                                        <TableRow key={`${txn.type}-${txn.id}`} className="border-slate-800">
                                            <TableCell className="text-slate-300">
                                                {format(new Date(txn.created_at), 'HH:mm')}
                                            </TableCell>
                                            <TableCell>
                                                {txn.type === 'sale' && (
                                                    <Badge className="bg-blue-600">
                                                        <TrendingUp className="w-3 h-3 mr-1" />
                                                        Venta
                                                    </Badge>
                                                )}
                                                {txn.type === 'payment' && (
                                                    <Badge className="bg-emerald-600">
                                                        <DollarSign className="w-3 h-3 mr-1" />
                                                        Abono CXC
                                                    </Badge>
                                                )}
                                                {txn.type === 'withdrawal' && (
                                                    <Badge className="bg-red-600">
                                                        <TrendingDown className="w-3 h-3 mr-1" />
                                                        Salida
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-slate-300">
                                                {txn.receipt_number || txn.reason || '-'}
                                                {txn.client_name && (
                                                    <span className="text-xs text-slate-500 block">
                                                        {txn.client_name}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {txn.isPending ? (
                                                    <Badge variant="outline" className="text-amber-400 border-amber-500">
                                                        ⏰ Pendiente
                                                    </Badge>
                                                ) : (
                                                    <>
                                                        {txn.payment_method === 'cash' && (
                                                            <Badge variant="outline" className="text-green-400 border-green-700">
                                                                <Banknote className="w-3 h-3 mr-1" />
                                                                Efectivo
                                                            </Badge>
                                                        )}
                                                        {txn.payment_method === 'card' && (
                                                            <Badge variant="outline" className="text-blue-400 border-blue-700">
                                                                <CreditCard className="w-3 h-3 mr-1" />
                                                                Tarjeta
                                                            </Badge>
                                                        )}
                                                        {txn.payment_method === 'transfer' && (
                                                            <Badge variant="outline" className="text-purple-400 border-purple-700">
                                                                <Building2 className="w-3 h-3 mr-1" />
                                                                Transfer.
                                                            </Badge>
                                                        )}
                                                        {txn.payment_method === 'credit' && (
                                                            <Badge variant="outline" className="text-amber-400 border-amber-700">
                                                                Crédito
                                                            </Badge>
                                                        )}
                                                        {txn.payment_method === 'paid_credit' && (
                                                            <Badge variant="outline" className="text-slate-400 border-slate-600">
                                                                paid_credit
                                                            </Badge>
                                                        )}
                                                    </>
                                                )}
                                                {txn.type === 'withdrawal' && '-'}
                                            </TableCell>
                                            <TableCell className={`text-right font-medium ${
                                                txn.type === 'withdrawal' ? 'text-red-400' : 
                                                (txn.payment_method === 'credit' || txn.payment_method === 'paid_credit' || txn.isPending) ? 'text-slate-500' :
                                                txn.payment_method === 'cash' ? 'text-green-400' : 'text-slate-300'
                                            }`}>
                                                {txn.type === 'withdrawal' ? '-' : ''}{formatCurrency(txn.amount)}
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

            {/* Notes (Screen only) */}
            {(shift.opening_notes || shift.closing_notes) && (
                <Card className="print:hidden bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Notas del Turno</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {shift.opening_notes && (
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Notas de apertura:</p>
                                <p className="text-slate-300">{shift.opening_notes}</p>
                            </div>
                        )}
                        {shift.closing_notes && (
                            <div>
                                <p className="text-xs text-slate-400 mb-1">Notas de cierre:</p>
                                <p className="text-slate-300">{shift.closing_notes}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
