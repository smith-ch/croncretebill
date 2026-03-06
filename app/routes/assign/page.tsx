"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, GripVertical, MapPin, X, ArrowLeft, Users } from "lucide-react"
import { useRoutes, useRouteAssignments } from "@/hooks/use-routes"
import { useDataUserId } from "@/hooks/use-data-user-id"
import { useToast } from "@/hooks/use-toast"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

export default function RouteAssignmentPage() {
    const searchParams = useSearchParams()
    const initialRouteId = searchParams.get("routeId") || ""

    const { routes, loading: routesLoading } = useRoutes()
    const [selectedRouteId, setSelectedRouteId] = useState(initialRouteId)
    const { assignments, loading: assignLoading, fetchAssignments, assignClient, removeAssignment } = useRouteAssignments(selectedRouteId)

    const [searchTerm, setSearchTerm] = useState("")
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [searching, setSearching] = useState(false)
    const [selectedDay, setSelectedDay] = useState("lunes")
    const [selectedFrequency, setSelectedFrequency] = useState("semanal")
    const { dataUserId } = useDataUserId()
    const { toast } = useToast()

    useEffect(() => {
        if (initialRouteId) setSelectedRouteId(initialRouteId)
    }, [initialRouteId])

    // Buscar clientes del CRM
    useEffect(() => {
        const searchClients = async () => {
            if (!dataUserId || searchTerm.length < 2) {
                setSearchResults([])
                return
            }
            setSearching(true)
            try {
                const { data, error } = await supabase
                    .from("clients")
                    .select("id, name, address, phone")
                    .eq("user_id", dataUserId)
                    .or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
                    .limit(10)
                if (error) throw error
                // Filtrar los que ya están asignados
                const assignedIds = new Set(assignments.map((a) => a.client_id))
                setSearchResults((data || []).filter((c: any) => !assignedIds.has(c.id)))
            } catch (error) {
                console.error("Error searching clients:", error)
            } finally {
                setSearching(false)
            }
        }
        const timer = setTimeout(searchClients, 300)
        return () => clearTimeout(timer)
    }, [searchTerm, dataUserId, assignments])

    const handleAssign = async (client: any) => {
        if (!selectedRouteId) {
            toast({ title: "Seleccione una ruta", description: "Debe seleccionar una ruta antes de asignar clientes", variant: "destructive" })
            return
        }
        await assignClient(client.id, selectedRouteId, selectedDay, selectedFrequency, assignments.length + 1)
        setSearchTerm("")
        setSearchResults([])
    }

    const loading = routesLoading || assignLoading

    if (loading && !routes.length) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 lg:p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="h-12 w-64 bg-slate-700 rounded skeleton"></div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="h-96 bg-slate-800 rounded-xl skeleton"></div>
                        <div className="lg:col-span-2 h-96 bg-slate-800 rounded-xl skeleton"></div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-4 lg:space-y-8">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 lg:gap-3">
                            <div className="p-2 lg:p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl lg:rounded-2xl shadow-lg">
                                <MapPin className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl lg:text-4xl font-bold text-slate-200">Asignación de Clientes</h1>
                                <p className="text-sm lg:text-lg text-slate-400 font-medium">Vincule clientes del CRM a las rutas logísticas</p>
                            </div>
                        </div>
                    </div>
                    <Link href="/routes">
                        <Button variant="ghost" className="text-slate-400 hover:text-slate-200 hover:bg-slate-800">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Volver a Rutas
                        </Button>
                    </Link>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Columna Izquierda: Buscador */}
                    <Card className="border-0 shadow-2xl bg-slate-900/80 backdrop-blur-sm border-slate-700 lg:col-span-1">
                        <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
                            <h2 className="font-semibold text-lg text-slate-200">Buscar Cliente CRM</h2>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            {/* Selector de Ruta */}
                            <div>
                                <label className="text-xs text-slate-400 font-medium mb-1 block">Ruta Destino</label>
                                <select
                                    className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-md text-sm p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={selectedRouteId}
                                    onChange={(e) => setSelectedRouteId(e.target.value)}
                                >
                                    <option value="">— Seleccione una ruta —</option>
                                    {routes.filter((r) => r.is_active).map((r) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-slate-400 font-medium mb-1 block">Día de Visita</label>
                                    <select className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-md text-sm p-2 outline-none focus:ring-2 focus:ring-blue-500" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
                                        <option value="lunes">Lunes</option>
                                        <option value="martes">Martes</option>
                                        <option value="miercoles">Miércoles</option>
                                        <option value="jueves">Jueves</option>
                                        <option value="viernes">Viernes</option>
                                        <option value="sabado">Sábado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 font-medium mb-1 block">Frecuencia</label>
                                    <select className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-md text-sm p-2 outline-none focus:ring-2 focus:ring-blue-500" value={selectedFrequency} onChange={(e) => setSelectedFrequency(e.target.value)}>
                                        <option value="semanal">Semanal</option>
                                        <option value="quincenal">Quincenal</option>
                                        <option value="mensual">Mensual</option>
                                    </select>
                                </div>
                            </div>

                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                                <Input
                                    placeholder="Nombre o dirección del cliente..."
                                    className="pl-9 border-slate-700 bg-slate-800 text-slate-200 focus:border-blue-500 focus:ring-blue-500"
                                    variant="modern"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1">
                                {searching && <p className="text-xs text-slate-500 text-center py-2">Buscando...</p>}
                                {!searching && searchTerm.length >= 2 && searchResults.length === 0 && (
                                    <p className="text-sm text-slate-500 text-center py-4">No se encontraron clientes disponibles.</p>
                                )}
                                {searchResults.map((client) => (
                                    <motion.div
                                        key={client.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        onClick={() => handleAssign(client)}
                                        className="p-3 border border-slate-700 rounded-lg hover:border-blue-500 hover:bg-blue-900/20 cursor-pointer transition-colors"
                                    >
                                        <p className="font-medium text-sm text-slate-200">{client.name}</p>
                                        <p className="text-xs text-slate-400 mt-1 truncate">{client.address || "Sin dirección"}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Columna Derecha: Asignados */}
                    <Card className="border-0 shadow-2xl bg-slate-900/80 backdrop-blur-sm border-slate-700 lg:col-span-2 flex flex-col">
                        <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
                            <div className="flex justify-between items-center">
                                <h2 className="font-semibold text-lg text-slate-200">
                                    Clientes Asignados {selectedRouteId && `(${assignments.length})`}
                                </h2>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 flex-1">
                            {!selectedRouteId ? (
                                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-500 space-y-2">
                                    <MapPin className="w-10 h-10 text-slate-600" />
                                    <p className="text-sm">Seleccione una ruta para ver y administrar sus clientes.</p>
                                </div>
                            ) : assignments.length === 0 ? (
                                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-500 space-y-2">
                                    <Users className="w-10 h-10 text-slate-600" />
                                    <p className="text-sm">Esta ruta no tiene clientes asignados. Busque y seleccione clientes a la izquierda.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {assignments.map((assignment, index) => (
                                        <motion.div
                                            key={assignment.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg group hover:border-slate-600 transition-colors"
                                        >
                                            <div className="cursor-grab text-slate-600 hover:text-slate-400 active:cursor-grabbing">
                                                <GripVertical className="w-5 h-5" />
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-blue-900/50 border border-blue-700 text-blue-300 flex items-center justify-center text-xs font-bold">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm text-slate-200 truncate">{assignment.clients?.name || "Cliente"}</p>
                                                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                                    <span className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">{assignment.day_of_week}</span>
                                                    <span className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">{assignment.frequency}</span>
                                                    <span className="truncate ml-1">{assignment.clients?.address || ""}</span>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeAssignment(assignment.id)}
                                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
