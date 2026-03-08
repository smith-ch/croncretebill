"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Plus,
  Search,
  FileText,
  Edit,
  Trash2,
  Download,
  Filter,
  Calendar,
  DollarSign,
  Eye,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { useCurrency } from "@/hooks/use-currency"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import { useDataUserId } from '@/hooks/use-data-user-id'
import { useToast } from "@/hooks/use-toast"
import { InvoicePDFPreview } from "@/components/invoices/invoice-pdf-preview"
import { useSubscriptionLimits } from "@/hooks/use-subscription-limits"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CurrencyConverter, DualCurrencyDisplay } from "@/components/currency-converter"

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, id: string | null, type: 'delete' | 'markPaid'}>({show: false, id: null, type: 'delete'})
  const [isProcessing, setIsProcessing] = useState(false)
  const [showUSD, setShowUSD] = useState(false)
  const { formatCurrency, formatUSD, exchangeRate } = useCurrency()
  const { canDelete, canEdit } = useUserPermissions()
  const { toast } = useToast()
  const { dataUserId, loading: userIdLoading } = useDataUserId()
  const { limits, canAddInvoices, remainingInvoices, refreshUsage } = useSubscriptionLimits()

  useEffect(() => {
    if (!userIdLoading && dataUserId) {
      fetchInvoices()
    }
  }, [dataUserId, userIdLoading])

  const fetchInvoices = async () => {
    try {
      if (!dataUserId) return

      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          clients(name, rnc),
          projects(name)
        `)
        .eq("user_id", dataUserId)
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }
      setInvoices(data || [])
      refreshUsage()
    } catch (error) {
      console.error("Error fetching invoices:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      (invoice.invoice_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.clients?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.clients?.rnc || "").toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter

    let matchesDate = true
    if (dateFilter !== "all") {
      const invoiceDate = new Date(invoice.created_at)
      const now = new Date()

      switch (dateFilter) {
        case "week":
          matchesDate = invoiceDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case "month":
          matchesDate = invoiceDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case "quarter":
          matchesDate = invoiceDate >= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
      }
    }

    return matchesSearch && matchesStatus && matchesDate
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "borrador":
        return "bg-slate-100 text-slate-200 border-slate-800"
      case "pendiente":
        return "bg-slate-800 text-blue-300 border-slate-700"
      case "enviada":
        return "bg-red-500 text-white border-red-600"
      case "pagada":
        return "bg-green-500 text-white border-green-600"
      case "vencida":
        return "bg-red-900/30 text-red-300 border-red-800"
      case "cancelada":
        return "bg-yellow-500 text-white border-yellow-600"
      default:
        return "bg-slate-100 text-slate-200 border-slate-800"
    }
  }

  const handleMarkAsPaid = async (id: string) => {
    setDeleteConfirm({show: true, id, type: 'markPaid'})
  }

  const handleDelete = async (id: string) => {
    if (!canDelete('invoices')) {
      toast({
        title: "Permiso denegado",
        description: "No tienes permisos para eliminar facturas",
        variant: "destructive"
      })
      return
    }
    
    setDeleteConfirm({show: true, id, type: 'delete'})
  }

  const confirmAction = async () => {
    if (!deleteConfirm.id) {
      return
    }

    setIsProcessing(true)
    try {
      if (deleteConfirm.type === 'markPaid') {
        const { error } = await supabase
          .from("invoices")
          .update({ status: "pagada" })
          .eq("id", deleteConfirm.id)

        if (error) {
          throw error
        }
        
        toast({
          title: "Factura actualizada",
          description: "La factura ha sido marcada como pagada"
        })
      } else {
        const { error } = await supabase.from("invoices").delete().eq("id", deleteConfirm.id)
        if (error) {
          throw error
        }
        
        toast({
          title: "Factura eliminada",
          description: "La factura ha sido eliminada exitosamente"
        })
      }
      
      fetchInvoices()
    } catch (error) {
      console.error("Error processing invoice:", error)
      toast({
        title: "Error",
        description: deleteConfirm.type === 'markPaid' ? "No se pudo marcar la factura como pagada" : "No se pudo eliminar la factura",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
      setDeleteConfirm({show: false, id: null, type: 'delete'})
    }
  }

  const downloadInvoicePDF = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error generating PDF")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `factura-${invoiceId}.html`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading PDF:", error)
      toast({
        title: "Error",
        description: "Error al descargar el PDF: " + (error instanceof Error ? error.message : "Error desconocido"),
        variant: "destructive",
      })
    }
  }

  const totalInvoices = filteredInvoices.length
  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
  const paidInvoices = filteredInvoices.filter((inv) => inv.status === "pagada").length
  const pendingInvoices = filteredInvoices.filter((inv) => inv.status === "enviada").length

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 lg:p-6 overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-6 overflow-x-hidden">
          {/* Header skeleton */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="h-10 w-48 bg-gray-200 rounded-lg skeleton"></div>
            <div className="h-10 w-full sm:w-40 bg-gray-200 rounded-lg skeleton"></div>
          </div>
          
          {/* Stats cards skeleton */}
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-0 shadow-lg skeleton">
                <CardContent className="p-4">
                  <div className="h-4 w-24 bg-gray-200 rounded mb-3"></div>
                  <div className="h-8 w-32 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters skeleton */}
          <Card className="border-0 shadow-lg skeleton">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="h-10 flex-1 bg-gray-200 rounded"></div>
                <div className="h-10 w-full lg:w-48 bg-gray-200 rounded"></div>
                <div className="h-10 w-full lg:w-48 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice cards skeleton */}
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="skeleton animate-slide-up" style={{animationDelay: `${i * 0.1}s`}}>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="h-6 w-32 bg-gray-200 rounded"></div>
                      <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                    </div>
                    <div className="h-4 w-48 bg-gray-200 rounded"></div>
                    <div className="h-4 w-full bg-gray-200 rounded"></div>
                    <div className="flex gap-2 flex-wrap">
                      <div className="h-9 w-24 bg-gray-200 rounded"></div>
                      <div className="h-9 w-24 bg-gray-200 rounded"></div>
                      <div className="h-9 w-24 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 lg:p-6 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8 overflow-x-hidden">
        <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0 gap-4 lg:gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl lg:text-4xl font-bold text-slate-200">
              Gestión de Facturas
            </h1>
            <p className="text-sm lg:text-base text-slate-400">Administra y controla todas tus facturas</p>
          </div>
          {canAddInvoices() ? (
            <Button
              asChild
              className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Link href="/invoices/new">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Factura
              </Link>
            </Button>
          ) : (
            <Button
              onClick={() => {
                toast({
                  title: "Límite alcanzado",
                  description: `Has alcanzado el límite de ${limits.maxInvoices} facturas/mes de tu ${limits.planDisplayName}. Actualiza tu plan para continuar.`,
                  variant: "destructive",
                })
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Límite Alcanzado
            </Button>
          )}
        </div>

        {!limits.isLoading && remainingInvoices <= 2 && (
          <Alert className={remainingInvoices === 0 ? "border-red-500 bg-red-900/30" : "border-amber-500 bg-amber-900/30"}>
            <AlertCircle className={remainingInvoices === 0 ? "h-4 w-4 text-red-600" : "h-4 w-4 text-amber-600"} />
            <AlertDescription className={remainingInvoices === 0 ? "text-red-300" : "text-amber-300"}>
              {remainingInvoices === 0 ? (
                <span>
                  <strong>Límite alcanzado:</strong> Has usado todas las {limits.maxInvoices} facturas de tu {limits.planDisplayName} este mes. 
                  <Link href="/subscriptions/my-subscription" className="underline font-semibold ml-1">Actualiza tu plan</Link>
                </span>
              ) : (
                <span>
                  <strong>Atención:</strong> Te quedan solo {remainingInvoices} factura(s) de {limits.maxInvoices} en tu {limits.planDisplayName}. 
                  <Link href="/subscriptions/my-subscription" className="underline font-semibold ml-1">Ver planes</Link>
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 card-hover animate-scale-in">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-1">Total Facturas</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-300">{totalInvoices}</p>
                </div>
                <div className="hidden sm:block p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex-shrink-0 ml-2 shadow-md">
                  <FileText className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 card-hover animate-scale-in" style={{animationDelay: '0.1s'}}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-emerald-400 uppercase tracking-wide mb-1">Monto Total</p>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-300 truncate">{formatCurrency(totalAmount)}</p>
                </div>
                <div className="hidden sm:block p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex-shrink-0 ml-2 shadow-md">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 card-hover animate-scale-in" style={{animationDelay: '0.2s'}}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-green-400 uppercase tracking-wide mb-1">Pagadas</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-300">{paidInvoices}</p>
                </div>
                <div className="hidden sm:block p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex-shrink-0 ml-2 shadow-md">
                  <Eye className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 card-hover animate-scale-in" style={{animationDelay: '0.3s'}}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-amber-400 uppercase tracking-wide mb-1">Pendientes</p>
                  <p className="text-xl sm:text-2xl font-bold text-amber-300">{pendingInvoices}</p>
                </div>
                <div className="hidden sm:block p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex-shrink-0 ml-2 shadow-md">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-lg bg-slate-900 border-slate-700 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros y Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent className="w-full">
            <div className="flex flex-col lg:flex-row gap-4 w-full">
              <div className="relative flex-1 max-w-full lg:max-w-md min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por número, cliente o RNC..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-slate-800 focus:border-blue-500 focus:ring-blue-500 w-full"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-48 border-slate-800 min-w-0">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="borrador">Borrador</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="enviada">Enviada</SelectItem>
                  <SelectItem value="pagada">Pagada</SelectItem>
                  <SelectItem value="vencida">Vencida</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full lg:w-48 border-slate-800">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las fechas</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mes</SelectItem>
                  <SelectItem value="quarter">Último trimestre</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-shrink-0">
                <CurrencyConverter 
                  onToggle={setShowUSD} 
                  exchangeRate={exchangeRate}
                  currentCurrency="DOP"
                  variant="compact"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-slate-900 border-slate-700 overflow-hidden">
          <CardContent className="p-6 w-full overflow-x-hidden">
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-slate-800 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <FileText className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-200 mb-2">
                  {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                    ? "No se encontraron facturas"
                    : "No hay facturas"}
                </h3>
                <p className="text-slate-400 mb-4">
                  {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                    ? "Intenta ajustar los filtros de búsqueda"
                    : "Comienza creando tu primera factura"}
                </p>
                <Button
                  asChild
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <Link href="/invoices/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Factura
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3 w-full overflow-x-hidden">
                {filteredInvoices.map((invoice, index) => (
                  <div
                    key={invoice.id}
                    className="group flex flex-col lg:flex-row lg:items-center lg:justify-between p-3 sm:p-4 lg:p-6 border border-slate-800 rounded-xl hover:bg-slate-800/50 hover:border-slate-600 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 card-hover gap-3 lg:gap-0 animate-slide-up w-full"
                    style={{animationDelay: `${index * 0.05}s`}}
                  >
                    <div className="flex-1 min-w-0 overflow-x-hidden">
                      <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-100 group-hover:text-blue-400 transition-colors truncate">
                          {invoice.invoice_number || "Sin número"}
                        </h3>
                        <Badge className={`${getStatusColor(invoice.status || "borrador")} border text-xs whitespace-nowrap`}>
                          {invoice.status || "borrador"}
                        </Badge>
                        {invoice.clients?.rnc && (
                          <Badge variant="outline" className="text-xs whitespace-nowrap hidden sm:inline-flex">
                            RNC: {invoice.clients.rnc}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm text-slate-400 w-full">
                        <div className="min-w-0 overflow-hidden">
                          <span className="font-medium text-slate-300 block text-xs">Cliente:</span>
                          <p className="truncate">{invoice.clients?.name || "Sin cliente"}</p>
                        </div>
                        <div className="min-w-0 overflow-hidden">
                          <span className="font-medium text-slate-300 block text-xs">Fecha:</span>
                          <p className="truncate">{new Date(invoice.invoice_date || invoice.issue_date).toLocaleDateString()}</p>
                        </div>
                        <div className="min-w-0 overflow-hidden">
                          <span className="font-medium text-slate-300 block text-xs">Vencimiento:</span>
                          <p className="truncate">{new Date(invoice.due_date).toLocaleDateString()}</p>
                        </div>
                        {invoice.projects?.name && (
                          <div className="min-w-0">
                            <span className="font-medium text-slate-300 block text-xs">Proyecto:</span>
                            <p className="truncate">{invoice.projects.name}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between lg:justify-end gap-2 sm:gap-3 lg:gap-6 flex-shrink-0 w-full sm:w-auto">
                      <div className="text-left lg:text-right w-full sm:w-auto">
                        {showUSD ? (
                          <div>
                            <p className="text-xl sm:text-2xl font-bold text-green-600">
                              {formatUSD((invoice.total || 0) / exchangeRate)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatCurrency(invoice.total || 0)} DOP
                            </p>
                          </div>
                        ) : (
                          <DualCurrencyDisplay 
                            amount={invoice.total || 0}
                            exchangeRate={exchangeRate}
                            showBoth={true}
                            size="lg"
                          />
                        )}
                        {invoice.include_itbis && <p className="text-xs text-slate-500 mt-1">Incluye ITBIS</p>}
                      </div>

                      <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-end">
                        {canEdit('invoices') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="hover:bg-slate-800 hover:text-blue-400 transition-all duration-200 hover:scale-110 active:scale-95 tap-target h-8 w-8 sm:h-9 sm:w-9 p-0"
                            title="Editar factura"
                          >
                            <Link href={`/invoices/${invoice.id}/edit`}>
                              <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Link>
                          </Button>
                        )}
                        <InvoicePDFPreview 
                          invoiceId={invoice.id}
                          invoiceNumber={invoice.invoice_number}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadInvoicePDF(invoice.id)}
                          className="hover:bg-emerald-900/30 hover:text-emerald-400 transition-all duration-200 hover:scale-110 active:scale-95 tap-target h-8 w-8 sm:h-9 sm:w-9 p-0"
                          title="Descargar PDF"
                        >
                          <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                        {invoice.status !== "pagada" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsPaid(invoice.id)}
                            className="hover:bg-green-900/30 hover:text-green-400 transition-all duration-200 hover:scale-110 active:scale-95 tap-target h-8 w-8 sm:h-9 sm:w-9 p-0"
                            title="Marcar como pagada"
                          >
                            <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        )}
                        {canDelete('invoices') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-red-900/30 hover:text-red-400 transition-all duration-200 hover:scale-110 active:scale-95 tap-target h-8 w-8 sm:h-9 sm:w-9 p-0"
                            onClick={() => handleDelete(invoice.id)}
                            title="Eliminar factura"
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteConfirm.show}
        onOpenChange={(isOpen) => setDeleteConfirm({show: isOpen, id: null, type: 'delete'})}
        title={deleteConfirm.type === 'markPaid' ? "Marcar como Pagada" : "Eliminar Factura"}
        description={
          deleteConfirm.type === 'markPaid'
            ? "¿Confirmar que esta factura ha sido pagada?"
            : "¿Estás seguro de que quieres eliminar esta factura? Esta acción no se puede deshacer."
        }
        confirmLabel={deleteConfirm.type === 'markPaid' ? "Confirmar" : "Eliminar"}
        cancelLabel="Cancelar"
        onConfirm={confirmAction}
        variant={deleteConfirm.type === 'markPaid' ? "success" : "danger"}
        isLoading={isProcessing}
      />
    </div>
  )
}
