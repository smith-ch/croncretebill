'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { RefreshCcw, Save, Banknote, ArrowRight, ArrowLeft } from 'lucide-react'
import { useCurrency } from '@/hooks/use-currency'

export default function CashReconciliation({ dispatch, isClosed, onNext, onBack }: any) {
    const { toast } = useToast()
    const { formatCurrency } = useCurrency()
    const [saving, setSaving] = useState(false)

    const [pettyCash, setPettyCash] = useState(dispatch.petty_cash_amount || 500)
    const [cashSales, setCashSales] = useState(0)
    const [expectedTotal, setExpectedTotal] = useState(0)
    const [actualReceived, setActualReceived] = useState<string>(dispatch.total_cash_received || '')

    useEffect(() => {
        const fetchCashSales = async () => {
            if (!dispatch?.id) return
            try {
                const dispatchDate = dispatch.dispatch_date

                // Buscar recibos desde la fecha del despacho hasta hoy
                // (las ventas pueden ocurrir en días posteriores al despacho inicial)
                const startDate = new Date(`${dispatchDate}T00:00:00`)
                startDate.setHours(startDate.getHours() - 4)
                const endDate = new Date()
                endDate.setHours(23, 59, 59, 999)

                const { data: receipts, error } = await supabase
                    .from('thermal_receipts')
                    .select('id, payment_method, amount_received, total_amount')
                    .eq('user_id', dispatch.user_id)
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', endDate.toISOString())
                    .neq('status', 'cancelled')

                if (error) throw error

                // Sumamos los recibos que fueron pagados en efectivo
                let cashSum = 0
                if (receipts) {
                    receipts.forEach((r: any) => {
                        // asumiendo que method='cash' (o 'efectivo' dependiendo de cómo lo guarden en el POS)
                        // Tomamos amount_received, o si no, total_amount
                        if (r.payment_method === 'cash' || r.payment_method === 'efectivo') {
                            cashSum += (parseFloat(r.total_amount) || 0)
                        }
                    })
                }

                setCashSales(cashSum)
                setExpectedTotal(pettyCash + cashSum)
            } catch (err) {
                console.error("Error fetching cash sales from receipts", err)
            }
        }

        fetchCashSales()

        if (dispatch.total_cash_received) {
            setActualReceived(dispatch.total_cash_received.toString())
        }
    }, [dispatch, pettyCash])

    const difference = (parseFloat(actualReceived) || 0) - expectedTotal

    const handleSave = async () => {
        setSaving(true)
        try {
            const { error } = await supabase
                .from('daily_dispatches')
                .update({
                    total_cash_expected: expectedTotal,
                    total_cash_received: parseFloat(actualReceived) || 0
                })
                .eq('id', dispatch.id)

            if (error) throw error

            toast({ title: "Guardado", description: "Cuadre de caja actualizado." })
            onNext()
        } catch (error) {
            console.error(error)
            toast({ title: "Error", description: "No se pudo guardar la caja.", variant: "destructive" })
        } finally {
            setSaving(false)
        }
    }

    return (
        <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-xl text-slate-200">3. Cuadre de Caja (Efectivo)</CardTitle>
                <CardDescription>
                    Suma el fondo de caja más las ventas en efectivo del día para obtener el total a entregar por el chofer.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Resumen Calculado */}
                    <div className="space-y-4 bg-slate-950/50 p-6 rounded-xl border border-slate-800">
                        <h3 className="font-semibold text-slate-300 flex items-center gap-2 mb-4">
                            <Banknote className="h-5 w-5 text-emerald-500" />
                            Cálculo Teórico
                        </h3>

                        <div className="flex justify-between text-slate-400">
                            <span>Fondo de Caja (Efectivo Base)</span>
                            <span className="font-medium">{formatCurrency(pettyCash)}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                            <span>Ventas en Efectivo (Recibos Térmicos)</span>
                            <span className="font-medium">+{formatCurrency(cashSales)}</span>
                        </div>

                        <div className="border-t border-slate-800 pt-3 flex justify-between text-slate-200 text-lg font-bold">
                            <span>Efectivo Total Esperado</span>
                            <span className="text-blue-400">{formatCurrency(expectedTotal)}</span>
                        </div>
                    </div>

                    {/* Input Físico */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Efectivo Físico Recibido (RD$)</label>
                            <Input
                                type="number"
                                min="0" step="0.01"
                                value={actualReceived}
                                onChange={(e) => setActualReceived(e.target.value)}
                                disabled={isClosed}
                                placeholder="0.00"
                                className="text-2xl h-14 bg-slate-950 border-slate-700 font-bold"
                            />
                        </div>

                        {actualReceived !== '' && (
                            <div className={`p-4 rounded-xl border flex items-center justify-between ${difference === 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                difference < 0 ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                    'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                }`}>
                                <span className="font-medium">
                                    {difference === 0 ? 'Cuadre Perfecto' :
                                        difference < 0 ? 'Faltante de Caja' : 'Sobrante de Caja'}
                                </span>
                                <span className="text-xl font-bold">
                                    {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                                </span>
                            </div>
                        )}

                        {difference > 0 && (
                            <p className="text-xs text-amber-500/80">
                                Un sobrante de caja se registrará como ingreso Extraordinario para no descuadrar la contabilidad de ventas.
                            </p>
                        )}
                        {difference < 0 && (
                            <p className="text-xs text-red-400/80">
                                Un faltante generará una alerta en el proximo paso para cobrarlo al empleado o asumirlo como pérdida empresarial.
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-8 flex justify-between gap-4">
                    <Button variant="outline" onClick={onBack} className="bg-slate-900 border-slate-700">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Vacíos
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || isClosed}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {saving ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Guardar Caja e Ir a Finalizar
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>

            </CardContent>
        </Card>
    )
}
