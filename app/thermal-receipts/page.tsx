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
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
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
  Minus,
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
  X,
  Package,
  ArrowDownCircle
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useCurrency } from "@/hooks/use-currency"
import { useNotificationHelpers } from "@/hooks/use-notifications"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import { useToast } from "@/hooks/use-toast"
import { useDataUserId } from "@/hooks/use-data-user-id"
import { downloadThermalReceiptPDF, printThermalReceiptPDF, previewThermalReceiptPDF } from "@/lib/thermal-receipt-utils"
import { ProductPriceDropdown } from "@/components/products/product-price-dropdown"
import { ServicePriceDropdown } from "@/components/services/service-price-dropdown"

interface Product {
  id: string
  name: string
  price: number
  stock_quantity: number
  current_stock?: number
  product_code?: string
  is_returnable?: boolean
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
  ncf: string
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
  includeItbis,
  ncf
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
    <div className="bg-slate-900 border-2 border-slate-800 rounded-lg p-4 font-mono text-xs leading-tight max-w-xs mx-auto">
      {/* Header de la empresa */}
      <div className="text-center border-b-2 border-dashed border-slate-700 pb-2 mb-3">
        <div className="font-bold text-sm mb-1">
          {profile?.company_name || "MI EMPRESA"}
        </div>
        {profile?.tax_id && (
          <div className="text-slate-400">RNC: {profile.tax_id}</div>
        )}
        {profile?.company_address && (
          <div className="text-slate-400">{profile.company_address}</div>
        )}
        {profile?.company_phone && (
          <div className="text-slate-400">Tel: {profile.company_phone}</div>
        )}
      </div>

      {/* Información del recibo */}
      <div className="text-center mb-3">
        <div className="font-bold">RECIBO TÉRMICO</div>
        <div>No. {receiptNumber}</div>
        <div>{currentDate.toLocaleDateString('es-DO')}, {currentDate.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
        {includeItbis && ncf && (
          <div className="mt-1 text-xs">NCF: {ncf}</div>
        )}
      </div>

      {/* Cliente */}
      {clientName && clientName !== 'Cliente General' && (
        <div className="border-t border-dashed border-slate-700 pt-2 mb-3">
          <div>Cliente: {clientName}</div>
        </div>
      )}

      {/* Items */}
      <div className="border-t border-dashed border-slate-700 pt-2 mb-3">
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
      <div className="border-t border-dashed border-slate-700 pt-2 mb-3">
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
        <div className="border-t border-dashed border-slate-700 pt-1 mt-1">
          <div className="flex justify-between font-bold">
            <span>TOTAL:</span>
            <span>{formatCurrency(total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Información de pago */}
      <div className="border-t border-dashed border-slate-700 pt-2 mb-3">
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
      <div className="border-t border-dashed border-slate-700 pt-2 mb-3 text-center">
        <div className="bg-gray-200 w-16 h-16 mx-auto mb-2 flex items-center justify-center">
          <QrCode className="h-8 w-8 text-gray-400" />
        </div>
        <div className="text-xs">Código: ABC123</div>
      </div>

      {/* Notas */}
      {notes && notes.trim() && (
        <div className="border-t border-dashed border-slate-700 pt-2 mb-3">
          <div className="font-bold">Notas:</div>
          <div>{notes}</div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-dashed border-slate-700 pt-2 text-center">
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
  client_id: string | null
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
  const [paymentStatus, setPaymentStatus] = useState<"pagado" | "pendiente">("pagado")
  const [amountReceived, setAmountReceived] = useState(0)
  const [notes, setNotes] = useState("")
  const [includeItbis, setIncludeItbis] = useState(true)
  const [ncf, setNcf] = useState("")
  const [items, setItems] = useState<ThermalReceiptItem[]>([
    { item_name: "", quantity: 1, unit_price: 0, line_total: 0 }
  ])
  
  // Discount states
  const [generalDiscountType, setGeneralDiscountType] = useState<"percentage" | "amount">("percentage")
  const [generalDiscountPercentage, setGeneralDiscountPercentage] = useState(0)
  const [generalDiscountAmount, setGeneralDiscountAmount] = useState(0)
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, id: string | null}>({show: false, id: null})
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Returnables state (Módulo F)
  const [clientReturnablesBalance, setClientReturnablesBalance] = useState<{product_id: string, product_name: string, balance: number}[]>([])
  const [returnedItems, setReturnedItems] = useState<{product_id: string, product_name: string, quantity: number}[]>([])
  const [showReturnablesSection, setShowReturnablesSection] = useState(false)
  
  const { formatCurrency } = useCurrency()
  const { notifySuccess, notifyError } = useNotificationHelpers()
  const { canDelete, permissions } = useUserPermissions()
  const { toast } = useToast()
  const { dataUserId, loading: userIdLoading } = useDataUserId()

  // Use proper permissions system for delete operations

  const fetchData = useCallback(async () => {
    try {
      if (!dataUserId) {
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
          .eq("user_id", dataUserId)
          .single(),
        
        // Fetch thermal receipts with items in a single query
        supabase
          .from("thermal_receipts")
          .select(`
            *,
            thermal_receipt_items (*)
          `)
          .eq("user_id", dataUserId)
          .order("created_at", { ascending: false }),
        
        // Fetch products
        supabase
          .from("products")
          .select("id, name, price, stock_quantity, product_code, current_stock, is_returnable")
          .eq("user_id", dataUserId)
          .order("name"),
        
        // Fetch services
        supabase
          .from("services")
          .select("id, name, price, service_code")
          .eq("user_id", dataUserId)
          .order("name"),
        
        // Fetch clients
        supabase
          .from("clients")
          .select("id, name, contact_person, email, phone")
          .eq("user_id", dataUserId)
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
  }, [notifyError, dataUserId])

  useEffect(() => {
    if (!userIdLoading && dataUserId) {
      fetchData()
    }
  }, [fetchData, userIdLoading, dataUserId])

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
    
    // Validar stock si se actualiza cantidad y hay product_id
    if (field === "quantity" && updatedItems[index].product_id) {
      const product = products.find(p => p.id === updatedItems[index].product_id)
      if (product) {
        const availableStock = product.current_stock ?? product.stock_quantity ?? 0
        if (value > availableStock) {
          notifyError(`Stock insuficiente. Solo hay ${availableStock} unidad(es) disponible(s) de "${product.name}"`)
          // Limitar cantidad al stock disponible
          updatedItems[index].quantity = availableStock
          value = availableStock
        }
      }
    }
    
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

  // Fetch client's returnable balance (Módulo F)
  const fetchClientReturnables = async (clientId: string) => {
    if (!clientId || !dataUserId) {
      setClientReturnablesBalance([])
      setShowReturnablesSection(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('client_returnables_balances')
        .select('product_id, product_name, balance')
        .eq('client_id', clientId)
        .eq('user_id', dataUserId)

      if (!error && data && data.length > 0) {
        setClientReturnablesBalance(data)
        setShowReturnablesSection(true)
      } else {
        setClientReturnablesBalance([])
        setShowReturnablesSection(false)
      }
    } catch (err) {
      console.warn('Returnables table may not exist:', err)
      setClientReturnablesBalance([])
      setShowReturnablesSection(false)
    }
  }

  // Handle adding a returned item
  const addReturnedItem = (productId: string, productName: string) => {
    const existing = returnedItems.find(r => r.product_id === productId)
    if (existing) {
      setReturnedItems(returnedItems.map(r => 
        r.product_id === productId ? {...r, quantity: r.quantity + 1} : r
      ))
    } else {
      setReturnedItems([...returnedItems, { product_id: productId, product_name: productName, quantity: 1 }])
    }
  }

  // Handle updating returned item quantity
  const updateReturnedQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setReturnedItems(returnedItems.filter(r => r.product_id !== productId))
    } else {
      setReturnedItems(returnedItems.map(r => 
        r.product_id === productId ? {...r, quantity} : r
      ))
    }
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
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) {
        return
      }

      const { subtotal, tax_amount, total_amount, change_amount } = calculateTotals()
      
      if (total_amount <= 0) {
        notifyError("Debe agregar al menos un producto con precio válido")
        return
      }

      // Validar que pendiente requiere cliente registrado
      if (paymentStatus === 'pendiente' && !selectedClientId) {
        notifyError("Para ventas pendientes debe seleccionar un cliente registrado")
        setSaving(false)
        return
      }

      // Validar descuentos para empleados (máximo 20%)
      console.log("🔍 Validación de descuento - isOwner:", permissions.isOwner, "| generalDiscountPercentage:", generalDiscountPercentage, "| generalDiscountAmount:", generalDiscountAmount)
      
      if (!permissions.isOwner) {
        // Validar descuento por porcentaje
        if (generalDiscountPercentage > 20) {
          console.log("❌ Descuento por porcentaje rechazado:", generalDiscountPercentage)
          notifyError("Los empleados solo pueden aplicar descuentos de hasta el 20%")
          setSaving(false)
          return
        }
        
        // Validar descuento por monto fijo
        if (generalDiscountAmount > 0) {
          const discountPercentage = (generalDiscountAmount / subtotal) * 100
          console.log("💰 Descuento fijo equivalente:", discountPercentage.toFixed(2) + "%")
          if (discountPercentage > 20) {
            console.log("❌ Descuento fijo rechazado - supera 20%")
            notifyError(`Descuento no permitido. El descuento supera el 20% permitido. Descuento máximo: ${formatCurrency(subtotal * 0.20)}`)
            setSaving(false)
            return
          }
        }
        console.log("✅ Descuento aprobado para empleado")
      } else {
        console.log("👑 Usuario es propietario - sin límite de descuento")
      }

      // Validar stock disponible antes de guardar
      const itemsToValidate = items.filter(item => item.product_id && item.quantity > 0)
      for (const item of itemsToValidate) {
        const product = products.find(p => p.id === item.product_id)
        if (product) {
          const availableStock = product.current_stock ?? product.stock_quantity ?? 0
          if (item.quantity > availableStock) {
            notifyError(`Stock insuficiente de "${product.name}". Disponible: ${availableStock}, Solicitado: ${item.quantity}`)
            setSaving(false)
            return
          }
        }
      }

      const verification_code = generateVerificationCode()
      const receipt_number = `TRM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
      
      // Use a fallback URL for local development
      const baseUrl = window.location.origin.includes('localhost') 
        ? 'https://tu-dominio-futuro.com' // Cambia esto por tu dominio de producción
        : window.location.origin
      const qr_url = `${baseUrl}/system-info`

      // Save thermal receipt
      const { data: receiptData, error: receiptError } = await supabase
        .from("thermal_receipts")
        .insert({
          user_id: dataUserId,
          receipt_number,
          client_id: selectedClientId || null,
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
          notes: notes || null,
          status: paymentStatus === 'pendiente' ? 'pendiente' : 'active'
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

      // Verify receipt was created
      if (!(receiptData as any)?.id) {
        throw new Error("No se pudo obtener el ID del recibo creado")
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

      if (itemsToSave.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from("thermal_receipt_items")
          .insert(itemsToSave)
          .select()

        if (itemsError) {
          console.error("Error inserting items:", itemsError)
          throw itemsError
        }

        console.log("Items inserted successfully:", itemsData)
      }

      // Si el estado es pendiente, crear cuenta por cobrar
      if (paymentStatus === 'pendiente' && selectedClientId) {
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 15) // Vencimiento en 15 días

        const { error: arError } = await supabase
          .from("accounts_receivable")
          .insert({
            user_id: dataUserId,
            client_id: selectedClientId,
            thermal_receipt_id: (receiptData as any).id,
            document_number: receipt_number,
            description: `Cuenta por cobrar - Recibo ${receipt_number}`,
            total_amount: total_amount,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: dueDate.toISOString().split('T')[0],
            payment_terms: 15,
            status: 'pendiente'
          })

        if (arError) {
          console.warn("No se pudo crear cuenta por cobrar:", arError.message)
        } else {
          console.log("Cuenta por cobrar creada para recibo:", receipt_number)
        }
      }

      // Módulo F: Registrar movimientos de retornables
      if (selectedClientId) {
        const returnablesEntries: any[] = []
        
        // 1. Registrar entregas - productos retornables vendidos
        for (const item of items) {
          if (item.product_id) {
            const product = products.find(p => p.id === item.product_id)
            if (product?.is_returnable && item.quantity > 0) {
              returnablesEntries.push({
                user_id: dataUserId,
                client_id: selectedClientId,
                product_id: item.product_id,
                transaction_type: 'entrega',
                quantity: item.quantity,
                reference_type: 'recibo_termico',
                reference_id: (receiptData as any).id,
                notes: `Entrega con recibo ${receipt_number}`
              })
            }
          }
        }

        // 2. Registrar devoluciones
        for (const returned of returnedItems) {
          if (returned.quantity > 0) {
            returnablesEntries.push({
              user_id: dataUserId,
              client_id: selectedClientId,
              product_id: returned.product_id,
              transaction_type: 'devolucion',
              quantity: returned.quantity,
              reference_type: 'recibo_termico',
              reference_id: (receiptData as any).id,
              notes: `Devolución con recibo ${receipt_number}`
            })
          }
        }

        // Insertar todos los movimientos de retornables
        if (returnablesEntries.length > 0) {
          const { error: retErr } = await supabase
            .from('client_returnables_ledger')
            .insert(returnablesEntries)

          if (retErr) {
            console.warn("No se pudieron registrar movimientos de retornables:", retErr.message)
          } else {
            console.log(`Registrados ${returnablesEntries.length} movimientos de retornables`)
          }
        }
      }

      // Reset form
      setClientName("")
      setPaymentMethod("cash")
      setPaymentStatus("pagado")
      setAmountReceived(0)
      setNotes("")
      setIncludeItbis(true)
      setNcf("")
      setItems([{ item_name: "", quantity: 1, unit_price: 0, line_total: 0 }])
      setGeneralDiscountPercentage(0)
      setGeneralDiscountAmount(0)
      setReturnedItems([])
      setClientReturnablesBalance([])
      setShowReturnablesSection(false)
      setSelectedClientId("")
      setClientType("occasional")

      notifySuccess("Recibo térmico creado exitosamente")
      await fetchData()

      // Generate and print receipt with company data - AUTO IMPRESIÓN
      const fullReceipt = { ...(receiptData as any), items: itemsToSave }
      const companyData = profile ? {
        name: profile.company_name || "MI EMPRESA",
        phone: profile.company_phone || "",
        rnc: profile.tax_id || "",
        address: profile.company_address || "",
        logo: profile.company_logo || undefined
      } : undefined
      
      // Auto-imprimir el recibo automáticamente después de crearlo
      await printThermalReceiptPDF(fullReceipt, companyData)

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
      toast({
        title: "Permiso denegado",
        description: "No tienes permisos para eliminar recibos",
        variant: "destructive"
      })
      return
    }

    setDeleteConfirm({show: true, id: receiptId})
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.id) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('thermal_receipts')
        .delete()
        .eq('id', deleteConfirm.id)

      if (error) throw error

      notifySuccess("Recibo eliminado exitosamente")
      await fetchData()
    } catch (error) {
      console.error("Error deleting receipt:", error)
      notifyError("Error al eliminar el recibo")
    } finally {
      setIsDeleting(false)
      setDeleteConfirm({show: false, id: null})
    }
  }

  // Convertir recibo a crédito
  const handleConvertToCredit = async (receipt: ThermalReceipt) => {
    if (!dataUserId) return
    
    // Verificar que el recibo no sea ya crédito
    if (receipt.payment_method === 'credit') {
      notifyError("Este recibo ya es a crédito")
      return
    }
    
    // Verificar que tenga cliente registrado
    if (!receipt.client_id) {
      notifyError("Solo se puede dar crédito a clientes registrados. Este recibo no tiene cliente asignado.")
      return
    }
    
    try {
      // Verificar si ya existe una cuenta por cobrar para este recibo
      const { data: existingAR } = await supabase
        .from('accounts_receivable')
        .select('id')
        .eq('thermal_receipt_id', receipt.id)
        .single()
      
      if (existingAR) {
        notifyError("Ya existe una cuenta por cobrar para este recibo")
        return
      }
      
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 15) // Vencimiento en 15 días
      
      // Crear cuenta por cobrar
      const { error: arError } = await supabase
        .from('accounts_receivable')
        .insert({
          user_id: dataUserId,
          client_id: receipt.client_id,
          thermal_receipt_id: receipt.id,
          document_number: receipt.receipt_number,
          description: `Crédito por recibo térmico ${receipt.receipt_number}`,
          total_amount: receipt.total_amount,
          issue_date: new Date().toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          payment_terms: 15,
          status: 'pendiente'
        })
      
      if (arError) {
        throw arError
      }
      
      // Actualizar el recibo a crédito
      const { error: updateError } = await supabase
        .from('thermal_receipts')
        .update({ payment_method: 'credit' })
        .eq('id', receipt.id)
      
      if (updateError) {
        throw updateError
      }
      
      notifySuccess(`Recibo ${receipt.receipt_number} convertido a crédito. Se creó cuenta por cobrar por ${formatCurrency(receipt.total_amount)}`)
      setSelectedReceipt(null)
      await fetchData()
    } catch (error: any) {
      console.error('Error converting to credit:', error)
      notifyError(error.message || "Error al convertir a crédito")
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
      <div className="flex items-center justify-center min-h-96 bg-slate-900">
        <div className="text-lg text-blue-600">Cargando facturas térmicas...</div>
      </div>
    )
  }

  // Calculate totals for the form
  const { subtotal, tax_amount, total_amount, change_amount } = calculateTotals()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
        {/* Header Principal Reorganizado */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-50/30 to-purple-50/20 backdrop-blur-sm rounded-2xl lg:rounded-3xl border border-white/20 shadow-xl p-4 lg:p-6 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-pink-600/5 rounded-2xl lg:rounded-3xl"></div>
          <div className="absolute top-0 right-0 w-32 h-32 lg:w-64 lg:h-64 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full -translate-y-16 translate-x-16 lg:-translate-y-32 lg:translate-x-32"></div>
          
          <div className="relative z-10 space-y-4">
            {/* Title Section */}
            <div className="flex items-start gap-3 lg:gap-4">
              <div className="relative flex-shrink-0">
                <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-3 lg:p-4 rounded-2xl lg:rounded-3xl shadow-lg">
                  <Receipt className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full p-1 lg:p-1.5 shadow-md">
                  <Sparkles className="h-2.5 w-2.5 lg:h-3 lg:w-3 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl lg:text-3xl font-black bg-gradient-to-r from-blue-700 via-blue-600 to-purple-700 bg-clip-text text-transparent leading-tight">
                      Recibos Térmicos
                    </h1>
                    <p className="text-xs lg:text-sm text-slate-400 mt-1">Sistema profesional de facturación</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-800 px-2 lg:px-3 py-1 rounded-full flex-shrink-0">
                    <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <span className="text-blue-400 text-xs lg:text-sm font-semibold">80mm</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats - Reorganizado para móvil */}
            {receipts.length > 0 && (
              <div className="grid grid-cols-3 gap-2 lg:gap-3">
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-2 lg:p-3 border border-blue-100">
                  <div className="flex items-center gap-1.5 lg:gap-2 mb-1">
                    <BarChart3 className="h-3 w-3 lg:h-4 lg:w-4 text-blue-600 flex-shrink-0" />
                    <span className="text-[10px] lg:text-xs text-blue-600 font-medium">Recibos</span>
                  </div>
                  <p className="text-sm lg:text-lg font-bold text-blue-400 truncate">{receipts.length}</p>
                </div>
                <div className="bg-green-900/30/50 backdrop-blur-sm rounded-xl p-2 lg:p-3 border border-green-100">
                  <div className="flex items-center gap-1.5 lg:gap-2 mb-1">
                    <DollarSign className="h-3 w-3 lg:h-4 lg:w-4 text-green-600 flex-shrink-0" />
                    <span className="text-[10px] lg:text-xs text-green-600 font-medium">Total</span>
                  </div>
                  <p className="text-xs lg:text-base font-bold text-green-400 truncate">{formatCurrency(receipts.reduce((sum, r) => sum + r.total_amount, 0))}</p>
                </div>
                <div className="bg-purple-900/30/50 backdrop-blur-sm rounded-xl p-2 lg:p-3 border border-purple-100">
                  <div className="flex items-center gap-1.5 lg:gap-2 mb-1">
                    <Clock className="h-3 w-3 lg:h-4 lg:w-4 text-purple-600 flex-shrink-0" />
                    <span className="text-[10px] lg:text-xs text-purple-600 font-medium">Hoy</span>
                  </div>
                  <p className="text-sm lg:text-lg font-bold text-purple-400 truncate">{todayReceipts.length}</p>
                </div>
              </div>
            )}

            {/* Company Info - Reorganizado */}
            {profile ? (
              <Card className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 border-slate-700 backdrop-blur-sm border-green-800/50 shadow-sm">
                <CardContent className="p-3 lg:p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-slate-800 p-2 rounded-lg flex-shrink-0">
                        <Building2 className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500">Empresa</p>
                        <p className="font-semibold text-sm lg:text-base text-slate-200 truncate">{profile.company_name || "Sin nombre"}</p>
                      </div>
                    </div>
                    {profile.company_phone && (
                      <div className="flex items-center gap-2">
                        <div className="bg-green-900/30 p-2 rounded-lg flex-shrink-0">
                          <Phone className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-green-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500">Teléfono</p>
                          <p className="font-medium text-sm lg:text-base text-slate-200 truncate">{profile.company_phone}</p>
                        </div>
                      </div>
                    )}
                    {profile.tax_id && (
                      <div className="flex items-center gap-2">
                        <div className="bg-orange-900/30 p-2 rounded-lg flex-shrink-0">
                          <FileText className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-orange-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500">RNC</p>
                          <p className="font-medium text-sm lg:text-base text-slate-200 truncate">{profile.tax_id}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              ) : (
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 border-orange-800/50 shadow-lg">
                  <CardContent className="p-4 lg:p-5">
                    <div className="flex items-start gap-3 lg:gap-4">
                      <div className="relative flex-shrink-0">
                        <div className="bg-gradient-to-br from-orange-500 to-red-500 p-2.5 lg:p-3 rounded-xl shadow-md">
                          <AlertCircle className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                        </div>
                        <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 animate-pulse">
                          <div className="w-1.5 h-1.5 bg-slate-900 rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 space-y-3">
                        <div>
                          <h3 className="text-base lg:text-lg font-bold text-orange-300 mb-1">Configuración Inicial Requerida</h3>
                          <p className="text-xs lg:text-sm text-orange-400 leading-relaxed">
                            Configura la información básica de tu empresa para comenzar a usar el sistema.
                          </p>
                        </div>
                        
                        <div className="bg-orange-900/30/50 rounded-lg p-3 border border-orange-800">
                          <h4 className="font-semibold text-xs lg:text-sm text-orange-300 mb-2 flex items-center">
                            <CheckCircle2 className="h-3.5 w-3.5 lg:h-4 lg:w-4 mr-1.5" />
                            Datos necesarios:
                          </h4>
                          <ul className="text-xs text-orange-400 space-y-0.5 ml-4 lg:ml-5">
                            <li>• Nombre de empresa</li>
                            <li>• RNC o identificación fiscal</li>
                            <li>• Dirección y teléfono</li>
                            <li>• Moneda predeterminada</li>
                          </ul>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2 pt-1">
                          <Button asChild
                            size="sm"
                            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-md flex-1"
                          >
                            <Link href="/settings" className="flex items-center justify-center">
                              <Building2 className="mr-2 h-3.5 w-3.5 lg:h-4 lg:w-4" />
                              <span className="text-xs lg:text-sm">Configurar Empresa</span>
                            </Link>
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                            className="border-orange-300 text-orange-400 hover:bg-orange-900/30 flex-1"
                            onClick={() => {
                              document.querySelector('[data-section="new-receipt"]')?.scrollIntoView({ behavior: 'smooth' })
                            }}
                          >
                            <Eye className="mr-2 h-3.5 w-3.5 lg:h-4 lg:w-4" />
                            <span className="text-xs lg:text-sm">Ver Demo</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* Botón CTA Principal */}
            <div className="flex flex-col sm:flex-row gap-2 lg:gap-3" data-section="new-receipt">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-4 lg:px-8 py-2.5 lg:py-3 text-sm lg:text-base font-semibold relative overflow-hidden group w-full">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10 flex items-center justify-center">
                      <Plus className="mr-2 lg:mr-3 h-4 w-4 lg:h-5 lg:w-5 group-hover:rotate-90 transition-transform duration-300" />
                      <span>Nueva Factura Térmica</span>
                      <Sparkles className="ml-2 h-3.5 w-3.5 lg:h-4 lg:w-4 animate-pulse" />
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 h-[75vh]">
              {/* Columna izquierda - Formulario */}
              <div className="col-span-1 lg:col-span-2 overflow-y-auto pr-0 lg:pr-4">
                <form className="space-y-4 lg:space-y-6">
              {/* Client Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Cliente</Label>
                  <Select 
                    value={clientType} 
                    onValueChange={(value: "registered" | "occasional") => {
                      setClientType(value)
                      if (value === "occasional") {
                        setSelectedClientId("")
                        setClientName("")
                        setClientReturnablesBalance([])
                        setReturnedItems([])
                        setShowReturnablesSection(false)
                      }
                    }}
                  >
                    <SelectTrigger className="border-slate-700 focus:border-blue-500">
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
                          fetchClientReturnables(value)
                          setReturnedItems([]) // Reset returned items on client change
                        }}
                      >
                        <SelectTrigger className="border-slate-700 focus:border-blue-500">
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
                        className="border-slate-700 focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                <div>
                  <Label htmlFor="paymentMethod">Método de Pago</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="border-slate-700 focus:border-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">💵 Efectivo</SelectItem>
                      <SelectItem value="card">💳 Tarjeta</SelectItem>
                      <SelectItem value="transfer">🏦 Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="paymentStatus">Estado de Pago</Label>
                  <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as "pagado" | "pendiente")}>
                    <SelectTrigger className="border-slate-700 focus:border-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pagado">✅ Pagado</SelectItem>
                      <SelectItem value="pendiente">⏰ Pendiente (Cuenta por Cobrar)</SelectItem>
                    </SelectContent>
                  </Select>
                  {paymentStatus === 'pendiente' && !selectedClientId && (
                    <p className="text-xs text-amber-500 mt-1">⚠️ Requiere cliente registrado</p>
                  )}
                  {paymentStatus === 'pendiente' && selectedClientId && (
                    <p className="text-xs text-green-500 mt-1">✓ Se creará cuenta por cobrar</p>
                  )}
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

              {/* NCF Field (Comprobante Fiscal) */}
              {includeItbis && (
                <div>
                  <Label htmlFor="ncf">Comprobante Fiscal (NCF)</Label>
                  <Input
                    id="ncf"
                    value={ncf}
                    onChange={(e) => setNcf(e.target.value.toUpperCase())}
                    placeholder="B0100000000"
                    className="uppercase"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Requerido para reportes fiscales 607
                  </p>
                </div>
              )}

              {/* Materiales Retornables Section (Módulo F) */}
              {clientType === "registered" && selectedClientId && showReturnablesSection && (
                <div className="p-4 rounded-lg bg-blue-950/30 border border-blue-800">
                  <div className="flex justify-between items-center mb-3">
                    <Label className="text-blue-300 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Envases del Cliente
                    </Label>
                  </div>
                  
                  {/* Balance actual */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                    {clientReturnablesBalance.map(item => (
                      <div key={item.product_id} className={`p-2 rounded ${item.balance < 0 ? 'bg-red-900/30' : 'bg-slate-800'}`}>
                        <p className="text-xs text-slate-400">{item.product_name}</p>
                        <p className={`font-bold ${item.balance < 0 ? 'text-red-400' : 'text-blue-400'}`}>
                          Tiene: {item.balance}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Devolver envases */}
                  <div className="pt-3 border-t border-blue-700">
                    <p className="text-xs text-slate-400 mb-2">Registrar devolución de envases:</p>
                    <div className="flex flex-wrap gap-2">
                      {clientReturnablesBalance.filter(b => b.balance > 0).map(item => (
                        <Button
                          key={item.product_id}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => addReturnedItem(item.product_id, item.product_name)}
                          className="text-xs border-green-700 text-green-400 hover:bg-green-900/30"
                        >
                          <ArrowDownCircle className="w-3 h-3 mr-1" />
                          Devolver {item.product_name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Items devueltos */}
                  {returnedItems.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-blue-700">
                      <p className="text-xs text-green-400 mb-2">📦 Envases a devolver:</p>
                      <div className="space-y-2">
                        {returnedItems.map(item => (
                          <div key={item.product_id} className="flex items-center justify-between bg-green-900/20 p-2 rounded">
                            <span className="text-sm text-green-300">{item.product_name}</span>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => updateReturnedQuantity(item.product_id, item.quantity - 1)}
                                className="h-6 w-6 p-0"
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="text-green-400 font-bold w-8 text-center">{item.quantity}</span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => updateReturnedQuantity(item.product_id, item.quantity + 1)}
                                className="h-6 w-6 p-0"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 p-3 border border-slate-700 rounded-lg bg-slate-900">
                      <div className="col-span-1 sm:col-span-2 lg:col-span-2">
                        <Input
                          placeholder="Nombre del producto/servicio"
                          value={item.item_name}
                          onChange={(e) => updateItem(index, "item_name", e.target.value)}
                          className="border-slate-700 text-sm lg:text-base"
                        />
                        <Select onValueChange={(value) => {
                          const [type, id] = value.split('|')
                          if (type && id) {
                            selectProductOrService(index, type as 'product' | 'service', id)
                          }
                        }}>
                          <SelectTrigger className="mt-1 border-slate-700">
                            <SelectValue placeholder="Seleccionar producto/servicio" />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="p-2 border-b sticky top-0 bg-slate-900 z-10">
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
                                {getFilteredProducts(index).map(product => {
                                  const stock = product.current_stock ?? product.stock_quantity ?? 0
                                  const isLowStock = stock > 0 && stock <= 10
                                  const isOutOfStock = stock <= 0
                                  return (
                                    <SelectItem 
                                      key={product.id} 
                                      value={`product|${product.id}`}
                                      disabled={isOutOfStock}
                                      className={isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <span>
                                          {product.product_code ? `[${product.product_code}] ` : ''}{product.name} - {formatCurrency(product.price)}
                                        </span>
                                        <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded ${
                                          isOutOfStock ? 'bg-red-900/30 text-red-400' : 
                                          isLowStock ? 'bg-yellow-100 text-yellow-700' : 
                                          'bg-green-900/30 text-green-400'
                                        }`}>
                                          {isOutOfStock ? 'Agotado' : `${stock} disponible${stock !== 1 ? 's' : ''}`}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  )
                                })}
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
                          className="border-slate-700"
                        />
                      </div>
                      <div>
                        {item.product_id ? (
                          <ProductPriceDropdown
                            productId={item.product_id}
                            selectedPriceId={item.selected_price_id}
                            quantity={item.quantity}
                            onPriceSelect={(priceId: string, priceValue: number) => handlePriceSelect(index, priceId, priceValue)}
                            className="border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                          />
                        ) : item.service_id ? (
                          <ServicePriceDropdown
                            serviceId={item.service_id}
                            selectedPriceId={item.selected_price_id}
                            quantity={item.quantity}
                            onPriceSelect={(priceId: string, priceValue: number) => handlePriceSelect(index, priceId, priceValue)}
                            className="border-slate-700 focus:border-blue-500 focus:ring-blue-500"
                          />
                        ) : (
                          <Input
                            type="number"
                            placeholder="Precio unitario"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="border-slate-700"
                          />
                        )}
                      </div>
                      <div>
                        <Input
                          value={formatCurrency(item.line_total)}
                          readOnly
                          className="bg-slate-800 border-slate-700"
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
              <div className="space-y-4 p-4 bg-green-900/30 rounded-lg border border-green-800">
                <div>
                  <Label className="text-green-400 font-semibold flex items-center">
                    <Percent className="h-4 w-4 mr-2" />
                    Descuentos
                  </Label>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="discountType" className="text-sm">Tipo de Descuento</Label>
                    <Select value={generalDiscountType} onValueChange={(value) => setGeneralDiscountType(value as "percentage" | "amount")}>
                      <SelectTrigger className="border-green-800 focus:border-green-500">
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
                        className="border-green-800 focus:border-green-500"
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
                        className="border-green-800 focus:border-green-500"
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
                      className="border-green-800 text-green-600 hover:bg-green-900/30 w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Limpiar
                    </Button>
                  </div>
                </div>
                
                {(generalDiscountPercentage > 0 || generalDiscountAmount > 0) && (
                  <div className="text-sm text-green-400 bg-green-900/30 p-2 rounded">
                    <strong>Descuento aplicado: {formatCurrency(calculateTotals().discountTotal)}</strong>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
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
                      className="border-slate-700 focus:border-blue-500"
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
                  className="border-slate-700 focus:border-blue-500"
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
                    setNcf("")
                    setItems([{ item_name: "", quantity: 1, unit_price: 0, line_total: 0 }])
                    setGeneralDiscountPercentage(0)
                    setGeneralDiscountAmount(0)
                  }}
                  className="border-slate-700 text-blue-600 hover:bg-slate-900"
                >
                  Limpiar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={generatePreview}
                  disabled={total_amount <= 0}
                  className="border-slate-700 text-blue-600 hover:bg-slate-900"
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
          <div className="col-span-1 overflow-y-auto border-l-0 lg:border-l border-slate-800 pl-0 lg:pl-4 mt-4 lg:mt-0">
            <div className="sticky top-0 bg-slate-900 pb-4 border-b border-slate-800 mb-4">
              <h3 className="font-semibold text-slate-200 text-center">Vista Previa</h3>
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
              ncf={ncf}
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
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 border-0 shadow-xl">
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
                  <h2 className="text-2xl lg:text-3xl font-bold text-slate-200 mb-2">¡Todo listo para empezar!</h2>
                  <p className="text-slate-400 text-lg max-w-2xl mx-auto">
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
                <h2 className="text-xl lg:text-2xl font-bold text-slate-200 flex items-center">
                  <BarChart3 className="mr-2 lg:mr-3 h-5 lg:h-6 w-5 lg:w-6 text-blue-600" />
                  Panel de Control
                </h2>
                <p className="text-slate-400 mt-1 text-sm lg:text-base">Resumen de tu actividad de facturación</p>
              </div>
              <div className="flex items-center space-x-2 bg-green-900/30 px-4 py-2 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-400 font-semibold text-sm">Datos actualizados</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-6">
              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-slate-800/30 rounded-full -translate-y-10 translate-x-10"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                  <CardTitle className="text-sm font-semibold text-blue-400">Total Recibos</CardTitle>
                  <div className="bg-slate-800 p-3 rounded-xl shadow-md">
                    <Receipt className="h-5 w-5 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-2xl lg:text-3xl font-bold text-blue-300 mb-1">{receipts.length}</div>
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
              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-green-900/30/30 rounded-full -translate-y-10 translate-x-10"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                  <CardTitle className="text-sm font-semibold text-green-400">Ingresos Hoy</CardTitle>
                  <div className="bg-green-900/30 p-3 rounded-xl shadow-md">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-2xl lg:text-3xl font-bold text-green-300 mb-1">{formatCurrency(todayAmount)}</div>
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
              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-purple-900/30/30 rounded-full -translate-y-10 translate-x-10"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                  <CardTitle className="text-sm font-semibold text-purple-400">Última Semana</CardTitle>
                  <div className="bg-purple-900/30 p-3 rounded-xl shadow-md">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-2xl lg:text-3xl font-bold text-purple-300 mb-1">{formatCurrency(weeklyAmount)}</div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-purple-600 font-medium">📅 {weeklyReceipts.length} recibos</p>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3 text-purple-500" />
                      <span className="text-xs text-purple-600 font-semibold">7d</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
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
              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-orange-900/30/30 rounded-full -translate-y-10 translate-x-10"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                  <CardTitle className="text-sm font-semibold text-orange-400">Efectivo</CardTitle>
                  <div className="bg-orange-900/30 p-3 rounded-xl shadow-md">
                    <Wallet className="h-5 w-5 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-2xl lg:text-3xl font-bold text-orange-300 mb-1">{receipts.filter(r => r.payment_method === 'cash').length}</div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-orange-600 font-medium">💵 {formatCurrency(receipts.filter(r => r.payment_method === 'cash').reduce((sum, r) => sum + r.total_amount, 0))}</p>
                    <Banknote className="h-3 w-3 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
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
              
              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-amber-900/30 rounded-full -translate-y-10 translate-x-10"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                  <CardTitle className="text-sm font-semibold text-amber-400">Créditos</CardTitle>
                  <div className="bg-amber-900/30 p-3 rounded-xl shadow-md">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-2xl lg:text-3xl font-bold text-amber-300 mb-1">{receipts.filter(r => r.payment_method === 'credit').length}</div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-amber-600 font-medium">⏰ {formatCurrency(receipts.filter(r => r.payment_method === 'credit').reduce((sum, r) => sum + r.total_amount, 0))}</p>
                    <div className="flex items-center space-x-1">
                      <AlertCircle className="h-3 w-3 text-amber-500" />
                      <span className="text-xs text-amber-600 font-semibold">Por cobrar</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Search and Filters Mejorados */}
      <Card className="bg-slate-900 border-slate-700 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-slate-900/80 via-slate-800/60 to-slate-900/80 border-slate-700 rounded-t-2xl border-b border-blue-100/50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
          <div className="relative z-10">
            <CardTitle className="text-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-3 rounded-2xl shadow-lg">
                  <Search className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
                    Buscar y Filtrar Recibos
                  </span>
                  <p className="text-slate-400 text-sm mt-1">Encuentra recibos específicos rápidamente</p>
                </div>
              </div>
              {receipts.length > 0 && (
                <div className="flex items-center space-x-2 bg-slate-800 px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-blue-400 font-semibold text-sm">{filteredReceipts.length} de {receipts.length}</span>
                </div>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-8 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-slate-300 font-semibold flex items-center">
                <Search className="h-4 w-4 mr-2 text-blue-600" />
                Buscar Recibo
              </Label>
              <div className="relative">
                <Input
                  id="search"
                  placeholder="Número de recibo, cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 pl-10 py-3 rounded-xl shadow-sm"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="statusFilter" className="text-slate-300 font-semibold flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                Estado
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 py-3 rounded-xl shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📊 Todos los estados</SelectItem>
                  <SelectItem value="active">✅ Pagados</SelectItem>
                  <SelectItem value="pendiente">⏰ Pendientes</SelectItem>
                  <SelectItem value="cancelled">❌ Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="paymentFilter" className="text-slate-300 font-semibold flex items-center">
                <Wallet className="h-4 w-4 mr-2 text-purple-600" />
                Método de Pago
              </Label>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 py-3 rounded-xl shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">💳 Todos los métodos</SelectItem>
                  <SelectItem value="cash">💵 Efectivo</SelectItem>
                  <SelectItem value="card">💳 Tarjeta</SelectItem>
                  <SelectItem value="transfer">🏦 Transferencia</SelectItem>
                  <SelectItem value="credit">⏰ Crédito (Pendiente)</SelectItem>
                  <SelectItem value="paid_credit">✅ Crédito Pagado</SelectItem>
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
                className="border-slate-700 text-slate-300 hover:bg-slate-950 hover:border-gray-400 py-3 rounded-xl shadow-sm transition-all duration-200"
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
      <Card className="border-slate-700">
        <CardHeader className="bg-slate-900">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-blue-600">Recibos Térmicos</CardTitle>
              <CardDescription>
                {filteredReceipts.length} de {receipts.length} recibos
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="border-slate-700">
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
                <div key={receipt.id} className="flex items-center justify-between p-4 border border-slate-700 rounded-lg bg-slate-900 hover:bg-slate-800 transition-colors">
                  <div className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <div>
                        <div className="font-semibold text-blue-400">{receipt.receipt_number}</div>
                        <div className="text-sm text-blue-600">{receipt.client_name}</div>
                      </div>
                      <div>
                        <div className="font-medium text-blue-400">{formatCurrency(receipt.total_amount)}</div>
                        <div className="text-sm text-blue-600 capitalize flex items-center space-x-1">
                          {receipt.payment_method === 'cash' && <Banknote className="h-3 w-3" />}
                          {receipt.payment_method === 'card' && <CreditCard className="h-3 w-3" />}
                          {receipt.payment_method === 'credit' && <Clock className="h-3 w-3 text-amber-500" />}
                          {receipt.payment_method === 'paid_credit' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                          <span>{
                            receipt.payment_method === 'cash' ? 'Efectivo' : 
                            receipt.payment_method === 'card' ? 'Tarjeta' : 
                            receipt.payment_method === 'credit' ? 'Crédito' : 
                            receipt.payment_method === 'paid_credit' ? 'Crédito Pagado' :
                            'Transferencia'
                          }</span>
                        </div>
                      </div>
                      <div>
                        <Badge 
                          variant={receipt.status === 'pendiente' ? 'destructive' : receipt.status === 'active' ? 'default' : 'secondary'}
                          className={
                            receipt.status === 'pendiente' ? 'bg-amber-600/30 text-amber-300' :
                            receipt.status === 'active' ? 'bg-green-900/30 text-green-300' : 
                            'bg-slate-800 text-slate-200'
                          }
                        >
                          {receipt.status === 'pendiente' ? '⏰ Pendiente' : receipt.status === 'active' ? '✅ Pagado' : '❌ Cancelado'}
                        </Badge>
                      </div>
                      <div className="text-sm text-blue-600">
                        <div>{new Date(receipt.created_at).toLocaleDateString()}</div>
                        <div>{new Date(receipt.created_at).toLocaleTimeString()}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-blue-400">
                          {receipt.items?.length || 0} items
                        </div>
                        <div className="text-xs text-blue-600">
                          Código: {receipt.verification_code}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    {/* Botón de crédito solo si no es ya crédito */}
                    {receipt.payment_method !== 'credit' && receipt.payment_method !== 'paid_credit' && receipt.client_id && (
                      <Button
                        size="sm"
                        onClick={() => handleConvertToCredit(receipt)}
                        className="bg-amber-600 hover:bg-amber-700"
                        title="Dar crédito"
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedReceipt(receipt)}
                      className="border-slate-700 text-blue-600 hover:bg-slate-900"
                      title="Ver detalles"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePreviewReceipt(receipt)}
                      className="border-purple-800 text-purple-600 hover:bg-purple-900/30"
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
                      className="border-green-800 text-green-600 hover:bg-green-900/30"
                      title="Descargar PDF"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {canDelete('thermalReceipts') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteReceipt(receipt.id)}
                        className="border-red-800 text-red-600 hover:bg-red-900/30"
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
                  <h4 className="font-semibold text-blue-400 mb-3">Información del Recibo</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cliente:</span>
                      <span className="font-medium">{selectedReceipt.client_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Fecha:</span>
                      <span>{new Date(selectedReceipt.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hora:</span>
                      <span>{new Date(selectedReceipt.created_at).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Método de Pago:</span>
                      <span className="capitalize">{selectedReceipt.payment_method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Estado:</span>
                      <Badge variant={selectedReceipt.status === 'pendiente' ? 'outline' : selectedReceipt.status === 'active' ? 'default' : 'secondary'}>
                        {selectedReceipt.status === 'pendiente' ? '⏰ Pendiente' : selectedReceipt.status === 'active' ? '✅ Pagado' : '❌ Cancelado'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-blue-400 mb-3">Código QR</h4>
                  <div className="text-center">
                    <div className="w-32 h-32 mx-auto bg-slate-900 border-2 border-slate-700 rounded-lg flex items-center justify-center">
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
                <h4 className="font-semibold text-blue-400 mb-3">Items del Recibo</h4>
                <div className="border border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900">
                      <tr>
                        <th className="text-left p-3 text-blue-400">Producto/Servicio</th>
                        <th className="text-center p-3 text-blue-400">Cantidad</th>
                        <th className="text-right p-3 text-blue-400">Precio</th>
                        <th className="text-right p-3 text-blue-400">Total</th>
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
                    <tfoot className="bg-slate-900 border-t border-slate-700">
                      <tr>
                        <td colSpan={3} className="p-3 text-right font-semibold text-blue-400">Subtotal:</td>
                        <td className="p-3 text-right font-semibold">{formatCurrency(selectedReceipt.subtotal)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="p-3 text-right font-semibold text-blue-400">ITBIS (18%):</td>
                        <td className="p-3 text-right font-semibold">{formatCurrency(selectedReceipt.tax_amount)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="p-3 text-right font-bold text-blue-400 text-lg">Total:</td>
                        <td className="p-3 text-right font-bold text-blue-400 text-lg">{formatCurrency(selectedReceipt.total_amount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Payment Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-900 rounded-lg">
                <div>
                  <span className="text-sm text-slate-400">Monto Recibido:</span>
                  <div className="font-semibold text-blue-400">{formatCurrency(selectedReceipt.amount_received)}</div>
                </div>
                <div>
                  <span className="text-sm text-slate-400">Cambio:</span>
                  <div className="font-semibold text-green-600">{formatCurrency(selectedReceipt.change_amount)}</div>
                </div>
              </div>

              {/* Notes */}
              {selectedReceipt.notes && (
                <div>
                  <h4 className="font-semibold text-blue-400 mb-2">Notas</h4>
                  <p className="text-sm text-slate-400 p-3 bg-slate-950 rounded-lg">{selectedReceipt.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-slate-700">
                {/* Convertir a crédito - solo si no es crédito ya */}
                {selectedReceipt.payment_method !== 'credit' && selectedReceipt.payment_method !== 'paid_credit' && (
                  <Button
                    onClick={() => handleConvertToCredit(selectedReceipt)}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Dar Crédito
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => handlePreviewReceipt(selectedReceipt)}
                  className="border-purple-800 text-purple-600 hover:bg-purple-900/30"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Vista Previa
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePrintReceipt(selectedReceipt)}
                  className="border-slate-700 text-blue-600 hover:bg-slate-900"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownloadReceipt(selectedReceipt)}
                  className="border-green-800 text-green-600 hover:bg-green-900/30"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
                {canDelete('thermalReceipts') && (
                  <Button
                    variant="outline"
                    onClick={() => handleDeleteReceipt(selectedReceipt.id)}
                    className="border-red-800 text-red-600 hover:bg-red-900/30"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setSelectedReceipt(null)}
                  className="border-slate-700 text-blue-600 hover:bg-slate-900"
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
              <div className="border-2 border-blue-300 rounded-lg p-4 bg-slate-900 shadow-lg max-w-sm mx-auto" style={{width: '80mm', maxWidth: '300px'}}>
                {/* Header */}
                <div className="text-center border-b border-slate-700 pb-3 mb-3">
                  <div className="mb-2">
                    <div className="w-16 h-16 mx-auto bg-slate-800 rounded-lg flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="text-sm font-bold text-slate-200">
                    {profile?.company_name || "MI EMPRESA"}
                  </div>
                  
                  {/* Always show RNC section with fallback */}
                  <div className="text-xs text-slate-400">
                    RNC: {profile?.tax_id || "000-00000000-0"}
                  </div>
                  
                  {/* Always show address with fallback */}
                  <div className="text-xs text-slate-400">
                    {profile?.company_address || "Dirección de la empresa"}
                  </div>
                  
                  {/* Always show phone with fallback */}
                  <div className="text-xs text-slate-400">
                    Tel: {profile?.company_phone || "000-000-0000"}
                  </div>
                  
                  {/* Show email if available */}
                  {profile?.company_email && (
                    <div className="text-xs text-slate-400">{profile.company_email}</div>
                  )}
                </div>

                {/* Receipt Info */}
                <div className="text-center mb-3">
                  <div className="text-xs font-bold">RECIBO TÉRMICO</div>
                  <div className="text-xs">{previewData.receipt_number}</div>
                  <div className="text-xs">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
                </div>

                {/* Customer */}
                <div className="border-b border-slate-800 pb-2 mb-2">
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
                      <div className="flex justify-between text-slate-400">
                        <span>{item.quantity} x {formatCurrency(item.unit_price)}</span>
                        <span>{formatCurrency(item.line_total)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-slate-700 pt-2 space-y-1">
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
                  <div className="flex justify-between text-sm font-bold border-t border-slate-800 pt-1">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(previewData.total_amount)}</span>
                  </div>
                </div>

                {/* Payment */}
                <div className="border-t border-slate-800 pt-2 mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Método:</span>
                    <span className="capitalize">{previewData.payment_method === 'cash' ? 'Efectivo' : previewData.payment_method === 'card' ? 'Tarjeta' : previewData.payment_method === 'credit' ? 'Crédito' : 'Transferencia'}</span>
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
                <div className="text-center mt-3 pt-2 border-t border-slate-800">
                  <div className="w-16 h-16 mx-auto bg-slate-900 border border-slate-700 rounded flex items-center justify-center mb-2">
                    <QrCode size={40} className="text-slate-400" />
                  </div>
                  <div className="text-xs text-slate-400">
                    Código: {previewData.verification_code}
                  </div>
                </div>

                {/* Notes */}
                {previewData.notes && (
                  <div className="text-center mt-2 pt-2 border-t border-slate-800">
                    <div className="text-xs text-slate-400">{previewData.notes}</div>
                  </div>
                )}

                {/* Footer */}
                <div className="text-center mt-3 pt-2 border-t border-slate-800">
                  <div className="text-xs text-gray-500">¡Gracias por su compra!</div>
                  <div className="text-xs text-gray-500">www.miempresa.com</div>
                </div>
              </div>

              {/* Preview Actions */}
              <div className="flex justify-center space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                  className="border-slate-700 text-blue-600 hover:bg-slate-900"
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

      <ConfirmDialog
        open={deleteConfirm.show}
        onOpenChange={(open) => !open && setDeleteConfirm({ show: false, id: null })}
        title="Eliminar Recibo Térmico"
        description="¿Estás seguro de que deseas eliminar este recibo térmico? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        variant="danger"
        isLoading={isDeleting}
      />
      </div>
    </div>
  )
}