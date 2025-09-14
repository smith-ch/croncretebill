"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Calculator,
  FileText,
  AlertCircle,
  Percent,
  DollarSign,
} from "lucide-react"
import { useCurrency } from "@/hooks/use-currency"

export default function EditInvoicePage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invoice, setInvoice] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState("")
  const [items, setItems] = useState([
    { product_id: "", service_id: "", quantity: 1, unit_price: 0, type: "product", original_description: "" },
  ])
  const [includeItbis, setIncludeItbis] = useState(false)
  const [ncf, setNcf] = useState("")
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage")
  const [discountValue, setDiscountValue] = useState(0)
  const { formatCurrency } = useCurrency()

  useEffect(() => {
    fetchInvoiceData()
  }, [])

  const fetchInvoiceData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      console.log("Current user ID:", user.id)

      const [productsRes, servicesRes] = await Promise.all([
        supabase.from("products").select("id, name, unit, unit_price").eq("user_id", user.id),
        supabase.from("services").select("id, name, unit, price").eq("user_id", user.id),
      ])

      console.log("Products query result:", productsRes)
      console.log("Services query result:", servicesRes)

      if (productsRes.error) {
        console.error("Error fetching products:", productsRes.error)
      }
      if (servicesRes.error) {
        console.error("Error fetching services:", servicesRes.error)
      }

      const fetchedProducts = productsRes.data || []
      const fetchedServices = servicesRes.data || []

      console.log("Fetched products:", fetchedProducts)
      console.log("Fetched services:", fetchedServices)
      console.log("Products count:", fetchedProducts.length)
      console.log("Services count:", fetchedServices.length)

      setProducts(fetchedProducts)
      setServices(fetchedServices)

      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select(`
          *,
          invoice_items:invoice_items_invoice_id_fkey(*)
        `)
        .eq("id", params.id)
        .eq("user_id", user.id)
        .single()

      if (invoiceError) throw invoiceError
      setInvoice(invoiceData)
      setSelectedClient(invoiceData.client_id)
      setIncludeItbis(invoiceData.include_itbis || false)
      setNcf(invoiceData.ncf || "")

      const [clientsRes, projectsRes, driversRes, vehiclesRes] = await Promise.all([
        supabase.from("clients").select("id, name").eq("user_id", user.id),
        supabase.from("projects").select("id, name, client_id").eq("user_id", user.id),
        supabase.from("drivers").select("id, name").eq("user_id", user.id),
        supabase.from("vehicles").select("id, model, plate").eq("user_id", user.id),
      ])

      setClients(clientsRes.data || [])
      setProjects(projectsRes.data || [])
      setDrivers(driversRes.data || [])
      setVehicles(vehiclesRes.data || [])

      if (invoiceData.invoice_items && invoiceData.invoice_items.length > 0) {
        const loadedItems = invoiceData.invoice_items.map((item: any) => {
          const productId = item.product_id ? String(item.product_id) : ""
          const serviceId = item.service_id ? String(item.service_id) : ""

          const product = fetchedProducts.find((p) => String(p.id) === productId)
          const service = fetchedServices.find((s) => String(s.id) === serviceId)

          console.log("Processing item:", { item, product, service, productId, serviceId })

          return {
            product_id: productId,
            service_id: serviceId,
            quantity: Math.max(item.quantity || 1, 0.01),
            unit_price: Math.max(item.unit_price || 0, 0),
            type: productId ? "product" : serviceId ? "service" : "product",
            original_description: item.description || product?.name || service?.name || "",
          }
        })

        console.log("Loaded items:", loadedItems)
        setItems(loadedItems)
      } else {
        setItems([
          { product_id: "", service_id: "", quantity: 1, unit_price: 0, type: "product", original_description: "" },
        ])
      }
    } catch (error) {
      console.error("Error fetching invoice:", error)
      setError("Error al cargar la factura")
    } finally {
      setFetchLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      console.log("[v0] All items before validation:", items)

      const validItems = items.filter((item, index) => {
        const hasValidQuantity = item.quantity > 0
        const hasValidPrice = item.unit_price >= 0
        const hasProductOrService =
          (item.type === "product" && item.product_id && item.product_id.trim() !== "") ||
          (item.type === "service" && item.service_id && item.service_id.trim() !== "")

        console.log(`[v0] Item ${index} validation:`, {
          item,
          hasValidQuantity,
          hasValidPrice,
          hasProductOrService,
          isValid: hasValidQuantity && hasValidPrice && hasProductOrService,
        })

        if (!hasValidQuantity) {
          console.warn(`[v0] Item ${index} has invalid quantity:`, item.quantity)
        }
        if (!hasValidPrice) {
          console.warn(`[v0] Item ${index} has invalid price:`, item.unit_price)
        }
        if (!hasProductOrService) {
          console.warn(`[v0] Item ${index} has no product/service selected:`, {
            type: item.type,
            product_id: item.product_id,
            service_id: item.service_id,
          })
        }

        return hasValidQuantity && hasValidPrice && hasProductOrService
      })

      console.log("[v0] Valid items after filtering:", validItems)
      console.log("[v0] Valid items count:", validItems.length)
      console.log("[v0] Total items count:", items.length)

      if (validItems.length === 0) {
        const invalidReasons = items
          .map((item, index) => {
            const reasons = []
            if (item.quantity <= 0) reasons.push("cantidad inválida")
            if (item.unit_price < 0) reasons.push("precio inválido")
            if (item.type === "product" && (!item.product_id || item.product_id.trim() === "")) {
              reasons.push("producto no seleccionado")
            }
            if (item.type === "service" && (!item.service_id || item.service_id.trim() === "")) {
              reasons.push("servicio no seleccionado")
            }
            return `Item ${index + 1}: ${reasons.join(", ")}`
          })
          .join("; ")

        throw new Error(
          `No hay items válidos para guardar. Problemas encontrados: ${invalidReasons}. Asegúrese de seleccionar productos/servicios de las listas desplegables y que tengan cantidad y precio válidos.`,
        )
      }

      if (includeItbis && !ncf.trim()) {
        throw new Error("NCF es requerido cuando se incluye ITBIS")
      }

      const subtotal = validItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
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

      const invoiceDate = formData.get("invoice_date") as string
      const dueDate = formData.get("due_date") as string

      const invoiceData = {
        client_id: formData.get("client_id") as string,
        project_id: (formData.get("project_id") as string) || null,
        driver_id: (formData.get("driver_id") as string) || null,
        vehicle_id: (formData.get("vehicle_id") as string) || null,
        invoice_date: invoiceDate,
        due_date: dueDate,
        subtotal,
        discount_type: discountType,
        discount_value: discountValue,
        tax_rate: includeItbis ? 18 : 0,
        tax_amount: itbisAmount,
        total,
        status: formData.get("status") as string,
        notes: (formData.get("notes") as string) || null,
        include_itbis: includeItbis,
        ncf: includeItbis ? ncf.trim() : null,
      }

      console.log("[v0] Updating invoice with data:", invoiceData)

      const { error: invoiceError, data: updatedInvoice } = await supabase
        .from("invoices")
        .update(invoiceData)
        .eq("id", params.id)
        .eq("user_id", user.id)
        .select()

      if (invoiceError) {
        console.error("[v0] Error updating invoice:", invoiceError)
        throw new Error(`Error al actualizar la factura: ${invoiceError.message}`)
      }

      if (!updatedInvoice || updatedInvoice.length === 0) {
        throw new Error("No se pudo actualizar la factura. Verifique que tenga permisos para editarla.")
      }

      console.log("[v0] Invoice updated successfully:", updatedInvoice)

      console.log("[v0] Deleting old invoice items...")
      const { error: deleteError, count: deletedCount } = await supabase
        .from("invoice_items")
        .delete({ count: "exact" })
        .eq("invoice_id", params.id)

      if (deleteError) {
        console.error("[v0] Error deleting old invoice items:", deleteError)
        throw new Error(`Error al eliminar items anteriores: ${deleteError.message}`)
      }

      console.log(`[v0] Deleted ${deletedCount} old items successfully`)

      const invoiceItems = validItems.map((item, index) => {
        const itemData: any = {
          invoice_id: params.id,
          quantity: Math.max(item.quantity, 0.01),
          unit_price: Math.max(item.unit_price, 0),
          total: Math.max(item.quantity, 0.01) * Math.max(item.unit_price, 0),
          itbis_rate: includeItbis ? 18 : 0,
          itbis_amount: includeItbis ? Math.max(item.quantity, 0.01) * Math.max(item.unit_price, 0) * 0.18 : 0,
        }

        if (item.type === "product" && item.product_id) {
          const product = products.find((p) => String(p.id) === String(item.product_id))
          itemData.product_id = item.product_id
          itemData.service_id = null
          itemData.description = product?.name || item.original_description || `Producto (ID: ${item.product_id})`
          itemData.unit = product?.unit || "unidad"
          console.log(`[v0] Prepared product item ${index}:`, itemData)
        } else if (item.type === "service" && item.service_id) {
          const service = services.find((s) => String(s.id) === String(item.service_id))
          itemData.service_id = item.service_id
          itemData.product_id = null
          itemData.description = service?.name || item.original_description || `Servicio (ID: ${item.service_id})`
          itemData.unit = service?.unit || "servicio"
          console.log(`[v0] Prepared service item ${index}:`, itemData)
        } else {
          console.error(`[v0] Invalid item configuration at index ${index}:`, item)
          throw new Error(`Item ${index + 1} tiene una configuración inválida`)
        }

        if (!itemData.description || itemData.description.trim() === "") {
          itemData.description = `${item.type === "product" ? "Producto" : "Servicio"} sin nombre`
        }

        return itemData
      })

      console.log("[v0] Final invoice items to insert:", invoiceItems)

      const { error: itemsError, data: insertedItems } = await supabase
        .from("invoice_items")
        .insert(invoiceItems)
        .select()

      if (itemsError) {
        console.error("[v0] Error inserting invoice items:", itemsError)
        throw new Error(`Error al guardar los productos/servicios: ${itemsError.message}`)
      }

      if (!insertedItems || insertedItems.length !== validItems.length) {
        console.warn("[v0] Mismatch in inserted items count:", {
          expected: validItems.length,
          inserted: insertedItems?.length || 0,
        })
      }

      console.log(`[v0] Successfully inserted ${insertedItems.length} invoice items:`, insertedItems)

      console.log("[v0] Invoice update completed successfully!")

      setError(null)

      setTimeout(() => {
        router.push("/invoices")
      }, 500)
    } catch (error: any) {
      console.error("[v0] Error updating invoice:", error)
      setError(error.message || "Error desconocido al actualizar la factura")
    } finally {
      setLoading(false)
    }
  }

  const addItem = () => {
    console.log("[v0] Adding new item")
    setItems([
      ...items,
      { product_id: "", service_id: "", quantity: 1, unit_price: 0, type: "product", original_description: "" },
    ])
  }

  const removeItem = (index: number) => {
    console.log("[v0] Removing item at index:", index)
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: any) => {
    console.log("[v0] Updating item:", { index, field, value })

    setItems((prevItems) => {
      const newItems = [...prevItems]
      const currentItem = { ...newItems[index] }

      // Update the specific field
      ;(currentItem as any)[field] = value

      // Handle type changes
      if (field === "type") {
        if (value === "product") {
          currentItem.service_id = ""
          currentItem.unit_price = 0
        } else {
          currentItem.product_id = ""
          currentItem.unit_price = 0
        }
      }

      // Handle product selection - preserve service_id as empty and update price
      if (field === "product_id" && value) {
        updateItem(index, "service_id", "")
        const product = products.find((p) => String(p.id) === String(value))
        if (product && product.unit_price) {
          updateItem(index, "unit_price", product.unit_price)
        }
      }
      // Handle service selection - preserve product_id as empty and update price
      else if (field === "service_id" && value) {
        updateItem(index, "product_id", "")
        const service = services.find((s) => String(s.id) === String(value))
        if (service && service.price) {
          updateItem(index, "unit_price", service.price)
        }
      }

      // Replace the item in the array
      newItems[index] = currentItem

      console.log("[v0] Updated items:", newItems)
      return newItems
    })
  }

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Cargando factura...</p>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="p-4 bg-red-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Factura no encontrada</h2>
          <p className="text-slate-600 mb-4">La factura que buscas no existe o no tienes permisos para verla</p>
          <Button onClick={() => router.push("/invoices")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Facturas
          </Button>
        </div>
      </div>
    )
  }

  const filteredProjects = projects.filter((p) => p.client_id === selectedClient)
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => router.back()} className="hover:bg-slate-100">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-slate-800 bg-clip-text text-transparent">
                  Editar Factura
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="outline" className="text-blue-700 border-blue-300">
                    <FileText className="h-3 w-3 mr-1" />
                    {invoice.invoice_number}
                  </Badge>
                  <Badge className={getStatusColor(invoice.status || "borrador")}>{invoice.status || "borrador"}</Badge>
                </div>
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
              disabled={loading}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </Button>
          </div>
        </div>

        <form id="invoice-form" onSubmit={handleSubmit} className="space-y-8">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">Número de Factura</Label>
                  <Input
                    value={invoice.invoice_number}
                    disabled
                    className="bg-slate-50 border-slate-200 text-slate-600"
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
                    defaultValue={invoice.invoice_date ? invoice.invoice_date.split("T")[0] : ""}
                    required
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="due_date" className="text-slate-700 font-medium">
                    Fecha de Vencimiento *
                  </Label>
                  <Input
                    id="due_date"
                    name="due_date"
                    type="date"
                    defaultValue={invoice.due_date ? invoice.due_date.split("T")[0] : ""}
                    required
                    className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-slate-700 font-medium">
                    Estado
                  </Label>
                  <Select name="status" defaultValue={invoice.status}>
                    <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="borrador">Borrador</SelectItem>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="enviada">Enviada</SelectItem>
                      <SelectItem value="pagada">Pagada</SelectItem>
                      <SelectItem value="vencida">Vencida</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="client_id" className="text-slate-700 font-medium">
                    Cliente *
                  </Label>
                  <Select name="client_id" value={selectedClient} onValueChange={setSelectedClient} required>
                    <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project_id" className="text-slate-700 font-medium">
                    Proyecto
                  </Label>
                  <Select name="project_id" defaultValue={invoice.project_id || ""}>
                    <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Seleccionar proyecto" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="driver_id" className="text-slate-700 font-medium">
                    Conductor
                  </Label>
                  <Select name="driver_id" defaultValue={invoice.driver_id || ""}>
                    <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Seleccionar conductor" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle_id" className="text-slate-700 font-medium">
                    Vehículo
                  </Label>
                  <Select name="vehicle_id" defaultValue={invoice.vehicle_id || ""}>
                    <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Seleccionar vehículo" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.model} - {vehicle.plate}
                        </SelectItem>
                      ))}
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
                        onChange={(e) => setNcf(e.target.value)}
                        placeholder="Ej: B0100000001"
                        required={includeItbis}
                        className="border-amber-300 focus:border-amber-500 focus:ring-amber-500 bg-white"
                      />
                      <p className="text-xs text-amber-700">El NCF es obligatorio cuando se incluye ITBIS</p>
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
                  Productos y Servicios
                </CardTitle>
                <Button
                  type="button"
                  onClick={addItem}
                  variant="secondary"
                  className="bg-white text-slate-700 hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {items.map((item, index) => (
                <div key={index} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-medium">Tipo</Label>
                      <Select value={item.type} onValueChange={(value) => updateItem(index, "type", value)}>
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
                        {item.type === "product" ? "Producto" : "Servicio"}
                      </Label>
                      <Select
                        value={item.type === "product" ? item.product_id : item.service_id}
                        onValueChange={(value) => {
                          if (item.type === "product") {
                            updateItem(index, "product_id", value)
                            const product = products.find((p) => String(p.id) === String(value))
                            if (product) {
                              updateItem(index, "unit_price", product.unit_price || 0)
                            }
                          } else {
                            updateItem(index, "service_id", value)
                            const service = services.find((s) => String(s.id) === String(value))
                            if (service) {
                              updateItem(index, "unit_price", service.price || 0)
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue
                            placeholder={`Seleccionar ${item.type === "product" ? "producto" : "servicio"}`}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {item.type === "product" ? (
                            <>
                              {item.product_id && !products.some((p) => String(p.id) === String(item.product_id)) && (
                                <SelectItem value={item.product_id}>
                                  {item.original_description || `Producto (ID: ${item.product_id})`} [Ya no disponible]
                                </SelectItem>
                              )}

                              {products.length > 0 ? (
                                products.map((product) => (
                                  <SelectItem key={product.id} value={String(product.id)}>
                                    {product.name} - {formatCurrency(product.unit_price || 0)}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="px-2 py-1.5 text-sm text-slate-500 italic">
                                  No hay productos disponibles
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {item.service_id && !services.some((s) => String(s.id) === String(item.service_id)) && (
                                <SelectItem value={item.service_id}>
                                  {item.original_description || `Servicio (ID: ${item.service_id})`} [Ya no disponible]
                                </SelectItem>
                              )}

                              {services.length > 0 ? (
                                services.map((service) => (
                                  <SelectItem key={service.id} value={String(service.id)}>
                                    {service.name} - {formatCurrency(service.price || 0)}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="px-2 py-1.5 text-sm text-slate-500 italic">
                                  No hay servicios disponibles
                                </div>
                              )}
                            </>
                          )}
                        </SelectContent>
                      </Select>

                      {process.env.NODE_ENV === "development" && (
                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                          Debug:{" "}
                          {item.type === "product" ? `${products.length} productos` : `${services.length} servicios`}{" "}
                          disponibles
                          <br />
                          Selected: {item.type === "product" ? item.product_id : item.service_id}
                          <br />
                          Products: {JSON.stringify(products.map((p) => ({ id: p.id, name: p.name })))}
                        </div>
                      )}

                      {((item.type === "product" &&
                        item.product_id &&
                        !products.some((p) => String(p.id) === String(item.product_id))) ||
                        (item.type === "service" &&
                          item.service_id &&
                          !services.some((s) => String(s.id) === String(item.service_id)))) && (
                        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                          ⚠️ Este {item.type === "product" ? "producto" : "servicio"} ya no está disponible. Puedes
                          mantenerlo o seleccionar uno nuevo.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 font-medium">Cantidad</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, "quantity", Math.max(Number.parseFloat(e.target.value) || 0, 0.01))
                        }
                        className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-medium">Precio Unitario</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, "unit_price", Number.parseFloat(e.target.value) || 0)}
                        className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                      />
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
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-orange-800 flex items-center gap-2">
                    <Percent className="h-5 w-5" />
                    Descuentos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-3">
                      <Label className="text-orange-700 font-medium">Tipo de Descuento</Label>
                      <RadioGroup
                        value={discountType}
                        onValueChange={(value: "percentage" | "fixed") => {
                          setDiscountType(value)
                          setDiscountValue(0)
                        }}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="percentage" id="percentage" />
                          <Label htmlFor="percentage" className="flex items-center gap-1 text-sm">
                            <Percent className="h-3 w-3" />
                            Porcentaje
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="fixed" id="fixed" />
                          <Label htmlFor="fixed" className="flex items-center gap-1 text-sm">
                            <DollarSign className="h-3 w-3" />
                            Monto Fijo
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
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
                          if (discountType === "percentage" && value > 100) return
                          if (discountType === "fixed" && value > subtotal) return
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
                  {discountAmount > 0 && (
                    <div className="text-sm text-orange-700 bg-orange-100 p-2 rounded border border-orange-200">
                      Se aplicará un descuento de {formatCurrency(discountAmount)} al subtotal
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
                          <span>{formatCurrency(total)}</span>
                        </div>
                      </div>
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
                defaultValue={invoice.notes || ""}
                rows={4}
                placeholder="Agregar notas, términos y condiciones, o información adicional..."
                className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </CardContent>
          </Card>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}
        </form>
      </div>
    </div>
  )
}

function getStatusColor(status: string) {
  switch (status) {
    case "borrador":
      return "bg-slate-100 text-slate-800 border-slate-200"
    case "pendiente":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "enviada":
      return "bg-amber-100 text-amber-800 border-amber-200"
    case "pagada":
      return "bg-emerald-100 text-emerald-800 border-emerald-200"
    case "vencida":
      return "bg-red-100 text-red-800 border-red-200"
    case "cancelada":
      return "bg-gray-100 text-gray-800 border-gray-200"
    default:
      return "bg-slate-100 text-slate-800 border-slate-200"
  }
}
