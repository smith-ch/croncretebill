"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Warehouse, 
  DollarSign,
  Activity,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Download,
  Edit,
  Trash2
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useCurrency } from "@/hooks/use-currency"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import { WarehouseTransfer } from "@/components/inventory/warehouse-transfer"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useToast } from "@/hooks/use-toast"


// Types
interface InventorySummary {
  total_products: number
  total_stock_value: number
  low_stock_items: number
  out_of_stock_items: number
  total_items_in_stock: number
}



export default function UnifiedInventoryPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [showMovementForm, setShowMovementForm] = useState(false)
  const [showWarehouseForm, setShowWarehouseForm] = useState(false)
  const [movementFormData, setMovementFormData] = useState({
    product_id: '',
    warehouse_id: '',
    movement_type: 'entrada',
    quantity: 0,
    notes: ''
  })
  const [movementFormLoading, setMovementFormLoading] = useState(false)
  const [movementFormError, setMovementFormError] = useState<string | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [editingStock, setEditingStock] = useState<string | null>(null)
  const [editStockValue, setEditStockValue] = useState<number>(0)
  const [newWarehouse, setNewWarehouse] = useState({
    name: '',
    description: '',
    address: ''
  })
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [stockItems, setStockItems] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterWarehouse, setFilterWarehouse] = useState<string>("all")
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string | null; name: string }>({ show: false, id: null, name: '' })
  const [isDeleting, setIsDeleting] = useState(false)
  const { formatCurrency, formatNumber } = useCurrency()
  const { permissions, canEdit } = useUserPermissions()
  const { toast } = useToast()

  const fetchProducts = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      const { data, error } = await supabase
        .from('products')
        .select('id, name, unit, current_stock, product_code')
        .eq('user_id', user.id)
        .order('name')

      if (error) {
        console.error('Error fetching products:', error)
        return
      }

      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const ensureDefaultWarehouse = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        console.log('No user in ensureDefaultWarehouse')
        return
      }

      console.log('Checking warehouses for user:', user.id)

      // Verificar si el usuario tiene almacenes activos
      const { data: existingWarehouses, error: checkError } = await supabase
        .from('warehouses')
        .select('id, name, user_id, is_active')
        .eq('user_id', user.id)

      console.log('Existing warehouses:', existingWarehouses, 'Error:', checkError)

      // Si no tiene almacenes activos, crear uno por defecto
      if (!existingWarehouses || existingWarehouses.length === 0) {
        console.log('Creating default warehouse for user:', user.id)
        
        const { data: newWarehouse, error: createError } = await (supabase as any)
          .from('warehouses')
          .insert({
            user_id: user.id,
            name: 'Almacén Principal',
            description: 'Almacén principal creado automáticamente',
            address: 'Dirección del almacén principal',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()

        console.log('Created warehouse:', newWarehouse, 'Error:', createError)

        if (createError) {
          console.error('Error creating default warehouse:', createError)
        }
      } else {
        // Verificar que al menos uno esté activo
        const warehousesData = existingWarehouses as any[]
        const activeWarehouses = warehousesData.filter(w => w.is_active)
        if (activeWarehouses.length === 0) {
          // Activar el primer almacén encontrado
          const { error: activateError } = await (supabase as any)
            .from('warehouses')
            .update({ is_active: true })
            .eq('id', warehousesData[0].id)
          
          console.log('Activated warehouse:', warehousesData[0].id, 'Error:', activateError)
        }
      }
    } catch (error) {
      console.error('Error ensuring default warehouse:', error)
    }
  }

  const fetchWarehouses = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        console.log('No user found')
        return
      }

      console.log('Current user ID:', user.id)

      // Asegurar que el usuario tenga al menos un almacén
      await ensureDefaultWarehouse()

      // Obtener todos los almacenes del usuario (activos e inactivos)
      const { data, error } = await supabase
        .from('warehouses')
        .select(`
          id,
          name,
          is_active,
          address,
          description,
          created_at,
          user_id
        `)
        .eq('user_id', user.id)
        .order('created_at')

      console.log('Warehouses query result:', { data, error, user_id: user.id })

      if (error) {
        console.error('Error fetching warehouses:', error)
        return
      }

      // Calcular datos adicionales para cada almacén
      const processedWarehouses = await Promise.all(data?.map(async (warehouse: any) => {
        const { data: stockData } = await supabase
          .from('product_warehouse_stock')
          .select(`
            current_stock,
            product:products!inner (cost_price)
          `)
          .eq('warehouse_id', warehouse.id)
          .eq('product.user_id', user.id)

        return {
          ...warehouse,
          product_count: stockData?.length || 0,
          total_stock_value: stockData?.reduce((sum: number, stock: any) => 
            sum + (stock.current_stock * (stock.product?.cost_price || 0)), 0) || 0
        }
      }) || [])

      setWarehouses(processedWarehouses)
    } catch (error) {
      console.error('Error fetching warehouses:', error)
    }
  }, [])

  const fetchAllData = useCallback(async () => {
    setLoading(true)
    // Primero sincronizar productos con almacenes
    await syncProductsWithWarehouse()
    
    await Promise.all([
      fetchSummary(),
      fetchStockItems(),
      fetchMovements(),
      fetchWarehouses(),
      fetchProducts()
    ])
    setLoading(false)
  }, [fetchWarehouses])

  const createStockMovement = async () => {
    // Validaciones
    if (!movementFormData.product_id) {
      setMovementFormError('Debe seleccionar un producto')
      return
    }
    if (!movementFormData.warehouse_id) {
      setMovementFormError('Debe seleccionar un almacén')
      return
    }
    if (movementFormData.quantity <= 0) {
      setMovementFormError('La cantidad debe ser mayor a 0')
      return
    }

    // Validación adicional para salidas
    if (movementFormData.movement_type === 'salida') {
      const selectedStock = stockItems.find(item => 
        item.product?.id === movementFormData.product_id && 
        item.warehouse?.id === movementFormData.warehouse_id
      )
      
      if (selectedStock && selectedStock.current_stock < movementFormData.quantity) {
        setMovementFormError(`Stock insuficiente. Disponible: ${formatNumber(selectedStock.current_stock)}`)
        return
      }
    }

    setMovementFormLoading(true)
    setMovementFormError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // 1. Registrar el movimiento
      const { error: movementError } = await (supabase as any)
        .from('stock_movements')
        .insert({
          product_id: movementFormData.product_id,
          warehouse_id: movementFormData.warehouse_id,
          movement_type: movementFormData.movement_type,
          quantity_change: movementFormData.movement_type === 'entrada' ? movementFormData.quantity : -movementFormData.quantity,
          notes: movementFormData.notes,
          movement_date: new Date().toISOString(),
          user_id: user.id
        })

      if (movementError) {
        throw movementError
      }

      // 2. Actualizar el stock en product_warehouse_stock
      const { data: existingStock, error: stockCheckError } = await supabase
        .from('product_warehouse_stock')
        .select('id, current_stock')
        .eq('product_id', movementFormData.product_id)
        .eq('warehouse_id', movementFormData.warehouse_id)
        .single()

      if (stockCheckError && stockCheckError.code !== 'PGRST116') {
        throw stockCheckError
      }

      const quantityChange = movementFormData.movement_type === 'entrada' ? movementFormData.quantity : -movementFormData.quantity

      if (existingStock) {
        // Actualizar stock existente
        const stockData = existingStock as any
        const newStock = Math.max(0, stockData.current_stock + quantityChange)
        const { error: updateError } = await supabase
          .from('product_warehouse_stock')
          .update({
            current_stock: newStock,
            available_stock: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', stockData.id)

        if (updateError) {
          throw updateError
        }
      } else if (movementFormData.movement_type === 'entrada' && quantityChange > 0) {
        // Crear nuevo registro si es entrada
        const { error: createError } = await supabase
          .from('product_warehouse_stock')
          .insert({
            product_id: movementFormData.product_id,
            warehouse_id: movementFormData.warehouse_id,
            current_stock: quantityChange,
            available_stock: quantityChange,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (createError) {
          throw createError
        }
      }

      // 3. Actualizar el stock total del producto en la tabla products
      // CRÍTICO: Solo sumar stock de almacenes ACTIVOS
      const { data: allWarehouseStock, error: fetchStockError } = await supabase
        .from('product_warehouse_stock')
        .select(`
          current_stock,
          warehouse:warehouses!inner(is_active)
        `)
        .eq('product_id', movementFormData.product_id)
        .eq('warehouse.is_active', true)

      if (fetchStockError) {
        console.error('Error fetching warehouse stock:', fetchStockError)
      }

      const totalStock = (allWarehouseStock as any)?.reduce((sum: number, stock: any) => 
        sum + (stock.current_stock || 0), 0) || 0

      console.log(`📊 Stock calculation for product ${movementFormData.product_id}:`, {
        warehouseStocks: allWarehouseStock,
        totalCalculated: totalStock
      })

      const { error: productUpdateError } = await supabase
        .from('products')
        .update({ 
          current_stock: totalStock,
          available_stock: totalStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', movementFormData.product_id)

      if (productUpdateError) {
        console.error('Error updating product stock:', productUpdateError)
        throw new Error('Error al actualizar stock total del producto')
      }

      // Mostrar notificación de éxito
      toast({
        title: "Movimiento creado",
        description: `Movimiento de ${movementFormData.movement_type} registrado correctamente`,
      })

      // Limpiar formulario y recargar datos
      setMovementFormData({
        product_id: '',
        warehouse_id: '',
        movement_type: 'entrada',
        quantity: 0,
        notes: ''
      })
      setShowMovementForm(false)
      fetchAllData()

    } catch (error: any) {
      console.error('Error creating movement:', error)
      setMovementFormError(`Error al crear movimiento: ${error.message}`)
    } finally {
      setMovementFormLoading(false)
    }
  }

  const updateStockDirectly = async (stockItemId: string, newStock: number) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // Obtener información del producto y almacén para el registro
      const { data: stockItem, error: stockItemError } = await supabase
        .from('product_warehouse_stock')
        .select(`
          id,
          current_stock,
          product_id,
          warehouse_id,
          product:products!inner (name, user_id),
          warehouse:warehouses!inner (name, user_id)
        `)
        .eq('id', stockItemId)
        .eq('product.user_id', user.id)
        .eq('warehouse.user_id', user.id)
        .single()

      if (stockItemError || !stockItem) {
        throw new Error('No se pudo encontrar el registro de stock')
      }

      const stockData = stockItem as any
      const oldStock = stockData.current_stock
      const quantityChange = newStock - oldStock

      // 1. Actualizar stock en product_warehouse_stock
      const { error: updateError } = await supabase
        .from('product_warehouse_stock')
        .update({
          current_stock: Math.max(0, newStock),
          available_stock: Math.max(0, newStock),
          updated_at: new Date().toISOString()
        })
        .eq('id', stockItemId)

      if (updateError) {
        throw updateError
      }

      // 2. Registrar el movimiento
      await supabase
        .from('stock_movements')
        .insert({
          product_id: stockData.product_id,
          warehouse_id: stockData.warehouse_id,
          movement_type: 'ajuste',
          quantity_change: quantityChange,
          notes: `Ajuste directo de stock. Stock anterior: ${oldStock}, Stock nuevo: ${newStock}`,
          movement_date: new Date().toISOString(),
          user_id: user.id
        })

      // 3. Actualizar el stock total del producto en la tabla products
      // Esto es CRÍTICO para sincronización con catálogo y recibos térmicos
      // IMPORTANTE: Solo sumar stock de almacenes ACTIVOS para evitar duplicados
      const { data: allWarehouseStock, error: fetchStockError } = await supabase
        .from('product_warehouse_stock')
        .select(`
          current_stock,
          warehouse:warehouses!inner(is_active)
        `)
        .eq('product_id', stockData.product_id)
        .eq('warehouse.is_active', true)

      if (fetchStockError) {
        console.error('Error fetching warehouse stock:', fetchStockError)
      }

      // Calcular total solo de almacenes activos
      const totalStock = (allWarehouseStock as any)?.reduce((sum: number, stock: any) => 
        sum + (stock.current_stock || 0), 0) || 0

      console.log(`📊 Stock calculation for product ${stockData.product_id}:`, {
        warehouseStocks: allWarehouseStock,
        totalCalculated: totalStock,
        previousTotal: stockData.product?.current_stock
      })

      // Actualizar products.current_stock y available_stock
      const { error: productUpdateError } = await supabase
        .from('products')
        .update({ 
          current_stock: totalStock,
          available_stock: totalStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', stockData.product_id)

      if (productUpdateError) {
        console.error('Error updating product stock:', productUpdateError)
        throw new Error('Error al actualizar stock total del producto')
      }

      // Mostrar notificación de éxito
      toast({
        title: "Stock actualizado",
        description: `Stock de "${stockData.product.name}" actualizado correctamente. Nuevo stock: ${newStock}`,
      })

      // Actualizar interfaz
      setEditingStock(null)
      setEditStockValue(0)
      fetchAllData()

    } catch (error: any) {
      console.error('Error updating stock:', error)
      toast({
        title: "Error",
        description: `Error al actualizar stock: ${error.message}`,
        variant: "destructive"
      })
    }
  }

  const startEditingStock = (stockItemId: string, currentStock: number) => {
    setEditingStock(stockItemId)
    setEditStockValue(currentStock)
  }

  const cancelEditingStock = () => {
    setEditingStock(null)
    setEditStockValue(0)
  }

  const createWarehouse = async () => {
    if (!newWarehouse.name.trim()) {
      alert('El nombre del almacén es requerido')
      return
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      const { data, error } = await (supabase as any)
        .from('warehouses')
        .insert({
          user_id: user.id,
          name: newWarehouse.name.trim(),
          description: newWarehouse.description.trim(),
          address: newWarehouse.address.trim(),
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()

      if (error) {
        throw error
      }

      console.log('Warehouse created successfully:', data)

      // Limpiar formulario
      setNewWarehouse({
        name: '',
        description: '',
        address: ''
      })
      setShowWarehouseForm(false)
      
      // Recargar datos
      fetchAllData()

    } catch (error: any) {
      console.error('Error creating warehouse:', error)
      alert(`Error al crear almacén: ${error.message}`)
    }
  }

  const deleteWarehouse = async (warehouseId: string, warehouseName: string) => {
    if (!canEdit) {
      toast({
        title: "Permiso denegado",
        description: "No tienes permisos para eliminar almacenes",
        variant: "destructive"
      })
      return
    }
    setDeleteConfirm({ show: true, id: warehouseId, name: warehouseName })
  }

  const confirmDeleteWarehouse = async () => {
    if (!deleteConfirm.id) return

    setIsDeleting(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // Verificar que no tenga productos
      const { data: stockItems } = await supabase
        .from('product_warehouse_stock')
        .select('id')
        .eq('warehouse_id', deleteConfirm.id)
        .gt('current_stock', 0)
        .limit(1)

      if (stockItems && stockItems.length > 0) {
        toast({
          title: "No se puede eliminar",
          description: "No se puede eliminar un almacén que tiene productos con stock. Transfiere los productos primero.",
          variant: "destructive"
        })
        setDeleteConfirm({ show: false, id: null, name: '' })
        setIsDeleting(false)
        return
      }

      // Eliminar almacén
      const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', deleteConfirm.id)
        .eq('user_id', user.id)

      if (error) {
        throw error
      }

      toast({
        title: "Almacén eliminado",
        description: `El almacén "${deleteConfirm.name}" ha sido eliminado exitosamente`,
      })
      
      setDeleteConfirm({ show: false, id: null, name: '' })
      
      // Recargar datos
      fetchAllData()

    } catch (error: any) {
      console.error('Error deleting warehouse:', error)
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const syncProductsWithWarehouse = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      console.log('Starting product sync for user:', user.id)

      // Obtener todos los productos del usuario
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, current_stock, user_id')
        .eq('user_id', user.id)

      if (productsError) {
        console.error('Error getting products:', productsError)
        return
      }

      console.log('Found products:', products?.length)

      // Obtener el almacén principal del usuario
      const { data: warehouse } = await supabase
        .from('warehouses')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single()

      let warehouseData = warehouse as any

      // Si no hay almacén, crear uno
      if (!warehouseData) {
        console.log('Creating default warehouse for sync')
        const { data: newWarehouse, error: createError } = await (supabase as any)
          .from('warehouses')
          .insert({
            user_id: user.id,
            name: 'Almacén Principal',
            description: 'Almacén principal creado automáticamente',
            address: 'Dirección del almacén principal',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating warehouse:', createError)
          return
        }
        warehouseData = newWarehouse
      }

      console.log('Using warehouse:', warehouseData.id, warehouseData.name)

      // Para cada producto, verificar si existe en product_warehouse_stock
      for (const product of (products as any[]) || []) {
        const { data: existingStock } = await supabase
          .from('product_warehouse_stock')
          .select('id, current_stock')
          .eq('product_id', product.id)
          .eq('warehouse_id', warehouseData.id)
          .single()

        if (!existingStock) {
          // Crear registro de stock en almacén
          console.log(`Creating warehouse stock for product: ${product.name}`)
          const { error: insertError } = await (supabase as any)
            .from('product_warehouse_stock')
            .insert({
              product_id: product.id,
              warehouse_id: warehouseData.id,
              current_stock: product.current_stock || 0,
              available_stock: product.current_stock || 0,
              reserved_stock: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (insertError) {
            console.error(`Error creating stock for ${product.name}:`, insertError)
          } else {
            // Crear movimiento inicial si hay stock
            if (product.current_stock > 0) {
              await (supabase as any)
                .from('stock_movements')
                .insert({
                  product_id: product.id,
                  warehouse_id: warehouseData.id,
                  movement_type: 'entrada',
                  quantity_change: product.current_stock,
                  notes: 'Sincronización inicial de stock desde catálogo',
                  movement_date: new Date().toISOString(),
                  user_id: user.id
                })
            }
          }
        } else {
          // Verificar si el stock está sincronizado
          const stockData = existingStock as any
          if (stockData.current_stock !== product.current_stock) {
            console.log(`Syncing stock for product: ${product.name}`)
            const quantityChange = product.current_stock - stockData.current_stock

            // Actualizar stock en almacén
            await (supabase as any)
              .from('product_warehouse_stock')
              .update({
                current_stock: product.current_stock,
                available_stock: product.current_stock,
                updated_at: new Date().toISOString()
              })
              .eq('id', stockData.id)

            // Crear movimiento de ajuste
            if (quantityChange !== 0) {
              await (supabase as any)
                .from('stock_movements')
                .insert({
                  product_id: product.id,
                  warehouse_id: warehouseData.id,
                  movement_type: 'ajuste',
                  quantity_change: quantityChange,
                  notes: 'Sincronización automática de stock desde catálogo',
                  movement_date: new Date().toISOString(),
                  user_id: user.id
                })
            }
          }
        }
      }

      console.log('Product sync completed')
    } catch (error) {
      console.error('Error in product sync:', error)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // Check if user has permission to manage inventory
  if (!permissions.canManageInventory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-2 border-red-200 bg-red-50">
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <Warehouse className="h-16 w-16 text-red-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-red-800 mb-2">Acceso Restringido</h2>
                <p className="text-red-600">
                  No tienes permisos para acceder al inventario. Esta función requiere permisos de gestión de inventario.
                </p>
              </div>
              <Button 
                onClick={() => window.history.back()} 
                className="bg-red-600 hover:bg-red-700"
              >
                Volver
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const fetchSummary = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      // Calcular resumen manualmente en lugar de usar RPC
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, current_stock, unit_price')
        .eq('user_id', user.id)

      if (productsError) {
        console.error('Error fetching products for summary:', productsError)
        return
      }

      const totalProducts = products?.length || 0
      const totalValue = products?.reduce((sum, p: any) => sum + ((p.current_stock || 0) * (p.unit_price || 0)), 0) || 0
      const lowStockCount = products?.filter((p: any) => (p.current_stock || 0) <= 5).length || 0
      const outOfStockCount = products?.filter((p: any) => (p.current_stock || 0) === 0).length || 0

      setSummary({
        total_products: totalProducts,
        total_stock_value: totalValue,
        low_stock_items: lowStockCount,
        out_of_stock_items: outOfStockCount,
        total_items_in_stock: products?.reduce((sum, p: any) => sum + (p.current_stock || 0), 0) || 0
      })
    } catch (error) {
      console.error('Error fetching summary:', error)
    }
  }

  const fetchStockItems = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      const { data, error } = await supabase
        .from('product_warehouse_stock')
        .select(`
          id,
          current_stock,
          reserved_stock,
          available_stock,
          location,
          product:products!inner (
            id,
            name,
            unit,
            unit_price,
            cost_price,
            reorder_point,
            max_stock,
            category,
            barcode,
            is_trackable,
            product_code,
            user_id
          ),
          warehouse:warehouses!inner (
            id,
            name,
            user_id
          )
        `)
        .eq('warehouse.is_active', true)
        .eq('warehouse.user_id', user.id)
        .eq('product.user_id', user.id)
        .order('id')

      if (error) {
        console.error('Error fetching stock items:', error)
        return
      }

      const processedItems = data?.map((item: any) => ({
        ...item,
        stock_value: item.current_stock * (item.product?.cost_price || 0),
        is_low_stock: item.current_stock <= (item.product?.reorder_point || 0) && item.current_stock > 0,
        is_out_of_stock: item.current_stock === 0,
        stock_status: item.current_stock === 0 ? 'out_of_stock' 
          : item.current_stock <= (item.product?.reorder_point || 0) ? 'low_stock' 
          : 'in_stock'
      })) || []

      setStockItems(processedItems)
    } catch (error) {
      console.error('Error fetching stock items:', error)
    }
  }

  const fetchMovements = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          id,
          movement_type,
          quantity_change,
          movement_date,
          notes,
          product:products!inner (name, unit, product_code, user_id),
          warehouse:warehouses!inner (name, user_id),
          user:profiles (email)
        `)
        .eq('product.user_id', user.id)
        .eq('warehouse.user_id', user.id)
        .order('movement_date', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching movements:', error)
        return
      }
      setMovements(data || [])
    } catch (error) {
      console.error('Error fetching movements:', error)
    }
  }



  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <Badge className="bg-green-100 text-green-800">En Stock</Badge>
      case 'low_stock':
        return <Badge className="bg-yellow-100 text-yellow-800">Stock Bajo</Badge>
      case 'out_of_stock':
        return <Badge className="bg-red-100 text-red-800">Sin Stock</Badge>
      default:
        return <Badge variant="outline">Desconocido</Badge>
    }
  }

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'entrada': return 'bg-green-100 text-green-800'
      case 'salida': return 'bg-red-100 text-red-800'
      case 'ajuste': return 'bg-blue-100 text-blue-800'
      case 'transferencia': return 'bg-purple-100 text-purple-800'
      case 'transfer_in': return 'bg-green-100 text-green-800'
      case 'transfer_out': return 'bg-red-100 text-red-800'
      case 'venta': return 'bg-orange-100 text-orange-800'
      case 'devolucion': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'entrada': return <TrendingUp className="w-4 h-4" />
      case 'salida': return <TrendingDown className="w-4 h-4" />
      case 'ajuste': return <Activity className="w-4 h-4" />
      case 'transferencia': return <Package className="w-4 h-4" />
      case 'transfer_in': return <TrendingUp className="w-4 h-4" />
      case 'transfer_out': return <TrendingDown className="w-4 h-4" />
      case 'venta': return <TrendingDown className="w-4 h-4" />
      case 'devolucion': return <TrendingUp className="w-4 h-4" />
      default: return <Package className="w-4 h-4" />
    }
  }

  const getMovementTypeName = (type: string) => {
    switch (type) {
      case 'entrada': return 'Entrada'
      case 'salida': return 'Salida'
      case 'ajuste': return 'Ajuste'
      case 'transferencia': return 'Transferencia'
      case 'transfer_in': return 'Transferencia Entrada'
      case 'transfer_out': return 'Transferencia Salida'
      case 'venta': return 'Venta'
      case 'devolucion': return 'Devolución'
      default: return type.charAt(0).toUpperCase() + type.slice(1)
    }
  }

  const filteredStockItems = stockItems.filter(item => {
    const matchesSearch = item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.product?.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.product?.product_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.warehouse?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || item.stock_status === filterStatus
    const matchesWarehouse = filterWarehouse === 'all' || item.warehouse?.id === filterWarehouse
    
    return matchesSearch && matchesStatus && matchesWarehouse
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-3 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Inventario Unificado</h1>
          <p className="text-sm lg:text-base text-gray-600">Gestión completa de inventario, stock, movimientos y almacenes</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={() => setShowMovementForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Movimiento
          </Button>
          <Button variant="outline" onClick={fetchAllData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Summary Cards - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary?.total_products || 0)}</div>
            <p className="text-xs text-muted-foreground">
              En {formatNumber(warehouses.length)} almacén{warehouses.length !== 1 ? 'es' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.total_stock_value || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor del inventario
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items en Stock</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary?.total_items_in_stock || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Unidades totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {summary?.low_stock_items || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Productos con stock bajo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summary?.out_of_stock_items || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Productos agotados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground overflow-x-auto min-w-full w-max lg:w-full lg:grid lg:grid-cols-5">
          <TabsTrigger value="overview" className="whitespace-nowrap">Resumen</TabsTrigger>
          <TabsTrigger value="stock" className="whitespace-nowrap">Stock</TabsTrigger>
          <TabsTrigger value="movements" className="whitespace-nowrap">Movimientos</TabsTrigger>
          <TabsTrigger value="warehouses" className="whitespace-nowrap">Almacenes</TabsTrigger>
          <TabsTrigger value="transfers" className="whitespace-nowrap">Transferencias</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Alerts Section */}
          {(summary?.low_stock_items || 0) > 0 || (summary?.out_of_stock_items || 0) > 0 ? (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center text-yellow-800">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Alertas de Inventario
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(summary?.low_stock_items || 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-800">
                        {summary?.low_stock_items} producto{(summary?.low_stock_items || 0) !== 1 ? 's' : ''} con stock bajo
                      </span>
                      <Button size="sm" variant="outline" onClick={() => {
                        setFilterStatus('low_stock')
                        setActiveTab('stock')
                      }}>
                        Ver Productos
                      </Button>
                    </div>
                  )}
                  {(summary?.out_of_stock_items || 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-red-800">
                        {summary?.out_of_stock_items} producto{(summary?.out_of_stock_items || 0) !== 1 ? 's' : ''} sin stock
                      </span>
                      <Button size="sm" variant="outline" onClick={() => {
                        setFilterStatus('out_of_stock')
                        setActiveTab('stock')
                      }}>
                        Ver Productos
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Recent Movements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Movimientos Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {movements.slice(0, 5).map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${getMovementTypeColor(movement.movement_type)}`}>
                        {getMovementIcon(movement.movement_type)}
                      </div>
                      <div>
                        <p className="font-medium">{movement.product?.name}</p>
                        <p className="text-sm text-gray-600">
                          {movement.warehouse?.name} • {new Date(movement.movement_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${movement.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change} {movement.product?.unit || ''}
                      </p>
                      <Badge className={getMovementTypeColor(movement.movement_type)}>
                        {getMovementTypeName(movement.movement_type)}
                      </Badge>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full" onClick={() => setActiveTab('movements')}>
                  Ver Todos los Movimientos
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Tab */}
        <TabsContent value="stock" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Nombre, código, categoría..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status">Estado</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="in_stock">En Stock</SelectItem>
                      <SelectItem value="low_stock">Stock Bajo</SelectItem>
                      <SelectItem value="out_of_stock">Sin Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="warehouse">Almacén</Label>
                  <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => {
                    setSearchTerm('')
                    setFilterStatus('all')
                    setFilterWarehouse('all')
                  }}>
                    Limpiar Filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Stock de Productos ({formatNumber(filteredStockItems.length)})
                </span>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Producto</th>
                      <th className="text-left p-2">Almacén</th>
                      <th className="text-right p-2">Stock</th>
                      <th className="text-right p-2">Reservado</th>
                      <th className="text-right p-2">Disponible</th>
                      <th className="text-right p-2">Valor</th>
                      <th className="text-center p-2">Estado</th>
                      <th className="text-center p-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStockItems.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <div>
                            <p className="font-medium">
                              {item.product?.product_code && (
                                <span className="text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded mr-2 text-xs">
                                  {item.product.product_code}
                                </span>
                              )}
                              {item.product?.name}
                            </p>
                            <p className="text-sm text-gray-600">{item.product?.category}</p>
                          </div>
                        </td>
                        <td className="p-2">{item.warehouse?.name}</td>
                        <td className="p-2 text-right">
                          {editingStock === item.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={editStockValue}
                                onChange={(e) => setEditStockValue(Number(e.target.value))}
                                className="w-20 text-right"
                                min="0"
                              />
                              <Button
                                size="sm"
                                onClick={() => updateStockDirectly(item.id, editStockValue)}
                                className="h-8 px-2"
                              >
                                ✓
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditingStock}
                                className="h-8 px-2"
                              >
                                ✕
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <span>{formatNumber(item.current_stock)} {item.product?.unit}</span>
                              {canEdit('products') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditingStock(item.id, item.current_stock)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-right">{formatNumber(item.reserved_stock || 0)}</td>
                        <td className="p-2 text-right">{formatNumber(item.available_stock || item.current_stock)}</td>
                        <td className="p-2 text-right">{formatCurrency(item.stock_value)}</td>
                        <td className="p-2 text-center">{getStatusBadge(item.stock_status)}</td>
                        <td className="p-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowMovementForm(true)}
                            title="Crear movimiento de stock"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movements Tab */}
        <TabsContent value="movements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Historial de Movimientos
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Fecha</th>
                      <th className="text-left p-2">Producto</th>
                      <th className="text-left p-2">Almacén</th>
                      <th className="text-center p-2">Tipo</th>
                      <th className="text-right p-2">Cantidad</th>
                      <th className="text-left p-2">Notas</th>
                      <th className="text-left p-2">Usuario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => (
                      <tr key={movement.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          {new Date(movement.movement_date).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="p-2">
                          {movement.product?.product_code && (
                            <span className="text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded mr-2 text-xs">
                              {movement.product.product_code}
                            </span>
                          )}
                          {movement.product?.name}
                        </td>
                        <td className="p-2">{movement.warehouse?.name}</td>
                        <td className="p-2 text-center">
                          <Badge className={getMovementTypeColor(movement.movement_type)}>
                            {getMovementTypeName(movement.movement_type)}
                          </Badge>
                        </td>
                        <td className={`p-2 text-right font-semibold ${movement.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {movement.quantity_change > 0 ? '+' : ''}{formatNumber(movement.quantity_change)} {movement.product?.unit || ''}
                        </td>
                        <td className="p-2">{movement.notes || '-'}</td>
                        <td className="p-2">{movement.user?.email || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warehouses Tab */}
        <TabsContent value="warehouses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Warehouse className="w-5 h-5 mr-2" />
                  Gestión de Almacenes
                </span>
                <Button onClick={() => setShowWarehouseForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Almacén
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {warehouses.map((warehouse) => (
                  <Card key={warehouse.id} className={`${warehouse.is_active ? 'border-green-200' : 'border-gray-200'}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{warehouse.name}</span>
                        <Badge variant={warehouse.is_active ? "default" : "secondary"}>
                          {warehouse.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Productos:</span>
                          <span className="font-semibold">{formatNumber(warehouse.product_count)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Valor Total:</span>
                          <span className="font-semibold">{formatCurrency(warehouse.total_stock_value)}</span>
                        </div>
                        {warehouse.address && (
                          <div>
                            <span className="text-sm text-gray-600">Dirección:</span>
                            <p className="text-sm">{warehouse.address}</p>
                          </div>
                        )}
                        {warehouse.description && (
                          <div>
                            <span className="text-sm text-gray-600">Descripción:</span>
                            <p className="text-sm">{warehouse.description}</p>
                          </div>
                        )}
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" size="sm" onClick={() => {
                            setFilterWarehouse(warehouse.id)
                            setActiveTab('stock')
                          }}>
                            <Package className="w-4 h-4 mr-2" />
                            Ver Stock
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => deleteWarehouse(warehouse.id, warehouse.name)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transfers Tab */}
        <TabsContent value="transfers" className="space-y-6">
          <WarehouseTransfer onTransferComplete={fetchAllData} />
        </TabsContent>
      </Tabs>

      {/* Modal para Nuevo Movimiento */}
      <Dialog open={showMovementForm} onOpenChange={setShowMovementForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Movimiento de Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {movementFormError && (
              <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg">
                {movementFormError}
              </div>
            )}
            
            <div>
              <Label htmlFor="movement-product">Producto</Label>
              <Select 
                value={movementFormData.product_id}
                onValueChange={(value) => setMovementFormData(prev => ({...prev, product_id: value}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product: any) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.product_code ? `[${product.product_code}] ` : ''}{product.name} (Stock total: {product.current_stock || 0} {product.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="movement-warehouse">Almacén</Label>
              <Select 
                value={movementFormData.warehouse_id}
                onValueChange={(value) => setMovementFormData(prev => ({...prev, warehouse_id: value}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar almacén" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse: any) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="movement-type">Tipo de Movimiento</Label>
              <Select 
                value={movementFormData.movement_type}
                onValueChange={(value) => setMovementFormData(prev => ({...prev, movement_type: value}))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada (Agregar Stock)</SelectItem>
                  <SelectItem value="salida">Salida (Reducir Stock)</SelectItem>
                  <SelectItem value="ajuste">Ajuste</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="movement-quantity">Cantidad</Label>
              <Input
                id="movement-quantity"
                type="number"
                min="1"
                value={movementFormData.quantity}
                onChange={(e) => setMovementFormData(prev => ({...prev, quantity: parseInt(e.target.value) || 0}))}
                placeholder="Cantidad"
              />
            </div>

            <div>
              <Label htmlFor="movement-notes">Notas (Opcional)</Label>
              <Input
                id="movement-notes"
                value={movementFormData.notes}
                onChange={(e) => setMovementFormData(prev => ({...prev, notes: e.target.value}))}
                placeholder="Razón del movimiento"
              />
            </div>

            {movementFormError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-800 text-sm">{movementFormError}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={() => setShowMovementForm(false)}
                variant="outline"
                className="flex-1"
                disabled={movementFormLoading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={createStockMovement}
                className="flex-1"
                disabled={movementFormLoading}
              >
                {movementFormLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Crear Movimiento'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para Nuevo Almacén */}
      <Dialog open={showWarehouseForm} onOpenChange={setShowWarehouseForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Almacén</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="warehouse-name">Nombre del Almacén</Label>
              <Input 
                id="warehouse-name" 
                placeholder="Almacén Principal"
                value={newWarehouse.name}
                onChange={(e) => setNewWarehouse(prev => ({...prev, name: e.target.value}))}
              />
            </div>
            <div>
              <Label htmlFor="warehouse-description">Descripción</Label>
              <Input 
                id="warehouse-description" 
                placeholder="Descripción del almacén"
                value={newWarehouse.description}
                onChange={(e) => setNewWarehouse(prev => ({...prev, description: e.target.value}))}
              />
            </div>
            <div>
              <Label htmlFor="warehouse-address">Dirección</Label>
              <Input 
                id="warehouse-address" 
                placeholder="Dirección física"
                value={newWarehouse.address}
                onChange={(e) => setNewWarehouse(prev => ({...prev, address: e.target.value}))}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  setShowWarehouseForm(false)
                  setNewWarehouse({ name: '', description: '', address: '' })
                }}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={createWarehouse}
                className="flex-1"
              >
                Crear Almacén
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm.show}
        onOpenChange={(open) => !open && setDeleteConfirm({ show: false, id: null, name: '' })}
        title="Eliminar Almacén"
        description={`¿Estás seguro de que deseas eliminar el almacén "${deleteConfirm.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDeleteWarehouse}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}