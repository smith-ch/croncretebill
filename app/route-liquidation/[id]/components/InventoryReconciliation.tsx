'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { RefreshCcw, Save, AlertTriangle, ArrowRight } from 'lucide-react'

export default function InventoryReconciliation({ dispatch, isClosed, onNext }: any) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [inventoryItems, setInventoryItems] = useState<any[]>([])

    // Cargar inventario despachado vs ventas
    useEffect(() => {
        const fetchInventory = async () => {
            setLoading(true)
            try {
                // 1. Obtener lo que se le cargó al camión (dispatch_inventory_loads)
                const { data: loads, error: loadsErr } = await supabase
                    .from('dispatch_inventory_loads')
                    .select('product_id, product_name, quantity_loaded')
                    .eq('dispatch_id', dispatch.id)

                if (loadsErr) throw loadsErr

                // 2. Obtener lo que se ha guardado como liquidación parcial si la hay
                const { data: liquidations, error: liqErr } = await supabase
                    .from('dispatch_liquidations')
                    .select('product_id, quantity_full_returned')
                    .eq('dispatch_id', dispatch.id)

                if (liqErr) throw liqErr

                // 3. Obtener ventas reales de la ruta (recibos térmicos)
                const dispatchDate = dispatch.dispatch_date // YYYY-MM-DD

                // Buscar recibos desde la fecha del despacho hasta hoy
                // (las ventas pueden ocurrir en días posteriores al despacho inicial)
                const startDate = new Date(`${dispatchDate}T00:00:00`)
                startDate.setHours(startDate.getHours() - 4) // 4 horas antes para cubrir zonas horarias
                
                // Si el despacho no está cerrado, buscar hasta ahora; si está cerrado, usar fecha de cierre o +7 días
                const endDate = new Date()
                endDate.setHours(23, 59, 59, 999) // Hasta el final del día actual

                console.log('🚛 Cuadre - Buscando recibos:', {
                    dispatchId: dispatch.id,
                    dispatchDate,
                    userId: dispatch.user_id,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                })

                const { data: receiptsData, error: recErr } = await supabase
                    .from('thermal_receipts')
                    .select('id, created_at, user_id, thermal_receipt_items(product_id, quantity)')
                    .eq('user_id', dispatch.user_id)
                    .gte('created_at', startDate.toISOString())
                    .lte('created_at', endDate.toISOString())
                    .neq('status', 'cancelled')

                console.log('🧾 Recibos encontrados:', receiptsData?.length || 0, receiptsData)
                if (recErr) console.error("Error fetching receipts:", recErr)

                // Sumar totales vendidos por producto
                const soldTotals: Record<string, number> = {}
                if (receiptsData) {
                    receiptsData.forEach((receipt: any) => {
                        receipt.thermal_receipt_items?.forEach((item: any) => {
                            if (item.product_id) {
                                soldTotals[item.product_id] = (soldTotals[item.product_id] || 0) + (parseFloat(item.quantity) || 0)
                            }
                        })
                    })
                }

                // Mapear la tabla final
                const items = (loads || []).map((load: any) => {
                    const saved = liquidations?.find(l => l.product_id === load.product_id)
                    const soldQuantity = soldTotals[load.product_id] || 0
                    const expectedReturn = load.quantity_loaded - soldQuantity

                    return {
                        product_id: load.product_id,
                        product_name: load.product_name,
                        loaded: load.quantity_loaded,
                        sold: soldQuantity,
                        expected: expectedReturn,
                        actual_returned: saved ? saved.quantity_full_returned : expectedReturn, // Default al esperado
                        difference: saved ? (saved.quantity_full_returned - expectedReturn) : 0
                    }
                })

                setInventoryItems(items)
            } catch (error: any) {
                console.error("Error loading inventory", error)
                toast({ title: "Error", description: "No se pudo cargar el inventario del camión.", variant: "destructive" })
            } finally {
                setLoading(false)
            }
        }

        if (dispatch?.id) {
            fetchInventory()
        }
    }, [dispatch?.id])

    const handleActualChange = (productId: string, value: string) => {
        const numValue = parseFloat(value) || 0
        setInventoryItems(prev => prev.map(item => {
            if (item.product_id === productId) {
                return {
                    ...item,
                    actual_returned: numValue,
                    difference: numValue - item.expected
                }
            }
            return item
        }))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            // Guardar (Upsert) cada item en dispatch_liquidations
            for (const item of inventoryItems) {
                // Chequear si existe
                const { data: existing } = await supabase
                    .from('dispatch_liquidations')
                    .select('id')
                    .eq('dispatch_id', dispatch.id)
                    .eq('product_id', item.product_id)
                    .single()

                if (existing) {
                    await supabase
                        .from('dispatch_liquidations')
                        .update({ quantity_full_returned: item.actual_returned })
                        .eq('id', existing.id)
                } else {
                    await supabase
                        .from('dispatch_liquidations')
                        .insert({
                            dispatch_id: dispatch.id,
                            product_id: item.product_id,
                            quantity_full_returned: item.actual_returned,
                            quantity_empty_returned: 0
                        })
                }
            }

            toast({ title: "Guardado", description: "Inventario físico guardado correctamente." })
            onNext() // Avanzar a la siguiente pestaña
        } catch (error: any) {
            console.error("Error saving inventory", error)
            toast({ title: "Error", description: "No se pudo guardar la conciliación.", variant: "destructive" })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="p-8 text-center"><RefreshCcw className="animate-spin mx-auto text-slate-500 h-8 w-8" /></div>
    }

    return (
        <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-xl text-slate-200">1. Inventario Físico (Llenos)</CardTitle>
                <CardDescription>
                    Verifica que la cantidad de producto intacto que regresa en el camión coincida con el cálculo del sistema (Cargado - Vendido).
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                {inventoryItems.length === 0 ? (
                    <div className="text-center p-8 bg-slate-950 rounded-xl">
                        <AlertTriangle className="h-10 w-10 text-slate-500 mx-auto mb-2" />
                        <p className="text-slate-400">Este despacho no tiene productos cargados.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-950/50 text-slate-400">
                                <tr>
                                    <th className="p-4 font-semibold rounded-tl-xl whitespace-normal break-words">Producto</th>
                                    <th className="p-4 font-semibold text-center">Carga Inicial</th>
                                    <th className="p-4 font-semibold text-center">Ventas (Recibos Térmicos)</th>
                                    <th className="p-4 font-semibold text-center text-blue-400 bg-blue-950/20">Esperado (Teórico)</th>
                                    <th className="p-4 font-semibold text-center">Físico Devuelto</th>
                                    <th className="p-4 font-semibold text-center rounded-tr-xl">Diferencia</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {inventoryItems.map((item) => (
                                    <tr key={item.product_id} className="hover:bg-slate-800/30">
                                        <td className="p-4 font-medium text-slate-200">{item.product_name}</td>
                                        <td className="p-4 text-center text-slate-400">{item.loaded}</td>
                                        <td className="p-4 text-center text-amber-400/80">-{item.sold}</td>
                                        <td className="p-4 text-center font-bold text-blue-400 bg-blue-950/10">{item.expected}</td>
                                        <td className="p-4 flex justify-center">
                                            <Input
                                                type="number"
                                                min="0"
                                                value={item.actual_returned}
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

                <div className="mt-8 flex justify-end gap-4">
                    <Button
                        onClick={handleSave}
                        disabled={saving || isClosed || inventoryItems.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {saving ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Guardar Físico e Ir a Vacíos
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
