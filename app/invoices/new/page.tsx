"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, FileText, ArrowLeft, Calendar } from "lucide-react"
import { useCurrency } from "@/hooks/use-currency"
import { useNotificationHelpers } from "@/hooks/use-notifications"

interface InvoiceItem {
  id: string
  item_id: string
  item_type: "product" | "service"
  quantity: number
  unit_price: number
}

export default function NewInvoicePage() {
  const router = useRouter()
  const { formatCurrency } = useCurrency()
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [clients, setClients] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState("")
  const [selectedProject, setSelectedProject] = useState("")
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: "item-1", item_id: "", item_type: "product", quantity: 1, unit_price: 0 },
  ])
  const [includeItbis, setIncludeItbis] = useState(false)
  const [ncf, setNcf] = useState("")
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage")
  const [discountValue, setDiscountValue] = useState(0)
  const { notifySuccess, notifyError, notifyInvoiceCreated } = useNotificationHelpers()

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
        notifyError("Usuario no autenticado")
        return
      }

      const [clientsRes, projectsRes, productsRes, servicesRes] = await Promise.all([
        supabase.from("clients").select("id, name").eq("user_id", user.id).order("name"),
        supabase.from("projects").select("id, name, client_id").eq("user_id", user.id).order("name"),
        supabase.from("products").select("id, name, unit, unit_price").eq("user_id", user.id).order("name"),
        supabase.from("services").select("id, name, unit, price").eq("user_id", user.id).order("name"),
      ])

      setClients(clientsRes.data || [])
      setProjects(projectsRes.data || [])
      setProducts(productsRes.data || [])
      setServices(servicesRes.data || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      notifyError("Error al cargar los datos iniciales")
    } finally {
      setFetchLoading(false)
    }
  }

  const generateInvoiceNumber = async () => {
    try {
      const { data, error } = await supabase.rpc("get_next_invoice_number")
      if (error) throw error
      setInvoiceNumber(data)
    } catch (error) {
      console.error("Error generating invoice number:", error)
      setInvoiceNumber(`FAC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      // Validate required fields
      const clientId = selectedClient
      const invoiceDate = formData.get("invoice_date") as string
      const dueDate = formData.get("due_date") as string

      if (!clientId) throw new Error("Cliente es requerido")
      if (!invoiceDate) throw new Error("Fecha de factura es requerida")
      if (!dueDate) throw new Error("Fecha de vencimiento es requerida")

      // Validate NCF if ITBIS is included
      if (includeItbis && !ncf.trim()) {
        throw new Error("NCF es requerido cuando se incluye ITBIS")
      }

      // Check if we have any items with products/services selected
      const validItems = items.filter((item) => {
        const isValid = item.item_id && item.item_id.trim() !== "" && item.item_id !== "no-items"
        return isValid
      })

      if (validItems.length === 0) {
        throw new Error("Debe seleccionar al menos un producto o servicio válido")
      }

      // Process valid items
      const processedItems = validItems.map((item) => ({
        item_id: item.item_id,
        item_type: item.item_type,
        quantity: Math.max(item.quantity || 1, 0.01),
        unit_price: Math.max(item.unit_price || 0, 0),
      }))

      const subtotal = processedItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

      // Calculate discount amount
      let discountAmount = 0
      if (discountValue > 0) {
        if (discountType === "percentage") {
          discountAmount = subtotal * (discountValue / 100)
        } else {
          discountAmount = Math.min(discountValue, subtotal) // Don't allow discount greater than subtotal
        }
      }

      // Validate discount doesn't make total negative
      const discountedSubtotal = Math.max(subtotal - discountAmount, 0)
      if (discountedSubtotal < 0) {
        throw new Error("El descuento no puede ser mayor al subtotal")
      }

      const itbis_amount = includeItbis ? discountedSubtotal * 0.18 : 0
      const total = discountedSubtotal + itbis_amount

      const invoiceData = {
        user_id: user.id,
        invoice_number: invoiceNumber,
        client_id: clientId,
        project_id: selectedProject && selectedProject !== "none" ? selectedProject : null,
        invoice_date: invoiceDate,
        issue_date: invoiceDate,
        due_date: dueDate,
        subtotal: discountedSubtotal, // Store the discounted subtotal
        tax_rate: includeItbis ? 18 : 0,
        tax_amount: itbis_amount,
        total,
        status: formData.get("status") as string,
        notes: (formData.get("notes") as string) || null,
        include_itbis: includeItbis,
        ncf: includeItbis ? ncf.trim() : null,
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert(invoiceData)
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Insert invoice items
      const invoiceItems = processedItems.map((item) => {
        const selectedItem =
          item.item_type === "product"
            ? products.find((p) => p.id === item.item_id)
            : services.find((s) => s.id === item.item_id)

        const itemItbisAmount = includeItbis ? item.quantity * item.unit_price * 0.18 : 0
        return {
          invoice_id: invoice.id,
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

      const { error: itemsError } = await supabase.from("invoice_items").insert(invoiceItems)
      if (itemsError) throw itemsError

      notifyInvoiceCreated(invoiceNumber)
      router.push("/invoices")
    } catch (error: any) {
      notifyError(error.message || "Error al crear la factura")
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

  const filteredProjects = projects.filter((p) => p.client_id === selectedClient)

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
      <div className="max-w-6xl mx-auto space-y-8">
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
              disabled={loading || (products.length === 0 && services.length === 0) || clients.length === 0}
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
          <Alert className="border-amber-200 bg-amber-50">
            <AlertDescription className="text-amber-800">
              No tienes clientes registrados.{" "}
              <a href="/clients" className="underline font-medium">
                Crea algunos clientes
              </a>{" "}
              antes de crear facturas.
            </AlertDescription>
          </Alert>
        )}

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
                    defaultValue={new Date().toISOString().split("T")[0]}
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
                  <div className="relative">
                    <Input
                      id="due_date"
                      name="due_date"
                      type="date"
                      defaultValue={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                      required
                      className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 pr-10"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Calendar className="h-4 w-4 text-blue-500" title="Se agregará automáticamente a la agenda" />
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Se agregará automáticamente a tu agenda
                  </p>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="client_id" className="text-slate-700 font-medium">
                    Cliente *
                  </Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient} required>
                    <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project_id" className="text-slate-700 font-medium">
                    Proyecto
                  </Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject} disabled={!selectedClient}>
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
                        : selectedClient && (
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
            <CardHeader>
              <CardTitle className="text-slate-800">Notas Adicionales</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Agregar notas, términos y condiciones, o información adicional..."
                rows={4}
                className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  )
}
