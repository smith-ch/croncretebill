'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from '@/hooks/use-toast'
import {
    ArrowLeft,
    PackageSearch,
    RefreshCcw,
    Banknote,
    AlertTriangle,
    CheckCircle2
} from 'lucide-react'

// Sub-componentes que crearemos luego
import InventoryReconciliation from './components/InventoryReconciliation'
import EmptyReturnsReconciliation from './components/EmptyReturnsReconciliation'
import CashReconciliation from './components/CashReconciliation'
import PenaltyResolution from './components/PenaltyResolution'

export default function RouteLiquidationProcess({ params }: { params: { id: string } }) {
    const router = useRouter()
    const { toast } = useToast()
    const dispatchId = params.id

    const [loading, setLoading] = useState(true)
    const [dispatch, setDispatch] = useState<any>(null)
    const [activeTab, setActiveTab] = useState("inventory")

    useEffect(() => {
        fetchDispatchDetails()
    }, [dispatchId])

    const fetchDispatchDetails = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('daily_dispatches')
                .select(`
                    *,
                    drivers(id, full_name, employee_id),
                    fleet_vehicles(plate_number, brand)
                ` as any)
                .eq('id', dispatchId)
                .single()

            if (error) throw error
            const dispatchData = data as any
            setDispatch(dispatchData)
            // No cambiar estado aquí: la liquidación se inicia al guardar el primer paso (inventario)
            // o al hacer clic en "Iniciar liquidación", para no marcar el camión en liquidación solo por abrir la página.
        } catch (error: any) {
            console.error('Error fetching dispatch:', error)
            toast({
                title: "Error",
                description: "No se pudo cargar la información del camión.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const startLiquidation = async (id: string) => {
        try {
            const { error } = await supabase
                .from('daily_dispatches')
                .update({ dispatch_status: 'en_liquidacion' })
                .eq('id', id)

            if (error) throw error

            // Actualizar estado local
            setDispatch((prev: any) => ({ ...prev, dispatch_status: 'en_liquidacion' }))

            toast({
                title: "Liquidación Iniciada",
                description: "El camión ha sido bloqueado para nuevas ventas móviles.",
            })
        } catch (error: any) {
            console.error('Error starting liquidation:', error)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 h-[60vh]">
                <RefreshCcw className="h-8 w-8 animate-spin text-slate-500 mb-4" />
                <p className="text-slate-400">Cargando datos de liquidación...</p>
            </div>
        )
    }

    if (!dispatch) {
        return (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl max-w-2xl mx-auto mt-12">
                <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-200 mb-2">Camión No Encontrado</h2>
                <p className="text-slate-400 mb-6">El código de despacho no existe o no tienes acceso.</p>
                <Button onClick={() => router.push('/route-liquidation')} variant="outline">
                    Volver al Dashboard
                </Button>
            </div>
        )
    }

    const isClosed = dispatch.dispatch_status === 'liquidado' || dispatch.dispatch_status === 'cerrado';

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-24">
            {/* Header / Nav */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/route-liquidation')} className="shrink-0 rounded-full bg-slate-900 hover:bg-slate-800 border mb-4 border-slate-800">
                    <ArrowLeft className="h-5 w-5 text-slate-400" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
                        Cuadre de Camión
                        <Badge variant="outline" className={
                            isClosed ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
                                : "border-amber-500 text-amber-400 bg-amber-500/10"
                        }>
                            {dispatch.dispatch_status.toUpperCase()}
                        </Badge>
                    </h1>
                    <p className="text-slate-400">
                        {dispatch.drivers?.full_name} • Placa: {dispatch.fleet_vehicles?.plate_number}
                    </p>
                </div>
            </div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-slate-900/80 border-slate-800 border p-1 rounded-xl">
                    <TabsTrigger value="inventory" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg">
                        1. Productos Llenos
                    </TabsTrigger>
                    <TabsTrigger value="returns" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg">
                        2. Envases (Vacíos)
                    </TabsTrigger>
                    <TabsTrigger value="cash" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white rounded-lg">
                        3. Efectivo
                    </TabsTrigger>
                    <TabsTrigger value="penalties" className="data-[state=active]:bg-slate-800 data-[state=active]:text-amber-400 rounded-lg">
                        4. Finalizar y Cuadrar
                    </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="inventory" className="mt-0 outline-none">
                        <InventoryReconciliation
                            dispatch={dispatch}
                            isClosed={isClosed}
                            onNext={() => setActiveTab('returns')}
                            onStartLiquidation={async () => {
                                await startLiquidation(dispatch.id)
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="returns" className="mt-0 outline-none">
                        <EmptyReturnsReconciliation
                            dispatch={dispatch}
                            isClosed={isClosed}
                            onNext={() => setActiveTab('cash')}
                            onBack={() => setActiveTab('inventory')}
                        />
                    </TabsContent>

                    <TabsContent value="cash" className="mt-0 outline-none">
                        <CashReconciliation
                            dispatch={dispatch}
                            isClosed={isClosed}
                            onNext={() => setActiveTab('penalties')}
                            onBack={() => setActiveTab('returns')}
                        />
                    </TabsContent>

                    <TabsContent value="penalties" className="mt-0 outline-none">
                        <PenaltyResolution
                            dispatch={dispatch}
                            isClosed={isClosed}
                            onBack={() => setActiveTab('cash')}
                            onSuccess={() => {
                                fetchDispatchDetails() // Reload to get newly 'liquidated' state
                            }}
                        />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}
