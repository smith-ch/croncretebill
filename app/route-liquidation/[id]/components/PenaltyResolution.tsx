'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { RefreshCcw, Save, AlertTriangle, ArrowLeft, CheckCircle2, DollarSign } from 'lucide-react'
import { useCurrency } from '@/hooks/use-currency'

export default function PenaltyResolution({ dispatch, isClosed, onBack, onSuccess }: any) {
    const { toast } = useToast()
    const { formatCurrency } = useCurrency()
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [discrepancies, setDiscrepancies] = useState<any[]>([])
    const [notes, setNotes] = useState(dispatch.liquidation_notes || '')
    const [cashDifference, setCashDifference] = useState(0)

    useEffect(() => {
        analyzeDiscrepancies()
    }, [dispatch])

    const analyzeDiscrepancies = async () => {
        setLoading(true)
        try {
            // Recargar datos actualizados del despacho 
            const { data: freshDispatch, error: dispatchError } = await supabase
                .from('daily_dispatches')
                .select('*')
                .eq('id', dispatch.id)
                .single()
            
            if (dispatchError) throw dispatchError
            
            const currentDispatch = freshDispatch || dispatch
            
            // 1. Analizar faltante/sobrante de caja con datos frescos
            const totalExpected = parseFloat(currentDispatch.total_cash_expected) || 0
            const totalReceived = parseFloat(currentDispatch.total_cash_received) || 0
            const diff = totalReceived - totalExpected
            
            console.log('💰 Análisis de caja:', { totalExpected, totalReceived, diff })
            setCashDifference(diff)

            // 2. Analizar inventario faltante
            const { data: liquidations } = await supabase
                .from('dispatch_liquidations')
                .select('product_id, quantity_full_returned, quantity_empty_returned, products(name)' as any)
                .eq('dispatch_id', dispatch.id)

            const { data: loads } = await supabase
                .from('dispatch_inventory_loads')
                .select('product_id, quantity_loaded')
                .eq('dispatch_id', dispatch.id)

            // Ventas por producto de este despacho (recibos con dispatch_id)
            const { data: receipts } = await supabase
                .from('thermal_receipts')
                .select('id, thermal_receipt_items(product_id, quantity)')
                .eq('dispatch_id', dispatch.id)
                .neq('status', 'cancelled')

            const soldByProduct: Record<string, number> = {}
            if (receipts) {
                receipts.forEach((r: any) => {
                    r.thermal_receipt_items?.forEach((item: any) => {
                        if (item.product_id) {
                            soldByProduct[item.product_id] = (soldByProduct[item.product_id] || 0) + (parseFloat(item.quantity) || 0)
                        }
                    })
                })
            }

            const issuesList: any[] = []

            if (diff < 0) {
                issuesList.push({
                    id: 'cash',
                    type: 'faltante_efectivo',
                    label: 'Faltante de Caja',
                    amount: Math.abs(diff),
                    chargeToEmployee: true,
                    unit: 'RD$'
                })
            }

            // Para cada carga: esperado = cargado - vendido; faltante si devuelto < esperado
            if (loads && liquidations) {
                const loadsArray = loads as any[]
                const liquidationsArray = liquidations as any[]
                for (const l of loadsArray) {
                    const liq = liquidationsArray.find(x => x.product_id === l.product_id)
                    const returnedFull = liq ? parseFloat(liq.quantity_full_returned) || 0 : 0
                    const sold = soldByProduct[l.product_id] || 0
                    const expectedFull = Math.max(0, (parseFloat(l.quantity_loaded) || 0) - sold)

                    if (expectedFull > 0 && returnedFull < expectedFull) {
                        issuesList.push({
                            id: `prod_${l.product_id}`,
                            product_id: l.product_id,
                            type: 'rotura_producto',
                            label: `Faltante de Producto (${liq?.products?.name})`,
                            amount: expectedFull - returnedFull,
                            chargeToEmployee: true,
                            unit: 'unidades'
                        })
                    }
                }
            }

            setDiscrepancies(issuesList)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const toggleCharge = (id: string, value: boolean) => {
        setDiscrepancies(prev => prev.map(d => d.id === id ? { ...d, chargeToEmployee: value } : d))
    }

    const handleApproveLiquidation = async () => {
        setSaving(true)
        try {
            const authStr = await supabase.auth.getUser()
            const ownerId = authStr.data.user?.id
            if (!ownerId) {
                toast({ title: "Error", description: "No se pudo identificar el usuario.", variant: "destructive" })
                return
            }

            // Evitar duplicar penalidades si se cierra dos veces
            const { data: existingPenalties } = await supabase
                .from('employee_penalties')
                .select('id')
                .eq('dispatch_id', dispatch.id)
            if (existingPenalties && existingPenalties.length > 0) {
                toast({ title: "Aviso", description: "Este despacho ya tiene penalidades registradas. Solo se actualizará el cierre.", variant: "default" })
            } else {
                for (const issue of discrepancies) {
                    if (issue.chargeToEmployee) {
                        await supabase.from('employee_penalties').insert({
                            user_id: ownerId,
                            driver_id: dispatch.driver_id,
                            dispatch_id: dispatch.id,
                            amount: issue.type === 'faltante_efectivo' ? issue.amount : 0,
                            reason: issue.type,
                            notes: `Faltante detectado en liquidación. Concepto: ${issue.label}`,
                            status: 'pendiente'
                        })
                    }
                }
            }

            // 2. Cerrar despacho y retornar stock
            // Para simplicidad en esta demo, solo cerramos. El trigger de Postgres de stock
            // puede manejar la lógica de devolucion_almacen si lo extendemos luego.
            await supabase.from('daily_dispatches').update({
                dispatch_status: 'liquidado',
                liquidation_notes: notes,
                closed_at: new Date().toISOString()
            }).eq('id', dispatch.id)

            toast({ title: "¡Liquidación Completada!", description: "La ruta se ha cerrado exitosamente.", variant: "default" })
            onSuccess() // Actualizar estado padre

        } catch (error) {
            console.error(error)
            toast({ title: "Error", description: "No se pudo cerrar la ruta.", variant: "destructive" })
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8 text-center"><RefreshCcw className="animate-spin mx-auto text-slate-500 h-8 w-8" /></div>

    return (
        <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-xl text-emerald-400">4. Finalizar y Cuadrar Ruta</CardTitle>
                <CardDescription>
                    Revisa las discrepancias encontradas, decide las penalizaciones, y cierra formalmente el camión para retornar el inventario sobrante al almacén principal.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6">

                {discrepancies.length > 0 ? (
                    <div className="mb-8">
                        <h3 className="font-semibold text-slate-300 mb-4 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Discrepancias Detectadas
                        </h3>
                        <div className="space-y-3">
                            {discrepancies.map((d) => (
                                <div key={d.id} className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <p className="font-medium text-slate-200">{d.label}</p>
                                        <p className="text-sm text-red-400 font-bold">-{d.type === 'faltante_efectivo' ? formatCurrency(d.amount) : `${d.amount} ${d.unit}`}</p>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <Button
                                            size="sm"
                                            variant={d.chargeToEmployee ? "default" : "outline"}
                                            className={d.chargeToEmployee ? "bg-red-900/40 text-red-400 border border-red-800" : "border-slate-700"}
                                            onClick={() => toggleCharge(d.id, true)}
                                            disabled={isClosed}
                                        >
                                            Cobrar al Chofer
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={!d.chargeToEmployee ? "default" : "outline"}
                                            className={!d.chargeToEmployee ? "bg-blue-900/40 text-blue-400 border border-blue-800" : "border-slate-700"}
                                            onClick={() => toggleCharge(d.id, false)}
                                            disabled={isClosed}
                                        >
                                            Asume Empresa
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-8 flex items-start gap-3">
                        <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                        <div>
                            <h3 className="font-semibold text-emerald-400">Cuadre Exacto</h3>
                            <p className="text-sm text-emerald-500/80">No se detectaron faltantes de inventario. {cashDifference > 0 ? `Se detectó un sobrante de efectivo de ${formatCurrency(cashDifference)}.` : 'La caja está cuadrada.'}</p>
                        </div>
                    </div>
                )}

                <div className="space-y-2 mb-8">
                    <label className="block text-sm font-medium text-slate-400">Observaciones del Cierre (Opcional)</label>
                    <Textarea
                        placeholder="Ej. El camión regresó con un rayón, o todo bajo control..."
                        value={notes}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                        disabled={isClosed}
                        className="bg-slate-950 border-slate-800"
                        rows={3}
                    />
                </div>

                <div className="flex justify-between gap-4 pt-6 border-t border-slate-800">
                    <Button variant="outline" onClick={onBack} className="bg-slate-900 border-slate-700">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Revisar Efectivo
                    </Button>
                    {!isClosed ? (
                        <Button
                            onClick={handleApproveLiquidation}
                            disabled={saving}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20"
                        >
                            {saving ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Aprobar y Cerrar Ruta
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={() => router.push('/route-liquidation')} className="border-slate-700 bg-slate-800">
                            Volver al Listado
                        </Button>
                    )}
                </div>

            </CardContent>
        </Card>
    )
}
