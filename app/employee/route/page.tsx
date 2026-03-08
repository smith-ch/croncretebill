'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Navigation, Clock, CheckCircle2, ShoppingCart, CreditCard, Banknote, ListTodo, Map, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useCurrency } from '@/hooks/use-currency'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function RoutePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [authLoading, setAuthLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [employeeUserId, setEmployeeUserId] = useState<string | null>(null)
    const [stops, setStops] = useState<any[]>([])
    const [dispatchStatus, setDispatchStatus] = useState<string>('pendiente')
    const [dailyDispatch, setDailyDispatch] = useState<any>(null)
    const [debugInfo, setDebugInfo] = useState<any>(null)
    const [driverId, setDriverId] = useState<string | null>(null)
    const { formatCurrency } = useCurrency()

    // Obtener el ID del usuario actual (empleado logueado)
    useEffect(() => {
        const getEmployeeId = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
                setEmployeeUserId(session.user.id)
                console.log('👤 Employee user ID:', session.user.id)
            }
            setAuthLoading(false)
        }
        getEmployeeId()
    }, [])

    useEffect(() => {
        if (!authLoading && employeeUserId) {
            fetchTodayRoute()
        }
    }, [authLoading, employeeUserId])

    // Suscripción en tiempo real para sincronizar cambios
    useEffect(() => {
        if (!dailyDispatch?.id) return

        console.log('🔄 Iniciando suscripción realtime para dispatch:', dailyDispatch.id)

        const channel = supabase
            .channel(`dispatch-${dailyDispatch.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'dispatch_items',
                    filter: `dispatch_id=eq.${dailyDispatch.id}`
                },
                (payload) => {
                    console.log('📨 Cambio detectado en dispatch_items:', payload)
                    fetchTodayRoute() // Recargar datos cuando hay cambios
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'daily_dispatches',
                    filter: `id=eq.${dailyDispatch.id}`
                },
                (payload) => {
                    console.log('📨 Cambio detectado en daily_dispatches:', payload)
                    fetchTodayRoute()
                }
            )
            .subscribe()

        return () => {
            console.log('📴 Cerrando suscripción realtime')
            supabase.removeChannel(channel)
        }
    }, [dailyDispatch?.id])

    const fetchTodayRoute = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true)
            } else {
                setLoading(true)
            }
            const today = new Date().toISOString().split('T')[0]

            console.log('🔍 Buscando chofer vinculado al empleado:', employeeUserId)

            // 1. Fetch the driver record linked to this employee (usando el ID del empleado logueado)
            const { data: driverData, error: driverError } = await supabase
                .from('drivers')
                .select('id, user_id, full_name')
                .eq('employee_id', employeeUserId)
                .single()

            let foundDriverId = null
            let ownerId = employeeUserId

            if (driverError) {
                console.log('⚠️ No se encontró chofer vinculado:', driverError.message)
            }

            if (driverData) {
                foundDriverId = driverData.id
                ownerId = driverData.user_id // The owner of the system who created the driver
                setDriverId(foundDriverId)
                console.log('✅ Chofer encontrado:', driverData.full_name, 'Driver ID:', foundDriverId, 'Owner ID:', ownerId)
            }

            setDebugInfo({
                employeeUserId,
                driverId: foundDriverId,
                ownerId,
                driverFound: !!driverData,
                dispatchId: null,
                dispatchItemsCount: 0,
                itemsError: null
            })

            // 2. Fetch today's active dispatch for this specific driver (if linked) OR for the user directly (fallback/owner)
            let dispatchesQuery = supabase
                .from('daily_dispatches')
                .select('*')
                .in('dispatch_status', ['preparando', 'despachado', 'en_ruta'])
                .order('created_at', { ascending: false })
                .limit(1)

            if (foundDriverId) {
                dispatchesQuery = dispatchesQuery.eq('driver_id', foundDriverId)
                console.log('🔍 Buscando despachos para driver_id:', foundDriverId)
            } else {
                dispatchesQuery = dispatchesQuery.eq('user_id', ownerId)
                console.log('🔍 Buscando despachos para user_id:', ownerId)
            }

            const { data: dispatches, error: dispatchError } = await dispatchesQuery

            if (dispatchError) {
                console.log('❌ Error buscando despachos:', dispatchError)
                throw dispatchError
            }

            console.log('📦 Despachos encontrados:', dispatches?.length || 0, dispatches)

            if (dispatches && dispatches.length > 0) {
                const currentDispatch = dispatches[0] as any
                setDailyDispatch(currentDispatch)
                setDispatchStatus(currentDispatch.dispatch_status || 'en_ruta')

                // Fetch stops for this dispatch (sin inner join para evitar errores de relación)
                const { data: dispatchItems, error: itemsError } = await supabase
                    .from('dispatch_items')
                    .select('id, visit_order, is_visited, visited_at, client_id')
                    .eq('dispatch_id', currentDispatch.id)
                    .order('visit_order', { ascending: true })

                if (itemsError) {
                    console.error('❌ Error obteniendo dispatch_items:', itemsError)
                    setDebugInfo((prev: any) => ({
                        ...prev,
                        dispatchId: currentDispatch.id,
                        itemsError: itemsError.message
                    }))
                    // No lanzar error, continuar con array vacío
                }

                console.log('📋 Dispatch items encontrados:', dispatchItems?.length || 0, dispatchItems)
                
                setDebugInfo((prev: any) => ({
                    ...prev,
                    dispatchId: currentDispatch.id,
                    dispatchItemsCount: dispatchItems?.length || 0,
                    itemsError: itemsError?.message || null
                }))

                if (dispatchItems && dispatchItems.length > 0) {
                    // Obtener los IDs de clientes únicos
                    const clientIds = [...new Set(dispatchItems.map((item: any) => item.client_id).filter(Boolean))]
                    console.log('👥 Client IDs a buscar:', clientIds)

                    // Fetch clientes por separado
                    let clientsMap: Record<string, { name: string; address: string }> = {}
                    if (clientIds.length > 0) {
                        const { data: clientsData, error: clientsError } = await supabase
                            .from('clients')
                            .select('id, name, address')
                            .in('id', clientIds)

                        if (clientsError) {
                            console.error('⚠️ Error obteniendo clientes:', clientsError)
                            // No lanzar error, continuar con datos parciales
                        } else if (clientsData) {
                            clientsMap = clientsData.reduce((acc: any, client: any) => {
                                acc[client.id] = { name: client.name, address: client.address }
                                return acc
                            }, {})
                            console.log('✅ Clientes cargados:', Object.keys(clientsMap).length)
                        }
                    }

                    const formattedStops = dispatchItems.map((item: any) => ({
                        id: item.id,
                        client_id: item.client_id,
                        client_name: clientsMap[item.client_id]?.name || 'Cliente desconocido',
                        address: clientsMap[item.client_id]?.address || 'Sin dirección',
                        status: item.is_visited ? 'completed' : 'pending',
                        visit_order: item.visit_order,
                        dispatch_id: currentDispatch.id
                    }))
                    setStops(formattedStops)
                } else {
                    setStops([])
                }
            } else {
                setStops([])
                setDailyDispatch(null)
            }
        } catch (error) {
            console.error('Error fetching route:', error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const handleRefresh = () => {
        fetchTodayRoute(true)
    }

    const handleStartSale = (client_id: string, dispatch_item_id: string) => {
        if (!dailyDispatch) return;
        // Navegar a recibos térmicos con cliente preseleccionado
        router.push(`/thermal-receipts?client_id=${client_id}&from=route&stop_id=${dispatch_item_id}&dispatch_id=${dailyDispatch.id}`)
    }

    const handleNavigate = (address: string) => {
        const query = encodeURIComponent(address)
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
    }

    const completedStops = stops.filter(s => s.status === 'completed').length
    const totalStops = stops.length
    const progress = totalStops > 0 ? (completedStops / totalStops) * 100 : 0
    const todayCollected = 0 // Future implementation: fetch thermal_receipts today for this dispatch

    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 lg:p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-slate-700 rounded-xl skeleton"></div>
                        <div>
                            <div className="h-8 w-48 bg-slate-700 rounded skeleton mb-2"></div>
                            <div className="h-4 w-64 bg-slate-800 rounded skeleton"></div>
                        </div>
                    </div>
                    <Card className="border-0 shadow-lg bg-slate-900/80">
                        <CardContent className="p-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-24 bg-slate-800 rounded-lg mb-4 skeleton" style={{ animationDelay: `${i * 0.1}s` }}></div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-4 lg:space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0 gap-4 lg:gap-6"
                >
                    <div className="space-y-2 lg:space-y-3">
                        <div className="flex items-center gap-2 lg:gap-3">
                            <div className="p-2 lg:p-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl lg:rounded-2xl shadow-lg">
                                <Map className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl lg:text-4xl xl:text-5xl font-bold text-slate-200">
                                    Ruta del Día
                                </h1>
                                <p className="text-sm lg:text-lg text-slate-400 font-medium">Gestiona tus paradas y ventas asignadas</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            onClick={handleRefresh} 
                            disabled={refreshing}
                            className="border-slate-700 text-slate-300 hover:bg-slate-800"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                            {refreshing ? 'Actualizando...' : 'Actualizar'}
                        </Button>
                    </div>
                </motion.div>

                {!dailyDispatch ? (
                    <Card className="border-0 shadow-2xl bg-slate-900/80 backdrop-blur-sm border-slate-700">
                        <CardContent className="p-12 text-center">
                            <div className="mb-6 mx-auto w-24 h-24 bg-gradient-to-br from-slate-800 to-slate-700 rounded-full flex items-center justify-center">
                                <ListTodo className="h-12 w-12 text-slate-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-200 mb-3">No hay rutas activas</h3>
                            <p className="text-slate-400 mb-6 max-w-md mx-auto">
                                No tienes rutas asignadas para hoy. Contacta al administrador si crees que esto es un error.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <Card className="border-0 shadow-2xl bg-gradient-to-br from-slate-900 to-slate-800 backdrop-blur-sm border-slate-700">
                            <CardContent className="p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
                                    <div>
                                        <p className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">Progreso de la Ruta</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl font-bold text-blue-400">{completedStops}</span>
                                            <span className="text-xl text-slate-500">/ {totalStops}</span>
                                        </div>
                                        <p className="text-slate-500 text-sm mt-1">Paradas Completadas</p>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <Badge variant="outline" className={`mb-2 ${dispatchStatus === 'en_ruta' ? 'border-emerald-500 text-emerald-400' : 'border-blue-500 text-blue-400'}`}>
                                            {dispatchStatus.replace('_', ' ').toUpperCase()}
                                        </Badge>
                                    </div>
                                </div>
                                <Progress value={progress} className="h-2 bg-slate-800" />
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6 mt-6">
                            {stops.map((stop, index) => (
                                <motion.div
                                    key={stop.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card className={`card-hover border-0 shadow-lg overflow-hidden group transition-all duration-300 ${stop.status === 'completed' ? 'bg-slate-900/50 border-l-4 border-l-emerald-500 opacity-70' : 'bg-slate-900/80 border-l-4 border-l-blue-500'}`}>
                                        <CardHeader className="p-4 sm:px-6 sm:pt-6 sm:pb-3">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex items-start gap-3 flex-1">
                                                    <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                                                        ${stop.status === 'completed' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-blue-900/30 text-blue-400'}`}>
                                                        {stop.visit_order}
                                                    </div>
                                                    <div>
                                                        <CardTitle className={`text-lg leading-tight mb-1 ${stop.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                                            {stop.client_name}
                                                        </CardTitle>
                                                        <CardDescription className="flex items-start gap-1 text-slate-400">
                                                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                            <span className="line-clamp-2">{stop.address}</span>
                                                        </CardDescription>
                                                    </div>
                                                </div>

                                                {stop.status === 'completed' ? (
                                                    <Badge className="bg-emerald-900/50 text-emerald-300 border border-emerald-700 shrink-0">
                                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                                        Completada
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="border-blue-700 text-blue-300 bg-blue-900/20 shrink-0">
                                                        Pendiente
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 sm:px-6 sm:pb-6">
                                            {stop.status === 'pending' ? (
                                                <div className="flex gap-2 mt-2 pt-4 border-t border-slate-800">
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => handleNavigate(stop.address)}
                                                        className="flex-1 rounded-xl h-12 text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white"
                                                    >
                                                        <Navigation className="w-4 h-4 mr-2" />
                                                        GPS
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleStartSale(stop.client_id, stop.id)}
                                                        className="flex-[2] rounded-xl h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg"
                                                    >
                                                        <ShoppingCart className="w-4 h-4 mr-2" />
                                                        Atender Cliente
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="mt-2 pt-4 border-t border-slate-800 flex justify-between items-center bg-emerald-950/20 p-3 rounded-xl border border-emerald-900/50">
                                                    <span className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        Visita completada
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleStartSale(stop.client_id, stop.id)}
                                                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                                                    >
                                                        Ver Detalles
                                                    </Button>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
