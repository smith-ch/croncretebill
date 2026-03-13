'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { useDataUserId } from '@/hooks/use-data-user-id'
import {
    RefreshCcw,
    Package,
    Search,
    AlertTriangle,
    Users,
    ArrowUpCircle,
    ArrowDownCircle,
    Eye,
    FileText,
} from 'lucide-react'

interface ClientReturnableSummary {
    client_id: string
    client_name: string
    tipos_de_envases: number
    total_unidades_prestadas: number
    items_con_balance_negativo: number
    ultimo_movimiento: string | null
}

interface ProductBalance {
    product_id: string
    product_name: string
    total_balance: number
    total_entregas: number
    total_devoluciones: number
    clients_count: number
}

export default function ReturnablesPage() {
    const router = useRouter()
    const { toast } = useToast()
    const { dataUserId, loading: userLoading } = useDataUserId()

    const [loading, setLoading] = useState(true)
    const [clientSummaries, setClientSummaries] = useState<ClientReturnableSummary[]>([])
    const [productBalances, setProductBalances] = useState<ProductBalance[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState<string>('all')
    const [moduleAvailable, setModuleAvailable] = useState(true)

    const fetchData = useCallback(async () => {
        if (!dataUserId) return
        
        setLoading(true)
        try {
            // Fetch client summaries from view
            const { data: summaryData, error: summaryError } = await supabase
                .from('client_returnables_summary')
                .select('*')
                .eq('user_id', dataUserId)
                .order('total_unidades_prestadas', { ascending: false })

            if (summaryError) {
                if (summaryError.code === '42P01') {
                    setModuleAvailable(false)
                    toast({
                        title: "Módulo no configurado",
                        description: "Ejecuta el script SQL del Módulo F para habilitar el control de retornables.",
                        variant: "destructive"
                    })
                    return
                }
                throw summaryError
            }

            setClientSummaries(summaryData || [])

            // Fetch product-level balances
            const { data: balancesData, error: balancesError } = await supabase
                .from('client_returnables_balances')
                .select('product_id, product_name, balance, total_entregas, total_devoluciones')
                .eq('user_id', dataUserId)

            if (!balancesError && balancesData) {
                // Aggregate by product
                const productMap = new Map<string, ProductBalance>()
                balancesData.forEach((item: any) => {
                    const existing = productMap.get(item.product_id)
                    if (existing) {
                        existing.total_balance += item.balance || 0
                        existing.total_entregas += item.total_entregas || 0
                        existing.total_devoluciones += item.total_devoluciones || 0
                        existing.clients_count += 1
                    } else {
                        productMap.set(item.product_id, {
                            product_id: item.product_id,
                            product_name: item.product_name,
                            total_balance: item.balance || 0,
                            total_entregas: item.total_entregas || 0,
                            total_devoluciones: item.total_devoluciones || 0,
                            clients_count: 1
                        })
                    }
                })
                setProductBalances(Array.from(productMap.values()))
            }

        } catch (error: any) {
            console.error('Error fetching data:', error)
            toast({
                title: "Error",
                description: "No se pudieron cargar los datos de retornables.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }, [dataUserId, toast])

    useEffect(() => {
        if (dataUserId) {
            fetchData()
        }
    }, [dataUserId, fetchData])

    const filteredClients = useMemo(() => {
        return clientSummaries.filter(client => {
            const matchesSearch = client.client_name.toLowerCase().includes(searchQuery.toLowerCase())
            
            if (!matchesSearch) return false

            switch (filterStatus) {
                case 'with_balance':
                    return client.total_unidades_prestadas > 0
                case 'negative':
                    return client.items_con_balance_negativo > 0
                case 'zero':
                    return client.total_unidades_prestadas === 0
                default:
                    return true
            }
        })
    }, [clientSummaries, searchQuery, filterStatus])

    const stats = useMemo(() => {
        return {
            totalClients: clientSummaries.length,
            totalUnits: clientSummaries.reduce((sum, c) => sum + c.total_unidades_prestadas, 0),
            clientsWithNegative: clientSummaries.filter(c => c.items_con_balance_negativo > 0).length,
            totalProductTypes: productBalances.length
        }
    }, [clientSummaries, productBalances])

    if (userLoading || loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <RefreshCcw className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        )
    }

    if (!moduleAvailable) {
        return (
            <div className="p-6 space-y-6">
                <Card className="bg-amber-950/30 border-amber-800">
                    <CardContent className="p-6 text-center">
                        <Package className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-amber-300 mb-2">Módulo No Configurado</h2>
                        <p className="text-amber-400/80 mb-4">
                            El módulo de Control de Materiales Retornables no está configurado en la base de datos.
                        </p>
                        <p className="text-sm text-slate-400">
                            Ejecuta el script SQL <code className="bg-slate-800 px-2 py-1 rounded">scripts/module-f-returnables.sql</code> en Supabase para habilitar esta funcionalidad.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <Package className="w-6 h-6 text-blue-500" />
                        Control de Envases Retornables
                    </h1>
                    <p className="text-slate-400">
                        Kardex general de materiales prestados a clientes
                    </p>
                </div>
                <Button onClick={fetchData} variant="outline" className="bg-slate-900 border-slate-700">
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Actualizar
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-900/50 to-slate-900 border-blue-800">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Total en Circulación</p>
                                <p className="text-3xl font-bold text-blue-400">{stats.totalUnits}</p>
                                <p className="text-xs text-slate-500">unidades prestadas</p>
                            </div>
                            <Package className="w-10 h-10 text-blue-500/50" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Clientes con Envases</p>
                                <p className="text-3xl font-bold text-slate-200">{stats.totalClients}</p>
                                <p className="text-xs text-slate-500">clientes</p>
                            </div>
                            <Users className="w-10 h-10 text-slate-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-900/30 to-slate-900 border-purple-800/50">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Tipos de Envases</p>
                                <p className="text-3xl font-bold text-purple-400">{stats.totalProductTypes}</p>
                                <p className="text-xs text-slate-500">productos rastreados</p>
                            </div>
                            <FileText className="w-10 h-10 text-purple-500/50" />
                        </div>
                    </CardContent>
                </Card>

                <Card className={`bg-gradient-to-br ${stats.clientsWithNegative > 0 ? 'from-red-900/30 border-red-800/50' : 'from-green-900/30 border-green-800/50'} to-slate-900`}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Alertas</p>
                                <p className={`text-3xl font-bold ${stats.clientsWithNegative > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {stats.clientsWithNegative}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {stats.clientsWithNegative > 0 ? 'balances negativos' : 'sin alertas'}
                                </p>
                            </div>
                            <AlertTriangle className={`w-10 h-10 ${stats.clientsWithNegative > 0 ? 'text-red-500/50' : 'text-green-500/50'}`} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Product Summary */}
            {productBalances.length > 0 && (
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-slate-100 flex items-center gap-2">
                            <Package className="w-5 h-5 text-blue-500" />
                            Resumen por Producto
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {productBalances.map(product => (
                                <div key={product.product_id} className={`p-3 rounded-lg ${product.total_balance < 0 ? 'bg-red-950/30 border border-red-800' : 'bg-slate-800 border border-slate-700'}`}>
                                    <p className="text-sm font-medium text-slate-200 truncate">{product.product_name}</p>
                                    <p className={`text-2xl font-bold ${product.total_balance < 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                        {product.total_balance}
                                    </p>
                                    <div className="flex gap-3 text-xs text-slate-400 mt-1">
                                        <span className="flex items-center gap-1">
                                            <ArrowUpCircle className="w-3 h-3 text-red-400" />
                                            {product.total_entregas}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <ArrowDownCircle className="w-3 h-3 text-green-400" />
                                            {product.total_devoluciones}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{product.clients_count} cliente(s)</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Buscar cliente..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-slate-900 border-slate-700"
                    />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-[200px] bg-slate-900 border-slate-700">
                        <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="all">Todos los clientes</SelectItem>
                        <SelectItem value="with_balance">Con envases prestados</SelectItem>
                        <SelectItem value="negative">Balance negativo</SelectItem>
                        <SelectItem value="zero">Sin envases</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Client List Table */}
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-slate-100 flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-500" />
                        Clientes con Envases
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        Lista de clientes con materiales retornables en su poder
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredClients.length === 0 ? (
                        <div className="text-center py-12">
                            <Package className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                            <p className="text-slate-400">
                                {clientSummaries.length === 0 
                                    ? 'No hay registros de envases retornables.' 
                                    : 'No hay clientes que coincidan con los filtros.'}
                            </p>
                            {clientSummaries.length === 0 && (
                                <p className="text-sm text-slate-500 mt-2">
                                    Los envases se registrarán automáticamente al vender productos marcados como retornables.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-700 hover:bg-slate-800/50">
                                        <TableHead className="text-slate-300">Cliente</TableHead>
                                        <TableHead className="text-slate-300 text-center">Tipos de Envases</TableHead>
                                        <TableHead className="text-slate-300 text-right">Total Unidades</TableHead>
                                        <TableHead className="text-slate-300 text-center">Estado</TableHead>
                                        <TableHead className="text-slate-300 text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredClients.map(client => (
                                        <TableRow key={client.client_id} className="border-slate-700 hover:bg-slate-800/50">
                                            <TableCell className="font-medium text-slate-200">
                                                {client.client_name}
                                            </TableCell>
                                            <TableCell className="text-center text-slate-300">
                                                {client.tipos_de_envases}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={`font-bold ${client.total_unidades_prestadas < 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                                    {client.total_unidades_prestadas}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {client.items_con_balance_negativo > 0 ? (
                                                    <Badge variant="destructive" className="bg-red-600">
                                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                                        Revisar
                                                    </Badge>
                                                ) : client.total_unidades_prestadas > 0 ? (
                                                    <Badge className="bg-blue-600">
                                                        Activo
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-slate-400">
                                                        Sin saldo
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    onClick={() => router.push(`/clients/${client.client_id}/returnables`)}
                                                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                                                >
                                                    <Eye className="w-4 h-4 mr-1" />
                                                    Ver Kardex
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
