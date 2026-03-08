'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { RefreshCcw, Save, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react'

export default function EmptyReturnsReconciliation({ dispatch, isClosed, onNext, onBack }: any) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [returnsItems, setReturnsItems] = useState<any[]>([])

    useEffect(() => {
        const fetchReturns = async () => {
            setLoading(true)
            try {
                // 1. Obtener la lista de productos cargados en este despacho
                // Mostramos todos los productos - el usuario decide cuáles tienen retorno de envases
                const { data: loads, error: loadsErr } = await supabase
                    .from('dispatch_inventory_loads')
                    .select('product_id, product_name, quantity_loaded')
                    .eq('dispatch_id', dispatch.id)

                if (loadsErr) throw loadsErr

                // 2. Obtener lo ya liquidado
                const { data: liquidations, error: liqErr } = await supabase
                    .from('dispatch_liquidations')
                    .select('product_id, quantity_empty_returned')
                    .eq('dispatch_id', dispatch.id)

                if (liqErr) throw liqErr

                const items = (loads || []).map((load: any) => {
                    const saved = liquidations?.find(l => l.product_id === load.product_id)
                    // Las ventas de vacíos esperadas deben venir de una consulta a recibos/ventas.
                    const expectedEmpty = 0 // TODO: Calcular envases dejados vs recibidos en el cliente.
                    return {
                        product_id: load.product_id,
                        product_name: load.product_name,
                        sold_full: 0, // TODO
                        expected_empty: expectedEmpty,
                        actual_empty_returned: saved ? saved.quantity_empty_returned : expectedEmpty,
                        difference: saved ? (saved.quantity_empty_returned - expectedEmpty) : 0
                    }
                })

                setReturnsItems(items)
            } catch (error: any) {
                console.error("Error loading empty returns", error)
            } finally {
                setLoading(false)
            }
        }

        if (dispatch?.id) fetchReturns()
    }, [dispatch?.id])

    const handleActualChange = (productId: string, value: string) => {
        const numValue = parseFloat(value) || 0
        setReturnsItems(prev => prev.map(item => {
            if (item.product_id === productId) {
                return {
                    ...item,
                    actual_empty_returned: numValue,
                    difference: numValue - item.expected_empty
                }
            }
            return item
        }))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            for (const item of returnsItems) {
                const { data: existing } = await supabase
                    .from('dispatch_liquidations')
                    .select('id')
                    .eq('dispatch_id', dispatch.id)
                    .eq('product_id', item.product_id)
                    .single()

                if (existing) {
                    await supabase
                        .from('dispatch_liquidations')
                        .update({ quantity_empty_returned: item.actual_empty_returned })
                        .eq('id', existing.id)
                } else {
                    await supabase
                        .from('dispatch_liquidations')
                        .insert({
                            dispatch_id: dispatch.id,
                            product_id: item.product_id,
                            quantity_empty_returned: item.actual_empty_returned,
                            quantity_full_returned: 0
                        })
                }
            }

            toast({ title: "Guardado", description: "Envases vacíos guardados correctamente." })
            onNext()
        } catch (error) {
            console.error(error)
            toast({ title: "Error", description: "No se pudo guardar la conciliación de envases.", variant: "destructive" })
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8 text-center"><RefreshCcw className="animate-spin mx-auto text-slate-500 h-8 w-8" /></div>

    return (
        <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-xl text-slate-200">2. Retornables Devueltos (Vacíos)</CardTitle>
                <CardDescription>
                    Registra la cantidad de envases vacíos (ej. Botellones) que el camión trajo de vuelta a la planta.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                {returnsItems.length === 0 ? (
                    <div className="text-center p-8 bg-slate-950 rounded-xl">
                        <AlertTriangle className="h-10 w-10 text-slate-500 mx-auto mb-2" />
                        <p className="text-slate-400">No hay productos retornables cargados en este camión.</p>
                        <Button variant="outline" onClick={onNext} className="mt-4">Omitir Paso</Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-950/50 text-slate-400">
                                <tr>
                                    <th className="p-4 font-semibold rounded-tl-xl whitespace-normal break-words">Envase (Producto)</th>
                                    <th className="p-4 font-semibold text-center text-blue-400 bg-blue-950/20">Esperado (S/Ventas)</th>
                                    <th className="p-4 font-semibold text-center">Físico Devuelto</th>
                                    <th className="p-4 font-semibold text-center rounded-tr-xl">Diferencia</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {returnsItems.map((item) => (
                                    <tr key={item.product_id} className="hover:bg-slate-800/30">
                                        <td className="p-4 font-medium text-slate-200">{item.product_name} Vacío</td>
                                        <td className="p-4 text-center font-bold text-blue-400 bg-blue-950/10">{item.expected_empty}</td>
                                        <td className="p-4 flex justify-center">
                                            <Input
                                                type="number"
                                                min="0"
                                                value={item.actual_empty_returned}
                                                onChange={(e) => handleActualChange(item.product_id, e.target.value)}
                                                disabled={isClosed}
                                                className="w-24 text-center bg-slate-950 border-slate-700"
                                            />
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`font-bold inline-flex items-center justify-center px-2 py-1 rounded w-16 ${item.difference === 0 ? 'text-emerald-400 bg-emerald-500/10' :
                                                    item.difference < 0 ? 'text-red-400 bg-red-500/10' :
                                                        'text-amber-400 bg-amber-500/10'
                                                }`}>
                                                {item.difference > 0 ? '+' : ''}{item.difference}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="mt-8 flex justify-between gap-4">
                    <Button variant="outline" onClick={onBack} className="bg-slate-900 border-slate-700">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Llenos
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || isClosed || returnsItems.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {saving ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Guardar Vacíos e Ir a Efectivo
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
