'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useCurrency } from '@/hooks/use-currency'
import { useDataUserId } from '@/hooks/use-data-user-id'
import {
    Search,
    RefreshCcw,
    DollarSign,
    AlertTriangle,
    Clock,
    CheckCircle2,
    TrendingUp,
    Filter,
    Banknote,
    Plus
} from 'lucide-react'
import { differenceInDays, format } from 'date-fns'

interface Client {
    id: string
    name: string
    phone?: string
    email?: string
}

interface Invoice {
    id: string
    invoice_number: string
    total: number
    client_id?: string
    client_name?: string
}

interface AgingReportItem {
    client_id: string
    client_name: string
    client_phone: string | null
    client_email: string | null
    total_documents: number
    total_invoiced: number
    total_paid: number
    total_balance: number
    current_balance: number
    overdue_1_7: number
    overdue_8_15: number
    overdue_16_30: number
    overdue_over_30: number
    max_days_overdue: number
}

interface SummaryStats {
    totalClients: number
    totalBalance: number
    currentBalance: number
    overdueBalance: number
    criticalBalance: number
}

export default function ReceivablesPage() {
    const router = useRouter()
    const { toast } = useToast()
    const { formatCurrency } = useCurrency()
    const { dataUserId, loading: userLoading } = useDataUserId()

    const [loading, setLoading] = useState(true)
    const [agingReport, setAgingReport] = useState<AgingReportItem[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState<string>('all')
    
    // Estado para modal de agregar crédito
    const [showAddModal, setShowAddModal] = useState(false)
    const [clients, setClients] = useState<Client[]>([])
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [saving, setSaving] = useState(false)
    
    // Form state para nuevo crédito
    const [newAR, setNewAR] = useState({
        client_id: '',
        invoice_id: '',
        manual_amount: '',
        due_days: '15',
        notes: ''
    })

    // Fetch clients and invoices for manual AR creation
    const fetchClientsAndInvoices = useCallback(async () => {
        if (!dataUserId) {
            return
        }
        
        const [clientsRes, invoicesRes] = await Promise.all([
            supabase
                .from('clients')
                .select('id, name, phone, email')
                .eq('user_id', dataUserId)
                .order('name'),
            supabase
                .from('invoices')
                .select('id, invoice_number, total, client_id')
                .eq('user_id', dataUserId)
                .in('payment_method', ['credito', 'credit'])
                .eq('status', 'enviada')
                .order('created_at', { ascending: false })
                .limit(50)
        ])
        
        setClients(clientsRes.data || [])
        
        // Map invoices with client names
        const invoicesWithClientNames = (invoicesRes.data || []).map(inv => {
            const client = (clientsRes.data || []).find(c => c.id === inv.client_id)
            return {
                ...inv,
                client_name: client?.name
            }
        })
        setInvoices(invoicesWithClientNames as Invoice[])
    }, [dataUserId])

    // Crear cuenta por cobrar manualmente
    const handleCreateAR = async () => {
        if (!dataUserId) {
            return
        }
        
        if (!newAR.client_id) {
            toast({
                title: "Error",
                description: "Debe seleccionar un cliente",
                variant: "destructive"
            })
            return
        }
        
        const selectedInvoice = invoices.find(i => i.id === newAR.invoice_id)
        const amount = selectedInvoice ? selectedInvoice.total : parseFloat(newAR.manual_amount)
        
        if (!amount || amount <= 0) {
            toast({
                title: "Error", 
                description: "Debe especificar un monto válido o seleccionar una factura",
                variant: "destructive"
            })
            return
        }
        
        setSaving(true)
        try {
            const dueDate = new Date()
            dueDate.setDate(dueDate.getDate() + parseInt(newAR.due_days))
            
            const documentNumber = selectedInvoice 
                ? selectedInvoice.invoice_number 
                : `CXC-${format(new Date(), 'yyyyMMdd-HHmmss')}`
            
            const { error } = await supabase
                .from('accounts_receivable')
                .insert({
                    user_id: dataUserId,
                    client_id: newAR.client_id,
                    invoice_id: (selectedInvoice && newAR.invoice_id !== 'none') ? selectedInvoice.id : null,
                    document_number: documentNumber,
                    description: newAR.notes || (selectedInvoice ? `Crédito por factura ${selectedInvoice.invoice_number}` : 'Crédito manual'),
                    total_amount: amount,
                    issue_date: new Date().toISOString().split('T')[0],
                    due_date: dueDate.toISOString().split('T')[0],
                    payment_terms: parseInt(newAR.due_days),
                    status: 'pendiente',
                    notes: newAR.notes || null
                })
            
            if (error) {
                throw error
            }
            
            toast({
                title: "✅ Crédito registrado",
                description: `Cuenta por cobrar de ${formatCurrency(amount)} creada exitosamente`
            })
            
            setShowAddModal(false)
            setNewAR({ client_id: '', invoice_id: '', manual_amount: '', due_days: '15', notes: '' })
            fetchAgingReport()
        } catch (error: any) {
            console.error('Error creating AR:', error)
            toast({
                title: "Error",
                description: error.message || "No se pudo crear la cuenta por cobrar",
                variant: "destructive"
            })
        } finally {
            setSaving(false)
        }
    }

    const fetchAgingReport = useCallback(async () => {
        if (!dataUserId) {
            return
        }
        
        setLoading(true)
        try {
            // Intentar usar la vista optimizada, si no existe usar query directa
            const { data, error } = await supabase
                .from('accounts_receivable')
                .select(`
                    client_id,
                    clients!inner(name, phone, email),
                    total_amount,
                    paid_amount,
                    balance,
                    issue_date,
                    due_date,
                    status
                `)
                .eq('user_id', dataUserId)
                .neq('status', 'cancelado')
                .gt('balance', 0)

            if (error) {
                throw error
            }

            // Agrupar y calcular aging manualmente
            const clientMap = new Map<string, AgingReportItem>()
            const today = new Date()

            ;(data || []).forEach((ar: any) => {
                const clientId = ar.client_id
                const client = ar.clients
                const balance = parseFloat(ar.balance) || 0
                const dueDate = new Date(ar.due_date)
                const daysOverdue = differenceInDays(today, dueDate)

                if (!clientMap.has(clientId)) {
                    clientMap.set(clientId, {
                        client_id: clientId,
                        client_name: client?.name || 'Cliente sin nombre',
                        client_phone: client?.phone,
                        client_email: client?.email,
                        total_documents: 0,
                        total_invoiced: 0,
                        total_paid: 0,
                        total_balance: 0,
                        current_balance: 0,
                        overdue_1_7: 0,
                        overdue_8_15: 0,
                        overdue_16_30: 0,
                        overdue_over_30: 0,
                        max_days_overdue: 0
                    })
                }

                const item = clientMap.get(clientId)!
                item.total_documents++
                item.total_invoiced += parseFloat(ar.total_amount) || 0
                item.total_paid += parseFloat(ar.paid_amount) || 0
                item.total_balance += balance

                // Clasificar por antigüedad
                if (daysOverdue <= 0) {
                    item.current_balance += balance
                } else if (daysOverdue <= 7) {
                    item.overdue_1_7 += balance
                } else if (daysOverdue <= 15) {
                    item.overdue_8_15 += balance
                } else if (daysOverdue <= 30) {
                    item.overdue_16_30 += balance
                } else {
                    item.overdue_over_30 += balance
                }

                if (daysOverdue > item.max_days_overdue) {
                    item.max_days_overdue = daysOverdue
                }
            })

            setAgingReport(Array.from(clientMap.values()))
        } catch (error: any) {
            console.error('Error fetching aging report:', error)
            // Si la tabla no existe, mostrar mensaje informativo
            if (error.message?.includes('does not exist')) {
                toast({
                    title: "Módulo no inicializado",
                    description: "Ejecuta el script SQL de Cuentas por Cobrar primero.",
                    variant: "destructive"
                })
            }
        } finally {
            setLoading(false)
        }
    }, [dataUserId, toast])

    useEffect(() => {
        if (dataUserId) {
            fetchAgingReport()
        }
    }, [dataUserId, fetchAgingReport])

    // Cargar clientes y facturas cuando se abre el modal
    useEffect(() => {
        if (showAddModal && dataUserId) {
            fetchClientsAndInvoices()
        }
    }, [showAddModal, dataUserId, fetchClientsAndInvoices])

    // Filtrado
    const filteredReport = useMemo(() => {
        return agingReport.filter(item => {
            const matchesSearch = item.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 item.client_phone?.includes(searchQuery) ||
                                 item.client_email?.toLowerCase().includes(searchQuery.toLowerCase())
            
            if (!matchesSearch) {
                return false
            }

            switch (filterStatus) {
                case 'current':
                    return item.current_balance > 0 && item.max_days_overdue <= 0
                case 'overdue':
                    return item.max_days_overdue > 0
                case 'critical':
                    return item.overdue_over_30 > 0 || item.overdue_16_30 > 0
                default:
                    return true
            }
        }).sort((a, b) => b.max_days_overdue - a.max_days_overdue)
    }, [agingReport, searchQuery, filterStatus])

    // Estadísticas
    const stats: SummaryStats = useMemo(() => {
        return agingReport.reduce((acc, item) => ({
            totalClients: acc.totalClients + 1,
            totalBalance: acc.totalBalance + item.total_balance,
            currentBalance: acc.currentBalance + item.current_balance,
            overdueBalance: acc.overdueBalance + item.overdue_1_7 + item.overdue_8_15 + item.overdue_16_30 + item.overdue_over_30,
            criticalBalance: acc.criticalBalance + item.overdue_16_30 + item.overdue_over_30
        }), {
            totalClients: 0,
            totalBalance: 0,
            currentBalance: 0,
            overdueBalance: 0,
            criticalBalance: 0
        })
    }, [agingReport])

    const getAgingBadge = (item: AgingReportItem) => {
        if (item.overdue_over_30 > 0) {
            return <Badge variant="destructive" className="bg-red-600">+30 días</Badge>
        }
        if (item.overdue_16_30 > 0) {
            return <Badge variant="destructive" className="bg-orange-600">16-30 días</Badge>
        }
        if (item.overdue_8_15 > 0) {
            return <Badge className="bg-amber-500 text-white">8-15 días</Badge>
        }
        if (item.overdue_1_7 > 0) {
            return <Badge className="bg-yellow-500 text-black">1-7 días</Badge>
        }
        return <Badge className="bg-emerald-500 text-white">Al día</Badge>
    }

    if (userLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <RefreshCcw className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                        <DollarSign className="h-6 w-6 text-emerald-500" />
                        Cuentas por Cobrar
                    </h1>
                    <p className="text-slate-400">
                        Gestión de créditos, cobranza y antigüedad de saldos
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Crédito
                    </Button>
                    <Button onClick={fetchAgingReport} variant="outline" className="bg-slate-900 border-slate-700 text-slate-300">
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Actualizar
                    </Button>
                </div>
            </div>

            {/* Modal para agregar crédito manualmente */}
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-slate-100">Registrar Cuenta por Cobrar</DialogTitle>
                        <DialogDescription>
                            Seleccione un cliente y opcionalmente una factura, o ingrese un monto manual.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        {/* Cliente */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Cliente *</Label>
                            <Select value={newAR.client_id} onValueChange={(v) => setNewAR(prev => ({ ...prev, client_id: v }))}>
                                <SelectTrigger className="bg-slate-950 border-slate-700">
                                    <SelectValue placeholder="Seleccionar cliente..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map(client => (
                                        <SelectItem key={client.id} value={client.id}>
                                            {client.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {/* Factura (opcional) */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Factura (opcional)</Label>
                            <Select value={newAR.invoice_id} onValueChange={(v) => setNewAR(prev => ({ ...prev, invoice_id: v, manual_amount: '' }))}>
                                <SelectTrigger className="bg-slate-950 border-slate-700">
                                    <SelectValue placeholder="Seleccionar factura..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sin factura (monto manual)</SelectItem>
                                    {invoices.filter(inv => !newAR.client_id || inv.client_id === newAR.client_id).map(inv => (
                                        <SelectItem key={inv.id} value={inv.id}>
                                            {inv.invoice_number} - {formatCurrency(inv.total)} {inv.client_name ? `(${inv.client_name})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500">Solo muestra facturas a crédito sin cuenta por cobrar</p>
                        </div>
                        
                        {/* Monto manual (si no hay factura seleccionada) */}
                        {(!newAR.invoice_id || newAR.invoice_id === 'none') && (
                            <div className="space-y-2">
                                <Label className="text-slate-300">Monto *</Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={newAR.manual_amount}
                                    onChange={(e) => setNewAR(prev => ({ ...prev, manual_amount: e.target.value }))}
                                    className="bg-slate-950 border-slate-700"
                                />
                            </div>
                        )}
                        
                        {/* Días de vencimiento */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Días para vencimiento</Label>
                            <Select value={newAR.due_days} onValueChange={(v) => setNewAR(prev => ({ ...prev, due_days: v }))}>
                                <SelectTrigger className="bg-slate-950 border-slate-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="7">7 días</SelectItem>
                                    <SelectItem value="15">15 días</SelectItem>
                                    <SelectItem value="30">30 días</SelectItem>
                                    <SelectItem value="45">45 días</SelectItem>
                                    <SelectItem value="60">60 días</SelectItem>
                                    <SelectItem value="90">90 días</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {/* Notas */}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Notas (opcional)</Label>
                            <Input
                                placeholder="Descripción del crédito..."
                                value={newAR.notes}
                                onChange={(e) => setNewAR(prev => ({ ...prev, notes: e.target.value }))}
                                className="bg-slate-950 border-slate-700"
                            />
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddModal(false)} className="border-slate-700">
                            Cancelar
                        </Button>
                        <Button onClick={handleCreateAR} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                            {saving ? <RefreshCcw className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            Registrar crédito
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-400 mb-1">Total por Cobrar</p>
                                <h3 className="text-2xl font-bold text-blue-400">{formatCurrency(stats.totalBalance)}</h3>
                                <p className="text-xs text-slate-500 mt-1">{stats.totalClients} clientes</p>
                            </div>
                            <div className="p-3 bg-blue-500/10 rounded-xl">
                                <TrendingUp className="h-5 w-5 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-400 mb-1">Al Día (Vigente)</p>
                                <h3 className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.currentBalance)}</h3>
                                <p className="text-xs text-slate-500 mt-1">Dentro de plazo</p>
                            </div>
                            <div className="p-3 bg-emerald-500/10 rounded-xl">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-400 mb-1">Vencido</p>
                                <h3 className="text-2xl font-bold text-amber-400">{formatCurrency(stats.overdueBalance)}</h3>
                                <p className="text-xs text-slate-500 mt-1">Fuera de plazo</p>
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
                                <p className="text-sm font-medium text-slate-400 mb-1">Crítico (+15 días)</p>
                                <h3 className="text-2xl font-bold text-red-400">{formatCurrency(stats.criticalBalance)}</h3>
                                <p className="text-xs text-slate-500 mt-1">Requiere acción</p>
                            </div>
                            <div className="p-3 bg-red-500/10 rounded-xl">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Table */}
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="border-b border-slate-800">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div>
                            <CardTitle className="text-lg text-slate-200">Reporte de Antigüedad</CardTitle>
                            <CardDescription>Saldos pendientes agrupados por cliente y categoría de vencimiento</CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <Input
                                    placeholder="Buscar cliente..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 bg-slate-950 border-slate-700 text-slate-200"
                                />
                            </div>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-full sm:w-40 bg-slate-950 border-slate-700">
                                    <Filter className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Filtrar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="current">Al día</SelectItem>
                                    <SelectItem value="overdue">Vencidos</SelectItem>
                                    <SelectItem value="critical">Críticos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12 text-center">
                            <RefreshCcw className="w-8 h-8 animate-spin text-slate-500 mx-auto mb-4" />
                            <p className="text-slate-400">Cargando cuentas por cobrar...</p>
                        </div>
                    ) : filteredReport.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-300 mb-1">Sin cuentas pendientes</h3>
                            <p className="text-slate-500 max-w-sm mx-auto">
                                {searchQuery || filterStatus !== 'all' 
                                    ? 'No hay resultados que coincidan con los filtros aplicados.'
                                    : 'No hay cuentas por cobrar registradas. Las ventas a crédito aparecerán aquí automáticamente.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-400 text-sm">
                                        <th className="text-left p-4 font-medium">Cliente</th>
                                        <th className="text-right p-4 font-medium">
                                            <span className="text-emerald-400">Al Día</span>
                                        </th>
                                        <th className="text-right p-4 font-medium">
                                            <span className="text-yellow-400">1-7d</span>
                                        </th>
                                        <th className="text-right p-4 font-medium">
                                            <span className="text-amber-400">8-15d</span>
                                        </th>
                                        <th className="text-right p-4 font-medium">
                                            <span className="text-orange-400">16-30d</span>
                                        </th>
                                        <th className="text-right p-4 font-medium">
                                            <span className="text-red-400">+30d</span>
                                        </th>
                                        <th className="text-right p-4 font-medium">Total</th>
                                        <th className="text-center p-4 font-medium">Estado</th>
                                        <th className="text-right p-4 font-medium">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {filteredReport.map((item) => (
                                        <tr 
                                            key={item.client_id} 
                                            className={`hover:bg-slate-800/30 transition-colors ${
                                                item.max_days_overdue > 15 ? 'bg-red-950/20' : ''
                                            }`}
                                        >
                                            <td className="p-4">
                                                <div>
                                                    <p className="font-medium text-slate-200">{item.client_name}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {item.total_documents} documento(s) · {item.client_phone || 'Sin teléfono'}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                {item.current_balance > 0 ? (
                                                    <span className="text-emerald-400 font-medium">
                                                        {formatCurrency(item.current_balance)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                {item.overdue_1_7 > 0 ? (
                                                    <span className="text-yellow-400 font-medium">
                                                        {formatCurrency(item.overdue_1_7)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                {item.overdue_8_15 > 0 ? (
                                                    <span className="text-amber-400 font-medium">
                                                        {formatCurrency(item.overdue_8_15)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                {item.overdue_16_30 > 0 ? (
                                                    <span className="text-orange-400 font-medium">
                                                        {formatCurrency(item.overdue_16_30)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                {item.overdue_over_30 > 0 ? (
                                                    <span className="text-red-400 font-medium">
                                                        {formatCurrency(item.overdue_over_30)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="text-slate-100 font-bold">
                                                    {formatCurrency(item.total_balance)}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                {getAgingBadge(item)}
                                            </td>
                                            <td className="p-4 text-right">
                                                <Button
                                                    size="sm"
                                                    onClick={() => router.push(`/receivables/${item.client_id}`)}
                                                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                                                >
                                                    <Banknote className="w-4 h-4 mr-1" />
                                                    Cobrar
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                {/* Footer con totales */}
                                <tfoot>
                                    <tr className="border-t-2 border-slate-700 bg-slate-950/50">
                                        <td className="p-4 font-bold text-slate-200">TOTALES</td>
                                        <td className="p-4 text-right">
                                            <span className="text-emerald-400 font-bold">
                                                {formatCurrency(filteredReport.reduce((sum, i) => sum + i.current_balance, 0))}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="text-yellow-400 font-bold">
                                                {formatCurrency(filteredReport.reduce((sum, i) => sum + i.overdue_1_7, 0))}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="text-amber-400 font-bold">
                                                {formatCurrency(filteredReport.reduce((sum, i) => sum + i.overdue_8_15, 0))}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="text-orange-400 font-bold">
                                                {formatCurrency(filteredReport.reduce((sum, i) => sum + i.overdue_16_30, 0))}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="text-red-400 font-bold">
                                                {formatCurrency(filteredReport.reduce((sum, i) => sum + i.overdue_over_30, 0))}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="text-white font-bold text-lg">
                                                {formatCurrency(filteredReport.reduce((sum, i) => sum + i.total_balance, 0))}
                                            </span>
                                        </td>
                                        <td colSpan={2}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
