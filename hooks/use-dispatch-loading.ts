"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useDataUserId } from "@/hooks/use-data-user-id"
import { useToast } from "@/hooks/use-toast"

// ---------- Types ----------
export interface DispatchInventoryItem {
    product_id: string
    product_name: string
    quantity_loaded: number
    unit: string
}

export interface DispatchInventoryLoad {
    id: string
    dispatch_id: string
    product_id: string | null
    product_name: string
    quantity_loaded: number
    unit: string
    created_at: string
}

export interface AvailableProduct {
    id: string
    name: string
    unit: string
    current_stock: number
    available_stock: number
}

export interface DispatchLoadingPayload {
    dispatch_id: string
    route_id: string
    driver_id: string
    vehicle_id: string
    petty_cash_amount: number
    warehouse_id: string
    items: DispatchInventoryItem[]
}

// ---------- Hook: useDispatchLoading ----------
export function useDispatchLoading() {
    const [availableProducts, setAvailableProducts] = useState<AvailableProduct[]>([])
    const [inventoryLoads, setInventoryLoads] = useState<DispatchInventoryLoad[]>([])
    const [defaultWarehouseId, setDefaultWarehouseId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const { dataUserId, loading: userIdLoading } = useDataUserId()
    const { toast } = useToast()

    // Fetch default warehouse (Almacén Principal)
    const fetchDefaultWarehouse = useCallback(async () => {
        if (!dataUserId) return
        try {
            const { data, error } = await (supabase as any)
                .from("warehouses")
                .select("id, name")
                .eq("user_id", dataUserId)
                .eq("is_active", true)
                .order("created_at", { ascending: true })
                .limit(1)
                .single()
            if (error) throw error
            setDefaultWarehouseId(data?.id || null)
        } catch (error: any) {
            console.error("Error fetching warehouse:", error)
        }
    }, [dataUserId])

    useEffect(() => {
        if (!userIdLoading && dataUserId) fetchDefaultWarehouse()
    }, [dataUserId, userIdLoading, fetchDefaultWarehouse])

    // Fetch products with available stock from main warehouse
    const fetchAvailableProducts = useCallback(async () => {
        if (!dataUserId || !defaultWarehouseId) return
        setLoading(true)
        try {
            const { data, error } = await (supabase as any)
                .from("product_warehouse_stock")
                .select("product_id, current_stock, available_stock, products(id, name, unit)")
                .eq("warehouse_id", defaultWarehouseId)
                .gt("available_stock", 0)
                .order("current_stock", { ascending: false })
            if (error) throw error
            const products: AvailableProduct[] = (data || []).map((row: any) => ({
                id: row.products?.id || row.product_id,
                name: row.products?.name || "Producto",
                unit: row.products?.unit || "und",
                current_stock: row.current_stock || 0,
                available_stock: row.available_stock || 0,
            }))
            setAvailableProducts(products)
        } catch (error: any) {
            console.error("Error fetching available products:", error)
        } finally {
            setLoading(false)
        }
    }, [dataUserId, defaultWarehouseId])

    useEffect(() => {
        if (defaultWarehouseId) fetchAvailableProducts()
    }, [defaultWarehouseId, fetchAvailableProducts])

    // Fetch already-loaded inventory for a dispatch
    const fetchInventoryLoads = useCallback(async (dispatchId: string) => {
        try {
            const { data, error } = await (supabase as any)
                .from("dispatch_inventory_loads")
                .select("*")
                .eq("dispatch_id", dispatchId)
                .order("created_at", { ascending: true })
            if (error) throw error
            setInventoryLoads(data || [])
        } catch (error: any) {
            console.error("Error fetching inventory loads:", error)
        }
    }, [])

    // Check if driver or vehicle already has an undispatched/unliquidated dispatch
    const checkAvailability = async (driverId: string, vehicleId: string, dispatchDate: string): Promise<{ available: boolean; reason?: string }> => {
        try {
            // Check driver
            const { data: driverDispatches } = await (supabase as any)
                .from("daily_dispatches")
                .select("id, dispatch_date, dispatch_status, routes(name)")
                .eq("driver_id", driverId)
                .in("dispatch_status", ["despachado", "en_ruta"])
            if (driverDispatches && driverDispatches.length > 0) {
                const d = driverDispatches[0]
                return { available: false, reason: `El chofer ya tiene un despacho activo (${d.routes?.name || "ruta"} - ${d.dispatch_date})` }
            }

            // Check vehicle
            const { data: vehicleDispatches } = await (supabase as any)
                .from("daily_dispatches")
                .select("id, dispatch_date, dispatch_status, routes(name)")
                .eq("vehicle_id", vehicleId)
                .in("dispatch_status", ["despachado", "en_ruta"])
            if (vehicleDispatches && vehicleDispatches.length > 0) {
                const v = vehicleDispatches[0]
                return { available: false, reason: `El vehículo ya tiene un despacho activo (${v.routes?.name || "ruta"} - ${v.dispatch_date})` }
            }

            return { available: true }
        } catch (error: any) {
            return { available: false, reason: error.message }
        }
    }

    // Confirm dispatch — transactional operation
    const confirmDispatch = async (payload: DispatchLoadingPayload): Promise<boolean> => {
        if (!dataUserId) return false
        setConfirming(true)
        try {
            // 1. Insert inventory loads
            if (payload.items.length > 0) {
                const loadInserts = payload.items.map((item) => ({
                    dispatch_id: payload.dispatch_id,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    quantity_loaded: item.quantity_loaded,
                    unit: item.unit,
                }))
                const { error: loadErr } = await (supabase as any)
                    .from("dispatch_inventory_loads")
                    .insert(loadInserts)
                if (loadErr) throw loadErr

                // 2. Register stock movements (transfer out from main warehouse)
                for (const item of payload.items) {
                    // Get current stock
                    const { data: stockRow } = await (supabase as any)
                        .from("product_warehouse_stock")
                        .select("current_stock, available_stock")
                        .eq("product_id", item.product_id)
                        .eq("warehouse_id", payload.warehouse_id)
                        .single()

                    const qtyBefore = stockRow?.current_stock || 0
                    const qtyAfter = qtyBefore - item.quantity_loaded

                    // Insert movement
                    await (supabase as any)
                        .from("stock_movements")
                        .insert({
                            user_id: dataUserId,
                            product_id: item.product_id,
                            warehouse_id: payload.warehouse_id,
                            movement_type: "transferencia",
                            quantity_before: qtyBefore,
                            quantity_change: -item.quantity_loaded,
                            quantity_after: qtyAfter,
                            reference_type: "dispatch",
                            reference_id: payload.dispatch_id,
                            notes: `Despacho matutino - carga al vehículo`,
                        })

                    // Update warehouse stock
                    await (supabase as any)
                        .from("product_warehouse_stock")
                        .update({
                            current_stock: qtyAfter,
                            available_stock: qtyAfter,
                            last_movement_date: new Date().toISOString(),
                        })
                        .eq("product_id", item.product_id)
                        .eq("warehouse_id", payload.warehouse_id)
                }
            }

            // 3. Update dispatch status + petty cash + departure time
            const { error: dispatchErr } = await (supabase as any)
                .from("daily_dispatches")
                .update({
                    dispatch_status: "despachado",
                    petty_cash_amount: payload.petty_cash_amount,
                    departure_time: new Date().toISOString(),
                })
                .eq("id", payload.dispatch_id)
            if (dispatchErr) throw dispatchErr

            // 4. Generate "salida_planta" delivery note
            const noteNumber = `CS-${Date.now().toString(36).toUpperCase()}`
            const deliveryNoteRow: Record<string, unknown> = {
                user_id: dataUserId,
                dispatch_id: payload.dispatch_id,
                driver_id: payload.driver_id,
                vehicle_id: payload.vehicle_id,
                note_number: noteNumber,
                delivery_date: new Date().toISOString().split("T")[0],
                status: "en_transito",
                note_type: "salida_planta",
                notes: `Fondo de caja: RD$${payload.petty_cash_amount}. Productos: ${payload.items.length} tipo(s).`,
            }
            // owner_id: requerido si existe columna (trigger set_owner_id_on_insert usa NEW.owner_id)
            deliveryNoteRow.owner_id = dataUserId
            const { error: noteErr } = await (supabase as any)
                .from("delivery_notes")
                .insert(deliveryNoteRow)
            if (noteErr) throw noteErr

            toast({ title: "¡Despacho confirmado!", description: `Conduce de salida ${noteNumber} generado. El vehículo está en ruta.` })
            fetchAvailableProducts() // Refresh stock
            return true
        } catch (error: any) {
            console.error("Error confirming dispatch:", error)
            toast({ title: "Error al despachar", description: error.message || "No se pudo confirmar el despacho", variant: "destructive" })
            return false
        } finally {
            setConfirming(false)
        }
    }

    return {
        availableProducts,
        inventoryLoads,
        defaultWarehouseId,
        loading,
        confirming,
        fetchAvailableProducts,
        fetchInventoryLoads,
        checkAvailability,
        confirmDispatch,
    }
}
