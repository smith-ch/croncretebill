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
import { Loader2, Plus, Trash2 } from "lucide-react"
import { useCurrency } from "@/hooks/use-currency"

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
  const [error, setError] = useState<string | null>(null)
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
      setError("Error al cargar los datos iniciales")
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
    setError(null)

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

      // Calculate totals
      const subtotal = processedItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
      const itbis_amount = includeItbis ? subtotal * 0.18 : 0
      const total = subtotal + itbis_amount

      const invoiceData = {
        user_id: user.id,
        invoice_number: invoiceNumber,
        client_id: clientId,
        project_id: selectedProject && selectedProject !== "none" ? selectedProject : null,
        invoice_date: invoiceDate,
        issue_date: invoiceDate,
        due_date: dueDate,
        subtotal,
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

      router.push("/invoices")
    } catch (error: any) {
      setError(error.message || "Error al crear la factura")
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

  // Calculate totals for display
  const validItemsForDisplay = items.filter(
    (item) => item.item_id && item.item_id.trim() !== "" && item.item_id !== "no-items",
  )
  const subtotal = validItemsForDisplay.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const itbisAmount = includeItbis ? subtotal * 0.18 : 0
  const total = subtotal + itbisAmount

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Nueva Factura
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Crear una nueva factura</p>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="text-white">Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número de Factura</Label>
                <Input value={invoiceNumber} disabled className="bg-gray-50 font-medium" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice_date">Fecha de Factura *</Label>
                <Input
                  id="invoice_date"
                  name="invoice_date"
                  type="date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  required
                  className="focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="due_date">Fecha de Vencimiento *</Label>
                <Input
                  id="due_date"
                  name="due_date"
                  type="date"
                  defaultValue={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                  required
                  className="focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select name="status" defaultValue="borrador">
                  <SelectTrigger className="focus:ring-2 focus:ring-blue-500">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_id">Cliente *</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient} required>
                  <SelectTrigger className="focus:ring-2 focus:ring-blue-500">
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
                <Label htmlFor="project_id">Proyecto</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject} disabled={!selectedClient}>
                  <SelectTrigger className="focus:ring-2 focus:ring-blue-500">
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

            {/* ITBIS and NCF Section */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include_itbis"
                  checked={includeItbis}
                  onCheckedChange={(checked) => {
                    setIncludeItbis(checked as boolean)
                    if (!checked) {
                      setNcf("")
                    }
                  }}
                />
                <Label htmlFor="include_itbis" className="text-sm font-medium">
                  ¿Incluir ITBIS (18%)?
                </Label>
              </div>

              {includeItbis && (
                <div className="space-y-2">
                  <Label htmlFor="ncf">Comprobante Fiscal (NCF) *</Label>
                  <Input
                    id="ncf"
                    value={ncf}
                    onChange={(e) => setNcf(e.target.value)}
                    placeholder="Ej: B0100000001"
                    required={includeItbis}
                    className="max-w-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
          <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-t-lg">
            <div className="flex justify-between items-center">
              <CardTitle className="text-white">Productos/Servicios</CardTitle>
              <Button
                type="button"
                onClick={addItem}
                variant="secondary"
                disabled={products.length === 0 && services.length === 0}
                className="bg-white text-green-600 hover:bg-gray-100"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Elemento
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {items.map((item) => {
              const selectedItem =
                item.item_type === "product"
                  ? products.find((p) => p.id === item.item_id)
                  : services.find((s) => s.id === item.item_id)

              return (
                <div
                  key={item.id}
                  className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg bg-white shadow-sm"
                >
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={item.item_type}
                      onValueChange={(value: "product" | "service") => {
                        updateItem(item.id, "item_type", value)
                        updateItem(item.id, "item_id", "")
                        updateItem(item.id, "unit_price", 0)
                      }}
                    >
                      <SelectTrigger className="focus:ring-2 focus:ring-green-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product">Producto</SelectItem>
                        <SelectItem value="service">Servicio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{item.item_type === "product" ? "Producto" : "Servicio"} *</Label>
                    <Select
                      value={item.item_id || "default"}
                      onValueChange={(value) => {
                        if (value !== "default" && value !== "no-items") {
                          handleItemChange(item.id, value, item.item_type)
                        }
                      }}
                    >
                      <SelectTrigger className="focus:ring-2 focus:ring-green-500">
                        <SelectValue
                          placeholder={`Seleccionar ${item.item_type === "product" ? "producto" : "servicio"}`}
                        >
                          {selectedItem
                            ? `${selectedItem.name} - ${formatCurrency(item.item_type === "product" ? selectedItem.unit_price || 0 : selectedItem.price || 0)}`
                            : `Seleccionar ${item.item_type === "product" ? "producto" : "servicio"}`}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default" disabled>
                          Seleccionar {item.item_type === "product" ? "producto" : "servicio"}
                        </SelectItem>
                        {item.item_type === "product" ? (
                          products.length > 0 ? (
                            products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} - {formatCurrency(product.unit_price || 0)}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-items" disabled>
                              No hay productos disponibles
                            </SelectItem>
                          )
                        ) : services.length > 0 ? (
                          services.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name} - {formatCurrency(service.price || 0)}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-items" disabled>
                            No hay servicios disponibles
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cantidad *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", Number.parseFloat(e.target.value) || 1)}
                      required
                      className="focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Precio Unitario *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => updateItem(item.id, "unit_price", Number.parseFloat(e.target.value) || 0)}
                      required
                      className="focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={formatCurrency(item.quantity * item.unit_price)}
                        disabled
                        className="bg-gray-50 font-medium"
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
              )
            })}

            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div></div>
                <div></div>
                <div className="space-y-2">
                  <div className="text-right bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Subtotal: {formatCurrency(subtotal)}</p>
                    {includeItbis && (
                      <p className="text-sm text-gray-600">ITBIS (18%): {formatCurrency(itbisAmount)}</p>
                    )}
                    <p className="text-lg font-bold text-blue-600">Total: {formatCurrency(total)}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
            <CardTitle className="text-white">Notas Adicionales</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Textarea
              id="notes"
              name="notes"
              placeholder="Notas adicionales..."
              rows={3}
              className="focus:ring-2 focus:ring-purple-500"
            />
          </CardContent>
        </Card>

        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={loading || (products.length === 0 && services.length === 0) || clients.length === 0}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear Factura
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}
