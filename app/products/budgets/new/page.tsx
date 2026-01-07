"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, Trash2, ArrowLeft } from "lucide-react"
import { useCurrency } from "@/hooks/use-currency"
import Link from "next/link"

interface BudgetItem {
  id: string
  item_id: string
  item_type: "product" | "service"
  item_name: string
  description: string
  quantity: number
  unit_price: number
  unit: string
  total: number
}

export default function NewBudgetPage() {
  const router = useRouter()
  const { formatCurrency } = useCurrency()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clients, setClients] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [productSearchTerms, setProductSearchTerms] = useState<Record<string, string>>({})
  const [serviceSearchTerms, setServiceSearchTerms] = useState<Record<string, string>>({})
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([
    {
      id: "item-1",
      item_id: "",
      item_type: "product",
      item_name: "",
      description: "",
      quantity: 1,
      unit_price: 0,
      unit: "unidad",
      total: 0,
    },
  ])
  const [includeItbis, setIncludeItbis] = useState(false)

  const [formData, setFormData] = useState({
    client_id: "",
    project_id: "",
    budget_date: new Date().toISOString().split("T")[0],
    valid_until: "",
    notes: "",
    terms_conditions: "",
  })

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      // Fetch clients
      const { data: clientsData } = await supabase.from("clients").select("*").eq("user_id", user.id).order("name")

      // Fetch projects
      const { data: projectsData } = await supabase.from("projects").select("*").eq("user_id", user.id).order("name")

      // Fetch products
      const { data: productsData } = await supabase.from("products").select("*").eq("user_id", user.id).order("name")

      // Fetch services
      const { data: servicesData } = await supabase.from("services").select("*").eq("user_id", user.id).order("name")

      setClients(clientsData || [])
      setProjects(projectsData || [])
      setProducts(productsData || [])
      setServices(servicesData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    }
  }

  const generateBudgetNumber = async (userId: string) => {
    try {
      const currentYear = new Date().getFullYear()

      // Get the count of budgets for this user this year
      const { count, error } = await supabase
        .from("budgets")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", `${currentYear}-01-01`)
        .lt("created_at", `${currentYear + 1}-01-01`)

      if (error) {
        console.error("Error counting budgets:", error)
        // Fallback to timestamp-based number
        const timestamp = Date.now().toString().slice(-4)
        return `PRES-${currentYear}-${timestamp}`
      }

      const nextNumber = (count || 0) + 1
      return `PRES-${currentYear}-${nextNumber.toString().padStart(4, "0")}`
    } catch (error) {
      console.error("Error generating budget number:", error)
      // Fallback to timestamp-based number
      const currentYear = new Date().getFullYear()
      const timestamp = Date.now().toString().slice(-4)
      return `PRES-${currentYear}-${timestamp}`
    }
  }

  const addBudgetItem = (type: "product" | "service") => {
    const newItem: BudgetItem = {
      id: Math.random().toString(36).substr(2, 9),
      item_id: "",
      item_type: type,
      item_name: "",
      description: "",
      quantity: 1,
      unit_price: 0,
      unit: type === "product" ? "unidad" : "servicio",
      total: 0,
    }
    setBudgetItems([...budgetItems, newItem])
  }

  // Funciones de filtrado por búsqueda
  const getFilteredProducts = (itemId: string) => {
    const searchTerm = productSearchTerms[itemId]?.toLowerCase() || ""
    if (!searchTerm) return products
    
    return products.filter(product => 
      product.name.toLowerCase().includes(searchTerm) ||
      product.code?.toLowerCase().includes(searchTerm) ||
      product.product_code?.toLowerCase().includes(searchTerm) ||
      product.sku?.toLowerCase().includes(searchTerm)
    )
  }

  const getFilteredServices = (itemId: string) => {
    const searchTerm = serviceSearchTerms[itemId]?.toLowerCase() || ""
    if (!searchTerm) return services
    
    return services.filter(service => 
      service.name.toLowerCase().includes(searchTerm) ||
      service.code?.toLowerCase().includes(searchTerm) ||
      service.service_code?.toLowerCase().includes(searchTerm)
    )
  }

  const updateBudgetItem = (id: string, field: string, value: any) => {
    setBudgetItems(
      budgetItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }

          // If product/service is selected, update details
          if (field === "item_id" && value) {
            const selectedItem = [...products, ...services].find((p) => p.id === value)
            if (selectedItem) {
              updatedItem.item_name = selectedItem.name
              // NO copiar automáticamente la descripción, dejar que el usuario la escriba
              // updatedItem.description = selectedItem.description || ""
              updatedItem.unit_price = selectedItem.unit_price || selectedItem.price || 0
              updatedItem.unit = selectedItem.unit || "unidad"
            }
          }

          // Calculate total
          updatedItem.total = updatedItem.quantity * updatedItem.unit_price

          return updatedItem
        }
        return item
      }),
    )
  }

  const removeBudgetItem = (id: string) => {
    if (budgetItems.length > 1) {
      setBudgetItems(budgetItems.filter((item) => item.id !== id))
    }
  }

  const calculateTotals = () => {
    const subtotal = budgetItems.reduce((sum, item) => sum + item.total, 0)
    const itbisAmount = includeItbis ? subtotal * 0.18 : 0
    const total = subtotal + itbisAmount

    return { subtotal, itbisAmount, total }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!formData.client_id) {
      setError("Debe seleccionar un cliente")
      return
    }

    const validItems = budgetItems.filter((item) => item.item_id && item.item_id.trim() !== "")
    if (validItems.length === 0) {
      setError("Debe agregar al menos un producto o servicio")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) throw new Error("Usuario no autenticado")

      const { subtotal, itbisAmount, total } = calculateTotals()

      // Generate budget number
      const budgetNumber = await generateBudgetNumber(user.id)

      // Create budget
      const { data: budget, error: budgetError } = await supabase
        .from("budgets")
        .insert({
          user_id: user.id,
          client_id: formData.client_id,
          project_id: formData.project_id || null,
          budget_number: budgetNumber,
          budget_date: formData.budget_date,
          valid_until: formData.valid_until || null,
          subtotal,
          itbis_rate: includeItbis ? 18 : 0,
          itbis_amount: itbisAmount,
          total,
          notes: formData.notes || null,
          terms_conditions: formData.terms_conditions || null,
          status: "borrador",
        })
        .select()
        .single()

      if (budgetError) throw budgetError

      // Create budget items - USAR SOLO LA DESCRIPCIÓN PERSONALIZADA
      const budgetItemsData = validItems.map((item) => ({
        budget_id: budget.id,
        product_id: item.item_type === "product" ? item.item_id : null,
        service_id: item.item_type === "service" ? item.item_id : null,
        description: item.description || "", // SOLO usar la descripción personalizada
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit: item.unit,
        total: item.total,
      }))

      const { error: itemsError } = await supabase.from("budget_items").insert(budgetItemsData)

      if (itemsError) throw itemsError

      router.push("/products/budgets")
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const { subtotal, itbisAmount, total } = calculateTotals()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/products/budgets">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Nuevo Presupuesto
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Crea un nuevo presupuesto para tu cliente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Budget Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información del Presupuesto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client_id">Cliente *</Label>
                    <Select
                      value={formData.client_id}
                      onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                      required
                    >
                      <SelectTrigger>
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
                    <Label htmlFor="project_id">Proyecto (Opcional)</Label>
                    <Select
                      value={formData.project_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, project_id: value === "no-project" ? "" : value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar proyecto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-project">Sin proyecto</SelectItem>
                        {projects.length > 0 ? (
                          projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-projects" disabled>
                            No hay proyectos disponibles
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget_date">Fecha del Presupuesto *</Label>
                    <Input
                      id="budget_date"
                      type="date"
                      value={formData.budget_date}
                      onChange={(e) => setFormData({ ...formData, budget_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valid_until">Válido Hasta</Label>
                    <Input
                      id="valid_until"
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notas adicionales del presupuesto"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="terms_conditions">Términos y Condiciones</Label>
                  <Textarea
                    id="terms_conditions"
                    value={formData.terms_conditions}
                    onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                    placeholder="Términos y condiciones del presupuesto"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Budget Items */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Productos y Servicios</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addBudgetItem("product")}
                      className="bg-orange-50 hover:bg-orange-100 text-orange-600 border-orange-300"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Producto
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addBudgetItem("service")}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-300"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Servicio
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {budgetItems.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Elemento #{index + 1}</h4>
                        {budgetItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBudgetItem(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Select
                            value={item.item_type}
                            onValueChange={(value: "product" | "service") => {
                              updateBudgetItem(item.id, "item_type", value)
                              updateBudgetItem(item.id, "item_id", "")
                              updateBudgetItem(item.id, "unit_price", 0)
                            }}
                          >
                            <SelectTrigger>
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
                                updateBudgetItem(item.id, "item_id", value)
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={`Seleccionar ${item.item_type === "product" ? "producto" : "servicio"}`}
                              >
                                {item.item_id
                                  ? `${item.item_name} - ${formatCurrency(item.unit_price)}`
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
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-8"
                                />
                              </div>
                              <SelectItem value="default" disabled className="hidden">
                                Seleccionar
                              </SelectItem>
                              {item.item_type === "product" ? (
                                getFilteredProducts(item.id).length > 0 ? (
                                  getFilteredProducts(item.id).map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      <div className="flex justify-between items-center w-full">
                                        <span>{product.name}</span>
                                        <span className="text-green-600 font-semibold ml-2">
                                          {formatCurrency(product.unit_price || 0)}
                                        </span>
                                      </div>
                                      {(product.code || product.product_code) && (
                                        <div className="text-xs text-gray-500">
                                          Código: {product.code || product.product_code}
                                        </div>
                                      )}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="no-items" disabled>
                                    No hay productos disponibles
                                  </SelectItem>
                                )
                              ) : (
                                getFilteredServices(item.id).length > 0 ? (
                                  getFilteredServices(item.id).map((service) => (
                                    <SelectItem key={service.id} value={service.id}>
                                      <div className="flex justify-between items-center w-full">
                                        <span>{service.name}</span>
                                        <span className="text-green-600 font-semibold ml-2">
                                          {formatCurrency(service.price || 0)}
                                        </span>
                                      </div>
                                      {(service.code || service.service_code) && (
                                        <div className="text-xs text-gray-500">
                                          Código: {service.code || service.service_code}
                                        </div>
                                      )}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="no-items" disabled>
                                    No hay servicios disponibles
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Cantidad</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={item.quantity}
                            onChange={(e) =>
                              updateBudgetItem(item.id, "quantity", Number.parseFloat(e.target.value) || 1)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Precio Unitario</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) =>
                              updateBudgetItem(item.id, "unit_price", Number.parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Unidad</Label>
                          <Input
                            value={item.unit}
                            onChange={(e) => updateBudgetItem(item.id, "unit", e.target.value)}
                            placeholder="ej: m³, kg, unidad"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Total</Label>
                          <Input value={formatCurrency(item.total)} disabled />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Descripción Personalizada</Label>
                        <Textarea
                          value={item.description}
                          onChange={(e) => updateBudgetItem(item.id, "description", e.target.value)}
                          placeholder="Escribe aquí la descripción que quieres que aparezca en el PDF"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include_itbis"
                    checked={includeItbis}
                    onCheckedChange={(checked) => setIncludeItbis(checked === true)}
                  />
                  <Label htmlFor="include_itbis">Incluir ITBIS (18%)</Label>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {includeItbis && (
                    <div className="flex justify-between">
                      <span>ITBIS (18%):</span>
                      <span>{formatCurrency(itbisAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span className="text-green-600">{formatCurrency(total)}</span>
                  </div>
                </div>

                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2 pt-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crear Presupuesto
                  </Button>
                  <Link href="/products/budgets">
                    <Button type="button" variant="outline" className="w-full bg-transparent">
                      Cancelar
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
