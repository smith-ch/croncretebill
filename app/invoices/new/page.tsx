"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, Plus, Trash2, Percent, DollarSign, FileText, Calculator, ArrowLeft, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react"
import { useCurrency } from "@/hooks/use-currency"
import { useToast } from "@/hooks/use-toast"
import { InvoicePreview } from "@/components/invoices/invoice-preview"
import { ProductPriceDropdown } from "@/components/products/product-price-dropdown"
import { ServicePriceDropdown } from "@/components/services/service-price-dropdown"

interface InvoiceItem {
  id: string
  item_id: string
  item_type: "product" | "service"
  quantity: number
  unit_price: number
  selected_price_id?: string | null // Para tracking del precio seleccionado
}

export default function NewInvoicePage() {
  const router = useRouter()
  const { formatCurrency } = useCurrency()
  const { permissions, validateInvoiceAmount } = useUserPermissions()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [clients, setClients] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState("no-client")
  const [selectedProject, setSelectedProject] = useState("")
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: "item-1", item_id: "", item_type: "product", quantity: 1, unit_price: 0 },
  ])
  const [includeItbis, setIncludeItbis] = useState(false)
  const [ncf, setNcf] = useState("")
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage")
  const [discountValue, setDiscountValue] = useState(0)
  const [companySettings, setCompanySettings] = useState<any>(null)
  const [productSearchTerms, setProductSearchTerms] = useState<{[key: string]: string}>({})
  const [serviceSearchTerms, setServiceSearchTerms] = useState<{[key: string]: string}>({})
  const [invoiceDate, setInvoiceDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [dueDate, setDueDate] = useState(() => {
    const today = new Date()
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    return nextMonth.toISOString().split('T')[0]
  })
  const [notes, setNotes] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("credito")

  useEffect(() => {
    fetchInitialData()
    generateInvoiceNumber()
  }, [])

  const fetchInitialData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError("Usuario no autenticado")
        return
      }

      const [clientsRes, projectsRes, productsRes, servicesRes, companyRes] = await Promise.all([
        supabase.from("clients").select("id, name, rnc, address, phone, email").eq("user_id", user.id).order("name"),
        supabase.from("projects").select("id, name, client_id").eq("user_id", user.id).order("name"),
        supabase.from("products").select("id, name, unit, unit_price, product_code").eq("user_id", user.id).order("name"),
        supabase.from("services").select("id, name, unit, price, service_code").eq("user_id", user.id).order("name"),
        supabase.from("company_settings").select("*").eq("user_id", user.id).single(),
      ])

      setClients(clientsRes.data || [])
      setProjects(projectsRes.data || [])
      setProducts(productsRes.data || [])
      setServices(servicesRes.data || [])
      setCompanySettings(companyRes.data || null)
    } catch (error) {
      console.error("Error fetching data:", error)
      setError("Error al cargar los datos iniciales")
    } finally {
      setFetchLoading(false)
    }
  }

  const generateInvoiceNumber = async () => {
    try {
      const { data, error } = await supabase.rpc("get_next_invoice_number")
      if (error) {
        throw error
      }
      setInvoiceNumber(data)
    } catch (error) {
      console.error("Error generating invoice number:", error)
      setInvoiceNumber(`FAC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setValidationErrors({})

    const formData = new FormData(e.currentTarget)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("Usuario no autenticado")
      }

      // Validate required fields
      const clientId = selectedClient === "no-client" ? null : selectedClient
      const invoiceDate = formData.get("invoice_date") as string
      const dueDate = formData.get("due_date") as string
      const errors: {[key: string]: string} = {}

      console.log('DEBUG - Form validation:', {
        clientId,
        selectedClient,
        invoiceDate,
        dueDate,
        items: items.length,
        includeItbis,
        ncf
      })

      // Validar fecha de factura
      if (!invoiceDate) {
        errors.invoiceDate = "La fecha de factura es requerida"
        toast({
          variant: "destructive",
          title: "Error en fecha de factura",
          description: "Por favor selecciona una fecha de factura válida",
        })
      }

      // Validar fecha de vencimiento
      if (!dueDate) {
        errors.dueDate = "La fecha de vencimiento es requerida"
        toast({
          variant: "destructive",
          title: "Error en fecha de vencimiento",
          description: "Por favor selecciona una fecha de vencimiento válida",
        })
      }

      // Validar que la fecha de vencimiento sea posterior a la fecha de factura
      if (invoiceDate && dueDate && new Date(dueDate) < new Date(invoiceDate)) {
        errors.dueDate = "La fecha de vencimiento debe ser posterior a la fecha de factura"
        toast({
          variant: "destructive",
          title: "Error en fechas",
          description: "La fecha de vencimiento debe ser posterior a la fecha de emisión",
        })
      }

      // Validate NCF if ITBIS is included
      if (includeItbis && !ncf.trim()) {
        errors.ncf = "NCF es requerido cuando se incluye ITBIS"
        toast({
          variant: "destructive",
          title: "NCF requerido",
          description: "Debes incluir un NCF válido cuando agregas ITBIS a la factura",
        })
      }

      // Validate NCF format if provided
      if (includeItbis && ncf.trim()) {
        const ncfPattern = /^[BE][0-9]{10}$/
        if (!ncfPattern.test(ncf.trim())) {
          errors.ncf = "NCF debe tener el formato correcto: B o E seguido de 10 dígitos"
          toast({
            variant: "destructive",
            title: "Formato de NCF inválido",
            description: "El NCF debe comenzar con B o E y tener 10 dígitos (ejemplo: B0100000001)",
          })
        }
      }

      // Check if we have any items with products/services selected
      const validItems = items.filter((item) => {
        const isValid = item.item_id && item.item_id.trim() !== "" && item.item_id !== "no-items"
        return isValid
      })

      console.log('DEBUG - Items validation:', {
        totalItems: items.length,
        validItems: validItems.length,
        firstItem: items[0],
        allItems: items
      })

      if (validItems.length === 0) {
        errors.items = "Debes agregar al menos un producto o servicio"
        toast({
          variant: "destructive",
          title: "Sin productos o servicios",
          description: "Debes seleccionar al menos un producto o servicio válido para crear la factura",
        })
        throw new Error("Debe seleccionar al menos un producto o servicio válido para crear la factura")
      }

      // Validar cantidades y precios de items
      let hasInvalidItems = false
      validItems.forEach((item, index) => {
        if (item.quantity <= 0) {
          errors[`item_${index}_quantity`] = "La cantidad debe ser mayor a 0"
          hasInvalidItems = true
        }
        if (item.unit_price < 0) {
          errors[`item_${index}_price`] = "El precio no puede ser negativo"
          hasInvalidItems = true
        }
      })

      if (hasInvalidItems) {
        toast({
          variant: "destructive",
          title: "Errores en items",
          description: "Algunos productos o servicios tienen cantidades o precios inválidos",
        })
        setValidationErrors(errors)
        setLoading(false)
        return
      }

      // Si hay errores de validación, detener aquí
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors)
        setLoading(false)
        return
      }

      // Process valid items
      const processedItems = validItems.map((item) => ({
        item_id: item.item_id,
        item_type: item.item_type,
        quantity: Math.max(item.quantity || 1, 0.01),
        unit_price: Math.max(item.unit_price || 0, 0),
      }))

      // Validate stock for products before creating invoice
      const productItems = processedItems
        .filter(item => item.item_type === "product")
        .map(item => ({
          product_id: item.item_id,
          quantity: item.quantity
        }))

      if (productItems.length > 0) {
        const stockValidationResponse = await fetch("/api/invoices/validate-stock", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ items: productItems }),
        })

        const stockValidation = await stockValidationResponse.json()

        if (!stockValidation.valid) {
          const stockErrors = stockValidation.stock_validation
            .filter((item: any) => !item.is_available)
            .map((item: any) => 
              `${item.product_name}: Solicitado ${item.requested_quantity}, Disponible ${item.available_stock}`
            )
            .join('\n')
          
          toast({
            variant: "destructive",
            title: "Stock insuficiente",
            description: stockErrors,
          })
          throw new Error(`Stock insuficiente:\n${stockErrors}`)
        }
      }

      const subtotal = processedItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

      // Calculate discount amount
      let discountAmount = 0
      if (discountValue > 0) {
        if (discountType === "percentage") {
          if (discountValue > 100) {
            toast({
              variant: "destructive",
              title: "Descuento inválido",
              description: "El descuento porcentual no puede ser mayor al 100%",
            })
            throw new Error("El descuento porcentual no puede ser mayor al 100%")
          }
          discountAmount = subtotal * (discountValue / 100)
        } else {
          if (discountValue > subtotal) {
            toast({
              variant: "destructive",
              title: "Descuento inválido",
              description: `El descuento fijo no puede ser mayor al subtotal (${formatCurrency(subtotal)})`,
            })
            throw new Error("El descuento no puede ser mayor al subtotal")
          }
          discountAmount = Math.min(discountValue, subtotal)
        }
      }

      // Validate discount doesn't make total negative
      const discountedSubtotal = Math.max(subtotal - discountAmount, 0)
      if (discountedSubtotal < 0) {
        toast({
          variant: "destructive",
          title: "Descuento inválido",
          description: "El descuento no puede ser mayor al subtotal",
        })
        throw new Error("El descuento no puede ser mayor al subtotal")
      }

      const itbis_amount = includeItbis ? discountedSubtotal * 0.18 : 0
      const total = discountedSubtotal + itbis_amount

      // Validar límite de monto si aplica
      if (!validateInvoiceAmount(total)) {
        toast({
          variant: "destructive",
          title: "Monto excede el límite",
          description: `El monto total ${formatCurrency(total)} excede tu límite autorizado de ${formatCurrency(permissions.maxInvoiceAmount || 0)}`,
        })
        throw new Error(`El monto total ${formatCurrency(total)} excede tu límite autorizado de ${formatCurrency(permissions.maxInvoiceAmount || 0)}`)
      }

      // Prepare items for API
      const apiItems = processedItems.map((item) => {
        const selectedItem =
          item.item_type === "product"
            ? products.find((p) => p.id === item.item_id)
            : services.find((s) => s.id === item.item_id)

        const itemItbisAmount = includeItbis ? item.quantity * item.unit_price * 0.18 : 0
        return {
          product_id: item.item_type === "product" ? item.item_id : null,
          service_id: item.item_type === "service" ? item.item_id : null,
          description: selectedItem?.name || "Elemento",
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price,
          unit: selectedItem?.unit || "unidad",
          itbis_rate: includeItbis ? 18 : 0,
          itbis_amount: itemItbisAmount,
        }
      })

      // Create invoice using API
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          invoice_number: invoiceNumber,
          client_id: clientId,
          project_id: selectedProject && selectedProject !== "none" ? selectedProject : null,
          invoice_date: invoiceDate,
          issue_date: invoiceDate,
          due_date: dueDate,
          subtotal: discountedSubtotal,
          tax_rate: includeItbis ? 18 : 0,
          tax_amount: itbis_amount,
          total,
          status: formData.get("status") as string,
          notes: (formData.get("notes") as string) || null,
          include_itbis: includeItbis,
          ncf: includeItbis ? ncf.trim() : null,
          payment_method: paymentMethod,
          items: apiItems
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        toast({
          variant: "destructive",
          title: "Error al crear factura",
          description: errorData.error || "Ocurrió un error al crear la factura. Por favor intenta de nuevo.",
        })
        throw new Error(errorData.error || "Error al crear la factura")
      }

      await response.json()
      
      toast({
        title: "✅ Factura creada exitosamente",
        description: `Factura #${invoiceNumber} creada correctamente`,
      })
      
      router.push("/invoices")
    } catch (error: any) {
      setError(error.message || "Error al crear la factura")
      // Solo mostrar toast si no se ha mostrado uno específico
      if (!error.message.includes("NCF") && !error.message.includes("Stock") && !error.message.includes("descuento")) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Ocurrió un error inesperado. Por favor intenta de nuevo.",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      item_id: "",
      item_type: "product",
      quantity: 1,
      unit_price: 0,
    }
    setItems((prevItems) => [...prevItems, newItem])
  }

  const removeItem = (itemId: string) => {
    if (items.length > 1) {
      setItems((prevItems) => prevItems.filter((item) => item.id !== itemId))
    }
  }

  const updateItem = (itemId: string, field: keyof InvoiceItem, value: any) => {
    setItems((prevItems) => prevItems.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)))
  }

  const handleItemChange = (itemId: string, selectedItemId: string, itemType: "product" | "service") => {
    updateItem(itemId, "item_id", selectedItemId)
    updateItem(itemId, "item_type", itemType)
    updateItem(itemId, "selected_price_id", null) // Reset price selection

    const selectedItem =
      itemType === "product"
        ? products.find((p) => p.id === selectedItemId)
        : services.find((s) => s.id === selectedItemId)

    if (selectedItem) {
      const price = itemType === "product" ? selectedItem.unit_price : selectedItem.price
      if (price !== null && price !== undefined) {
        updateItem(itemId, "unit_price", Number(price))
      }
    }
  }

  // Funciones de filtrado por búsqueda
  const getFilteredProducts = (itemId: string) => {
    const searchTerm = productSearchTerms[itemId]?.toLowerCase() || ""
    if (!searchTerm) {
      return products
    }
    
    return products.filter(product => 
      product.name.toLowerCase().includes(searchTerm) ||
      product.product_code?.toLowerCase().includes(searchTerm)
    )
  }

  const getFilteredServices = (itemId: string) => {
    const searchTerm = serviceSearchTerms[itemId]?.toLowerCase() || ""
    if (!searchTerm) {
      return services
    }
    
    return services.filter(service => 
      service.name.toLowerCase().includes(searchTerm) ||
      service.service_code?.toLowerCase().includes(searchTerm)
    )
  }

  const handlePriceSelect = (itemId: string, priceId: string, priceValue: number) => {
    updateItem(itemId, "selected_price_id", priceId)
    updateItem(itemId, "unit_price", priceValue)
  }

  const filteredProjects = projects.filter((p) => p.client_id === selectedClient && selectedClient !== "no-client")

  const validItemsForDisplay = items.filter(
    (item) => item.item_id && item.item_id.trim() !== "" && item.item_id !== "no-items",
  )
  const subtotal = validItemsForDisplay.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

  // Calculate discount amount
  let discountAmount = 0
  if (discountValue > 0) {
    if (discountType === "percentage") {
      discountAmount = subtotal * (discountValue / 100)
    } else {
      discountAmount = Math.min(discountValue, subtotal)
    }
  }

  const discountedSubtotal = Math.max(subtotal - discountAmount, 0)
  const itbisAmount = includeItbis ? discountedSubtotal * 0.18 : 0
  const total = discountedSubtotal + itbisAmount

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => router.back()} className="hover:bg-slate-100">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-slate-800 bg-clip-text text-transparent">
                  Nueva Factura
                </h1>
                <p className="text-slate-600 mt-1">Crear una nueva factura</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push("/invoices")} className="hover:bg-slate-100">
              Cancelar
            </Button>
            <Button
              form="invoice-form"
              type="submit"
              disabled={loading || (products.length === 0 && services.length === 0) || !validateInvoiceAmount(total)}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Factura
            </Button>
          </div>
        </div>

        {products.length === 0 && services.length === 0 && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertDescription className="text-amber-800">
              No tienes productos ni servicios registrados.{" "}
              <a href="/products" className="underline font-medium">
                Crea algunos productos
              </a>{" "}
              o{" "}
              <a href="/services" className="underline font-medium">
                servicios
              </a>{" "}
              antes de crear facturas.
            </AlertDescription>
          </Alert>
        )}

        {clients.length === 0 && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800">
              💡 <strong>Tip:</strong> Puedes crear facturas sin cliente específico para agilizar el proceso.{" "}
              <a href="/clients" className="underline font-medium">
                Crear clientes
              </a>{" "}
              te ayudará a llevar mejor seguimiento de tus ventas.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-8 grid-cols-1 xl:grid-cols-2">
          <div className="space-y-8">
            <form id="invoice-form" onSubmit={handleSubmit} className="space-y-8">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Número de Factura</Label>
                  <Input
                    value={invoiceNumber}
                    disabled
                    className="bg-slate-50 border-slate-200 text-slate-600 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_date" className="text-slate-700 font-medium">
                    Fecha de Factura *
                  </Label>
                  <Input
                    id="invoice_date"
                    name="invoice_date"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    required
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="due_date" className="text-slate-700 font-medium">
                    Fecha de Vencimiento *
                  </Label>
                  <Input
                    id="due_date"
                    name="due_date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-slate-700 font-medium">
                    Estado
                  </Label>
                  <Select name="status" defaultValue="borrador">
                    <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="borrador">Borrador</SelectItem>
                      <SelectItem value="enviada">Enviada</SelectItem>
                      <SelectItem value="pagada">Pagada</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_method" className="text-slate-700 font-medium">
                    Forma de Pago
                  </Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="credito">Crédito</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="client_id" className="text-slate-700 font-medium">
                    Cliente <span className="text-slate-400">(Opcional)</span>
                  </Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Seleccionar cliente (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-client">Sin cliente específico</SelectItem>
                      {clients.length > 0 ? (
                        clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-clients" disabled>
                          No hay clientes disponibles
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Déjalo vacío para facturas rápidas sin cliente específico
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project_id" className="text-slate-700 font-medium">
                    Proyecto
                  </Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject} disabled={!selectedClient || selectedClient === "no-client"}>
                    <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Seleccionar proyecto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin proyecto</SelectItem>
                      {filteredProjects.length > 0
                        ? filteredProjects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))
                        : selectedClient && selectedClient !== "no-client" && (
                            <SelectItem value="no-projects" disabled>
                              No hay proyectos para este cliente
                            </SelectItem>
                          )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="include_itbis"
                    checked={includeItbis}
                    onCheckedChange={(checked) => {
                      setIncludeItbis(checked as boolean)
                      if (!checked) {
                        setNcf("")
                      }
                    }}
                    className="border-slate-300"
                  />
                  <Label htmlFor="include_itbis" className="text-slate-700 font-medium">
                    ¿Incluir ITBIS (18%)?
                  </Label>
                </div>

                {includeItbis && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="space-y-2">
                      <Label htmlFor="ncf" className="text-amber-800 font-medium">
                        Comprobante Fiscal (NCF) *
                      </Label>
                      <Input
                        id="ncf"
                        value={ncf}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase()
                          // Limitar a 11 caracteres
                          if (value.length <= 11) {
                            setNcf(value)
                          }
                        }}
                        placeholder="Ej: B0100000001"
                        required={includeItbis}
                        maxLength={11}
                        pattern="^[BE][0-9]{10}$"
                        title="El NCF debe tener 11 caracteres: letra (B o E) seguida de 10 dígitos"
                        className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white"
                      />
                      <p className="text-xs text-amber-700">
                        El NCF debe tener exactamente 11 caracteres (ej: B0100000001)
                        {includeItbis && " - Es obligatorio cuando se incluye ITBIS"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
            <CardHeader className="bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-t-lg">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Productos/Servicios
                </CardTitle>
                <Button
                  type="button"
                  onClick={addItem}
                  variant="secondary"
                  disabled={products.length === 0 && services.length === 0}
                  className="bg-white text-slate-700 hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Elemento
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {items.map((item) => {
                const selectedItem =
                  item.item_type === "product"
                    ? products.find((p) => p.id === item.item_id)
                    : services.find((s) => s.id === item.item_id)

                return (
                  <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-4">
                    {/* Fila 1: Tipo y Producto/Servicio */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-medium">Tipo</Label>
                        <Select
                          value={item.item_type}
                          onValueChange={(value: "product" | "service") => {
                            updateItem(item.id, "item_type", value)
                            updateItem(item.id, "item_id", "")
                            updateItem(item.id, "unit_price", 0)
                          }}
                        >
                          <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="product">Producto</SelectItem>
                            <SelectItem value="service">Servicio</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-medium">
                          {item.item_type === "product" ? "Producto" : "Servicio"} *
                        </Label>
                        <Select
                          value={item.item_id || "default"}
                          onValueChange={(value) => {
                            if (value !== "default" && value !== "no-items") {
                              handleItemChange(item.id, value, item.item_type)
                            }
                          }}
                        >
                          <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                            <SelectValue
                              placeholder={`Seleccionar ${item.item_type === "product" ? "producto" : "servicio"}`}
                            >
                              {selectedItem
                                ? `${selectedItem.name} - ${formatCurrency(item.item_type === "product" ? selectedItem.unit_price || 0 : selectedItem.price || 0)}`
                                : `Seleccionar ${item.item_type === "product" ? "producto" : "servicio"}`}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <div className="p-2 border-b sticky top-0 bg-white z-10">
                              <Input
                                placeholder={`Buscar ${item.item_type === "product" ? "producto" : "servicio"} por código o nombre...`}
                                value={item.item_type === "product" ? productSearchTerms[item.id] || "" : serviceSearchTerms[item.id] || ""}
                                onChange={(e) => {
                                  if (item.item_type === "product") {
                                    setProductSearchTerms(prev => ({...prev, [item.id]: e.target.value}))
                                  } else {
                                    setServiceSearchTerms(prev => ({...prev, [item.id]: e.target.value}))
                                  }
                                }}
                                className="h-8 text-sm"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <SelectItem value="default" disabled>
                              Seleccionar {item.item_type === "product" ? "producto" : "servicio"}
                            </SelectItem>
                            {item.item_type === "product" ? (
                              getFilteredProducts(item.id).length > 0 ? (
                                getFilteredProducts(item.id).map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.product_code ? `[${product.product_code}] ` : ''}{product.name} - {formatCurrency(product.unit_price || 0)}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-items" disabled>
                                  No hay productos disponibles
                                </SelectItem>
                              )
                            ) : getFilteredServices(item.id).length > 0 ? (
                              getFilteredServices(item.id).map((service) => (
                                <SelectItem key={service.id} value={service.id}>
                                  {service.service_code ? `[${service.service_code}] ` : ''}{service.name} -{" "}
                                  {service.price !== null ? formatCurrency(service.price) : "Precio personalizado"}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-items" disabled>
                                No hay {item.item_type === "product" ? "productos" : "servicios"} disponibles
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Fila 2: Cantidad, Precio y Total */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-medium">Cantidad *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", Number.parseFloat(e.target.value) || 1)}
                          required
                          className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-medium">Precio Unitario *</Label>
                        {item.item_type === "product" && item.item_id ? (
                          <ProductPriceDropdown
                            productId={item.item_id}
                            selectedPriceId={item.selected_price_id}
                            quantity={item.quantity}
                            onPriceSelect={(priceId: string, priceValue: number) => handlePriceSelect(item.id, priceId, priceValue)}
                            className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        ) : item.item_type === "service" && item.item_id ? (
                          <ServicePriceDropdown
                            serviceId={item.item_id}
                            selectedPriceId={item.selected_price_id}
                            quantity={item.quantity}
                            onPriceSelect={(priceId: string, priceValue: number) => handlePriceSelect(item.id, priceId, priceValue)}
                            className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        ) : (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) => updateItem(item.id, "unit_price", Number.parseFloat(e.target.value) || 0)}
                            required
                            className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-medium">Total</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            value={formatCurrency(item.quantity * item.unit_price)}
                            disabled
                            className="bg-slate-50 border-slate-200 text-slate-600 font-medium"
                          />
                          {items.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
                <CardHeader className="pb-4">
                  <CardTitle className="text-orange-800 flex items-center gap-2">
                    <Percent className="h-5 w-5" />
                    Descuentos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Tipo de descuento */}
                  <div>
                    <Label className="text-orange-700 font-medium mb-3 block">Tipo de Descuento</Label>
                    <RadioGroup
                      value={discountType}
                      onValueChange={(value: "percentage" | "fixed") => {
                        setDiscountType(value)
                        setDiscountValue(0)
                      }}
                      className="flex flex-row gap-8"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="percentage" id="percentage" />
                        <Label htmlFor="percentage" className="flex items-center gap-2 text-sm cursor-pointer">
                          <Percent className="h-4 w-4" />
                          Porcentaje
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="fixed" id="fixed" />
                        <Label htmlFor="fixed" className="flex items-center gap-2 text-sm cursor-pointer">
                          <DollarSign className="h-4 w-4" />
                          Monto Fijo
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Valores del descuento */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-orange-700 font-medium">
                        {discountType === "percentage" ? "Porcentaje (%)" : "Monto"}
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={discountType === "percentage" ? "100" : undefined}
                        value={discountValue}
                        onChange={(e) => {
                          const value = Number.parseFloat(e.target.value) || 0
                          if (discountType === "percentage" && value > 100) {
                            return
                          }
                          if (discountType === "fixed" && value > subtotal) {
                            return
                          }
                          setDiscountValue(value)
                        }}
                        placeholder="0.00"
                        className="focus:ring-2 focus:ring-orange-500 border-orange-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-orange-700 font-medium">Descuento Aplicado</Label>
                      <Input
                        value={formatCurrency(discountAmount)}
                        disabled
                        className="bg-orange-100 font-medium text-orange-800 border-orange-300"
                      />
                    </div>
                  </div>

                  {/* Mensaje informativo */}
                  {discountAmount > 0 && (
                    <div className="text-sm text-orange-700 bg-orange-100 p-3 rounded border border-orange-200">
                      💰 Se aplicará un descuento de <strong>{formatCurrency(discountAmount)}</strong> al subtotal
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="border-t border-slate-200 pt-6">
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div></div>
                    <div></div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-slate-700">
                        <span>Subtotal:</span>
                        <span className="font-medium">{formatCurrency(subtotal)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-orange-600">
                          <span>Descuento:</span>
                          <span className="font-medium">-{formatCurrency(discountAmount)}</span>
                        </div>
                      )}
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-slate-700">
                          <span>Subtotal con descuento:</span>
                          <span className="font-medium">{formatCurrency(discountedSubtotal)}</span>
                        </div>
                      )}
                      {includeItbis && (
                        <div className="flex justify-between text-slate-700">
                          <span>ITBIS (18%):</span>
                          <span className="font-medium">{formatCurrency(itbisAmount)}</span>
                        </div>
                      )}
                      <div className="border-t border-slate-300 pt-3">
                        <div className="flex justify-between text-lg font-bold text-slate-900">
                          <span>Total:</span>
                          <span className={!validateInvoiceAmount(total) ? 'text-red-600' : ''}>{formatCurrency(total)}</span>
                        </div>
                      </div>
                      
                      {/* Alerta de límite de facturación */}
                      {permissions.maxInvoiceAmount !== null && (
                        <div className={`text-xs p-2 rounded ${
                          validateInvoiceAmount(total) 
                            ? 'text-blue-700 bg-blue-50 border border-blue-200' 
                            : 'text-red-700 bg-red-50 border border-red-200'
                        }`}>
                          {validateInvoiceAmount(total) 
                            ? `Límite disponible: ${formatCurrency(permissions.maxInvoiceAmount - total)}`
                            : `⚠️ Excede límite autorizado de ${formatCurrency(permissions.maxInvoiceAmount)}`
                          }
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
            <CardHeader>
              <CardTitle className="text-slate-800">Notas Adicionales</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notes"
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Agregar notas, términos y condiciones, o información adicional..."
                rows={4}
                className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </CardContent>
          </Card>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}
            </form>
          </div>

          {/* Vista previa */}
          <div className="sticky top-6">
            <InvoicePreview
              invoiceNumber={invoiceNumber}
              invoiceDate={invoiceDate}
              dueDate={dueDate}
              selectedClient={selectedClient}
              selectedProject={selectedProject}
              clients={clients}
              projects={projects}
              products={products}
              services={services}
              items={items}
              includeItbis={includeItbis}
              ncf={ncf}
              discountType={discountType}
              discountValue={discountValue}
              notes={notes}
              paymentMethod={paymentMethod}
              companyInfo={{
                name: companySettings?.company_name || "Mi Empresa",
                address: companySettings?.company_address,
                phone: companySettings?.company_phone,
                email: companySettings?.company_email,
                logo: companySettings?.company_logo
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
