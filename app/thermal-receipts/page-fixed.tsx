"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
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
  Plus, 
  Trash2, 
  Receipt, 
  QrCode, 
  Printer,
  CreditCard,
  Banknote,
  FileText
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useCurrency } from "@/hooks/use-currency"
import { useNotificationHelpers } from "@/hooks/use-notifications"
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

interface ThermalReceiptItem {
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
  created_at: string
  items: ThermalReceiptItem[]
}

export default function ThermalReceiptsPage() {
  const [receipts, setReceipts] = useState<ThermalReceipt[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<ThermalReceipt | null>(null)
  
  // Form state
  const [clientName, setClientName] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [amountReceived, setAmountReceived] = useState(0)
  const [notes, setNotes] = useState("")
  const [includeItbis, setIncludeItbis] = useState(true)
  const [items, setItems] = useState<ThermalReceiptItem[]>([
    { item_name: "", quantity: 1, unit_price: 0, line_total: 0 }
  ])
  
  const { formatCurrency } = useCurrency()
  const { notifySuccess, notifyError } = useNotificationHelpers()

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      // Fetch thermal receipts con manejo de error si la tabla no existe
      const { data: receiptsData, error: receiptsError } = await supabase
        .from("thermal_receipts")
        .select(`
          *,
          thermal_receipt_items (*)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (receiptsError) {
        console.warn("Thermal receipts table may not exist yet:", receiptsError)
        if (receiptsError.message?.includes('relation "public.thermal_receipts" does not exist')) {
          notifyError("Las tablas no están configuradas. Por favor aplica el schema de base de datos.")
        }
        setReceipts([])
      } else {
        setReceipts(receiptsData?.map((receipt: any) => ({
          ...receipt,
          items: receipt.thermal_receipt_items || []
        })) || [])
      }

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, price, stock_quantity")
        .eq("user_id", user.id)
        .order("name")

      if (productsError) {
        console.warn("Products table error:", productsError)
        setProducts([])
      } else {
        setProducts(productsData || [])
      }

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("id, name, price")
        .eq("user_id", user.id)
        .order("name")

      if (servicesError) {
        console.warn("Services table error:", servicesError)
        setServices([])
      } else {
        setServices(servicesData || [])
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
      updateItem(index, "item_name", item.name)
      updateItem(index, "unit_price", item.price || 0)
      updateItem(index, type === 'product' ? "product_id" : "service_id", id)
    }
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0)
    const tax_amount = includeItbis ? subtotal * 0.18 : 0 // 18% tax only if enabled
    const total_amount = subtotal + tax_amount
    const receivedAmount = isNaN(amountReceived) ? 0 : amountReceived
    const change_amount = Math.max(0, receivedAmount - total_amount)
    
    return { subtotal, tax_amount, total_amount, change_amount }
  }

  const generateVerificationCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase()
  }

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
          thermal_receipt_id: (receiptData as any)?.id,
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

      notifySuccess("Recibo térmico creado exitosamente")
      await fetchData()

      // Generate and print receipt
      const fullReceipt = { ...(receiptData as any), items: itemsToSave }
      await generateThermalReceiptPDF(fullReceipt)

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
      await generateThermalReceiptPDF(receipt)
      notifySuccess("Recibo enviado a impresión")
    } catch (error) {
      console.error("Error printing receipt:", error)
      notifyError("Error al imprimir el recibo")
    }
  }

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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-blue-600">Facturas Térmicas</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Factura Térmica
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-blue-600">Nueva Factura Térmica</DialogTitle>
              <DialogDescription>
                Crear una factura térmica para impresión de 80mm
              </DialogDescription>
            </DialogHeader>

            <form className="space-y-6">
              {/* Client Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">Cliente</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Cliente General"
                    className="border-blue-200 focus:border-blue-500"
                  />
                </div>
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
                  {includeItbis && (
                    <div className="flex justify-between">
                      <span>ITBIS (18%):</span>
                      <span className="font-semibold">{formatCurrency(tax_amount)}</span>
                    </div>
                  )}
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
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
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
                  }}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  Limpiar
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Total Recibos</CardTitle>
            <Receipt className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{receipts.length}</div>
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
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Total Vendido</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(receipts.reduce((sum, r) => sum + r.total_amount, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receipts List */}
      <Card className="border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-blue-600">Recibos Térmicos Recientes</CardTitle>
          <CardDescription>
            Lista de todos los recibos térmicos generados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <div className="text-center py-8 text-blue-500">
              No hay recibos térmicos creados aún
            </div>
          ) : (
            <div className="space-y-4">
              {receipts.map((receipt) => (
                <div key={receipt.id} className="flex items-center justify-between p-4 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="font-semibold text-blue-700">{receipt.receipt_number}</div>
                        <div className="text-sm text-blue-600">{receipt.client_name}</div>
                      </div>
                      <div>
                        <div className="font-medium text-blue-700">{formatCurrency(receipt.total_amount)}</div>
                        <div className="text-sm text-blue-600 capitalize">{receipt.payment_method}</div>
                      </div>
                      <div className="text-sm text-blue-600">
                        {new Date(receipt.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedReceipt(receipt)}
                      className="border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Ver QR
                    </Button>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => handlePrintReceipt(receipt)}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Reimprimir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      {selectedReceipt && (
        <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-blue-600">Código QR - {selectedReceipt.receipt_number}</DialogTitle>
              <DialogDescription>
                Escanea este código para verificar el recibo
              </DialogDescription>
            </DialogHeader>
            <div className="text-center">
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <div className="w-48 h-48 mx-auto bg-white border-2 border-blue-200 rounded-lg flex items-center justify-center">
                  <QrCode size={120} className="text-blue-600" />
                </div>
              </div>
              <div className="text-sm text-blue-600">
                Código de verificación: <strong className="text-blue-700">{selectedReceipt.verification_code}</strong>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
