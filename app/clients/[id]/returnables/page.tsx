'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog'
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
import { useUserPermissions } from '@/hooks/use-user-permissions-simple'
import {
    ArrowLeft,
    RefreshCcw,
    Package,
    Plus,
    Minus,
    AlertTriangle,
    History,
    FileText,
    Calendar,
    User,
    ArrowDownCircle,
    ArrowUpCircle,
    Settings,
    Upload,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Client {
    id: string
    name: string
    phone: string | null
    email: string | null
}

interface ReturnableBalance {
    product_id: string
    product_name: string
    product_sku: string | null
    balance: number
    total_entregas: number
    total_devoluciones: number
    saldo_inicial: number
    ajustes_netos: number
    ultimo_movimiento: string | null
}

interface LedgerEntry {
    id: string
    product_id: string
    product_name: string
    transaction_type: string
    quantity: number
    reference_type: string | null
    reference_id: string | null
    notes: string | null
    created_by_name: string | null
    created_at: string
}

interface ReturnableProduct {
    id: string
    name: string
    sku: string | null
}

export default function ClientReturnablesPage() {
    const router = useRouter()
    const params = useParams()
    const clientId = params.id as string
    const { toast } = useToast()
    const { dataUserId, loading: userLoading } = useDataUserId()
    const { canEdit } = useUserPermissions()

    const [loading, setLoading] = useState(true)
    const [client, setClient] = useState<Client | null>(null)
    const [balances, setBalances] = useState<ReturnableBalance[]>([])
    const [ledger, setLedger] = useState<LedgerEntry[]>([])
    const [returnableProducts, setReturnableProducts] = useState<ReturnableProduct[]>([])
    
    // Adjustment form state
    const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
    const [adjustType, setAdjustType] = useState<'devolucion' | 'entrega' | 'ajuste_ganancia' | 'ajuste_perdida' | 'saldo_inicial'>('devolucion')
    const [adjustProductId, setAdjustProductId] = useState<string>('')
    const [adjustQuantity, setAdjustQuantity] = useState<string>('')
    const [adjustNotes, setAdjustNotes] = useState<string>('')
    const [submitting, setSubmitting] = useState(false)

    // Filter state
    const [filterProduct, setFilterProduct] = useState<string>('all')
    const [filterType, setFilterType] = useState<string>('all')

    const fetchData = useCallback(async () => {
        if (!dataUserId || !clientId) {
            return
        }
        
        setLoading(true)
        try {
            // Fetch client info
            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .select('id, name, phone, email')
                .eq('id', clientId)
                .single()

            if (clientError) {
                throw clientError
            }
            setClient(clientData)

            // Fetch returnable products
            const { data: productsData, error: productsError } = await supabase
                .from('products')
                .select('id, name, sku')
                .eq('user_id', dataUserId)
                .eq('is_returnable', true)
                .order('name')

            if (!productsError && productsData) {
                setReturnableProducts(productsData)
            }

            // Fetch balances from view
            const { data: balancesData, error: balancesError } = await supabase
                .from('client_returnables_balances')
                .select('*')
                .eq('client_id', clientId)
                .eq('user_id', dataUserId)

            if (!balancesError && balancesData) {
                setBalances(balancesData as ReturnableBalance[])
            }

            // Fetch ledger entries with product name
            const { data: ledgerData, error: ledgerError } = await supabase
                .from('client_returnables_ledger')
                .select(`
                    id,
                    product_id,
                    transaction_type,
                    quantity,
                    reference_type,
                    reference_id,
                    notes,
                    created_at,
                    created_by,
                    products!inner(name)
                `)
                .eq('client_id', clientId)
                .eq('user_id', dataUserId)
                .order('created_at', { ascending: false })
                .limit(100)

            if (!ledgerError && ledgerData) {
                const entriesWithNames = ledgerData.map((entry: any) => ({
                    ...entry,
                    product_name: entry.products?.name || 'Producto desconocido',
                    created_by_name: null // TODO: fetch profile name if needed
                }))
                setLedger(entriesWithNames)
            }

        } catch (error: any) {
            console.error('Error fetching data:', error)
            if (error.code === '42P01') {
                // Table doesn't exist
                toast({
                    title: "Módulo no configurado",
                    description: "Ejecuta el script SQL del Módulo F para habilitar el control de retornables.",
                    variant: "destructive"
                })
            } else {
                toast({
                    title: "Error",
                    description: "No se pudieron cargar los datos de retornables.",
                    variant: "destructive"
                })
            }
        } finally {
            setLoading(false)
        }
    }, [dataUserId, clientId, toast])

    useEffect(() => {
        if (dataUserId && clientId) {
            fetchData()
        }
    }, [dataUserId, clientId, fetchData])

    const handleAdjustment = async () => {
        // Notes are required only for adjustments, not for devolucion/entrega
        const requiresNotes = ['ajuste_ganancia', 'ajuste_perdida', 'saldo_inicial'].includes(adjustType)
        
        if (!adjustProductId || !adjustQuantity) {
            toast({
                title: "Error",
                description: "Seleccione un producto y cantidad.",
                variant: "destructive"
            })
            return
        }
        
        if (requiresNotes && !adjustNotes.trim()) {
            toast({
                title: "Error",
                description: "La justificación es obligatoria para ajustes.",
                variant: "destructive"
            })
            return
        }

        const quantity = parseInt(adjustQuantity)
        if (isNaN(quantity) || quantity <= 0) {
            toast({
                title: "Error",
                description: "La cantidad debe ser un número entero positivo.",
                variant: "destructive"
            })
            return
        }

        setSubmitting(true)
        try {
            const { error } = await supabase
                .from('client_returnables_ledger')
                .insert({
                    user_id: dataUserId,
                    client_id: clientId,
                    product_id: adjustProductId,
                    transaction_type: adjustType,
                    quantity: quantity,
                    reference_type: 'manual',
                    notes: adjustNotes.trim() || null,
                    created_by: dataUserId
                })

            if (error) {
                throw error
            }

            // Actualizar stock del producto según el tipo de movimiento
            // - devolucion: Cliente devuelve → stock AUMENTA
            // - entrega: Sale sin factura → stock DISMINUYE
            if (adjustType === 'devolucion' || adjustType === 'entrega') {
                const stockChange = adjustType === 'devolucion' ? quantity : -quantity
                
                // Obtener stock actual y datos del producto
                const { data: productData, error: productError } = await supabase
                    .from('products')
                    .select('current_stock, cost_price, name')
                    .eq('id', adjustProductId)
                    .single()

                if (!productError && productData) {
                    const currentStock = productData.current_stock || 0
                    const newStock = Math.max(0, currentStock + stockChange)

                    // Actualizar stock del producto
                    await supabase
                        .from('products')
                        .update({ current_stock: newStock })
                        .eq('id', adjustProductId)

                    // Obtener almacén principal del usuario
                    const { data: warehouse } = await supabase
                        .from('warehouses')
                        .select('id')
                        .eq('user_id', dataUserId)
                        .order('created_at', { ascending: true })
                        .limit(1)
                        .single()

                    // Registrar movimiento en el historial de inventario
                    if (warehouse) {
                        const movementType = adjustType === 'devolucion' ? 'devolucion' : 'salida'
                        const unitCost = productData.cost_price || 0

                        await supabase
                            .from('stock_movements')
                            .insert({
                                user_id: dataUserId,
                                product_id: adjustProductId,
                                warehouse_id: warehouse.id,
                                movement_type: movementType,
                                quantity_before: currentStock,
                                quantity_change: stockChange,
                                quantity_after: newStock,
                                unit_cost: unitCost,
                                total_cost: Math.abs(stockChange) * unitCost,
                                reference_type: 'returnable',
                                notes: adjustType === 'devolucion' 
                                    ? `Devolución de envase retornable: ${productData.name}${adjustNotes ? ' - ' + adjustNotes : ''}`
                                    : `Entrega de envase sin factura: ${productData.name}${adjustNotes ? ' - ' + adjustNotes : ''}`
                            })
                    }
                }
            }

            const typeLabels: Record<string, string> = {
                'devolucion': 'devolución',
                'entrega': 'entrega',
                'saldo_inicial': 'saldo inicial',
                'ajuste_ganancia': 'ajuste positivo',
                'ajuste_perdida': 'ajuste negativo'
            }

            toast({
                title: "Movimiento registrado",
                description: `Se registró la ${typeLabels[adjustType]} de ${quantity} unidades.`
            })

            // Reset form
            setAdjustDialogOpen(false)
            setAdjustProductId('')
            setAdjustQuantity('')
            setAdjustNotes('')
            setAdjustType('devolucion')

            // Refresh data
            fetchData()

        } catch (error: any) {
            console.error('Error creating adjustment:', error)
            toast({
                title: "Error",
                description: error.message || "No se pudo registrar el ajuste.",
                variant: "destructive"
            })
        } finally {
            setSubmitting(false)
        }
    }

    const filteredLedger = useMemo(() => {
        return ledger.filter(entry => {
            const matchesProduct = filterProduct === 'all' || entry.product_id === filterProduct
            const matchesType = filterType === 'all' || entry.transaction_type === filterType
            return matchesProduct && matchesType
        })
    }, [ledger, filterProduct, filterType])

    const getTransactionBadge = (type: string) => {
        switch (type) {
            case 'entrega':
                return <Badge className="bg-red-500 text-white"><ArrowUpCircle className="w-3 h-3 mr-1" />Entrega</Badge>
            case 'devolucion':
                return <Badge className="bg-green-500 text-white"><ArrowDownCircle className="w-3 h-3 mr-1" />Devolución</Badge>
            case 'saldo_inicial':
                return <Badge className="bg-blue-500 text-white"><FileText className="w-3 h-3 mr-1" />Saldo Inicial</Badge>
            case 'ajuste_ganancia':
                return <Badge className="bg-emerald-600 text-white"><Plus className="w-3 h-3 mr-1" />Ajuste (+)</Badge>
            case 'ajuste_perdida':
                return <Badge className="bg-orange-500 text-white"><Minus className="w-3 h-3 mr-1" />Ajuste (-)</Badge>
            default:
                return <Badge variant="outline">{type}</Badge>
        }
    }

    const totalUnidadesPrestadas = useMemo(() => 
        balances.reduce((sum, b) => sum + b.balance, 0), 
        [balances]
    )

    const hasNegativeBalance = useMemo(() => 
        balances.some(b => b.balance < 0),
        [balances]
    )

    if (userLoading || loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <RefreshCcw className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => router.back()}
                        className="bg-slate-900 border-slate-700"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                            <Package className="w-6 h-6 text-blue-500" />
                            Materiales Retornables
                        </h1>
                        <p className="text-slate-400">
                            {client?.name || 'Cliente'} - Kardex de Envases
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button onClick={fetchData} variant="outline" className="bg-slate-900 border-slate-700">
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Actualizar
                    </Button>
                    {canEdit('products') && (
                        <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-gradient-to-r from-green-600 to-emerald-600">
                                    <ArrowDownCircle className="w-4 h-4 mr-2" />
                                    Registrar Movimiento
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
                                <DialogHeader>
                                    <DialogTitle className="text-slate-100">Registrar Movimiento de Envases</DialogTitle>
                                    <DialogDescription className="text-slate-400">
                                        Registrar devolución, entrega o ajuste de materiales retornables.
                                        <span className="text-slate-500 block mt-1">
                                            Esta acción queda registrada en el historial.
                                        </span>
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Tipo de Movimiento</Label>
                                        <Select value={adjustType} onValueChange={(v: any) => setAdjustType(v)}>
                                            <SelectTrigger className="bg-slate-800 border-slate-700">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-800 border-slate-700">
                                                <SelectItem value="devolucion">✅ Devolución (Cliente devuelve)</SelectItem>
                                                <SelectItem value="entrega">📤 Entrega (Sin factura)</SelectItem>
                                                <SelectItem value="saldo_inicial">📦 Saldo Inicial (Migración)</SelectItem>
                                                <SelectItem value="ajuste_ganancia">➕ Ajuste Positivo (Agregar)</SelectItem>
                                                <SelectItem value="ajuste_perdida">➖ Ajuste Negativo (Pérdida/Rotura)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Producto Retornable</Label>
                                        <Select value={adjustProductId} onValueChange={setAdjustProductId}>
                                            <SelectTrigger className="bg-slate-800 border-slate-700">
                                                <SelectValue placeholder="Seleccionar producto..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-800 border-slate-700">
                                                {returnableProducts.map(product => (
                                                    <SelectItem key={product.id} value={product.id}>
                                                        {product.name} {product.sku && `(${product.sku})`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {returnableProducts.length === 0 && (
                                            <p className="text-xs text-amber-400">
                                                No hay productos marcados como retornables. 
                                                Marca productos en Inventario primero.
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Cantidad</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={adjustQuantity}
                                            onChange={(e) => setAdjustQuantity(e.target.value)}
                                            placeholder="Cantidad de unidades"
                                            className="bg-slate-800 border-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">
                                            Notas {['ajuste_ganancia', 'ajuste_perdida', 'saldo_inicial'].includes(adjustType) ? '*' : '(opcional)'}
                                        </Label>
                                        <Textarea
                                            value={adjustNotes}
                                            onChange={(e) => setAdjustNotes(e.target.value)}
                                            placeholder={['devolucion', 'entrega'].includes(adjustType) 
                                                ? "Observaciones opcionales..." 
                                                : "Explique el motivo del ajuste (requerido)..."}
                                            className="bg-slate-800 border-slate-700"
                                            rows={3}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
                                        Cancelar
                                    </Button>
                                    <Button 
                                        onClick={handleAdjustment}
                                        disabled={submitting || !adjustProductId || !adjustQuantity || 
                                            (['ajuste_ganancia', 'ajuste_perdida', 'saldo_inicial'].includes(adjustType) && !adjustNotes.trim())}
                                        className={adjustType === 'devolucion' ? 'bg-green-600 hover:bg-green-700' : ''}
                                    >
                                        {submitting ? <RefreshCcw className="w-4 h-4 animate-spin mr-2" /> : null}
                                        {adjustType === 'devolucion' ? 'Registrar Devolución' : 
                                         adjustType === 'entrega' ? 'Registrar Entrega' : 'Registrar Movimiento'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            {/* Alert for negative balance */}
            {hasNegativeBalance && (
                <Card className="bg-amber-950/50 border-amber-800">
                    <CardContent className="flex items-center gap-3 p-4">
                        <AlertTriangle className="w-6 h-6 text-amber-400" />
                        <div>
                            <p className="text-amber-300 font-medium">Balance Negativo Detectado</p>
                            <p className="text-amber-400/80 text-sm">
                                Este cliente tiene más devoluciones que entregas en algún producto. 
                                Esto puede indicar un error de conteo que necesita revisión.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-900/50 to-slate-900 border-blue-800">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Total en Poder del Cliente</p>
                                <p className={`text-3xl font-bold ${totalUnidadesPrestadas < 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                    {totalUnidadesPrestadas}
                                </p>
                                <p className="text-xs text-slate-500">unidades</p>
                            </div>
                            <Package className="w-10 h-10 text-blue-500/50" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Tipos de Envases</p>
                                <p className="text-3xl font-bold text-slate-200">
                                    {balances.length}
                                </p>
                                <p className="text-xs text-slate-500">productos</p>
                            </div>
                            <History className="w-10 h-10 text-slate-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-900/30 to-slate-900 border-red-800/50">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Total Entregas</p>
                                <p className="text-3xl font-bold text-red-400">
                                    {balances.reduce((sum, b) => sum + (b.total_entregas || 0), 0)}
                                </p>
                                <p className="text-xs text-slate-500">unidades entregadas</p>
                            </div>
                            <ArrowUpCircle className="w-10 h-10 text-red-500/50" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-900/30 to-slate-900 border-green-800/50">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Total Devoluciones</p>
                                <p className="text-3xl font-bold text-green-400">
                                    {balances.reduce((sum, b) => sum + (b.total_devoluciones || 0), 0)}
                                </p>
                                <p className="text-xs text-slate-500">unidades devueltas</p>
                            </div>
                            <ArrowDownCircle className="w-10 h-10 text-green-500/50" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Balance Detail by Product */}
            {balances.length > 0 && (
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-slate-100 flex items-center gap-2">
                            <Package className="w-5 h-5 text-blue-500" />
                            Balance por Producto
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Detalle de materiales retornables en poder del cliente
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {balances.map(item => (
                                <Card 
                                    key={item.product_id} 
                                    className={`${item.balance < 0 ? 'bg-red-950/30 border-red-800' : 'bg-slate-800 border-slate-700'}`}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium text-slate-200">{item.product_name}</p>
                                                {item.product_sku && (
                                                    <p className="text-xs text-slate-500">SKU: {item.product_sku}</p>
                                                )}
                                            </div>
                                            <p className={`text-2xl font-bold ${item.balance < 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                                {item.balance}
                                            </p>
                                        </div>
                                        <div className="mt-3 flex gap-4 text-xs text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <ArrowUpCircle className="w-3 h-3 text-red-400" />
                                                {item.total_entregas || 0} entregadas
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <ArrowDownCircle className="w-3 h-3 text-green-400" />
                                                {item.total_devoluciones || 0} devueltas
                                            </span>
                                        </div>
                                        {item.balance < 0 && (
                                            <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                Balance negativo - Revisar
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Ledger History */}
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="text-slate-100 flex items-center gap-2">
                                <History className="w-5 h-5 text-purple-500" />
                                Historial de Movimientos (Kardex)
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Registro cronológico de todas las transacciones
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Select value={filterProduct} onValueChange={setFilterProduct}>
                                <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700">
                                    <SelectValue placeholder="Producto" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    <SelectItem value="all">Todos los productos</SelectItem>
                                    {returnableProducts.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={filterType} onValueChange={setFilterType}>
                                <SelectTrigger className="w-[150px] bg-slate-800 border-slate-700">
                                    <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="entrega">Entregas</SelectItem>
                                    <SelectItem value="devolucion">Devoluciones</SelectItem>
                                    <SelectItem value="saldo_inicial">Saldo Inicial</SelectItem>
                                    <SelectItem value="ajuste_ganancia">Ajustes (+)</SelectItem>
                                    <SelectItem value="ajuste_perdida">Ajustes (-)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredLedger.length === 0 ? (
                        <div className="text-center py-12">
                            <History className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                            <p className="text-slate-400">
                                {ledger.length === 0 
                                    ? 'No hay movimientos registrados para este cliente.' 
                                    : 'No hay movimientos que coincidan con los filtros.'}
                            </p>
                            {ledger.length === 0 && canEdit('products') && (
                                <p className="text-sm text-slate-500 mt-2">
                                    Use &quot;Ajuste Manual&quot; para registrar el saldo inicial de envases.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-700 hover:bg-slate-800/50">
                                        <TableHead className="text-slate-300">Fecha</TableHead>
                                        <TableHead className="text-slate-300">Tipo</TableHead>
                                        <TableHead className="text-slate-300">Producto</TableHead>
                                        <TableHead className="text-slate-300 text-right">Cantidad</TableHead>
                                        <TableHead className="text-slate-300">Referencia</TableHead>
                                        <TableHead className="text-slate-300">Notas</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLedger.map(entry => (
                                        <TableRow key={entry.id} className="border-slate-700 hover:bg-slate-800/50">
                                            <TableCell className="text-slate-300">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-slate-500" />
                                                    {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getTransactionBadge(entry.transaction_type)}
                                            </TableCell>
                                            <TableCell className="text-slate-200 font-medium">
                                                {entry.product_name}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={`font-bold ${
                                                    entry.transaction_type === 'entrega' || entry.transaction_type === 'saldo_inicial' || entry.transaction_type === 'ajuste_ganancia'
                                                        ? 'text-red-400' 
                                                        : 'text-green-400'
                                                }`}>
                                                    {entry.transaction_type === 'entrega' || entry.transaction_type === 'saldo_inicial' || entry.transaction_type === 'ajuste_ganancia' 
                                                        ? '+' 
                                                        : '-'}
                                                    {entry.quantity}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-slate-400">
                                                {entry.reference_type === 'recibo_termico' && (
                                                    <Badge variant="outline" className="text-xs">
                                                        <FileText className="w-3 h-3 mr-1" />
                                                        Recibo
                                                    </Badge>
                                                )}
                                                {entry.reference_type === 'manual' && (
                                                    <Badge variant="outline" className="text-xs text-amber-400 border-amber-600">
                                                        <User className="w-3 h-3 mr-1" />
                                                        Manual
                                                    </Badge>
                                                )}
                                                {entry.reference_type === 'migracion' && (
                                                    <Badge variant="outline" className="text-xs text-blue-400 border-blue-600">
                                                        <Upload className="w-3 h-3 mr-1" />
                                                        Migración
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-slate-400 text-sm max-w-[200px] truncate">
                                                {entry.notes || '-'}
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
