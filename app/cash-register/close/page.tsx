'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { useCurrency } from '@/hooks/use-currency'
import { useDataUserId } from '@/hooks/use-data-user-id'
import { useUserPermissions } from '@/hooks/use-user-permissions-simple'
import {
    RefreshCcw,
    Lock,
    Calculator,
    AlertTriangle,
    CheckCircle2,
    ArrowLeft,
    Banknote,
    Plus,
    Minus,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Denominaciones de billetes dominicanos - agrupados
const BILL_DENOMINATIONS = [
    { value: 2000, label: '2,000', color: 'bg-violet-900/30 border-violet-700' },
    { value: 1000, label: '1,000', color: 'bg-blue-900/30 border-blue-700' },
    { value: 500, label: '500', color: 'bg-emerald-900/30 border-emerald-700' },
    { value: 200, label: '200', color: 'bg-amber-900/30 border-amber-700' },
    { value: 100, label: '100', color: 'bg-red-900/30 border-red-700' },
    { value: 50, label: '50', color: 'bg-cyan-900/30 border-cyan-700' },
]

const COIN_DENOMINATIONS = [
    { value: 25, label: '25', color: 'bg-slate-800/50 border-slate-600' },
    { value: 10, label: '10', color: 'bg-slate-800/50 border-slate-600' },
    { value: 5, label: '5', color: 'bg-slate-800/50 border-slate-600' },
    { value: 1, label: '1', color: 'bg-slate-800/50 border-slate-600' },
]

const ALL_DENOMINATIONS = [...BILL_DENOMINATIONS, ...COIN_DENOMINATIONS]

interface CashShift {
    id: string
    opened_at: string
    opening_amount: number
    status: string
}

function ClosePageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const shiftId = searchParams.get('shift')
    const { toast } = useToast()
    const { formatCurrency, currencySymbol } = useCurrency()
    const { dataUserId, loading: userLoading } = useDataUserId()
    const { permissions, loading: permissionsLoading } = useUserPermissions()

    const [loading, setLoading] = useState(true)
    const [shift, setShift] = useState<CashShift | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    // Denomination counts
    const [counts, setCounts] = useState<Record<number, number>>({})
    
    // Manual total input
    const [useCalculator, setUseCalculator] = useState(true)
    const [manualTotal, setManualTotal] = useState('')
    
    // Notes
    const [closingNotes, setClosingNotes] = useState('')

    // Calculate total from denominations
    const calculatedTotal = ALL_DENOMINATIONS.reduce((sum, d) => {
        return sum + (d.value * (counts[d.value] || 0))
    }, 0)

    const reportedCash = useCalculator ? calculatedTotal : parseFloat(manualTotal) || 0

    const fetchShift = useCallback(async () => {
        if (!dataUserId || !shiftId) { return }
        
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('cash_register_shifts')
                .select('*')
                .eq('id', shiftId)
                .eq('status', 'abierta')
                .single()

            if (error || !data) {
                toast({
                    title: "Error",
                    description: "Turno no encontrado o ya está cerrado.",
                    variant: "destructive"
                })
                router.push('/cash-register')
                return
            }

            setShift(data as unknown as CashShift)
        } catch (error: any) {
            console.error('Error fetching shift:', error)
            toast({
                title: "Error",
                description: "No se pudo cargar la información del turno.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }, [dataUserId, shiftId, router, toast])

    useEffect(() => {
        if (dataUserId && shiftId) {
            fetchShift()
        } else if (!shiftId) {
            router.push('/cash-register')
        }
    }, [dataUserId, shiftId, fetchShift, router])

    // Redirect non-owners - only owners can close shifts
    useEffect(() => {
        if (!permissionsLoading && !permissions.isOwner) {
            toast({
                title: "Acceso denegado",
                description: "Solo el propietario puede cerrar turnos de caja.",
                variant: "destructive"
            })
            router.push('/cash-register')
        }
    }, [permissionsLoading, permissions.isOwner, router, toast])

    const updateCount = (denomination: number, delta: number) => {
        setCounts(prev => ({
            ...prev,
            [denomination]: Math.max(0, (prev[denomination] || 0) + delta)
        }))
    }

    const setCount = (denomination: number, value: string) => {
        const num = parseInt(value) || 0
        setCounts(prev => ({
            ...prev,
            [denomination]: Math.max(0, num)
        }))
    }

    const handleClose = async () => {
        if (!shift || reportedCash < 0) {
            toast({
                title: "Error",
                description: "Ingrese un monto válido.",
                variant: "destructive"
            })
            return
        }

        setSubmitting(true)
        try {
            // Call the close function
            const { data, error } = await supabase.rpc('close_cash_shift', {
                p_shift_id: shift.id,
                p_reported_cash: reportedCash,
                p_closed_by: dataUserId,
                p_notes: closingNotes.trim() || null
            })

            if (error) { throw error }

            const result = data?.[0]
            
            if (result?.success) {
                toast({
                    title: "Turno cerrado",
                    description: "El cierre de caja se ha registrado correctamente."
                })
                // Navigate to the report
                router.push(`/cash-register/report/${shift.id}`)
            } else {
                throw new Error(result?.message || 'Error al cerrar el turno')
            }

        } catch (error: any) {
            console.error('Error closing shift:', error)
            toast({
                title: "Error",
                description: error.message || "No se pudo cerrar el turno.",
                variant: "destructive"
            })
        } finally {
            setSubmitting(false)
            setShowConfirm(false)
        }
    }

    if (userLoading || loading || permissionsLoading || !permissions.isOwner) {
        return (
            <div className="flex items-center justify-center h-96">
                <RefreshCcw className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        )
    }

    if (!shift) {
        return null
    }

    return (
        <div className="space-y-6 p-4 md:p-6 max-w-2xl mx-auto pb-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => router.push('/cash-register')}
                    className="bg-slate-900/50 border-slate-700 hover:bg-slate-800"
                >
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <div className="p-2 bg-red-900/30 rounded-lg">
                            <Lock className="w-5 h-5 text-red-400" />
                        </div>
                        Cierre de Caja
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Turno iniciado: {format(new Date(shift.opened_at), "d 'de' MMMM, HH:mm 'hrs'", { locale: es })}
                    </p>
                </div>
            </div>

            {/* Warning about blind close */}
            <div className="relative">
                <div className="absolute inset-0 bg-amber-500/10 rounded-xl blur-lg" />
                <Card className="relative bg-gradient-to-r from-amber-950/40 to-orange-950/40 border-amber-700/30 overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                    <CardContent className="flex items-start gap-4 p-4 pl-5">
                        <div className="p-2 bg-amber-900/50 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-amber-200 font-semibold">Cierre Ciego</p>
                            <p className="text-amber-300/70 text-sm mt-1">
                                Cuente todo el dinero físico en su gaveta y registre el total exacto. 
                                <span className="text-amber-200 font-medium"> El sistema calculará la diferencia después de confirmar.</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Calculator Toggle */}
            <div className="flex gap-2 bg-slate-900/50 p-1 rounded-xl">
                <Button
                    variant="ghost"
                    onClick={() => setUseCalculator(true)}
                    className={`flex-1 rounded-lg transition-all ${useCalculator ? "bg-emerald-600 hover:bg-emerald-600 text-white shadow-lg" : "hover:bg-slate-800 text-slate-400"}`}
                >
                    <Calculator className="w-4 h-4 mr-2" />
                    Por Denominación
                </Button>
                <Button
                    variant="ghost"
                    onClick={() => setUseCalculator(false)}
                    className={`flex-1 rounded-lg transition-all ${!useCalculator ? "bg-blue-600 hover:bg-blue-600 text-white shadow-lg" : "hover:bg-slate-800 text-slate-400"}`}
                >
                    <Banknote className="w-4 h-4 mr-2" />
                    Total Directo
                </Button>
            </div>

            {useCalculator ? (
                /* Denomination Calculator - Modern Design */
                <div className="space-y-4">
                    {/* Billetes */}
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <span className="text-lg">💵</span>
                                Billetes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {BILL_DENOMINATIONS.map((d) => (
                                    <div 
                                        key={d.value} 
                                        className={`${d.color} border rounded-xl p-3 transition-all hover:scale-[1.02]`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-lg text-white">RD${d.label}</span>
                                            <span className="text-xs text-slate-400">
                                                = {formatCurrency(d.value * (counts[d.value] || 0))}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 rounded-lg bg-slate-900/50 hover:bg-slate-800"
                                                onClick={() => updateCount(d.value, -1)}
                                            >
                                                <Minus className="w-4 h-4" />
                                            </Button>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={counts[d.value] || ''}
                                                onChange={(e) => setCount(d.value, e.target.value)}
                                                className="h-9 text-center bg-slate-900/80 border-0 text-lg font-bold rounded-lg"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 rounded-lg bg-slate-900/50 hover:bg-slate-800"
                                                onClick={() => updateCount(d.value, 1)}
                                            >
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Monedas */}
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <span className="text-lg">🪙</span>
                                Monedas
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {COIN_DENOMINATIONS.map((d) => (
                                    <div 
                                        key={d.value} 
                                        className={`${d.color} border rounded-xl p-3 transition-all hover:scale-[1.02]`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-white">RD${d.label}</span>
                                            <span className="text-xs text-slate-400">
                                                = {formatCurrency(d.value * (counts[d.value] || 0))}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg bg-slate-900/50 hover:bg-slate-800"
                                                onClick={() => updateCount(d.value, -1)}
                                            >
                                                <Minus className="w-3 h-3" />
                                            </Button>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={counts[d.value] || ''}
                                                onChange={(e) => setCount(d.value, e.target.value)}
                                                className="h-8 text-center bg-slate-900/80 border-0 font-bold rounded-lg"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg bg-slate-900/50 hover:bg-slate-800"
                                                onClick={() => updateCount(d.value, 1)}
                                            >
                                                <Plus className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                /* Manual Total Input */
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Banknote className="w-5 h-5 text-blue-500" />
                            Total de Efectivo Físico
                        </CardTitle>
                        <CardDescription>
                            Ingrese el total exacto de dinero en su gaveta
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-2xl">
                                {currencySymbol}
                            </span>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={manualTotal}
                                onChange={(e) => setManualTotal(e.target.value)}
                                placeholder="0.00"
                                className="pl-14 text-4xl h-20 bg-slate-900 border-slate-700 text-center font-bold"
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Total Display - Prominent */}
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-emerald-600/20 to-emerald-500/20 rounded-2xl blur-xl" />
                <Card className="relative bg-gradient-to-br from-emerald-950/80 to-slate-900 border-emerald-700/50 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-500" />
                    <CardContent className="p-8 text-center">
                        <p className="text-xs uppercase tracking-widest text-emerald-400/80 mb-3 font-medium">
                            Efectivo Declarado
                        </p>
                        <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-green-400">
                            {formatCurrency(reportedCash)}
                        </p>
                        {reportedCash > 0 && (
                            <p className="text-sm text-slate-400 mt-3">
                                {ALL_DENOMINATIONS.filter(d => counts[d.value] > 0).length} denominaciones contadas
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Notes */}
            <div className="space-y-2">
                <Label className="text-slate-300">Notas de cierre (opcional)</Label>
                <Textarea
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder="Observaciones sobre el cierre de turno..."
                    className="bg-slate-900/50 border-slate-700 focus:border-slate-600"
                    rows={3}
                />
            </div>

            {/* Submit Button - Prominent */}
            <div className="relative">
                <div className="absolute inset-0 bg-red-600/20 rounded-xl blur-lg" />
                <Button
                    onClick={() => setShowConfirm(true)}
                    disabled={submitting || reportedCash < 0}
                    className="relative w-full h-16 text-lg font-bold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-lg shadow-red-900/50 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Lock className="w-5 h-5 mr-2" />
                    Confirmar Cierre de Turno
                </Button>
            </div>

            {/* Confirmation Dialog */}
            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent className="bg-slate-900 border-slate-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Confirmar Cierre de Caja
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4">
                            <p>
                                Está a punto de cerrar el turno declarando un total de:
                            </p>
                            <p className="text-3xl font-bold text-emerald-400 text-center py-2">
                                {formatCurrency(reportedCash)}
                            </p>
                            <p className="text-amber-400">
                                <strong>Esta acción es irreversible.</strong> Una vez confirmado, 
                                el sistema calculará si hay diferencia entre lo esperado y lo declarado.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-800 border-slate-700">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleClose}
                            disabled={submitting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {submitting ? (
                                <>
                                    <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Confirmar Cierre
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

export default function CashRegisterClosePage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-96">
                <RefreshCcw className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        }>
            <ClosePageContent />
        </Suspense>
    )
}
