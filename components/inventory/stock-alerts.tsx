"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Package, X, Bell, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useCurrency } from "@/hooks/use-currency"

// Cache global para evitar múltiples llamadas simultáneas
let stockAlertsCache: {
  data: any[] | null
  timestamp: number
  loading: boolean
  promise: Promise<any> | null
} = {
  data: null,
  timestamp: 0,
  loading: false,
  promise: null,
}

const CACHE_DURATION = 30000 // 30 segundos

interface LowStockAlert {
  id: string
  product: {
    id: string
    name: string
    unit: string
    reorder_point: number
    max_stock?: number
    cost_price: number
  }
  warehouse: {
    id: string
    name: string
  }
  current_stock: number
  shortage: number
  recommended_order: number
}

interface StockAlertsProps {
  onDismiss?: () => void
  showTitle?: boolean
  maxItems?: number
}

// Función compartida para obtener alertas con deduplicación
const fetchStockAlertsShared = async (userId: string): Promise<any[]> => {
  const now = Date.now()
  
  // Si hay datos en caché y no han expirado, devolverlos
  if (stockAlertsCache.data && (now - stockAlertsCache.timestamp) < CACHE_DURATION) {
    return stockAlertsCache.data
  }

  // Si ya hay una petición en curso, esperar a que termine
  if (stockAlertsCache.loading && stockAlertsCache.promise) {
    return stockAlertsCache.promise
  }

  // Iniciar nueva petición
  stockAlertsCache.loading = true
  stockAlertsCache.promise = (async () => {
    try {
      const response = await fetch(`/api/inventory/reports?user_id=${userId}&type=low-stock`)
      if (response.ok) {
        const data = await response.json()
        const alerts = data.low_stock_items || []
        
        // Actualizar caché
        stockAlertsCache.data = alerts
        stockAlertsCache.timestamp = Date.now()
        stockAlertsCache.loading = false
        stockAlertsCache.promise = null
        
        return alerts
      }
      return []
    } catch (error) {
      console.error("Error fetching low stock alerts:", error)
      stockAlertsCache.loading = false
      stockAlertsCache.promise = null
      return []
    }
  })()

  return stockAlertsCache.promise
}

export function StockAlerts({ onDismiss, showTitle = true, maxItems = 5 }: StockAlertsProps) {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<string[]>([])
  const { formatCurrency } = useCurrency()

  const fetchLowStockAlerts = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      setLoading(true)
      const data = await fetchStockAlertsShared(user.id)
      setAlerts(data)
    } catch (error) {
      console.error("Error fetching low stock alerts:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLowStockAlerts()
  }, [fetchLowStockAlerts])

  const handleDismissAlert = useCallback((alertId: string) => {
    setDismissed(prev => [...prev, alertId])
  }, [])

  const handleDismissAll = useCallback(() => {
    setDismissed(alerts.map(alert => alert.id))
    if (onDismiss) {
      onDismiss()
    }
  }, [alerts, onDismiss])

  const visibleAlerts = useMemo(
    () => alerts.filter(alert => !dismissed.includes(alert.id)).slice(0, maxItems),
    [alerts, dismissed, maxItems]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
        <span className="text-sm">Verificando stock...</span>
      </div>
    )
  }

  if (visibleAlerts.length === 0) {
    return null
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-3">
        {showTitle && (
          <CardTitle className="flex items-center justify-between text-yellow-800">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Alertas de Stock Bajo ({visibleAlerts.length})
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={fetchLowStockAlerts}
                className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismissAll}
                className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardTitle>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleAlerts.map((alert) => (
          <Alert key={alert.id} className="border-yellow-300 bg-yellow-100">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <div className="flex-1">
              <AlertTitle className="text-yellow-800">
                {alert.product.name} - Stock Bajo
              </AlertTitle>
              <AlertDescription className="text-yellow-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <div>
                    <span className="font-medium">Almacén:</span> {alert.warehouse.name}
                  </div>
                  <div>
                    <span className="font-medium">Stock actual:</span> {alert.current_stock} {alert.product.unit}
                  </div>
                  <div>
                    <span className="font-medium">Punto de reorden:</span> {alert.product.reorder_point} {alert.product.unit}
                  </div>
                  <div>
                    <span className="font-medium">Recomendado:</span> {alert.recommended_order} {alert.product.unit}
                  </div>
                </div>
                
                {alert.product.cost_price > 0 && (
                  <div className="mt-2">
                    <span className="font-medium">Costo estimado de reposición:</span>{" "}
                    {formatCurrency(alert.recommended_order * alert.product.cost_price)}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <div className="flex space-x-2">
                    <Badge variant={alert.current_stock === 0 ? "destructive" : "secondary"}>
                      {alert.current_stock === 0 ? "Sin Stock" : "Stock Bajo"}
                    </Badge>
                    {alert.shortage > 0 && (
                      <Badge variant="outline" className="text-red-600">
                        Faltante: {alert.shortage} {alert.product.unit}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDismissAlert(alert.id)}
                      className="text-yellow-800 border-yellow-300 hover:bg-yellow-200"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Descartar
                    </Button>
                    <Button size="sm" asChild>
                      <Link href={`/inventory/movements/new?product_id=${alert.product.id}&warehouse_id=${alert.warehouse.id}&suggested_quantity=${alert.recommended_order}&movement_type=entrada`}>
                        <Package className="w-4 h-4 mr-1" />
                        Reabastecer
                      </Link>
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </div>
          </Alert>
        ))}

        {alerts.length > maxItems && (
          <div className="text-center pt-3 border-t border-yellow-300">
            <Button variant="outline" size="sm" asChild>
              <Link href="/inventory/reports?type=low-stock">
                <Bell className="w-4 h-4 mr-2" />
                Ver todas las alertas ({alerts.length})
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Hook optimizado para usar las alertas en cualquier componente
export function useStockAlerts() {
  const [alertCount, setAlertCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const fetchAlertCount = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        
        if (!user || !mounted) {
          if (mounted) setLoading(false)
          return
        }

        // Usar la función compartida con caché
        const alerts = await fetchStockAlertsShared(user.id)
        
        if (mounted) {
          setAlertCount(alerts.length || 0)
          setLoading(false)
        }
      } catch (error) {
        console.error("Error fetching alert count:", error)
        if (mounted) setLoading(false)
      }
    }

    fetchAlertCount()

    // Cleanup para prevenir actualizaciones en componentes desmontados
    return () => {
      mounted = false
    }
  }, []) // Array de dependencias vacío - solo se ejecuta una vez al montar

  return { alertCount, loading }
}

export default StockAlerts