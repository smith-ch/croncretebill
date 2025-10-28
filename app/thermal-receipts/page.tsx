"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
  Phone,
  Calendar,
  TrendingUp,
  Wallet,
  Users,
  BarChart3,
  Clock,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowUp,
  Percent,
  X
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useCurrency } from "@/hooks/use-currency"
import { useNotificationHelpers } from "@/hooks/use-notifications"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import { downloadThermalReceiptPDF, printThermalReceiptPDF, previewThermalReceiptPDF } from "@/lib/thermal-receipt-utils"
import { ProductPriceDropdown } from "@/components/products/product-price-dropdown"
import { ServicePriceDropdown } from "@/components/services/service-price-dropdown"

interface Product {
  id: string
  name: string
  price: number
  stock_quantity: number
  product_code?: string
}

interface Service {
  id: string
  name: string
  price: number
  service_code?: string
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
  generalDiscountPercentage: number
  generalDiscountAmount: number
  includeItbis: boolean
}

const LivePreview: React.FC<LivePreviewProps> = React.memo(({ 
  clientName, 
  paymentMethod, 
  amountReceived, 
  items, 
  notes, 
  profile,
  generalDiscountPercentage,
  generalDiscountAmount,
  includeItbis
}) => {
  const { formatCurrency } = useCurrency()

  const calculateTotals = useCallback(() => {
    // Calcular subtotal base
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0)
    
    // Aplicar descuento general
    let discountTotal = 0
    if (generalDiscountPercentage > 0) {
      discountTotal = subtotal * (generalDiscountPercentage / 100)
    } else if (generalDiscountAmount > 0) {
      discountTotal = generalDiscountAmount
    }
    
    const subtotalAfterDiscount = subtotal - discountTotal
    const tax_amount = includeItbis ? subtotalAfterDiscount * 0.18 : 0
    const total_amount = subtotalAfterDiscount + tax_amount
    const change_amount = Math.max(0, amountReceived - total_amount)
    
    return { subtotal, discountTotal, subtotalAfterDiscount, tax_amount, total_amount, change_amount }
  }, [items, amountReceived, generalDiscountPercentage, generalDiscountAmount, includeItbis])

  const { subtotal, discountTotal, tax_amount, total_amount, change_amount } = calculateTotals()
  
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
        {discountTotal > 0 && (
          <div className="flex justify-between text-red-600">
            <span>DESCUENTO:</span>
            <span>-{formatCurrency(discountTotal)}</span>
          </div>
        )}
        {includeItbis && (
          <div className="flex justify-between">
            <span>ITBIS (18%):</span>
            <span>{formatCurrency(tax_amount)}</span>
          </div>
        )}
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
  selected_price_id?: string | null // Para tracking del precio seleccionado
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
  const [itemSearchTerms, setItemSearchTerms] = useState<{[key: number]: string}>({})
  
  // Form state
  const [clientName, setClientName] = useState("")
  const [clientType, setClientType] = useState<"registered" | "occasional">("occasional")
  const [selectedClientId, setSelectedClientId] = useState("")
  const [registeredClients, setRegisteredClients] = useState<any[]>([])
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [amountReceived, setAmountReceived] = useState(0)
  const [notes, setNotes] = useState("")
  const [includeItbis, setIncludeItbis] = useState(true)
  const [items, setItems] = useState<ThermalReceiptItem[]>([
    { item_name: "", quantity: 1, unit_price: 0, line_total: 0 }
  ])
  
  // Discount states
  const [generalDiscountType, setGeneralDiscountType] = useState<"percentage" | "amount">("percentage")
  const [generalDiscountPercentage, setGeneralDiscountPercentage] = useState(0)
  const [generalDiscountAmount, setGeneralDiscountAmount] = useState(0)
  
  const { formatCurrency } = useCurrency()
  const { notifySuccess, notifyError } = useNotificationHelpers()
  const { canDelete } = useUserPermissions()

  // Use proper permissions system for delete operations

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
          .select("id, name, price, stock_quantity, product_code")
          .eq("user_id", user.id)
          .order("name"),
        
        // Fetch services
        supabase
          .from("services")
          .select("id, name, price, service_code")
          .eq("user_id", user.id)
          .order("name"),
        
        // Fetch clients
        supabase
          .from("clients")
          .select("id, name, contact_person, email, phone")
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
        const transformedReceipts = receiptsResult.data?.map((receipt: any) => ({
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
        selected_price_id: null, // Reset price selection
        line_total: updatedItems[index].quantity * (item.price || 0)
      }
      setItems(updatedItems)
    }
  }

  const handlePriceSelect = (index: number, priceId: string, priceValue: number) => {
    const updatedItems = [...items]
    updatedItems[index] = {
      ...updatedItems[index],
      selected_price_id: priceId,
      unit_price: priceValue,
      line_total: updatedItems[index].quantity * priceValue
    }
    setItems(updatedItems)
  }

  // Funciones de filtrado para búsqueda
  const getFilteredProducts = (index: number) => {
    const searchTerm = itemSearchTerms[index]?.toLowerCase() || ""
    if (!searchTerm) {
      return products
    }
    
    return products.filter(product => 
      product.name.toLowerCase().includes(searchTerm) ||
      product.product_code?.toLowerCase().includes(searchTerm)
    )
  }

  const getFilteredServices = (index: number) => {
    const searchTerm = itemSearchTerms[index]?.toLowerCase() || ""
    if (!searchTerm) {
      return services
    }
    
    return services.filter(service => 
      service.name.toLowerCase().includes(searchTerm) ||
      service.service_code?.toLowerCase().includes(searchTerm)
    )
  }

  const calculateTotals = () => {
    // Calcular subtotal base
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0)
    
    // Aplicar descuento general
    let discountTotal = 0
    if (generalDiscountType === "percentage" && generalDiscountPercentage > 0) {
      discountTotal = subtotal * (generalDiscountPercentage / 100)
    } else if (generalDiscountType === "amount" && generalDiscountAmount > 0) {
      discountTotal = generalDiscountAmount
    }
    
    const subtotalAfterDiscount = Math.max(0, subtotal - discountTotal)
    const tax_amount = includeItbis ? subtotalAfterDiscount * 0.18 : 0 // 18% tax only if enabled
    const total_amount = subtotalAfterDiscount + tax_amount
    const receivedAmount = isNaN(amountReceived) ? 0 : amountReceived
    const change_amount = Math.max(0, receivedAmount - total_amount)
    
    return { subtotal, discountTotal, subtotalAfterDiscount, tax_amount, total_amount, change_amount }
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
      // Use a fallback URL for local development
      const baseUrl = window.location.origin.includes('localhost') 
        ? 'https://tu-dominio-futuro.com' // Cambia esto por tu dominio de producción
        : window.location.origin
      const qr_url = `${baseUrl}/system-info`

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
          qr_code: qr_url,
          verification_code,
          digital_receipt_url: qr_url,
          notes,
          include_itbis: includeItbis
        } as any)
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
          thermal_receipt_id: (receiptData as any).id,
          product_id: item.product_id || null,
          service_id: item.service_id || null,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total
        }))

      const { error: itemsError } = await supabase
        .from("thermal_receipt_items")
        .insert(itemsToSave as any)

      if (itemsError) {
        throw itemsError
      }

      // Reset form
      setClientName("")
      setPaymentMethod("cash")
      setAmountReceived(0)
      setNotes("")
      setIncludeItbis(true)
      setItems([{ item_name: "", quantity: 1, unit_price: 0, line_total: 0 }])
      setGeneralDiscountPercentage(0)
      setGeneralDiscountAmount(0)

      notifySuccess("Recibo térmico creado exitosamente")
      await fetchData()

      // Generate and print receipt with company data
      const fullReceipt = { ...(receiptData as any), items: itemsToSave }
      const companyData = profile ? {
        name: profile.company_name || "MI EMPRESA",
        phone: profile.company_phone || "",
        rnc: profile.tax_id || "",
        address: profile.company_address || "",
        logo: profile.company_logo || undefined
      } : undefined
      
      await downloadThermalReceiptPDF(fullReceipt, companyData)

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
      
      await printThermalReceiptPDF(receipt, companyData)
      notifySuccess("Recibo enviado a impresión")
    } catch (error) {
      console.error("Error printing receipt:", error)
      notifyError("Error al imprimir el recibo")
    }
  }

  const handleDownloadReceipt = async (receipt: ThermalReceipt) => {
    try {
      const companyData = profile ? {
        name: profile.company_name || "MI EMPRESA",
        phone: profile.company_phone || "",
        rnc: profile.tax_id || "",
        address: profile.company_address || "",
        logo: profile.company_logo || undefined
      } : undefined
      
      await downloadThermalReceiptPDF(receipt, companyData)
      notifySuccess("Recibo descargado exitosamente")
    } catch (error) {
      console.error("Error downloading receipt:", error)
      notifyError("Error al descargar el recibo")
    }
  }

  const handlePreviewReceipt = async (receipt: ThermalReceipt) => {
    try {
      const companyData = profile ? {
        name: profile.company_name || "MI EMPRESA",
        phone: profile.company_phone || "",
        rnc: profile.tax_id || "",
        address: profile.company_address || "",
        logo: profile.company_logo || undefined
      } : undefined
      
      await previewThermalReceiptPDF(receipt, companyData)
      notifySuccess("Vista previa abierta")
    } catch (error) {
      console.error("Error previewing receipt:", error)
      notifyError("Error al mostrar vista previa del recibo")
    }
  }

  const handleDeleteReceipt = async (receiptId: string) => {
  if (!canDelete('thermalReceipts')) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96 bg-blue-50">
        <div className="text-lg text-blue-600">Cargando facturas térmicas...</div>
      </div>
    )
  }

  // Calculate totals for the form
  const { subtotal, tax_amount, total_amount, change_amount } = calculateTotals()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-white p-3 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Principal Mejorado */}
        <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 backdrop-blur-sm rounded-3xl border border-white/20 shadow-2xl p-8 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-pink-600/5 rounded-3xl"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full -translate-y-32 translate-x-32"></div>
          
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
              <div className="space-y-6">
                {/* Title Section */}
                <div className="flex items-start space-x-6">
                  <div className="relative">
                    <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-5 rounded-3xl shadow-2xl transform rotate-2 hover:rotate-0 transition-all duration-500 hover:scale-110">
                      <Receipt className="h-10 w-10 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full p-2 shadow-lg">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-3xl lg:text-5xl font-black bg-gradient-to-r from-blue-700 via-blue-600 to-purple-700 bg-clip-text text-transparent leading-tight">
                      Recibos Térmicos
                    </h1>
                    <div className="flex flex-col lg:flex-row lg:items-center space-y-2 lg:space-y-0 lg:space-x-4">
                      <p className="text-gray-600 text-base lg:text-lg font-medium">Sistema profesional de facturación</p>
                      <div className="flex items-center space-x-2 bg-blue-100 px-3 py-1 rounded-full self-start lg:self-auto">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        <span className="text-blue-700 text-sm font-semibold">80mm</span>
                      </div>
                    </div>
                    
                    {/* Quick Stats for existing users */}
                    {receipts.length > 0 && (
                      <div className="flex items-center space-x-6 pt-2">
                        <div className="flex items-center space-x-2">
                          <BarChart3 className="h-4 w-4 text-blue-600" />
                          <span className="text-blue-700 font-semibold">{receipts.length} recibos</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="text-green-700 font-semibold">{formatCurrency(receipts.reduce((sum, r) => sum + r.total_amount, 0))}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-purple-600" />
                          <span className="text-purple-700 font-semibold">{todayReceipts.length} hoy</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
              
            {/* Company Status Section */}
            <div className="space-y-4">
              {profile ? (
                <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200/50 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-6 text-sm">
                      <div className="flex items-center space-x-2 text-gray-700">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <Building2 className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <span className="font-semibold text-gray-800">{profile.company_name || "Sin nombre"}</span>
                          <p className="text-xs text-gray-500">Empresa configurada</p>
                        </div>
                      </div>
                      {profile.company_phone && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <div className="bg-green-100 p-2 rounded-lg">
                            <Phone className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <span className="font-medium">{profile.company_phone}</span>
                            <p className="text-xs text-gray-500">Teléfono</p>
                          </div>
                        </div>
                      )}
                      {profile.tax_id && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <div className="bg-orange-100 p-2 rounded-lg">
                            <FileText className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <span className="font-medium">RNC: {profile.tax_id}</span>
                            <p className="text-xs text-gray-500">Registro Nacional</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 border-orange-200/50 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-5">
                      <div className="relative">
                        <div className="bg-gradient-to-br from-orange-500 to-red-500 p-4 rounded-2xl shadow-lg">
                          <AlertCircle className="h-7 w-7 text-white" />
                        </div>
                        <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 animate-pulse">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <h3 className="text-xl font-bold text-orange-900 mb-1">¡Bienvenido! Configuración Inicial</h3>
                          <p className="text-orange-700 leading-relaxed">
                            Para comenzar a usar el sistema de recibos térmicos, necesitas configurar 
                            la información básica de tu empresa en la configuración.
                          </p>
                        </div>
                        
                        <div className="bg-orange-100/50 rounded-lg p-4 border border-orange-200">
                          <h4 className="font-semibold text-orange-800 mb-2 flex items-center">
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Qué necesitas configurar:
                          </h4>
                          <ul className="text-sm text-orange-700 space-y-1 ml-6">
                            <li>• Nombre de tu empresa</li>
                            <li>• RNC o número de identificación fiscal</li>
                            <li>• Dirección comercial</li>
                            <li>• Teléfono de contacto</li>
                            <li>• Moneda predeterminada</li>
                          </ul>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <Button asChild
                            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex-1"
                          >
                            <Link href="/settings" className="flex items-center justify-center">
                              <Building2 className="mr-2 h-4 w-4" />
                              Configurar Empresa
                            </Link>
                          </Button>
                          <Button 
                            variant="outline"
                            className="border-orange-300 text-orange-700 hover:bg-orange-50 flex-1"
                            onClick={() => {
                              // Scroll to the new receipt section
                              document.querySelector('[data-section="new-receipt"]')?.scrollIntoView({ behavior: 'smooth' })
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Demo
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            {/* Botón CTA Mejorado */}
            <div className="flex flex-col sm:flex-row gap-4" data-section="new-receipt">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl transform hover:scale-105 transition-all duration-200 px-8 py-3 text-lg font-semibold relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10 flex items-center">
                      <Plus className="mr-3 h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                      Nueva Factura Térmica
                      <Sparkles className="ml-2 h-4 w-4 animate-pulse" />
                    </div>
                  </Button>
                </DialogTrigger>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-blue-600">Nueva Factura Térmica</DialogTitle>
              <DialogDescription>
                Crear una factura térmica para impresión de 80mm con vista previa en tiempo real
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[75vh]">
              {/* Columna izquierda - Formulario */}
              <div className="col-span-1 lg:col-span-2 overflow-y-auto pr-0 lg:pr-4">
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

              {/* ITBIS Option */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeItbis"
                  checked={includeItbis}
                  onCheckedChange={(checked) => setIncludeItbis(checked as boolean)}
                />
                <Label htmlFor="includeItbis" className="text-sm font-medium">
                  Incluir ITBIS (18%)
                </Label>
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
                    <div key={index} className="grid grid-cols-1 lg:grid-cols-6 gap-2 p-3 border border-blue-200 rounded-lg bg-blue-50">
                      <div className="col-span-1 lg:col-span-2">
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
                            <div className="p-2 border-b sticky top-0 bg-white z-10">
                              <Input
                                placeholder="Buscar producto/servicio por código o nombre..."
                                value={itemSearchTerms[index] || ""}
                                onChange={(e) => {
                                  setItemSearchTerms(prev => ({...prev, [index]: e.target.value}))
                                }}
                                className="h-8 text-sm"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            {getFilteredProducts(index).length === 0 && getFilteredServices(index).length === 0 && (
                              <SelectItem disabled value="no-items">
                                No hay productos/servicios disponibles
                              </SelectItem>
                            )}
                            {getFilteredProducts(index).length > 0 && (
                              <>
                                <SelectItem disabled value="products-header">Productos</SelectItem>
                                {getFilteredProducts(index).map(product => (
                                  <SelectItem key={product.id} value={`product|${product.id}`}>
                                    {product.product_code ? `[${product.product_code}] ` : ''}{product.name} - {formatCurrency(product.price)}
                                  </SelectItem>
                                ))}
                              </>
                            )}
                            {getFilteredServices(index).length > 0 && (
                              <>
                                <SelectItem disabled value="services-header">Servicios</SelectItem>
                                {getFilteredServices(index).map(service => (
                                  <SelectItem key={service.id} value={`service|${service.id}`}>
                                    {service.service_code ? `[${service.service_code}] ` : ''}{service.name} - {formatCurrency(service.price)}
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
                        {item.product_id ? (
                          <ProductPriceDropdown
                            productId={item.product_id}
                            selectedPriceId={item.selected_price_id}
                            quantity={item.quantity}
                            onPriceSelect={(priceId: string, priceValue: number) => handlePriceSelect(index, priceId, priceValue)}
                            className="border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        ) : item.service_id ? (
                          <ServicePriceDropdown
                            serviceId={item.service_id}
                            selectedPriceId={item.selected_price_id}
                            quantity={item.quantity}
                            onPriceSelect={(priceId: string, priceValue: number) => handlePriceSelect(index, priceId, priceValue)}
                            className="border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        ) : (
                          <Input
                            type="number"
                            placeholder="Precio unitario"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="border-blue-200"
                          />
                        )}
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

              {/* Descuentos */}
              <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <Label className="text-green-700 font-semibold flex items-center">
                    <Percent className="h-4 w-4 mr-2" />
                    Descuentos
                  </Label>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="discountType" className="text-sm">Tipo de Descuento</Label>
                    <Select value={generalDiscountType} onValueChange={(value) => setGeneralDiscountType(value as "percentage" | "amount")}>
                      <SelectTrigger className="border-green-200 focus:border-green-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                        <SelectItem value="amount">Cantidad Fija</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {generalDiscountType === "percentage" ? (
                    <div>
                      <Label htmlFor="discountPercentage" className="text-sm">Descuento (%)</Label>
                      <Input
                        id="discountPercentage"
                        type="number"
                        value={generalDiscountPercentage === 0 ? "" : generalDiscountPercentage}
                        onChange={(e) => setGeneralDiscountPercentage(parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="0.0"
                        className="border-green-200 focus:border-green-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="discountAmount" className="text-sm">Descuento ({formatCurrency(0).replace('0.00', '')})</Label>
                      <Input
                        id="discountAmount"
                        type="number"
                        value={generalDiscountAmount === 0 ? "" : generalDiscountAmount}
                        onChange={(e) => setGeneralDiscountAmount(parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="border-green-200 focus:border-green-500"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setGeneralDiscountPercentage(0)
                        setGeneralDiscountAmount(0)
                      }}
                      className="border-green-200 text-green-600 hover:bg-green-50 w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Limpiar
                    </Button>
                  </div>
                </div>
                
                {(generalDiscountPercentage > 0 || generalDiscountAmount > 0) && (
                  <div className="text-sm text-green-700 bg-green-100 p-2 rounded">
                    <strong>Descuento aplicado: {formatCurrency(calculateTotals().discountTotal)}</strong>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(subtotal)}</span>
                  </div>
                  {calculateTotals().discountTotal > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Descuento:</span>
                      <span className="font-semibold">-{formatCurrency(calculateTotals().discountTotal)}</span>
                    </div>
                  )}
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
                    setIncludeItbis(true)
                    setItems([{ item_name: "", quantity: 1, unit_price: 0, line_total: 0 }])
                    setGeneralDiscountPercentage(0)
                    setGeneralDiscountAmount(0)
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
          <div className="col-span-1 overflow-y-auto border-l-0 lg:border-l border-gray-200 pl-0 lg:pl-4 mt-4 lg:mt-0">
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
              generalDiscountPercentage={generalDiscountPercentage}
              generalDiscountAmount={generalDiscountAmount}
              includeItbis={includeItbis}
            />
          </div>
        </div>
          </DialogContent>
        </Dialog>
      </div>
          </div>
        </div>



      {/* Dashboard Principal - Estadísticas */}
      <div className="space-y-6">
        {/* Welcome Message for New Users */}
        {receipts.length === 0 && profile && (
          <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-0 shadow-xl">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <div className="relative inline-block">
                  <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-6 rounded-3xl shadow-2xl">
                    <Receipt className="h-12 w-12 text-white mx-auto" />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-gradient-to-br from-green-400 to-green-600 rounded-full p-2">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-2">¡Todo listo para empezar!</h2>
                  <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                    Tu empresa <span className="font-semibold text-blue-600">{profile.company_name}</span> está 
                    configurada correctamente. Crea tu primer recibo térmico para comenzar.
                  </p>
                </div>
                <div className="flex justify-center">
                  <Button 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl px-8 py-3 text-lg font-semibold"
                    onClick={() => document.querySelector('[data-section="new-receipt"]')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <Plus className="mr-3 h-5 w-5" />
                    Crear Primer Recibo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid - Only show if user has data */}
        {receipts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold text-gray-800 flex items-center">
                  <BarChart3 className="mr-2 lg:mr-3 h-5 lg:h-6 w-5 lg:w-6 text-blue-600" />
                  Panel de Control
                </h2>
                <p className="text-gray-600 mt-1 text-sm lg:text-base">Resumen de tu actividad de facturación</p>
              </div>
              <div className="flex items-center space-x-2 bg-green-100 px-4 py-2 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-700 font-semibold text-sm">Datos actualizados</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/30 rounded-full -translate-y-10 translate-x-10"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                  <CardTitle className="text-sm font-semibold text-blue-700">Total Recibos</CardTitle>
                  <div className="bg-blue-200 p-3 rounded-xl shadow-md">
                    <Receipt className="h-5 w-5 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-2xl lg:text-3xl font-bold text-blue-800 mb-1">{receipts.length}</div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-blue-600 font-medium">📊 {todayReceipts.length} hoy</p>
                    {todayReceipts.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <ArrowUp className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-600 font-semibold">Activo</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-green-200/30 rounded-full -translate-y-10 translate-x-10"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                  <CardTitle className="text-sm font-semibold text-green-700">Ingresos Hoy</CardTitle>
                  <div className="bg-green-200 p-3 rounded-xl shadow-md">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-2xl lg:text-3xl font-bold text-green-800 mb-1">{formatCurrency(todayAmount)}</div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-green-600 font-medium">💰 {todayReceipts.length} recibos</p>
                    {todayAmount > 0 && (
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-600 font-semibold">+{((todayAmount / (weeklyAmount || 1)) * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-purple-200/30 rounded-full -translate-y-10 translate-x-10"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                  <CardTitle className="text-sm font-semibold text-purple-700">Última Semana</CardTitle>
                  <div className="bg-purple-200 p-3 rounded-xl shadow-md">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-2xl lg:text-3xl font-bold text-purple-800 mb-1">{formatCurrency(weeklyAmount)}</div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-purple-600 font-medium">📅 {weeklyReceipts.length} recibos</p>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3 text-purple-500" />
                      <span className="text-xs text-purple-600 font-semibold">7d</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-200/30 rounded-full -translate-y-10 translate-x-10"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                  <CardTitle className="text-sm font-semibold text-indigo-700">Este Mes</CardTitle>
                  <div className="bg-indigo-200 p-3 rounded-xl shadow-md">
                    <BarChart3 className="h-5 w-5 text-indigo-600" />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-2xl lg:text-3xl font-bold text-indigo-800 mb-1">{formatCurrency(monthlyAmount)}</div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-indigo-600 font-medium">📈 {monthlyReceipts.length} recibos</p>
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-3 w-3 text-indigo-500" />
                      <span className="text-xs text-indigo-600 font-semibold">Mensual</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-orange-200/30 rounded-full -translate-y-10 translate-x-10"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                  <CardTitle className="text-sm font-semibold text-orange-700">Efectivo</CardTitle>
                  <div className="bg-orange-200 p-3 rounded-xl shadow-md">
                    <Wallet className="h-5 w-5 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-2xl lg:text-3xl font-bold text-orange-800 mb-1">{receipts.filter(r => r.payment_method === 'cash').length}</div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-orange-600 font-medium">💵 {formatCurrency(receipts.filter(r => r.payment_method === 'cash').reduce((sum, r) => sum + r.total_amount, 0))}</p>
                    <Banknote className="h-3 w-3 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-200/30 rounded-full -translate-y-10 translate-x-10"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                  <CardTitle className="text-sm font-semibold text-cyan-700">Tarjetas</CardTitle>
                  <div className="bg-cyan-200 p-3 rounded-xl shadow-md">
                    <CreditCard className="h-5 w-5 text-cyan-600" />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-2xl lg:text-3xl font-bold text-cyan-800 mb-1">{receipts.filter(r => r.payment_method === 'card').length}</div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-cyan-600 font-medium">💳 {formatCurrency(receipts.filter(r => r.payment_method === 'card').reduce((sum, r) => sum + r.total_amount, 0))}</p>
                    <div className="flex items-center space-x-1">
                      <Users className="h-3 w-3 text-cyan-500" />
                      <span className="text-xs text-cyan-600 font-semibold">Digital</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Search and Filters Mejorados */}
      <Card className="bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 rounded-t-2xl border-b border-blue-100/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
          <div className="relative z-10">
            <CardTitle className="text-gray-800 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-3 rounded-2xl shadow-lg">
                  <Search className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
                    Buscar y Filtrar Recibos
                  </span>
                  <p className="text-gray-600 text-sm mt-1">Encuentra recibos específicos rápidamente</p>
                </div>
              </div>
              {receipts.length > 0 && (
                <div className="flex items-center space-x-2 bg-blue-100 px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-blue-700 font-semibold text-sm">{filteredReceipts.length} de {receipts.length}</span>
                </div>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-8 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-gray-700 font-semibold flex items-center">
                <Search className="h-4 w-4 mr-2 text-blue-600" />
                Buscar Recibo
              </Label>
              <div className="relative">
                <Input
                  id="search"
                  placeholder="Número de recibo, cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 pl-10 py-3 rounded-xl shadow-sm"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="statusFilter" className="text-gray-700 font-semibold flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                Estado
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 py-3 rounded-xl shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📊 Todos los estados</SelectItem>
                  <SelectItem value="active">✅ Activos</SelectItem>
                  <SelectItem value="cancelled">❌ Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="paymentFilter" className="text-gray-700 font-semibold flex items-center">
                <Wallet className="h-4 w-4 mr-2 text-purple-600" />
                Método de Pago
              </Label>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 py-3 rounded-xl shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">💳 Todos los métodos</SelectItem>
                  <SelectItem value="cash">💵 Efectivo</SelectItem>
                  <SelectItem value="card">💳 Tarjeta</SelectItem>
                  <SelectItem value="transfer">🏦 Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col justify-end space-y-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("")
                  setStatusFilter("all")
                  setPaymentFilter("all")
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 py-3 rounded-xl shadow-sm transition-all duration-200"
              >
                <Filter className="h-4 w-4 mr-2" />
                Limpiar Filtros
              </Button>
              
              {receipts.length > 0 && (
                <div className="text-center">
                  <span className="text-sm text-gray-500">
                    {filteredReceipts.length === receipts.length 
                      ? `Mostrando todos los ${receipts.length} recibos`
                      : `${filteredReceipts.length} de ${receipts.length} recibos`
                    }
                  </span>
                </div>
              )}
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
                      title="Ver detalles"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePreviewReceipt(receipt)}
                      className="border-purple-200 text-purple-600 hover:bg-purple-50"
                      title="Vista previa PDF"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => handlePrintReceipt(receipt)}
                      title="Imprimir directamente"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadReceipt(receipt)}
                      className="border-green-200 text-green-600 hover:bg-green-50"
                      title="Descargar PDF"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {canDelete('thermalReceipts') && (
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
                  onClick={() => handlePreviewReceipt(selectedReceipt)}
                  className="border-purple-200 text-purple-600 hover:bg-purple-50"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Vista Previa
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePrintReceipt(selectedReceipt)}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownloadReceipt(selectedReceipt)}
                  className="border-green-200 text-green-600 hover:bg-green-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
                {canDelete('thermalReceipts') && (
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
                  {previewData.discountTotal > 0 && (
                    <div className="flex justify-between text-xs text-red-600">
                      <span>Descuento:</span>
                      <span>-{formatCurrency(previewData.discountTotal)}</span>
                    </div>
                  )}
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
    </div>
  )
}