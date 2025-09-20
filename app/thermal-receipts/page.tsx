"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Receipt,
  Plus,
  Printer,
  QrCode,
  Eye,
  Search,
  Filter,
  Download,
  DollarSign,
  Trash2,
  CreditCard,
  Banknote,
  FileText,
  Building2,
  Phone
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useCurrency } from "@/hooks/use-currency"
import { useNotificationHelpers } from "@/hooks/use-notifications"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import { generateThermalReceiptPDF } from "@/lib/thermal-receipt-utils"

interface Product {
  id: string
  name: string
  price: number
  stock_quantity: number
}

interface Service {
  id: string
  name: string
  price: number
}

interface Profile {
  id: string
  company_name: string
  company_address: string
  company_phone: string
  company_email: string
  company_website: string
  tax_id: string
  company_logo?: string
  currency_code: string
  currency_symbol: string
}

// Componente de Vista Previa en Tiempo Real
interface LivePreviewProps {
  clientName: string
  paymentMethod: string
  amountReceived: number
  items: ThermalReceiptItem[]
  notes: string
  profile: Profile | null
}

const LivePreview: React.FC<LivePreviewProps> = React.memo(({ 
  clientName, 
  paymentMethod, 
  amountReceived, 
  items, 
  notes, 
  profile 
}) => {
  const { formatCurrency } = useCurrency()

  const calculateTotals = useCallback(() => {
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0)
    const tax_amount = subtotal * 0.18
    const total_amount = subtotal + tax_amount
    const change_amount = Math.max(0, amountReceived - total_amount)
    
    return { subtotal, tax_amount, total_amount, change_amount }
  }, [items, amountReceived])

  const { subtotal, tax_amount, total_amount, change_amount } = calculateTotals()
  
  const receiptNumber = useMemo(() => {
    const currentDate = new Date()
    return `TRM-${currentDate.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
  }, [])

  const currentDate = useMemo(() => new Date(), [])

  const paymentMethodText = useMemo(() => {
    return paymentMethod === 'cash' ? 'Efectivo' : 
           paymentMethod === 'card' ? 'Tarjeta' : 
           'Transferencia'
  }, [paymentMethod])

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-4 font-mono text-xs leading-tight max-w-xs mx-auto">
      {/* Header de la empresa */}
      <div className="text-center border-b-2 border-dashed border-gray-300 pb-2 mb-3">
        <div className="font-bold text-sm mb-1">
          {profile?.company_name || "MI EMPRESA"}
        </div>
        {profile?.tax_id && (
          <div className="text-gray-600">RNC: {profile.tax_id}</div>
        )}
        {profile?.company_address && (
          <div className="text-gray-600">{profile.company_address}</div>
        )}
        {profile?.company_phone && (
          <div className="text-gray-600">Tel: {profile.company_phone}</div>
        )}
      </div>

      {/* Información del recibo */}
      <div className="text-center mb-3">
        <div className="font-bold">RECIBO TÉRMICO</div>
        <div>No. {receiptNumber}</div>
        <div>{currentDate.toLocaleDateString('es-DO')}, {currentDate.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
      </div>

      {/* Cliente */}
      {clientName && clientName !== 'Cliente General' && (
        <div className="border-t border-dashed border-gray-300 pt-2 mb-3">
          <div>Cliente: {clientName}</div>
        </div>
      )}

      {/* Items */}
      <div className="border-t border-dashed border-gray-300 pt-2 mb-3">
        {items.filter(item => item.item_name.trim() !== "" && item.line_total > 0).map((item, index) => (
          <div key={index} className="mb-2">
            <div>{item.item_name}</div>
            <div className="flex justify-between">
              <span>{item.quantity.toFixed(item.quantity % 1 === 0 ? 0 : 2)} x {formatCurrency(item.unit_price)}</span>
              <span>{formatCurrency(item.line_total)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Totales */}
      <div className="border-t border-dashed border-gray-300 pt-2 mb-3">
        <div className="flex justify-between">
          <span>SUBTOTAL:</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>ITBIS (18%):</span>
          <span>{formatCurrency(tax_amount)}</span>
        </div>
        <div className="border-t border-dashed border-gray-300 pt-1 mt-1">
          <div className="flex justify-between font-bold">
            <span>TOTAL:</span>
            <span>{formatCurrency(total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Información de pago */}
      <div className="border-t border-dashed border-gray-300 pt-2 mb-3">
        <div>Pago: {paymentMethodText}</div>
        {amountReceived > 0 && (
          <>
            <div>Recibido: {formatCurrency(amountReceived)}</div>
            {change_amount > 0 && (
              <div>Cambio: {formatCurrency(change_amount)}</div>
            )}
          </>
        )}
      </div>

      {/* QR Code placeholder */}
      <div className="border-t border-dashed border-gray-300 pt-2 mb-3 text-center">
        <div className="bg-gray-200 w-16 h-16 mx-auto mb-2 flex items-center justify-center">
          <QrCode className="h-8 w-8 text-gray-400" />
        </div>
        <div className="text-xs">Código: ABC123</div>
      </div>

      {/* Notas */}
      {notes && notes.trim() && (
        <div className="border-t border-dashed border-gray-300 pt-2 mb-3">
          <div className="font-bold">Notas:</div>
          <div>{notes}</div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-dashed border-gray-300 pt-2 text-center">
        <div className="font-bold">¡GRACIAS POR SU COMPRA!</div>
        {profile?.company_website && (
          <div className="text-xs mt-1">{profile.company_website}</div>
        )}
      </div>
    </div>
  )
})

LivePreview.displayName = 'LivePreview'

interface ThermalReceiptItem {
  id?: string
  item_name: string
  quantity: number
  unit_price: number
  line_total: number
  product_id?: string
  service_id?: string
}

interface ThermalReceipt {
  id: string
  receipt_number: string
  client_name: string
  subtotal: number
  tax_amount: number
  total_amount: number
  payment_method: string
  amount_received: number
  change_amount: number
  qr_code: string
  verification_code: string
  digital_receipt_url: string
  notes: string
  status: string
  created_at: string
  items: ThermalReceiptItem[]
}

export default function ThermalReceiptsPage() {
  const [receipts, setReceipts] = useState<ThermalReceipt[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<ThermalReceipt | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  
  // Form state
  const [clientName, setClientName] = useState("")
  const [clientType, setClientType] = useState<"registered" | "occasional">("occasional")
  const [selectedClientId, setSelectedClientId] = useState("")
  const [registeredClients, setRegisteredClients] = useState<any[]>([])
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [amountReceived, setAmountReceived] = useState(0)
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<ThermalReceiptItem[]>([
    { item_name: "", quantity: 1, unit_price: 0, line_total: 0 }
  ])
  
  const { formatCurrency } = useCurrency()
  const { notifySuccess, notifyError } = useNotificationHelpers()
  const { permissions } = useUserPermissions()

  // Para el modo empleado, no pueden eliminar cosas
  const canDelete = permissions.isOwner && !permissions.isRealEmployee

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      // Batch fetch all data in parallel for better performance
      const [
        profileResult,
        receiptsResult,
        productsResult,
        servicesResult,
        clientsResult
      ] = await Promise.all([
        // Fetch user profile/company information
        supabase
          .from("company_settings")
          .select("*")
          .eq("user_id", user.id)
          .single(),
        
        // Fetch thermal receipts with items in a single query
        supabase
          .from("thermal_receipts")
          .select(`
            *,
            thermal_receipt_items (*)
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        
        // Fetch products
        supabase
          .from("products")
          .select("id, name, price, stock_quantity")
          .eq("user_id", user.id)
          .order("name"),
        
        // Fetch services
        supabase
          .from("services")
          .select("id, name, price")
          .eq("user_id", user.id)
          .order("name"),
        
        // Fetch clients
        supabase
          .from("clients")
          .select("id, name, contact_person, email, phone")
          .eq("user_id", user.id)
          .order("name")
          .select("id, name, price")
          .eq("user_id", user.id)
          .order("name")
      ])

      // Handle profile data
      if (profileResult.error) {
        console.warn("Company settings error:", profileResult.error)
      } else {
        setProfile(profileResult.data)
      }

      // Handle receipts data
      if (receiptsResult.error) {
        console.warn("Thermal receipts table may not exist yet:", receiptsResult.error)
        if (receiptsResult.error.message?.includes('relation "public.thermal_receipts" does not exist')) {
          notifyError("Las tablas no están configuradas. Por favor aplica el schema de base de datos.")
        }
        setReceipts([])
      } else {
        // Transform data efficiently
        const transformedReceipts = receiptsResult.data?.map(receipt => ({
          ...receipt,
          items: receipt.thermal_receipt_items || []
        })) || []
        setReceipts(transformedReceipts)
      }

      // Handle products data
      if (productsResult.error) {
        console.warn("Products table error:", productsResult.error)
        setProducts([])
      } else {
        setProducts(productsResult.data || [])
      }

      // Handle services data
      if (servicesResult.error) {
        console.warn("Services table error:", servicesResult.error)
        setServices([])
      } else {
        setServices(servicesResult.data || [])
      }

      // Handle clients data
      if (clientsResult.error) {
        console.warn("Clients table error:", clientsResult.error)
        setRegisteredClients([])
      } else {
        setRegisteredClients(clientsResult.data || [])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      notifyError("Error al cargar los datos. Verifica que las tablas estén configuradas.")
    } finally {
      setLoading(false)
    }
  }, [notifyError])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const addItem = () => {
    setItems([...items, { item_name: "", quantity: 1, unit_price: 0, line_total: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof ThermalReceiptItem, value: any) => {
    const updatedItems = [...items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    
    // Calculate line total
    if (field === "quantity" || field === "unit_price") {
      updatedItems[index].line_total = updatedItems[index].quantity * updatedItems[index].unit_price
    }
    
    setItems(updatedItems)
  }

  const selectProductOrService = (index: number, type: 'product' | 'service', id: string) => {
    const item = type === 'product' 
      ? products.find(p => p.id === id)
      : services.find(s => s.id === id)
    
    if (item) {
      const updatedItems = [...items]
      updatedItems[index] = {
        ...updatedItems[index],
        item_name: item.name,
        unit_price: item.price || 0,
        [type === 'product' ? "product_id" : "service_id"]: id,
        line_total: updatedItems[index].quantity * (item.price || 0)
      }
      setItems(updatedItems)
    }
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0)
    const tax_amount = subtotal * 0.18 // 18% tax
    const total_amount = subtotal + tax_amount
    const receivedAmount = isNaN(amountReceived) ? 0 : amountReceived
    const change_amount = Math.max(0, receivedAmount - total_amount)
    
    return { subtotal, tax_amount, total_amount, change_amount }
  }

  const generateVerificationCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase()
  }

  const generatePreview = () => {
    const { subtotal, tax_amount, total_amount, change_amount } = calculateTotals()
    
    if (total_amount <= 0) {
      notifyError("Debe agregar al menos un producto con precio válido")
      return
    }

    // Log profile for debugging
    console.log("Profile in generatePreview:", profile)

    const verification_code = generateVerificationCode()
    const receipt_number = `TRM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
    
    const previewReceipt = {
      receipt_number,
      client_name: clientName || "Cliente General",
      subtotal,
      tax_amount,
      total_amount,
      payment_method: paymentMethod,
      amount_received: amountReceived,
      change_amount,
      verification_code,
      notes,
      items: items.filter(item => item.item_name.trim() !== "" && item.line_total > 0),
      created_at: new Date().toISOString(),
      status: 'preview'
    }

    setPreviewData(previewReceipt)
    setShowPreview(true)
  }

  // Función removida - ahora la información de empresa se configura en /settings

  const handleSaveReceipt = async () => {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      const { subtotal, tax_amount, total_amount, change_amount } = calculateTotals()
      
      if (total_amount <= 0) {
        notifyError("Debe agregar al menos un producto con precio válido")
        return
      }

      const verification_code = generateVerificationCode()
      const qr_data = {
        receipt_number: `TR-${Date.now()}`,
        total: total_amount,
        verification: verification_code,
        url: `${window.location.origin}/verify/${verification_code}`
      }

      // Save thermal receipt
      const { data: receiptData, error: receiptError } = await supabase
        .from("thermal_receipts")
        .insert({
          user_id: user.id,
          client_name: clientName || "Cliente General",
          subtotal,
          tax_amount,
          total_amount,
          payment_method: paymentMethod,
          amount_received: amountReceived,
          change_amount,
          qr_code: JSON.stringify(qr_data),
          verification_code,
          digital_receipt_url: qr_data.url,
          notes
        })
        .select()
        .single()

      if (receiptError) {
        console.error("Receipt error:", receiptError)
        if (receiptError.message?.includes('relation "public.thermal_receipts" does not exist')) {
          notifyError("Las tablas no están configuradas. Por favor aplica el schema de base de datos.")
          return
        }
        throw receiptError
      }

      // Save receipt items
      const itemsToSave = items
        .filter(item => item.item_name.trim() !== "" && item.line_total > 0)
        .map(item => ({
          thermal_receipt_id: receiptData.id,
          product_id: item.product_id || null,
          service_id: item.service_id || null,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total
        }))

      const { error: itemsError } = await supabase
        .from("thermal_receipt_items")
        .insert(itemsToSave)

      if (itemsError) {
        throw itemsError
      }

      // Reset form
      setClientName("")
      setPaymentMethod("cash")
      setAmountReceived(0)
      setNotes("")
      setItems([{ item_name: "", quantity: 1, unit_price: 0, line_total: 0 }])

      notifySuccess("Recibo térmico creado exitosamente")
      await fetchData()

      // Generate and print receipt with company data
      const fullReceipt = { ...receiptData, items: itemsToSave }
      const companyData = profile ? {
        name: profile.company_name || "MI EMPRESA",
        phone: profile.company_phone || "",
        rnc: profile.tax_id || "",
        address: profile.company_address || "",
        logo: profile.company_logo || undefined
      } : undefined
      
      await generateThermalReceiptPDF(fullReceipt, companyData)

    } catch (error) {
      console.error("Error saving receipt:", error)
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      if (errorMessage.includes('relation "public.thermal_receipts" does not exist')) {
        notifyError("Las tablas no están configuradas. Por favor aplica el schema de base de datos.")
      } else {
        notifyError("Error al crear el recibo térmico")
      }
    } finally {
      setSaving(false)
    }
  }

  const handlePrintReceipt = async (receipt: ThermalReceipt) => {
    try {
      const companyData = profile ? {
        name: profile.company_name || "MI EMPRESA",
        phone: profile.company_phone || "",
        rnc: profile.tax_id || "",
        address: profile.company_address || "",
        logo: profile.company_logo || undefined
      } : undefined
      
      await generateThermalReceiptPDF(receipt, companyData)
      notifySuccess("Recibo enviado a impresión")
    } catch (error) {
      console.error("Error printing receipt:", error)
      notifyError("Error al imprimir el recibo")
    }
  }

  const handleDeleteReceipt = async (receiptId: string) => {
    if (!canDelete) {
      notifyError("No tienes permisos para eliminar recibos")
      return
    }

    if (!confirm("¿Estás seguro de que quieres eliminar este recibo? Esta acción no se puede deshacer.")) {
      return
    }

    try {
      const { error } = await supabase
        .from('thermal_receipts')
        .delete()
        .eq('id', receiptId)

      if (error) {
        throw error
      }

      notifySuccess("Recibo eliminado exitosamente")
      await fetchData()
    } catch (error) {
      console.error("Error deleting receipt:", error)
      notifyError("Error al eliminar el recibo")
    }
  }

  // Filter receipts based on search and filters
  const filteredReceipts = receipts.filter((receipt) => {
    const matchesSearch = 
      receipt.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.client_name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || receipt.status === statusFilter
    const matchesPayment = paymentFilter === "all" || receipt.payment_method === paymentFilter

    return matchesSearch && matchesStatus && matchesPayment
  })

  // Calculate statistics
  const totalAmount = receipts.reduce((sum, r) => sum + r.total_amount, 0)
  const todayReceipts = receipts.filter(r => 
    new Date(r.created_at).toDateString() === new Date().toDateString()
  )
  const todayAmount = todayReceipts.reduce((sum, r) => sum + r.total_amount, 0)

  // Weekly statistics (last 7 days)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weeklyReceipts = receipts.filter(r => 
    new Date(r.created_at) >= weekAgo
  )
  const weeklyAmount = weeklyReceipts.reduce((sum, r) => sum + r.total_amount, 0)

  // Monthly statistics (current month)
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthlyReceipts = receipts.filter(r => 
    new Date(r.created_at) >= currentMonthStart
  )
  const monthlyAmount = monthlyReceipts.reduce((sum, r) => sum + r.total_amount, 0)

  const { subtotal, tax_amount, total_amount, change_amount } = calculateTotals()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96 bg-blue-50">
        <div className="text-lg text-blue-600">Cargando facturas térmicas...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Company Info */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-blue-600">Facturas Térmicas</h1>
          </div>
          
          {profile ? (
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4" />
                <span>{profile.company_name || "Sin nombre"}</span>
              </div>
              {profile.company_phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>{profile.company_phone}</span>
                </div>
              )}
              {profile.tax_id && (
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>RNC: {profile.tax_id}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="text-sm text-orange-600">
                Configure la información de su empresa
              </div>
              <Button asChild
                size="sm"
                variant="outline"
                className="border-orange-200 text-orange-600 hover:bg-orange-50"
              >
                <Link href="/settings">
                  Ir a Configuración
                </Link>
              </Button>
            </div>
          )}
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Factura Térmica
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-blue-600">Nueva Factura Térmica</DialogTitle>
              <DialogDescription>
                Crear una factura térmica para impresión de 80mm con vista previa en tiempo real
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-6 h-[75vh]">
              {/* Columna izquierda - Formulario */}
              <div className="col-span-2 overflow-y-auto pr-4">
                <form className="space-y-6">
              {/* Client Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Cliente</Label>
                  <Select 
                    value={clientType} 
                    onValueChange={(value: "registered" | "occasional") => {
                      setClientType(value)
                      if (value === "occasional") {
                        setSelectedClientId("")
                        setClientName("")
                      }
                    }}
                  >
                    <SelectTrigger className="border-blue-200 focus:border-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="occasional">Cliente Ocasional</SelectItem>
                      <SelectItem value="registered">Cliente Registrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  {clientType === "registered" ? (
                    <div className="space-y-2">
                      <Label htmlFor="selectedClient">Seleccionar Cliente</Label>
                      <Select 
                        value={selectedClientId} 
                        onValueChange={(value) => {
                          setSelectedClientId(value)
                          const client = registeredClients.find(c => c.id === value)
                          setClientName(client ? client.name : "")
                        }}
                      >
                        <SelectTrigger className="border-blue-200 focus:border-blue-500">
                          <SelectValue placeholder="Selecciona un cliente..." />
                        </SelectTrigger>
                        <SelectContent>
                          {registeredClients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name} {client.contact_person && `(${client.contact_person})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="clientName">Nombre del Cliente</Label>
                      <Input
                        id="clientName"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Cliente General"
                        className="border-blue-200 focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentMethod">Método de Pago</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="border-blue-200 focus:border-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="card">Tarjeta</SelectItem>
                      <SelectItem value="transfer">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label>Productos/Servicios</Label>
                  <Button type="button" onClick={addItem} size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-6 gap-2 p-3 border border-blue-200 rounded-lg bg-blue-50">
                      <div className="col-span-2">
                        <Input
                          placeholder="Nombre del producto/servicio"
                          value={item.item_name}
                          onChange={(e) => updateItem(index, "item_name", e.target.value)}
                          className="border-blue-200"
                        />
                        <Select onValueChange={(value) => {
                          const [type, id] = value.split('|')
                          if (type && id) {
                            selectProductOrService(index, type as 'product' | 'service', id)
                          }
                        }}>
                          <SelectTrigger className="mt-1 border-blue-200">
                            <SelectValue placeholder="Seleccionar producto/servicio" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.length === 0 && services.length === 0 && (
                              <SelectItem disabled value="no-items">
                                No hay productos/servicios. Ve a Productos o Servicios para agregar.
                              </SelectItem>
                            )}
                            {products.length > 0 && (
                              <>
                                <SelectItem disabled value="products-header">Productos</SelectItem>
                                {products.map(product => (
                                  <SelectItem key={product.id} value={`product|${product.id}`}>
                                    {product.name} - {formatCurrency(product.price)}
                                  </SelectItem>
                                ))}
                              </>
                            )}
                            {services.length > 0 && (
                              <>
                                <SelectItem disabled value="services-header">Servicios</SelectItem>
                                {services.map(service => (
                                  <SelectItem key={service.id} value={`service|${service.id}`}>
                                    {service.name} - {formatCurrency(service.price)}
                                  </SelectItem>
                                ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Input
                          type="number"
                          placeholder="Cantidad"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="border-blue-200"
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          placeholder="Precio unitario"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="border-blue-200"
                        />
                      </div>
                      <div>
                        <Input
                          value={formatCurrency(item.line_total)}
                          readOnly
                          className="bg-blue-100 border-blue-200"
                        />
                      </div>
                      <div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ITBIS (18%):</span>
                    <span className="font-semibold">{formatCurrency(tax_amount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg text-blue-600">
                    <span>Total:</span>
                    <span>{formatCurrency(total_amount)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="amountReceived">Monto Recibido</Label>
                    <Input
                      id="amountReceived"
                      type="number"
                      value={amountReceived === 0 ? "" : amountReceived}
                      onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="border-blue-200 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Cambio:</span>
                    <span className={change_amount > 0 ? "text-green-600" : "text-blue-600"}>
                      {formatCurrency(change_amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales..."
                  rows={3}
                  className="border-blue-200 focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setClientName("")
                    setPaymentMethod("cash")
                    setAmountReceived(0)
                    setNotes("")
                    setItems([{ item_name: "", quantity: 1, unit_price: 0, line_total: 0 }])
                  }}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  Limpiar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={generatePreview}
                  disabled={total_amount <= 0}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Vista Previa
                </Button>
                <Button
                  type="button"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleSaveReceipt}
                  disabled={saving || total_amount <= 0}
                >
                  {saving ? "Guardando..." : "Guardar y Imprimir"}
                </Button>
              </div>
            </form>
          </div>

          {/* Columna derecha - Vista Previa */}
          <div className="col-span-1 overflow-y-auto border-l border-gray-200 pl-4">
            <div className="sticky top-0 bg-white pb-4 border-b border-gray-200 mb-4">
              <h3 className="font-semibold text-gray-800 text-center">Vista Previa</h3>
              <p className="text-xs text-gray-500 text-center">Actualización en tiempo real</p>
            </div>
            <LivePreview
              clientName={clientName}
              paymentMethod={paymentMethod}
              amountReceived={amountReceived}
              items={items}
              notes={notes}
              profile={profile}
            />
          </div>
        </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Database Status Alert */}
      {receipts.length === 0 && !loading && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-yellow-700">
              <div className="text-sm">
                <strong>⚠️ Base de datos no configurada:</strong> 
                Las tablas de facturas térmicas no existen. 
                <strong>Por favor aplica el archivo <code>fix-database-schema.sql</code> en Supabase.</strong>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Total Recibos</CardTitle>
            <Receipt className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{receipts.length}</div>
            <p className="text-xs text-muted-foreground">
              {todayReceipts.length} hoy
            </p>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Hoy</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(todayAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {todayReceipts.length} recibos
            </p>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">7 Días</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(weeklyAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {weeklyReceipts.length} recibos
            </p>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Este Mes</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(monthlyAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {monthlyReceipts.length} recibos
            </p>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Efectivo</CardTitle>
            <Banknote className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {receipts.filter(r => r.payment_method === 'cash').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(receipts.filter(r => r.payment_method === 'cash').reduce((sum, r) => sum + r.total_amount, 0))}
            </p>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Tarjeta</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {receipts.filter(r => r.payment_method === 'card').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(receipts.filter(r => r.payment_method === 'card').reduce((sum, r) => sum + r.total_amount, 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-blue-600 flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Buscar y Filtrar</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <Input
                id="search"
                placeholder="Número, cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-blue-200 focus:border-blue-500"
              />
            </div>
            <div>
              <Label htmlFor="statusFilter">Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-blue-200 focus:border-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="paymentFilter">Método de Pago</Label>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="border-blue-200 focus:border-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("all")
                  setPaymentFilter("all")
                }}
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receipts List */}
      <Card className="border-blue-200">
        <CardHeader className="bg-blue-50">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-blue-600">Recibos Térmicos</CardTitle>
              <CardDescription>
                {filteredReceipts.length} de {receipts.length} recibos
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="border-blue-200">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredReceipts.length === 0 ? (
            <div className="text-center py-12">
              {receipts.length === 0 ? (
                <div className="text-blue-500">
                  <Receipt className="h-12 w-12 mx-auto mb-4 text-blue-300" />
                  <p className="text-lg font-medium">No hay recibos térmicos</p>
                  <p className="text-sm">Crea tu primer recibo térmico</p>
                </div>
              ) : (
                <div className="text-blue-500">
                  <Search className="h-12 w-12 mx-auto mb-4 text-blue-300" />
                  <p className="text-lg font-medium">No se encontraron resultados</p>
                  <p className="text-sm">Intenta con otros términos de búsqueda</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReceipts.map((receipt) => (
                <div key={receipt.id} className="flex items-center justify-between p-4 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                  <div className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <div>
                        <div className="font-semibold text-blue-700">{receipt.receipt_number}</div>
                        <div className="text-sm text-blue-600">{receipt.client_name}</div>
                      </div>
                      <div>
                        <div className="font-medium text-blue-700">{formatCurrency(receipt.total_amount)}</div>
                        <div className="text-sm text-blue-600 capitalize flex items-center space-x-1">
                          {receipt.payment_method === 'cash' && <Banknote className="h-3 w-3" />}
                          {receipt.payment_method === 'card' && <CreditCard className="h-3 w-3" />}
                          <span>{receipt.payment_method === 'cash' ? 'Efectivo' : receipt.payment_method === 'card' ? 'Tarjeta' : 'Transferencia'}</span>
                        </div>
                      </div>
                      <div>
                        <Badge 
                          variant={receipt.status === 'active' ? 'default' : 'secondary'}
                          className={receipt.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                        >
                          {receipt.status === 'active' ? 'Activo' : 'Cancelado'}
                        </Badge>
                      </div>
                      <div className="text-sm text-blue-600">
                        <div>{new Date(receipt.created_at).toLocaleDateString()}</div>
                        <div>{new Date(receipt.created_at).toLocaleTimeString()}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-blue-700">
                          {receipt.items?.length || 0} items
                        </div>
                        <div className="text-xs text-blue-600">
                          Código: {receipt.verification_code}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedReceipt(receipt)}
                      className="border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedReceipt(receipt)}
                      className="border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => handlePrintReceipt(receipt)}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteReceipt(receipt.id)}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Details Modal */}
      {selectedReceipt && (
        <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-blue-600 flex items-center space-x-2">
                <Receipt className="h-5 w-5" />
                <span>Detalles del Recibo - {selectedReceipt.receipt_number}</span>
              </DialogTitle>
              <DialogDescription>
                Información completa y código QR del recibo térmico
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Receipt Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-blue-700 mb-3">Información del Recibo</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cliente:</span>
                      <span className="font-medium">{selectedReceipt.client_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fecha:</span>
                      <span>{new Date(selectedReceipt.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Hora:</span>
                      <span>{new Date(selectedReceipt.created_at).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Método de Pago:</span>
                      <span className="capitalize">{selectedReceipt.payment_method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estado:</span>
                      <Badge variant={selectedReceipt.status === 'active' ? 'default' : 'secondary'}>
                        {selectedReceipt.status === 'active' ? 'Activo' : 'Cancelado'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-blue-700 mb-3">Código QR</h4>
                  <div className="text-center">
                    <div className="w-32 h-32 mx-auto bg-white border-2 border-blue-200 rounded-lg flex items-center justify-center">
                      <QrCode size={80} className="text-blue-600" />
                    </div>
                    <div className="mt-2 text-xs text-blue-600">
                      Código: <strong>{selectedReceipt.verification_code}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-semibold text-blue-700 mb-3">Items del Recibo</h4>
                <div className="border border-blue-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="text-left p-3 text-blue-700">Producto/Servicio</th>
                        <th className="text-center p-3 text-blue-700">Cantidad</th>
                        <th className="text-right p-3 text-blue-700">Precio</th>
                        <th className="text-right p-3 text-blue-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReceipt.items?.map((item, index) => (
                        <tr key={index} className="border-t border-blue-100">
                          <td className="p-3">{item.item_name}</td>
                          <td className="p-3 text-center">{item.quantity}</td>
                          <td className="p-3 text-right">{formatCurrency(item.unit_price)}</td>
                          <td className="p-3 text-right font-medium">{formatCurrency(item.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-blue-50 border-t border-blue-200">
                      <tr>
                        <td colSpan={3} className="p-3 text-right font-semibold text-blue-700">Subtotal:</td>
                        <td className="p-3 text-right font-semibold">{formatCurrency(selectedReceipt.subtotal)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="p-3 text-right font-semibold text-blue-700">ITBIS (18%):</td>
                        <td className="p-3 text-right font-semibold">{formatCurrency(selectedReceipt.tax_amount)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="p-3 text-right font-bold text-blue-700 text-lg">Total:</td>
                        <td className="p-3 text-right font-bold text-blue-700 text-lg">{formatCurrency(selectedReceipt.total_amount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Payment Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                <div>
                  <span className="text-sm text-gray-600">Monto Recibido:</span>
                  <div className="font-semibold text-blue-700">{formatCurrency(selectedReceipt.amount_received)}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Cambio:</span>
                  <div className="font-semibold text-green-600">{formatCurrency(selectedReceipt.change_amount)}</div>
                </div>
              </div>

              {/* Notes */}
              {selectedReceipt.notes && (
                <div>
                  <h4 className="font-semibold text-blue-700 mb-2">Notas</h4>
                  <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">{selectedReceipt.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t border-blue-200">
                <Button
                  variant="outline"
                  onClick={() => handlePrintReceipt(selectedReceipt)}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Reimprimir
                </Button>
                {canDelete && (
                  <Button
                    variant="outline"
                    onClick={() => handleDeleteReceipt(selectedReceipt.id)}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setSelectedReceipt(null)}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Thermal Receipt Preview Modal */}
      {showPreview && previewData && (
        <Dialog open={showPreview} onOpenChange={() => setShowPreview(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-blue-600 flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Vista Previa - Recibo Térmico</span>
              </DialogTitle>
              <DialogDescription>
                Vista previa del recibo que se imprimirá en 80mm
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Thermal Receipt Preview */}
              <div className="border-2 border-blue-300 rounded-lg p-4 bg-white shadow-lg max-w-sm mx-auto" style={{width: '80mm', maxWidth: '300px'}}>
                {/* Header */}
                <div className="text-center border-b border-gray-300 pb-3 mb-3">
                  <div className="mb-2">
                    <div className="w-16 h-16 mx-auto bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="text-sm font-bold text-gray-800">
                    {profile?.company_name || "MI EMPRESA"}
                  </div>
                  
                  {/* Always show RNC section with fallback */}
                  <div className="text-xs text-gray-600">
                    RNC: {profile?.tax_id || "000-00000000-0"}
                  </div>
                  
                  {/* Always show address with fallback */}
                  <div className="text-xs text-gray-600">
                    {profile?.company_address || "Dirección de la empresa"}
                  </div>
                  
                  {/* Always show phone with fallback */}
                  <div className="text-xs text-gray-600">
                    Tel: {profile?.company_phone || "000-000-0000"}
                  </div>
                  
                  {/* Show email if available */}
                  {profile?.company_email && (
                    <div className="text-xs text-gray-600">{profile.company_email}</div>
                  )}
                </div>

                {/* Receipt Info */}
                <div className="text-center mb-3">
                  <div className="text-xs font-bold">RECIBO TÉRMICO</div>
                  <div className="text-xs">{previewData.receipt_number}</div>
                  <div className="text-xs">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
                </div>

                {/* Customer */}
                <div className="border-b border-gray-200 pb-2 mb-2">
                  <div className="text-xs">
                    <strong>Cliente:</strong> {previewData.client_name}
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1 mb-3">
                  {previewData.items.map((item: any, index: number) => (
                    <div key={index} className="text-xs">
                      <div className="flex justify-between">
                        <span className="flex-1">{item.item_name}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>{item.quantity} x {formatCurrency(item.unit_price)}</span>
                        <span>{formatCurrency(item.line_total)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-gray-300 pt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(previewData.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>ITBIS (18%):</span>
                    <span>{formatCurrency(previewData.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-1">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(previewData.total_amount)}</span>
                  </div>
                </div>

                {/* Payment */}
                <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Método:</span>
                    <span className="capitalize">{previewData.payment_method === 'cash' ? 'Efectivo' : previewData.payment_method === 'card' ? 'Tarjeta' : 'Transferencia'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Recibido:</span>
                    <span>{formatCurrency(previewData.amount_received)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Cambio:</span>
                    <span>{formatCurrency(previewData.change_amount)}</span>
                  </div>
                </div>

                {/* QR and Verification */}
                <div className="text-center mt-3 pt-2 border-t border-gray-200">
                  <div className="w-16 h-16 mx-auto bg-white border border-gray-300 rounded flex items-center justify-center mb-2">
                    <QrCode size={40} className="text-gray-600" />
                  </div>
                  <div className="text-xs text-gray-600">
                    Código: {previewData.verification_code}
                  </div>
                </div>

                {/* Notes */}
                {previewData.notes && (
                  <div className="text-center mt-2 pt-2 border-t border-gray-200">
                    <div className="text-xs text-gray-600">{previewData.notes}</div>
                  </div>
                )}

                {/* Footer */}
                <div className="text-center mt-3 pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500">¡Gracias por su compra!</div>
                  <div className="text-xs text-gray-500">www.miempresa.com</div>
                </div>
              </div>

              {/* Preview Actions */}
              <div className="flex justify-center space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  Volver a Editar
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setShowPreview(false)
                    handleSaveReceipt()
                  }}
                  disabled={saving}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  {saving ? "Guardando..." : "Guardar e Imprimir"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
