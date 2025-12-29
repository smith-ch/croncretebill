"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  CheckCircle,
  FileText,
  Download,
  Eye,
  Filter,
  MoreVertical,
  Mail,
  DollarSign,
  Calendar,
  CreditCard,
  Building,
  XCircle,
  TrendingUp,
  Receipt
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useCurrency } from "@/hooks/use-currency"
import { useNotificationHelpers } from "@/hooks/use-notifications"
import { generatePaymentReceiptPDF } from "@/lib/payment-receipt-utils"
import { useToast } from "@/hooks/use-toast"

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
    invoice_items?: {
      id: string
      quantity: number
      unit_price: number
      total: number
      products?: {
        id: string
        name: string
        description?: string | null
      } | null
      services?: {
        id: string
        name: string
        description?: string | null
      } | null
    }[]
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
  invoice_items?: {
    id: string
    quantity: number
    unit_price: number
    total: number
    products?: {
      id: string
      name: string
      description?: string | null
    } | null
    services?: {
      id: string
      name: string
      description?: string | null
    } | null
  }[]
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
  const [expenses, setExpenses] = useState<any[]>([])
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, receipt: PaymentReceipt | null}>({show: false, receipt: null})
  const [isDeleting, setIsDeleting] = useState(false)
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
  
  // Expense receipt form
  const [expenseReceiptData, setExpenseReceiptData] = useState({
    expense_id: "",
    payment_method: "cash",
    amount_paid: 0,
    notes: "",
    issued_by: ""
  })

  const { formatCurrency } = useCurrency()
  const { notifySuccess, notifyError } = useNotificationHelpers()
  const { toast } = useToast()

  // Memoize expensive calculations
  const mostUsedPaymentMethod = useMemo(() => {
    const entries = Object.entries(stats.methodStats)
    if (entries.length === 0) {
      return 'cash'
    }
    return entries.reduce((a, b) => a[1] > b[1] ? a : b)[0]
  }, [stats.methodStats])

  const mostUsedMethodLabel = useMemo(() => {
    switch (mostUsedPaymentMethod) {
      case 'cash': return 'Efectivo'
      case 'card': return 'Tarjeta'
      case 'transfer': return 'Transferencia'
      case 'check': return 'Cheque'
      default: return 'Efectivo'
    }
  }, [mostUsedPaymentMethod])

  const availableInvoices = useMemo(() => {
    return paidInvoices.filter(invoice => 
      !paymentReceipts.some(receipt => receipt.invoice_id === invoice.id)
    )
  }, [paidInvoices, paymentReceipts])

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) {
        return
      }

      // Batch fetch all data in parallel for better performance
      const [
        companyResult,
        receiptsResult,
        invoicesResult,
        expensesResult
      ] = await Promise.all([
        // Fetch company settings
        supabase
          .from("company_settings")
          .select("*")
          .eq("user_id", user.id)
          .single(),
        
        // Fetch payment receipts with basic invoice and client info (no invoice_items to avoid relationship conflicts)
        supabase
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
          .order("created_at", { ascending: false }),
        
        // Fetch paid invoices with basic client info (no invoice_items to avoid relationship conflicts)
        supabase
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
          .order("created_at", { ascending: false }),
        
        // Fetch expenses
        supabase
          .from("expenses")
          .select("*")
          .eq("user_id", user.id)
          .order("expense_date", { ascending: false })
      ])

      // Handle company settings
      if (companyResult.error) {
        console.warn("Company settings error:", companyResult.error)
      } else {
        setCompanySettings(companyResult.data)
      }

      // Handle expenses
      if (expensesResult.error) {
        console.warn("Expenses error:", expensesResult.error)
        setExpenses([])
      } else {
        setExpenses(expensesResult.data || [])
      }

      // Handle payment receipts
      if (receiptsResult.error) {
        console.warn("Payment receipts table may not exist yet:", receiptsResult.error)
        setPaymentReceipts([])
        setStats({ totalPaid: 0, totalReceipts: 0, todayReceipts: 0, methodStats: { cash: 0, card: 0, transfer: 0, check: 0 } })
      } else {
        // Transform receipts data efficiently
        const transformedReceipts = (receiptsResult.data || []).map((receipt: any) => ({
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

        // Calculate stats efficiently
        const totalPaid = transformedReceipts.reduce((sum: number, receipt: any) => sum + receipt.amount_paid, 0)
        const totalReceipts = transformedReceipts.length
        const today = new Date().toDateString()
        const todayReceipts = transformedReceipts.filter((receipt: any) => 
          new Date(receipt.created_at).toDateString() === today
        ).length

        const methodStats = transformedReceipts.reduce((acc: any, receipt: any) => {
          const method = receipt.payment_method as keyof typeof acc
          acc[method] = (acc[method] || 0) + 1
          return acc
        }, { cash: 0, card: 0, transfer: 0, check: 0 })

        setStats({ totalPaid, totalReceipts, todayReceipts, methodStats })
      }

      // Handle paid invoices
      if (invoicesResult.error) {
        console.error("Error fetching invoices:", invoicesResult.error)
        setPaidInvoices([])
      } else {
        // Transform invoices data efficiently
        const transformedInvoices = (invoicesResult.data || []).map((invoice: any) => ({
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
  }, [notifyError])

  // Helper function to format receipt number display
  const formatReceiptNumber = (receiptNumber: string): string => {
    if (!receiptNumber || receiptNumber === 'cons') {
      return receiptNumber
    }
    
    // Si ya está en el formato nuevo CPG-NNNN, devolverlo tal como está
    if (receiptNumber.startsWith('CPG-')) {
      return receiptNumber
    }
    
    // Manejar formato antiguo CP-YYYYMMDD-NNNN -> convertir a CPG-NNNN
    if (receiptNumber.includes('CP-')) {
      const parts = receiptNumber.split('-')
      if (parts.length >= 3) {
        const sequentialPart = parts[parts.length - 1]
        // Obtener últimos 4 dígitos como número de secuencia
        const seqNumber = sequentialPart.slice(-4).padStart(4, '0')
        return `CPG-${seqNumber}`
      }
    }
    
    // Para cualquier otro formato, devolverlo tal como está
    return receiptNumber
  }

  // Helper function to fetch invoice items for PDF generation
  const fetchInvoiceItems = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase
        .from("invoice_items")
        .select(`
          id,
          quantity,
          unit_price,
          subtotal,
          product_id,
          service_id,
          products (
            id,
            name,
            description
          ),
          services (
            id,
            name,
            description
          )
        `)
        .eq("invoice_id", invoiceId)

      if (error) {
        console.error("Error fetching invoice items:", error)
        return []
      }

      return data || []
    } catch (error) {
      console.error("Error fetching invoice items:", error)
      return []
    }
  }

  const handleGenerateManualReceipt = async () => {
    // Validación: Factura seleccionada
    if (!selectedInvoice) {
      toast({
        variant: "destructive",
        title: "❌ Factura requerida",
        description: "Debe seleccionar una factura para generar el comprobante",
      })
      notifyError("Debe seleccionar una factura")
      return
    }

    // Validación: Monto pagado debe ser mayor a 0
    const amountPaid = manualReceiptData.amount_paid || selectedInvoice.total
    if (amountPaid <= 0) {
      toast({
        variant: "destructive",
        title: "❌ Monto inválido",
        description: "El monto pagado debe ser mayor a 0",
      })
      return
    }

    // Validación: Monto pagado no debe exceder el total
    if (amountPaid > selectedInvoice.total * 1.5) {
      toast({
        variant: "destructive",
        title: "⚠️ Monto muy alto",
        description: `El monto pagado (${formatCurrency(amountPaid)}) parece muy alto para esta factura (${formatCurrency(selectedInvoice.total)})`,
      })
      return
    }

    // Validación: Si es transferencia o cheque, debe tener referencia bancaria
    if ((manualReceiptData.payment_method === "transfer" || manualReceiptData.payment_method === "check") 
        && (!manualReceiptData.bank_reference || manualReceiptData.bank_reference.trim() === "")) {
      toast({
        variant: "destructive",
        title: "❌ Referencia requerida",
        description: "Para pagos por transferencia o cheque debe proporcionar la referencia bancaria",
      })
      return
    }

    try {
      setGenerating(true)
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) {
        toast({
          variant: "destructive",
          title: "Error de autenticación",
          description: "Su sesión ha expirado. Por favor, inicie sesión nuevamente.",
        })
        return
      }

      // Check if receipt already exists
      const existingReceipt = paymentReceipts.find(r => r.invoice_id === selectedInvoice.id)
      if (existingReceipt) {
        toast({
          variant: "destructive",
          title: "❌ Comprobante duplicado",
          description: "Esta factura ya tiene un comprobante de pago",
        })
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
          amount_paid: amountPaid,
          change_amount: manualReceiptData.change_amount,
          bank_reference: manualReceiptData.bank_reference || null,
          notes: manualReceiptData.notes || null,
          issued_by: manualReceiptData.issued_by || "Sistema",
          receipt_type: receiptType
        })
        .select()
        .single()

      if (error) {
        throw error
      }

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

      toast({
        title: "✅ Comprobante generado exitosamente",
        description: `Comprobante de pago para factura #${selectedInvoice.invoice_number}`,
      })
      notifySuccess("Comprobante de pago generado exitosamente")
      await fetchData()

      // Generate PDF
      // Fetch invoice items separately if we have a selected invoice
      let invoiceItems = []
      if (selectedInvoice) {
        invoiceItems = await fetchInvoiceItems(selectedInvoice.id)
      }

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
          } : null,
          invoice_items: invoiceItems
        } : {
          id: '',
          invoice_number: '',
          total_amount: 0,
          client_name: 'Cliente no encontrado',
          client: null,
          invoice_items: []
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

  const handleGenerateExpenseReceipt = async () => {
    if (!selectedExpense) {
      toast({
        variant: "destructive",
        title: "❌ Gasto no seleccionado",
        description: "Debe seleccionar un gasto para generar el comprobante",
      })
      notifyError("Debe seleccionar un gasto")
      return
    }

    const amountPaid = expenseReceiptData.amount_paid || selectedExpense.amount
    if (amountPaid <= 0) {
      toast({
        variant: "destructive",
        title: "❌ Monto inválido",
        description: "El monto pagado debe ser mayor a 0",
      })
      return
    }

    try {
      setGenerating(true)
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) {
        toast({
          variant: "destructive",
          title: "Error de autenticación",
          description: "Su sesión ha expirado. Por favor, inicie sesión nuevamente.",
        })
        return
      }

      // Crear un "recibo de gasto" - usaremos la misma tabla payment_receipts pero con invoice_id NULL
      const { data: receiptData, error } = await supabase
        .from("payment_receipts")
        .insert({
          user_id: user.id,
          invoice_id: null, // No es una factura, es un gasto
          payment_method: expenseReceiptData.payment_method,
          amount_paid: amountPaid,
          change_amount: 0,
          bank_reference: null,
          notes: `Comprobante de Gasto: ${selectedExpense.description}\\n${expenseReceiptData.notes || ''}`,
          issued_by: expenseReceiptData.issued_by || "Sistema",
          receipt_type: "simple"
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Reset form
      setExpenseReceiptData({
        expense_id: "",
        payment_method: "cash",
        amount_paid: 0,
        notes: "",
        issued_by: ""
      })
      setSelectedExpense(null)

      toast({
        title: "✅ Comprobante de gasto generado",
        description: `Comprobante para el gasto: ${selectedExpense.description}`,
      })
      notifySuccess("Comprobante de gasto generado exitosamente")
      await fetchData()

      // Generate PDF para el gasto
      const fullReceipt = { 
        ...receiptData, 
        invoice: {
          id: selectedExpense.id,
          invoice_number: `GASTO-${selectedExpense.expense_date}`,
          total_amount: selectedExpense.amount,
          client_name: selectedExpense.provider_name || 'Proveedor',
          client: {
            id: '',
            name: selectedExpense.provider_name || 'Proveedor',
            email: null,
            rnc: selectedExpense.provider_rnc || null,
            phone: null,
            address: null
          },
          invoice_items: [{
            id: selectedExpense.id,
            quantity: 1,
            unit_price: selectedExpense.amount,
            total: selectedExpense.amount,
            products: {
              id: '',
              name: selectedExpense.description,
              description: selectedExpense.notes || null
            }
          }]
        }
      }
      
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
      console.error("Error generating expense receipt:", error)
      notifyError("Error al generar el comprobante de gasto")
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
      
      // Fetch invoice items separately to avoid relationship conflicts
      const invoiceItems = await fetchInvoiceItems(receipt.invoice.id)

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
          } : null,
          invoice_items: invoiceItems
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
    setDeleteConfirm({show: true, receipt})
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.receipt) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from("payment_receipts")
        .delete()
        .eq("id", deleteConfirm.receipt.id)

      if (error) throw error

      notifySuccess("Comprobante eliminado correctamente")
      await fetchData()
    } catch (error) {
      console.error("Error deleting receipt:", error)
      notifyError("Error al eliminar el comprobante")
    } finally {
      setIsDeleting(false)
      setDeleteConfirm({show: false, receipt: null})
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
      // eslint-disable-next-line no-unused-vars
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

  // useEffect to load data and set up event listeners
  useEffect(() => {
    fetchData()
  }, [fetchData])

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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="h-8 w-80 bg-gray-200 rounded-lg skeleton"></div>
              <div className="h-4 w-96 bg-gray-200 rounded skeleton"></div>
            </div>
          </div>

          {/* Stats cards skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1,2,3,4].map((i) => (
              <Card key={i} className="border-0 shadow-lg skeleton animate-scale-in" style={{animationDelay: `${i * 0.05}s`}}>
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                    <div className="h-8 w-32 bg-gray-300 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs and filters skeleton */}
          <Card className="border-0 shadow-lg skeleton">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="h-10 w-32 bg-gray-200 rounded"></div>
                  <div className="h-10 w-32 bg-gray-200 rounded"></div>
                  <div className="h-10 w-32 bg-gray-200 rounded"></div>
                </div>
                <div className="h-10 w-full bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>

          {/* Receipt cards skeleton */}
          <div className="space-y-3">
            {[1,2,3,4,5].map((i) => (
              <Card key={i} className="border-0 shadow-lg skeleton animate-slide-up" style={{animationDelay: `${i * 0.1}s`}}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-lg flex-shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-gray-200 rounded"></div>
                      <div className="h-3 w-48 bg-gray-200 rounded"></div>
                      <div className="h-3 w-40 bg-gray-200 rounded"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-9 w-9 bg-gray-200 rounded"></div>
                      <div className="h-9 w-9 bg-gray-200 rounded"></div>
                      <div className="h-9 w-9 bg-gray-200 rounded"></div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100 card-hover animate-scale-in">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-emerald-600 font-medium text-xs uppercase tracking-wide mb-1">Total Recaudado</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-900 truncate">{formatCurrency(stats.totalPaid)}</p>
              </div>
              <div className="hidden sm:block p-2 bg-emerald-200 rounded-full flex-shrink-0 ml-2">
                <TrendingUp className="h-5 w-5 text-emerald-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-blue-600 font-medium text-xs uppercase tracking-wide mb-1">Comprobantes Emitidos</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-900">{stats.totalReceipts}</p>
              </div>
              <div className="hidden sm:block p-2 bg-blue-200 rounded-full flex-shrink-0 ml-2">
                <Receipt className="h-5 w-5 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-purple-600 font-medium text-xs uppercase tracking-wide mb-1">Comprobantes Hoy</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-900">{stats.todayReceipts}</p>
              </div>
              <div className="hidden sm:block p-2 bg-purple-200 rounded-full flex-shrink-0 ml-2">
                <Calendar className="h-5 w-5 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-orange-600 font-medium text-xs uppercase tracking-wide mb-1">Método Más Usado</p>
                <p className="text-base sm:text-lg font-bold text-orange-900 truncate">
                  {mostUsedMethodLabel}
                </p>
              </div>
              <div className="hidden sm:block p-2 bg-orange-200 rounded-full flex-shrink-0 ml-2">
                {getPaymentMethodIcon(mostUsedPaymentMethod)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="receipts-list" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-100">
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
            Comprobante de Factura
          </TabsTrigger>
          <TabsTrigger 
            value="expense-receipt"
            className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Comprobante de Gasto
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
                <div className="space-y-3">
                  {paymentReceipts.map((receipt, index) => (
                    <div
                      key={receipt.id}
                      className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-3 sm:p-4 bg-white border-0 shadow-md rounded-xl hover:bg-gradient-to-r hover:from-emerald-50 hover:to-slate-50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 card-hover gap-3 lg:gap-0 animate-slide-up"
                      style={{animationDelay: `${index * 0.05}s`}}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-emerald-100 rounded-lg flex-shrink-0">
                          {getPaymentMethodIcon(receipt.payment_method)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 text-sm sm:text-base truncate">
                            {formatReceiptNumber(receipt.receipt_number)}
                          </div>
                          <div className="text-xs sm:text-sm text-slate-600 truncate">
                            Factura: {receipt.invoice?.invoice_number || 'N/A'} • {receipt.invoice?.clients?.name || 'Cliente no encontrado'}
                          </div>
                          <div className="text-xs sm:text-sm text-slate-600">
                            {getPaymentMethodLabel(receipt.payment_method)} • {formatCurrency(receipt.amount_paid)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {new Date(receipt.payment_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between lg:justify-end gap-2 flex-shrink-0">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                          <Badge
                            variant={receipt.receipt_type === "formal" ? "default" : "secondary"}
                            className={`text-xs ${
                              receipt.receipt_type === "formal"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {receipt.receipt_type === "formal" ? "Formal" : "Simple"}
                          </Badge>
                          {receipt.emailed_at && (
                            <Badge className="bg-green-100 text-green-800 text-xs hidden sm:inline-flex">
                              <Mail className="h-3 w-3 mr-1" />
                              Enviado
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadReceipt(receipt)}
                            title="Descargar PDF"
                            className="h-8 w-8 p-0"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreviewReceipt(receipt)}
                            title="Vista Previa PDF"
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {receipt.invoice?.client?.email && !receipt.emailed_at && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEmailReceipt(receipt)}
                              title="Enviar por Email"
                              className="h-8 w-8 p-0 hidden sm:inline-flex"
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteReceipt(receipt)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                            title="Eliminar Comprobante"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedReceipt(receipt)}
                                title="Ver Detalles"
                                className="h-8 w-8 p-0"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
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
                                  <div className="relative bg-slate-100 p-6 rounded-lg shadow-inner overflow-hidden">
                                    {/* Watermark */}
                                    <div
                                      className="pointer-events-none select-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                                      style={{
                                        zIndex: 0,
                                        fontSize: '4rem',
                                        color: '#64748b', // slate-500
                                        opacity: 0.10,
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap',
                                        transform: 'translate(-50%, -50%) rotate(-30deg)',
                                        userSelect: 'none',
                                      }}
                                    >
                                      COMPROBANTE DE PAGO
                                    </div>
                                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {/* Company Info */}
                                      <div>
                                        <h3 className="font-semibold mb-2 text-slate-700">Datos de la Empresa</h3>
                                        <div className="text-sm text-slate-700">
                                          <div><span className="font-medium">Nombre:</span> {companySettings?.company_name || 'Empresa'}</div>
                                          <div><span className="font-medium">RNC:</span> {companySettings?.tax_id || 'N/A'}</div>
                                          <div><span className="font-medium">Dirección:</span> {companySettings?.company_address || 'N/A'}</div>
                                          <div><span className="font-medium">Teléfono:</span> {companySettings?.company_phone || 'N/A'}</div>
                                        </div>
                                      </div>
                                      {/* Client Info */}
                                      <div>
                                        <h3 className="font-semibold mb-2 text-slate-700">Información del Cliente</h3>
                                        <div className="text-sm text-slate-700">
                                          <div><span className="font-medium">Nombre:</span> {selectedReceipt.invoice?.clients?.name || 'Cliente no encontrado'}</div>
                                          <div><span className="font-medium">RNC/Cédula:</span> {selectedReceipt.invoice?.clients?.rnc || 'N/A'}</div>
                                          <div><span className="font-medium">Dirección:</span> {selectedReceipt.invoice?.clients?.address || 'N/A'}</div>
                                          <div><span className="font-medium">Teléfono:</span> {selectedReceipt.invoice?.clients?.phone || 'N/A'}</div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="bg-slate-200 p-4 rounded-lg border border-slate-300">
                                    <h3 className="font-semibold mb-2 text-slate-800">Información del Pago</h3>
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
                                        <span className="text-slate-600">Método de Pago:</span>
                                        <p className="font-medium">{getPaymentMethodLabel(selectedReceipt.payment_method)}</p>
                                      </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-400 bg-slate-300 -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
                                      <div className="flex justify-between items-center">
                                        <span className="text-lg font-semibold text-slate-800">Total Pagado:</span>
                                        <span className="text-xl font-bold text-slate-900">{formatCurrency(selectedReceipt.amount_paid)}</span>
                                      </div>
                                    </div>
                                    {selectedReceipt.notes && (
                                      <div className="mt-4">
                                        <span className="text-slate-600">Notas:</span>
                                        <p className="font-medium">{selectedReceipt.notes}</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Items Section - Products and Services */}
                                  {selectedReceipt.invoice?.invoice_items && selectedReceipt.invoice.invoice_items.length > 0 && (
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                      <h3 className="font-semibold mb-3 text-slate-800 flex items-center gap-2">
                                        <Receipt className="h-4 w-4" />
                                        Detalle de la Factura
                                      </h3>
                                      <div className="space-y-2">
                                        {selectedReceipt.invoice.invoice_items.map((item, index) => {
                                          const itemName = item.products?.name || item.services?.name || 'Item sin nombre'
                                          const itemDescription = item.products?.description || item.services?.description
                                          const itemType = item.products ? 'Producto' : item.services ? 'Servicio' : 'Item'
                                          
                                          return (
                                            <div key={index} className="flex justify-between items-start p-3 bg-white rounded border border-slate-200">
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <span className="font-medium text-slate-900">{itemName}</span>
                                                  <Badge variant="outline" className="text-xs">
                                                    {itemType}
                                                  </Badge>
                                                </div>
                                                {itemDescription && (
                                                  <p className="text-xs text-slate-600 mb-2">{itemDescription}</p>
                                                )}
                                                <div className="flex gap-4 text-xs text-slate-500">
                                                  <span>Cantidad: {item.quantity}</span>
                                                  <span>Precio: {formatCurrency(item.unit_price)}</span>
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                <span className="font-semibold text-slate-900">
                                                  {formatCurrency(item.total)}
                                                </span>
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}
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

        {/* Generar Comprobante de Gasto */}
        <TabsContent value="expense-receipt" className="space-y-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-red-50">
            <CardHeader className="pb-4">
              <CardTitle className="text-slate-800 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-red-600" />
                Generar Comprobante de Gasto
              </CardTitle>
              <CardDescription>
                Crear comprobante de pago para un gasto registrado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="expense-select">Seleccionar Gasto</Label>
                    <Select
                      value={selectedExpense?.id || ""}
                      onValueChange={(value) => {
                        const expense = expenses.find(exp => exp.id === value)
                        setSelectedExpense(expense || null)
                        if (expense) {
                          setExpenseReceiptData(prev => ({
                            ...prev,
                            expense_id: expense.id,
                            amount_paid: expense.amount
                          }))
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Seleccione un gasto" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenses.length === 0 ? (
                          <SelectItem disabled value="no-expenses">
                            No hay gastos registrados
                          </SelectItem>
                        ) : (
                          expenses.map(expense => (
                            <SelectItem key={expense.id} value={expense.id}>
                              <div className="flex items-center justify-between w-full">
                                <span className="truncate">{expense.description}</span>
                                <span className="ml-4 font-medium">{formatCurrency(expense.amount)}</span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="expense-payment-method">Método de Pago</Label>
                    <Select
                      value={expenseReceiptData.payment_method}
                      onValueChange={(value) => setExpenseReceiptData(prev => ({ ...prev, payment_method: value }))}
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
                    <Label htmlFor="expense-amount-paid">Monto Pagado</Label>
                    <Input
                      id="expense-amount-paid"
                      type="number"
                      min="0"
                      step="0.01"
                      value={expenseReceiptData.amount_paid}
                      onChange={(e) => setExpenseReceiptData(prev => ({ 
                        ...prev, 
                        amount_paid: parseFloat(e.target.value) || 0 
                      }))}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="expense-issued-by">Emitido Por</Label>
                    <Input
                      id="expense-issued-by"
                      placeholder="Nombre de quien emite el comprobante"
                      value={expenseReceiptData.issued_by}
                      onChange={(e) => setExpenseReceiptData(prev => ({ 
                        ...prev, 
                        issued_by: e.target.value 
                      }))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="expense-notes">Notas</Label>
                    <Textarea
                      id="expense-notes"
                      placeholder="Notas adicionales del comprobante"
                      value={expenseReceiptData.notes}
                      onChange={(e) => setExpenseReceiptData(prev => ({ 
                        ...prev, 
                        notes: e.target.value 
                      }))}
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  {selectedExpense && (
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <h3 className="font-semibold mb-2 text-red-900">Resumen del Gasto</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-red-700">Descripción:</span>
                          <span className="text-red-900 font-medium">{selectedExpense.description}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-700">Fecha:</span>
                          <span className="text-red-900">{new Date(selectedExpense.expense_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-700">Categoría:</span>
                          <span className="text-red-900">{selectedExpense.category || 'Sin categoría'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-700">Monto:</span>
                          <span className="font-medium text-red-900">{formatCurrency(selectedExpense.amount)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleGenerateExpenseReceipt}
                  disabled={generating || !selectedExpense}
                  className="bg-red-600 hover:bg-red-700 text-white"
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
                      Generar Comprobante de Gasto
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteConfirm.show}
        onOpenChange={(isOpen) => setDeleteConfirm({show: isOpen, receipt: null})}
        title="Eliminar Comprobante de Pago"
        description="¿Estás seguro de que deseas eliminar este comprobante de pago? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
