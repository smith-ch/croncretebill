'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import {
    Search,
    Banknote,
    Truck,
    Clock,
    RefreshCcw,
    CheckCircle2,
    ArrowRight,
    Calendar,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'
import { format, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'

type DispatchWithDriver = {
    id: string;
    dispatch_date: string;
    dispatch_status: string;
    created_at: string;
    driver_id: string;
    drivers: {
        id: string;
        full_name: string;
    };
    fleet_vehicles: {
        plate_number: string;
        brand: string;
    };
}

export default function RouteLiquidationDashboard() {
    const router = useRouter()
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [dispatches, setDispatches] = useState<DispatchWithDriver[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())

    useEffect(() => {
        fetchDispatches()
    }, [selectedDate])

    const fetchDispatches = async () => {
        setLoading(true)
        try {
            // Formatear fecha para filtrar
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            
            // Obtener despachos de la fecha seleccionada
            const { data, error } = await supabase
                .from('daily_dispatches')
                .select(`
                    id, 
                    dispatch_date, 
                    dispatch_status, 
                    created_at,
                    driver_id,
                    drivers(id, full_name),
                    fleet_vehicles(plate_number, brand)
                `)
                .eq('dispatch_date', dateStr)
                .in('dispatch_status', ['despachado', 'en_ruta', 'en_liquidacion', 'liquidado', 'cerrado'])
                .order('created_at', { ascending: false })

            if (error) throw error

            setDispatches(data as unknown as DispatchWithDriver[])
        } catch (error: any) {
            console.error('Error al cargar despachos:', error)
            toast({
                title: "Error",
                description: "No se pudieron cargar las rutas del día.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const filteredDispatches = dispatches.filter(d =>
        d.drivers?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.fleet_vehicles?.plate_number?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const pendingCount = dispatches.filter(d => d.dispatch_status === 'en_ruta').length
    const liquidatingCount = dispatches.filter(d => d.dispatch_status === 'en_liquidacion').length
    const finishedCount = dispatches.filter(d => d.dispatch_status === 'liquidado' || d.dispatch_status === 'cerrado').length

    const goToPreviousDay = () => setSelectedDate(prev => subDays(prev, 1))
    const goToNextDay = () => setSelectedDate(prev => addDays(prev, 1))
    const goToToday = () => setSelectedDate(new Date())
    
    const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                        <Banknote className="h-6 w-6 text-emerald-500" />
                        Liquidación de Rutas
                    </h1>
                    <p className="text-slate-400">
                        Cierre de camiones, cuadre de inventario y caja.
                    </p>
                </div>
                <Button onClick={fetchDispatches} variant="outline" className="shrink-0 bg-slate-900 border-slate-700 text-slate-300">
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Actualizar
                </Button>
            </div>

            {/* Selector de Fecha */}
            <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-emerald-500" />
                            <span className="text-slate-300 font-medium">Seleccionar fecha:</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={goToPreviousDay}
                                className="bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            
                            <div className="flex items-center gap-2">
                                <Input
                                    type="date"
                                    value={format(selectedDate, 'yyyy-MM-dd')}
                                    onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))}
                                    className="bg-slate-950 border-slate-700 text-slate-200 w-44"
                                />
                                <span className="text-slate-400 hidden sm:block">
                                    {format(selectedDate, 'EEEE', { locale: es })}
                                </span>
                            </div>
                            
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={goToNextDay}
                                className="bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            
                            {!isToday && (
                                <Button
                                    variant="outline"
                                    onClick={goToToday}
                                    className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 ml-2"
                                >
                                    Hoy
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Metricas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-400 mb-1">En Ruta (Por Llegar)</p>
                                <h3 className="text-3xl font-bold text-blue-500">{pendingCount}</h3>
                            </div>
                            <div className="p-3 bg-blue-500/10 rounded-xl">
                                <Truck className="h-5 w-5 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-400 mb-1">En Liquidación</p>
                                <h3 className="text-3xl font-bold text-amber-500">{liquidatingCount}</h3>
                            </div>
                            <div className="p-3 bg-amber-500/10 rounded-xl">
                                <Clock className="h-5 w-5 text-amber-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-400 mb-1">Liquidados (Cerrados)</p>
                                <h3 className="text-3xl font-bold text-emerald-500">{finishedCount}</h3>
                            </div>
                            <div className="p-3 bg-emerald-500/10 rounded-xl">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Listado de Camiones */}
            <Card className="bg-slate-900 border-slate-800 shadow-xl">
                <CardHeader className="border-b border-slate-800 pb-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="text-lg text-slate-200">
                                Camiones del {format(selectedDate, 'd \'de\' MMMM, yyyy', { locale: es })}
                            </CardTitle>
                            <CardDescription>Selecciona un camión para iniciar o continuar su cuadre de fin de día.</CardDescription>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <Input
                                placeholder="Buscar chofer o placa..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-slate-950 border-slate-800 text-slate-200 w-full"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 text-center">
                            <RefreshCcw className="w-8 h-8 text-slate-500 animate-spin mx-auto mb-4" />
                            <p className="text-slate-400">Cargando despachos...</p>
                        </div>
                    ) : filteredDispatches.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Truck className="h-8 w-8 text-slate-500" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-300 mb-1">No se encontraron camiones</h3>
                            <p className="text-slate-500 max-w-sm mx-auto">
                                No hay despachos registrados para el {format(selectedDate, 'd \'de\' MMMM', { locale: es })}, o no coinciden con la búsqueda.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800/60">
                            {filteredDispatches.map((dispatch) => (
                                <div key={dispatch.id} className="p-4 sm:p-6 hover:bg-slate-800/30 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl shrink-0 ${(dispatch.dispatch_status === 'liquidado' || dispatch.dispatch_status === 'cerrado') ? 'bg-emerald-500/10 text-emerald-500' :
                                            dispatch.dispatch_status === 'en_liquidacion' ? 'bg-amber-500/10 text-amber-500' :
                                                'bg-blue-500/10 text-blue-500'
                                            }`}>
                                            <Truck className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-slate-200">
                                                {dispatch.drivers?.full_name || 'Sin chofer asignado'}
                                            </h4>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <Badge variant="outline" className="bg-slate-950 border-slate-700 text-slate-400">
                                                    {dispatch.fleet_vehicles?.plate_number || 'Sin placa'}
                                                </Badge>
                                                <Badge variant="outline" className={`
                                                    ${(dispatch.dispatch_status === 'liquidado' || dispatch.dispatch_status === 'cerrado') ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : ''}
                                                    ${dispatch.dispatch_status === 'en_liquidacion' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' : ''}
                                                    ${(dispatch.dispatch_status === 'en_ruta' || dispatch.dispatch_status === 'despachado') ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : ''}
                                                `}>
                                                    {(dispatch.dispatch_status === 'cerrado' ? 'LIQUIDADO' : dispatch.dispatch_status).replace('_', ' ').toUpperCase()}
                                                </Badge>
                                                <span className="text-xs text-slate-500 flex items-center">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    {format(new Date(dispatch.created_at), 'hh:mm a')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full sm:w-auto">
                                        {(dispatch.dispatch_status === 'liquidado' || dispatch.dispatch_status === 'cerrado') ? (
                                            <Button
                                                variant="outline"
                                                className="w-full sm:w-auto border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                                onClick={() => router.push(`/route-liquidation/${dispatch.id}`)}
                                            >
                                                Ver Resumen
                                            </Button>
                                        ) : (
                                            <Button
                                                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg"
                                                onClick={() => router.push(`/route-liquidation/${dispatch.id}`)}
                                            >
                                                {dispatch.dispatch_status === 'en_liquidacion' ? 'Continuar Cuadre' : 'Iniciar Liquidación'}
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
