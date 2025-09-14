"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  CheckCircle,
  FileText,
  Download,
  Eye,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Printer,
  DollarSign,
  Calendar,
  User,
  CreditCard,
  Building,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Receipt
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useCurrency } from "@/hooks/use-currency"
import { useNotificationHelpers } from "@/hooks/use-notifications"
import { generatePaymentReceiptPDF } from "@/lib/payment-receipt-utils"

interface PaymentReceipt {
  id: string
  invoice_id: string
  receipt_number: string
  payment_date: string
  payment_method: string
  amount_paid: number
  change_amount: number
  bank_reference: string | null
  notes: string | null
  receipt_type: string
  issued_by: string | null
  client_signature: boolean
  pdf_url: string | null
  emailed_at: string | null
  status: string
  created_at: string
  user_id?: string
  invoice?: {
    id: string
    invoice_number: string
    total: number
    status: string
    clients: {
      id: string
      name: string
      email?: string | null
      rnc?: string | null
      phone?: string | null
      address?: string | null
    } | null
    client?: {
      id: string
      name: string
      email: string | null
      rnc: string | null
      phone?: string | null
      address?: string | null
    } | null
  }
}

interface Invoice {
  id: string
  invoice_number: string
  total: number
  status: string
  created_at: string
  clients: {
    id: string
    name: string
    email?: string | null
    rnc?: string | null
    phone?: string | null
    address?: string | null
  } | null
  client?: {
    id: string
    name: string
    email: string | null
    rnc: string | null
    phone?: string | null
    address?: string | null
  } | null
}

interface PaymentStats {
  totalPaid: number
  totalReceipts: number
  todayReceipts: number
  methodStats: {
    cash: number
    card: number
    transfer: number
    check: number
  }
}

export default function PaymentReceiptsPage() {
  const [paymentReceipts, setPaymentReceipts] = useState<PaymentReceipt[]>([])
  const [paidInvoices, setPaidInvoices] = useState<Invoice[]>([])
  const [companySettings, setCompanySettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null)
  const [stats, setStats] = useState<PaymentStats>({
    totalPaid: 0,
    totalReceipts: 0,
    todayReceipts: 0,
    methodStats: { cash: 0, card: 0, transfer: 0, check: 0 }
  })
  
  // Manual receipt form
  const [manualReceiptData, setManualReceiptData] = useState({
    invoice_id: "",
    payment_method: "cash",
    amount_paid: 0,
    change_amount: 0,
    bank_reference: "",
    notes: "",
    issued_by: ""
  })

  const { formatCurrency } = useCurrency()
  const { notifySuccess, notifyError } = useNotificationHelpers()

  useEffect(() => {
    fetchData()

    // Listener para mensajes de la vista previa
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === 'generatePDF' && event.data.receiptId) {
        const receipt = paymentReceipts.find(r => r.id === event.data.receiptId)
        if (receipt) {
          await handleDownloadReceipt(receipt)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [paymentReceipts])

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch company settings
      const { data: companyData, error: companyError } = await supabase
        .from("company_settings")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (companyError) {
        console.warn("Company settings error:", companyError)
      } else {
        setCompanySettings(companyData)
      }

      // Fetch payment receipts con información completa de factura y cliente
      const { data: receiptsData, error: receiptsError } = await supabase
        .from("payment_receipts")
        .select(`
          *,
          invoices (
            id,
            invoice_number,
            total,
            clients (
              id,
              name,
              email,
              rnc,
              phone,
              address
            )
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (receiptsError) {
        console.warn("Payment receipts table may not exist yet:", receiptsError)
        setPaymentReceipts([])
      } else {
        // Transformar los datos para que tengan la estructura esperada
        const transformedReceipts = (receiptsData || []).map((receipt: any) => ({
          ...receipt,
          invoice: receipt.invoices ? {
            id: receipt.invoices.id,
            invoice_number: receipt.invoices.invoice_number,
            total: receipt.invoices.total,
            client_name: receipt.invoices.clients?.name || 'Cliente no encontrado',
            clients: receipt.invoices.clients,
            client: receipt.invoices.clients
          } : null
        }))
        setPaymentReceipts(transformedReceipts)

        // Calculate stats con los datos transformados
        const totalPaid = transformedReceipts.reduce((sum: number, receipt: any) => sum + receipt.amount_paid, 0)
        const totalReceipts = transformedReceipts.length
        const today = new Date().toDateString()
        const todayReceipts = transformedReceipts.filter((receipt: any) => 
          new Date(receipt.created_at).toDateString() === today
        ).length

        const methodStats = transformedReceipts.reduce((acc: any, receipt: any) => {
          acc[receipt.payment_method as keyof typeof acc] = (acc[receipt.payment_method as keyof typeof acc] || 0) + 1
          return acc
        }, { cash: 0, card: 0, transfer: 0, check: 0 })

        setStats({ totalPaid, totalReceipts, todayReceipts, methodStats })
      }

      // Fetch paid invoices - consulta con JOIN para obtener información completa del cliente
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          total,
          status,
          created_at,
          clients (
            id,
            name,
            email,
            rnc,
            phone,
            address
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "pagada")
        .order("created_at", { ascending: false })

      if (invoicesError) {
        console.error("Error fetching invoices:", invoicesError)
        setPaidInvoices([])
      } else {
        // Transformar los datos porque Supabase devuelve clients como array
        const transformedInvoices = (invoicesData || []).map((invoice: any) => ({
          ...invoice,
          clients: Array.isArray(invoice.clients) ? invoice.clients[0] || null : invoice.clients
        }))
        setPaidInvoices(transformedInvoices)
      }

    } catch (error) {
      console.error("Error fetching data:", error)
      notifyError("Error al cargar los datos")
    } finally {
      setLoading(false)
    }
  }

  // Helper function to format receipt number display
  const formatReceiptNumber = (receiptNumber: string): string => {
    // Extract clean number from database format
    // Format: CP-YYYYMMDD-NNNN -> CPG-YYYY-NNNN
    if (!receiptNumber || receiptNumber === 'cons') return receiptNumber
    
    // Handle both old and new formats
    if (receiptNumber.includes('CP-')) {
      // Extract the sequential number from end
      const parts = receiptNumber.split('-')
      if (parts.length >= 3) {
        const year = new Date().getFullYear()
        const sequentialPart = parts[parts.length - 1]
        // Get last 4 digits as sequence number
        const seqNumber = sequentialPart.slice(-4).padStart(4, '0')
        return `CPG-${year}-${seqNumber}`
      }
    }
    
    return receiptNumber
  }

  const handleGenerateManualReceipt = async () => {
    try {
      setGenerating(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (!selectedInvoice) {
        notifyError("Debe seleccionar una factura")
        return
      }

      // Check if receipt already exists
      const existingReceipt = paymentReceipts.find(r => r.invoice_id === selectedInvoice.id)
      if (existingReceipt) {
        notifyError("Esta factura ya tiene un comprobante de pago")
        return
      }

      // Determine receipt type based on client RNC
      const receiptType = selectedInvoice.clients?.rnc ? "formal" : "simple"

      const { data: receiptData, error } = await supabase
        .from("payment_receipts")
        .insert({
          user_id: user.id,
          invoice_id: selectedInvoice.id,
          payment_method: manualReceiptData.payment_method,
          amount_paid: manualReceiptData.amount_paid || selectedInvoice.total,
          change_amount: manualReceiptData.change_amount,
          bank_reference: manualReceiptData.bank_reference || null,
          notes: manualReceiptData.notes || null,
          issued_by: manualReceiptData.issued_by || "Sistema",
          receipt_type: receiptType
        })
        .select()
        .single()

      if (error) throw error

      // Reset form
      setManualReceiptData({
        invoice_id: "",
        payment_method: "cash",
        amount_paid: 0,
        change_amount: 0,
        bank_reference: "",
        notes: "",
        issued_by: ""
      })
      setSelectedInvoice(null)

      notifySuccess("Comprobante de pago generado exitosamente")
      await fetchData()

      // Generate PDF
      const fullReceipt = { 
        ...receiptData, 
        invoice: selectedInvoice ? {
          id: selectedInvoice.id,
          invoice_number: selectedInvoice.invoice_number,
          total_amount: selectedInvoice.total,
          client_name: selectedInvoice.clients?.name || 'Cliente no encontrado',
          client: selectedInvoice.clients ? {
            id: selectedInvoice.clients.id,
            name: selectedInvoice.clients.name,
            email: selectedInvoice.clients.email ?? null,
            rnc: selectedInvoice.clients.rnc ?? null,
            phone: selectedInvoice.clients.phone ?? null,
            address: selectedInvoice.clients.address ?? null
          } : null
        } : {
          id: '',
          invoice_number: '',
          total_amount: 0,
          client_name: 'Cliente no encontrado',
          client: null
        }
      }
      
      // Preparar datos de la empresa (siempre enviar datos, aunque sean por defecto)
      const companyData = {
        name: companySettings?.company_name || 'TU EMPRESA',
        phone: companySettings?.company_phone || '',
        rnc: companySettings?.tax_id || '',
        address: companySettings?.company_address || '',
        email: companySettings?.company_email || '',
        website: companySettings?.company_website || '',
        logo_url: companySettings?.company_logo || ''
      }
      
      await generatePaymentReceiptPDF(fullReceipt, companyData)

    } catch (error) {
      console.error("Error generating receipt:", error)
      notifyError("Error al generar el comprobante")
    } finally {
      setGenerating(false)
    }
  }

  const handleDownloadReceipt = async (receipt: PaymentReceipt) => {
    try {
      // Verificar que tenemos la información de la factura
      if (!receipt.invoice) {
        notifyError("No se puede generar el PDF: falta información de la factura")
        return
      }
      
      if (!receipt.invoice) {
        notifyError("No se puede generar el PDF: falta información de la factura")
        return
      }

      await generatePaymentReceiptPDF({
        ...receipt,
        bank_reference: receipt.bank_reference ?? undefined,
        notes: receipt.notes ?? undefined,
        issued_by: receipt.issued_by || "Sistema",
        invoice: {
          id: receipt.invoice.id,
          invoice_number: receipt.invoice.invoice_number,
          total_amount: receipt.invoice.total,
          client_name: receipt.invoice.clients?.name || 'Cliente no encontrado',
          client: receipt.invoice.clients ? {
            id: receipt.invoice.clients.id,
            name: receipt.invoice.clients.name,
            email: receipt.invoice.clients.email ?? null,
            rnc: receipt.invoice.clients.rnc ?? null,
            phone: receipt.invoice.clients.phone ?? null,
            address: receipt.invoice.clients.address ?? null
          } : null
        }
      }, {
        name: companySettings?.company_name || 'TU EMPRESA',
        phone: companySettings?.company_phone || '',
        rnc: companySettings?.tax_id || '',
        address: companySettings?.company_address || '',
        email: companySettings?.company_email || '',
        website: companySettings?.company_website || '',
        logo_url: companySettings?.company_logo || ''
      })
      notifySuccess("Comprobante descargado")
    } catch (error) {
      console.error("Error downloading receipt:", error)
      notifyError("Error al descargar el comprobante")
    }
  }

  const handleEmailReceipt = async (receipt: PaymentReceipt) => {
    try {
      if (!receipt.invoice?.client?.email) {
        notifyError("El cliente no tiene email registrado")
        return
      }

      // Simulate email sending (implement with your email service)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Update receipt as emailed
      await supabase
        .from("payment_receipts")
        .update({ emailed_at: new Date().toISOString() })
        .eq("id", receipt.id)

      notifySuccess("Comprobante enviado por email")
      await fetchData()
    } catch (error) {
      console.error("Error sending email:", error)
      notifyError("Error al enviar el email")
    }
  }

  const handleDeleteReceipt = async (receipt: PaymentReceipt) => {
    try {
      if (!confirm("¿Estás seguro de que deseas eliminar este comprobante de pago? Esta acción no se puede deshacer.")) {
        return
      }

      const { error } = await supabase
        .from("payment_receipts")
        .delete()
        .eq("id", receipt.id)

      if (error) {
        throw error
      }

      notifySuccess("Comprobante eliminado correctamente")
      await fetchData()
    } catch (error) {
      console.error("Error deleting receipt:", error)
      notifyError("Error al eliminar el comprobante")
    }
  }

  const handlePreviewReceipt = async (receipt: PaymentReceipt) => {
    try {
      // Verificar que tenemos la información de la factura
      if (!receipt.invoice) {
        notifyError("No se puede generar la vista previa: falta información de la factura")
        return
      }

      // Preparar datos de la empresa
      const companyData = companySettings ? {
        name: companySettings.company_name || 'TU EMPRESA',
        phone: companySettings.phone || '',
        rnc: companySettings.rnc || '',
        address: companySettings.address || '',
        email: companySettings.email || '',
        website: companySettings.website || ''
      } : undefined

      // Abrir en nueva ventana/pestaña para vista previa
      const receiptWindow = window.open('', '_blank')
      if (receiptWindow) {
        receiptWindow.document.write(`
          <html>
            <head>
              <title>Vista Previa - Comprobante ${formatReceiptNumber(receipt.receipt_number)}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .preview-container { max-width: 800px; margin: 0 auto; }
                .preview-header { text-align: center; margin-bottom: 20px; }
                .preview-content { border: 1px solid #ddd; padding: 20px; }
                .button-container { text-align: center; margin: 20px 0; }
                button { 
                  background: #2563eb; 
                  color: white; 
                  border: none; 
                  padding: 10px 20px; 
                  border-radius: 5px; 
                  cursor: pointer; 
                  margin: 0 10px;
                }
                button:hover { background: #1d4ed8; }
              </style>
            </head>
            <body>
              <div class="preview-container">
                <div class="preview-header">
                  <h2>Vista Previa del Comprobante</h2>
                  <p>Comprobante N°: ${formatReceiptNumber(receipt.receipt_number)}</p>
                </div>
                <div class="button-container">
                  <button onclick="generatePDF()">Descargar PDF</button>
                  <button onclick="window.close()">Cerrar Vista Previa</button>
                </div>
                <div class="preview-content">
                  <iframe id="pdfFrame" width="100%" height="800px" style="border: none;"></iframe>
                </div>
              </div>
              <script>
                function generatePDF() {
                  window.opener.postMessage({
                    type: 'generatePDF',
                    receiptId: '${receipt.id}'
                  }, '*');
                }
              </script>
            </body>
          </html>
        `)
        receiptWindow.document.close()
      }

      notifySuccess("Vista previa abierta en nueva ventana")
    } catch (error) {
      console.error("Error opening preview:", error)
      notifyError("Error al abrir la vista previa")
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "cash":
        return <DollarSign className="h-4 w-4 text-green-600" />
      case "card":
        return <CreditCard className="h-4 w-4 text-blue-600" />
      case "transfer":
        return <Building className="h-4 w-4 text-purple-600" />
      case "check":
        return <FileText className="h-4 w-4 text-orange-600" />
      default:
        return <DollarSign className="h-4 w-4 text-slate-600" />
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "cash": return "Efectivo"
      case "card": return "Tarjeta"
      case "transfer": return "Transferencia"
      case "check": return "Cheque"
      default: return method
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <CheckCircle className="h-12 w-12 text-emerald-600 animate-pulse" />
          <p className="text-lg font-medium text-slate-900">Cargando comprobantes de pago...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container-responsive py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="heading-responsive font-bold text-slate-900 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
            Comprobantes de Pago
          </h1>
          <p className="text-responsive text-slate-600 mt-1">
            Gestión automática de comprobantes cuando las facturas son pagadas
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-600 font-medium text-sm">Total Recaudado</p>
                <p className="text-2xl font-bold text-emerald-900">{formatCurrency(stats.totalPaid)}</p>
              </div>
              <div className="p-3 bg-emerald-200 rounded-full">
                <TrendingUp className="h-6 w-6 text-emerald-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 font-medium text-sm">Comprobantes Emitidos</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalReceipts}</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <Receipt className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 font-medium text-sm">Comprobantes Hoy</p>
                <p className="text-2xl font-bold text-purple-900">{stats.todayReceipts}</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <Calendar className="h-6 w-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 font-medium text-sm">Método Más Usado</p>
                <p className="text-lg font-bold text-orange-900">
                  {Object.entries(stats.methodStats).reduce((a, b) => a[1] > b[1] ? a : b)[0] === 'cash' ? 'Efectivo' : 
                   Object.entries(stats.methodStats).reduce((a, b) => a[1] > b[1] ? a : b)[0] === 'card' ? 'Tarjeta' :
                   Object.entries(stats.methodStats).reduce((a, b) => a[1] > b[1] ? a : b)[0] === 'transfer' ? 'Transferencia' : 'Cheque'}
                </p>
              </div>
              <div className="p-3 bg-orange-200 rounded-full">
                {getPaymentMethodIcon(Object.entries(stats.methodStats).reduce((a, b) => a[1] > b[1] ? a : b)[0])}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="receipts-list" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-100">
          <TabsTrigger 
            value="receipts-list"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
          >
            <Receipt className="h-4 w-4 mr-2" />
            Comprobantes Emitidos
          </TabsTrigger>
          <TabsTrigger 
            value="manual-receipt"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
          >
            <FileText className="h-4 w-4 mr-2" />
            Generar Manual
          </TabsTrigger>
        </TabsList>

        {/* Lista de Comprobantes */}
        <TabsContent value="receipts-list" className="space-y-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-slate-800">Comprobantes de Pago Emitidos</CardTitle>
                  <CardDescription>
                    Historial de todos los comprobantes generados automáticamente
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {paymentReceipts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    No hay comprobantes emitidos
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Los comprobantes se generan automáticamente cuando las facturas son marcadas como pagadas
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentReceipts.map((receipt) => (
                    <div
                      key={receipt.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          {getPaymentMethodIcon(receipt.payment_method)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">
                            {formatReceiptNumber(receipt.receipt_number)}
                          </div>
                          <div className="text-sm text-slate-600">
                            Factura: {receipt.invoice?.invoice_number || 'N/A'} • {receipt.invoice?.clients?.name || 'Cliente no encontrado'}
                          </div>
                          <div className="text-sm text-slate-600">
                            {getPaymentMethodLabel(receipt.payment_method)} • {formatCurrency(receipt.amount_paid)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {new Date(receipt.payment_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={receipt.receipt_type === "formal" ? "default" : "secondary"}
                          className={
                            receipt.receipt_type === "formal"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-600"
                          }
                        >
                          {receipt.receipt_type === "formal" ? "Formal" : "Simple"}
                        </Badge>
                        {receipt.emailed_at && (
                          <Badge className="bg-green-100 text-green-800">
                            <Mail className="h-3 w-3 mr-1" />
                            Enviado
                          </Badge>
                        )}
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadReceipt(receipt)}
                            title="Descargar PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreviewReceipt(receipt)}
                            title="Vista Previa PDF"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {receipt.invoice?.client?.email && !receipt.emailed_at && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEmailReceipt(receipt)}
                              title="Enviar por Email"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteReceipt(receipt)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Eliminar Comprobante"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedReceipt(receipt)}
                                title="Ver Detalles"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Vista Previa del Comprobante</DialogTitle>
                                <DialogDescription>
                                  Detalles del comprobante de pago {formatReceiptNumber(receipt.receipt_number)}
                                </DialogDescription>
                              </DialogHeader>
                              {selectedReceipt && (
                                <div className="space-y-4">
                                  <div className="bg-slate-50 p-4 rounded-lg">
                                    <h3 className="font-semibold mb-2">Información del Pago</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="text-slate-600">Número:</span>
                                        <p className="font-medium">{formatReceiptNumber(selectedReceipt.receipt_number)}</p>
                                      </div>
                                      <div>
                                        <span className="text-slate-600">Fecha:</span>
                                        <p className="font-medium">
                                          {new Date(selectedReceipt.payment_date).toLocaleDateString()}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-slate-600">Factura:</span>
                                        <p className="font-medium">{selectedReceipt.invoice?.invoice_number || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <span className="text-slate-600">Cliente:</span>
                                        <p className="font-medium">{selectedReceipt.invoice?.clients?.name || 'Cliente no encontrado'}</p>
                                      </div>
                                      <div>
                                        <span className="text-slate-600">Método de Pago:</span>
                                        <p className="font-medium">{getPaymentMethodLabel(selectedReceipt.payment_method)}</p>
                                      </div>
                                      <div>
                                        <span className="text-slate-600">Monto Pagado:</span>
                                        <p className="font-medium">{formatCurrency(selectedReceipt.amount_paid)}</p>
                                      </div>
                                    </div>
                                    {selectedReceipt.notes && (
                                      <div className="mt-4">
                                        <span className="text-slate-600">Notas:</span>
                                        <p className="font-medium">{selectedReceipt.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generar Comprobante Manual */}
        <TabsContent value="manual-receipt" className="space-y-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
            <CardHeader className="pb-4">
              <CardTitle className="text-slate-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                Generar Comprobante Manual
              </CardTitle>
              <CardDescription>
                Crear comprobante para facturas que no lo generaron automáticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="invoice-select">Seleccionar Factura Pagada</Label>
                    <Select
                      value={selectedInvoice?.id || ""}
                      onValueChange={(value) => {
                        const invoice = paidInvoices.find(inv => inv.id === value)
                        setSelectedInvoice(invoice || null)
                        if (invoice) {
                          setManualReceiptData(prev => ({
                            ...prev,
                            invoice_id: invoice.id,
                            amount_paid: invoice.total
                          }))
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Seleccione una factura" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const availableInvoices = paidInvoices
                            .filter(invoice => !paymentReceipts.some(receipt => receipt.invoice_id === invoice.id))
                          
                          if (availableInvoices.length === 0) {
                            return (
                              <SelectItem disabled value="no-invoices">
                                No hay facturas pagadas sin comprobante
                              </SelectItem>
                            )
                          }
                          
                          return availableInvoices.map(invoice => (
                            <SelectItem key={invoice.id} value={invoice.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{invoice.invoice_number} - {invoice.clients?.name}</span>
                                <span className="ml-4 font-medium">{formatCurrency(invoice.total)}</span>
                              </div>
                            </SelectItem>
                          ))
                        })()}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="payment-method">Método de Pago</Label>
                    <Select
                      value={manualReceiptData.payment_method}
                      onValueChange={(value) => setManualReceiptData(prev => ({ ...prev, payment_method: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            Efectivo
                          </div>
                        </SelectItem>
                        <SelectItem value="card">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-blue-600" />
                            Tarjeta
                          </div>
                        </SelectItem>
                        <SelectItem value="transfer">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-purple-600" />
                            Transferencia
                          </div>
                        </SelectItem>
                        <SelectItem value="check">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-600" />
                            Cheque
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="amount-paid">Monto Pagado</Label>
                    <Input
                      id="amount-paid"
                      type="number"
                      min="0"
                      step="0.01"
                      value={manualReceiptData.amount_paid}
                      onChange={(e) => setManualReceiptData(prev => ({ 
                        ...prev, 
                        amount_paid: parseFloat(e.target.value) || 0 
                      }))}
                      className="mt-1"
                    />
                  </div>

                  {manualReceiptData.payment_method === "cash" && (
                    <div>
                      <Label htmlFor="change-amount">Cambio</Label>
                      <Input
                        id="change-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={manualReceiptData.change_amount}
                        onChange={(e) => setManualReceiptData(prev => ({ 
                          ...prev, 
                          change_amount: parseFloat(e.target.value) || 0 
                        }))}
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {manualReceiptData.payment_method === "transfer" && (
                    <div>
                      <Label htmlFor="bank-reference">Referencia Bancaria</Label>
                      <Input
                        id="bank-reference"
                        placeholder="Número de referencia"
                        value={manualReceiptData.bank_reference}
                        onChange={(e) => setManualReceiptData(prev => ({ 
                          ...prev, 
                          bank_reference: e.target.value 
                        }))}
                        className="mt-1"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="issued-by">Emitido Por</Label>
                    <Input
                      id="issued-by"
                      placeholder="Nombre de quien emite el comprobante"
                      value={manualReceiptData.issued_by}
                      onChange={(e) => setManualReceiptData(prev => ({ 
                        ...prev, 
                        issued_by: e.target.value 
                      }))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notas</Label>
                    <Textarea
                      id="notes"
                      placeholder="Notas adicionales del comprobante"
                      value={manualReceiptData.notes}
                      onChange={(e) => setManualReceiptData(prev => ({ 
                        ...prev, 
                        notes: e.target.value 
                      }))}
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  {selectedInvoice && (
                    <div className="p-4 bg-slate-100 rounded-lg">
                      <h3 className="font-semibold mb-2">Resumen de la Factura</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Número:</span>
                          <span>{selectedInvoice.invoice_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cliente:</span>
                          <span>{selectedInvoice.clients?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total:</span>
                          <span className="font-medium">{formatCurrency(selectedInvoice.total)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tipo de Comprobante:</span>
                          <span>
                            <Badge variant={selectedInvoice.clients?.rnc ? "default" : "secondary"}>
                              {selectedInvoice.clients?.rnc ? "Formal" : "Simple"}
                            </Badge>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleGenerateManualReceipt}
                  disabled={generating || !selectedInvoice}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="lg"
                >
                  {generating ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2 animate-pulse" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Generar Comprobante
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
