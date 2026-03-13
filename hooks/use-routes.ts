"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useDataUserId } from "@/hooks/use-data-user-id"
import { useToast } from "@/hooks/use-toast"

// ---------- Types ----------
export interface Route {
    id: string
    user_id: string
    name: string
    description: string | null
    is_active: boolean
    created_at: string
    updated_at: string
    assignment_count?: number
}

export interface ClientRouteAssignment {
    id: string
    user_id: string
    client_id: string
    route_id: string
    day_of_week: string
    frequency: string
    visit_order: number
    created_at: string
    clients?: { id: string; name: string; address?: string; phone?: string }
}

export interface DailyDispatch {
    id: string
    user_id: string
    route_id: string
    dispatch_date: string
    status: "pendiente" | "en_progreso" | "completada"
    driver_id: string | null
    vehicle_id: string | null
    created_at: string
    routes?: { name: string }
    drivers?: { full_name: string }
    fleet_vehicles?: { plate_number: string }
}

export interface DispatchItem {
    id: string
    dispatch_id: string
    client_id: string
    visit_order: number
    is_visited: boolean
    visited_at: string | null
    notes: string | null
    clients?: { id: string; name: string; address?: string; phone?: string }
}

// ---------- Hook: useRoutes ----------
export function useRoutes() {
    const [routes, setRoutes] = useState<Route[]>([])
    const [loading, setLoading] = useState(true)
    const { dataUserId, loading: userIdLoading } = useDataUserId()
    const { toast } = useToast()

    const fetchRoutes = useCallback(async () => {
        if (!dataUserId) return
        setLoading(true)
        try {
            const { data, error } = await (supabase as any)
                .from("routes")
                .select("*, client_route_assignments(id)")
                .eq("user_id", dataUserId)
                .order("created_at", { ascending: false })

            if (error) throw error
            const mapped = (data || []).map((r: any) => ({
                ...r,
                assignment_count: r.client_route_assignments?.length || 0,
            }))
            setRoutes(mapped)
        } catch (error: any) {
            console.error("Error fetching routes:", error)
            toast({ title: "Error", description: "No se pudieron cargar las rutas", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }, [dataUserId, toast])

    useEffect(() => {
        if (!userIdLoading && dataUserId) fetchRoutes()
    }, [dataUserId, userIdLoading, fetchRoutes])

    const createRoute = async (name: string, description: string) => {
        if (!dataUserId) return null
        try {
            const { data, error } = await (supabase as any)
                .from("routes")
                .insert({ user_id: dataUserId, name, description: description || null })
                .select()
                .single()
            if (error) throw error
            toast({ title: "Ruta creada", description: `La ruta "${name}" fue creada exitosamente` })
            fetchRoutes()
            return data
        } catch (error: any) {
            console.error("Error creating route:", error)
            toast({ title: "Error", description: error.message || "No se pudo crear la ruta", variant: "destructive" })
            return null
        }
    }

    const updateRoute = async (id: string, updates: Partial<Route>) => {
        try {
            const { error } = await (supabase as any)
                .from("routes")
                .update(updates)
                .eq("id", id)
            if (error) throw error
            toast({ title: "Ruta actualizada", description: "Los cambios fueron guardados" })
            fetchRoutes()
        } catch (error: any) {
            console.error("Error updating route:", error)
            toast({ title: "Error", description: error.message || "No se pudo actualizar la ruta", variant: "destructive" })
        }
    }

    const deleteRoute = async (id: string) => {
        try {
            const { error } = await (supabase as any)
                .from("routes")
                .delete()
                .eq("id", id)
            if (error) throw error
            toast({ title: "Ruta eliminada", description: "La ruta fue eliminada exitosamente" })
            fetchRoutes()
        } catch (error: any) {
            console.error("Error deleting route:", error)
            toast({ title: "Error", description: error.message || "No se pudo eliminar la ruta", variant: "destructive" })
        }
    }

    const toggleRoute = async (id: string, isActive: boolean) => {
        await updateRoute(id, { is_active: !isActive })
    }

    return { routes, loading, fetchRoutes, createRoute, updateRoute, deleteRoute, toggleRoute }
}

// ---------- Hook: useRouteAssignments ----------
export function useRouteAssignments(routeId?: string) {
    const [assignments, setAssignments] = useState<ClientRouteAssignment[]>([])
    const [loading, setLoading] = useState(true)
    const { dataUserId, loading: userIdLoading } = useDataUserId()
    const { toast } = useToast()

    const fetchAssignments = useCallback(async () => {
        if (!dataUserId) return
        setLoading(true)
        try {
            let query = (supabase as any)
                .from("client_route_assignments")
                .select("*, clients(id, name, address, phone)")
                .eq("user_id", dataUserId)
                .order("visit_order", { ascending: true })

            if (routeId) query = query.eq("route_id", routeId)

            const { data, error } = await query
            if (error) throw error
            setAssignments(data || [])
        } catch (error: any) {
            console.error("Error fetching assignments:", error)
        } finally {
            setLoading(false)
        }
    }, [dataUserId, routeId])

    useEffect(() => {
        if (!userIdLoading && dataUserId) fetchAssignments()
    }, [dataUserId, userIdLoading, fetchAssignments])

    const assignClient = async (clientId: string, rId: string, dayOfWeek: string, frequency: string, visitOrder: number) => {
        if (!dataUserId) return null
        try {
            const { data, error } = await (supabase as any)
                .from("client_route_assignments")
                .insert({
                    user_id: dataUserId,
                    client_id: clientId,
                    route_id: rId,
                    day_of_week: dayOfWeek,
                    frequency,
                    visit_order: visitOrder,
                })
                .select("*, clients(id, name, address, phone)")
                .single()
            if (error) throw error
            toast({ title: "Cliente asignado", description: "El cliente fue agregado a la ruta" })
            fetchAssignments()
            return data
        } catch (error: any) {
            if (error.code === "23505") {
                toast({ title: "Duplicado", description: "Este cliente ya está asignado a esta ruta en ese día", variant: "destructive" })
            } else {
                toast({ title: "Error", description: error.message || "No se pudo asignar el cliente", variant: "destructive" })
            }
            return null
        }
    }

    const removeAssignment = async (assignmentId: string) => {
        try {
            const { error } = await (supabase as any)
                .from("client_route_assignments")
                .delete()
                .eq("id", assignmentId)
            if (error) throw error
            toast({ title: "Cliente removido", description: "El cliente fue removido de la ruta" })
            fetchAssignments()
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "No se pudo remover", variant: "destructive" })
        }
    }

    return { assignments, loading, fetchAssignments, assignClient, removeAssignment }
}

// ---------- Hook: useDailyDispatch ----------
export function useDailyDispatch() {
    const [dispatches, setDispatches] = useState<DailyDispatch[]>([])
    const [dispatchItems, setDispatchItems] = useState<DispatchItem[]>([])
    const [loading, setLoading] = useState(true)
    const { dataUserId, loading: userIdLoading } = useDataUserId()
    const { toast } = useToast()

    const fetchDispatches = useCallback(async (date?: string) => {
        if (!dataUserId) return
        setLoading(true)
        const targetDate = date || new Date().toISOString().split("T")[0]
        try {
            const { data, error } = await (supabase as any)
                .from("daily_dispatches")
                .select("*, routes(name), drivers(full_name), fleet_vehicles(plate_number)")
                .eq("user_id", dataUserId)
                .eq("dispatch_date", targetDate)
                .order("created_at", { ascending: true })

            if (error) throw error
            setDispatches(data || [])
        } catch (error: any) {
            console.error("Error fetching dispatches:", error)
        } finally {
            setLoading(false)
        }
    }, [dataUserId])

    const fetchDispatchItems = useCallback(async (dispatchId: string) => {
        try {
            const { data, error } = await (supabase as any)
                .from("dispatch_items")
                .select("*, clients(id, name, address, phone)")
                .eq("dispatch_id", dispatchId)
                .order("visit_order", { ascending: true })

            if (error) throw error
            setDispatchItems(data || [])
        } catch (error: any) {
            console.error("Error fetching items:", error)
        }
    }, [])

    useEffect(() => {
        if (!userIdLoading && dataUserId) fetchDispatches()
    }, [dataUserId, userIdLoading, fetchDispatches])

    const createDispatch = async (routeId: string, date: string, driverId?: string, vehicleId?: string) => {
        if (!dataUserId) return null
        try {
            const insertPayload: any = { user_id: dataUserId, route_id: routeId, dispatch_date: date }
            if (driverId) insertPayload.driver_id = driverId
            if (vehicleId) insertPayload.vehicle_id = vehicleId
            const { data, error } = await (supabase as any)
                .from("daily_dispatches")
                .insert(insertPayload)
                .select("*, routes(name), drivers(full_name), fleet_vehicles(plate_number)")
                .single()
            if (error) throw error

            // Crear dispatch_items a partir de los clientes asignados a esta ruta
            const dispatch = data as any
            
            console.log('📅 Creando dispatch_items para fecha:', date, 'ruta:', routeId)
            
            // Obtener TODOS los clientes asignados a esta ruta (sin filtrar por día)
            const { data: assignments, error: assignError } = await (supabase as any)
                .from("client_route_assignments")
                .select("client_id, visit_order")
                .eq("route_id", routeId)
                .eq("user_id", dataUserId)
                .order("visit_order", { ascending: true })

            if (assignError) {
                console.error('Error obteniendo asignaciones:', assignError)
            } else if (assignments && assignments.length > 0) {
                console.log('👥 Clientes asignados encontrados:', assignments.length)
                
                // Crear los dispatch_items
                const itemsToInsert = assignments.map((a: any, index: number) => ({
                    dispatch_id: dispatch.id,
                    client_id: a.client_id,
                    visit_order: a.visit_order || index + 1,
                    is_visited: false
                }))

                const { error: itemsError } = await (supabase as any)
                    .from("dispatch_items")
                    .insert(itemsToInsert)

                if (itemsError) {
                    console.error('Error creando dispatch_items:', itemsError)
                    toast({ title: "Advertencia", description: "Despacho creado pero sin paradas. Asigne clientes manualmente.", variant: "destructive" })
                } else {
                    console.log('✅ Dispatch items creados:', itemsToInsert.length)
                }
            } else {
                console.log('⚠️ No hay clientes asignados a esta ruta para el día:', dayOfWeek)
            }

            toast({ title: "Despacho creado", description: "El despacho del día fue generado" })
            fetchDispatches(date)
            return data
        } catch (error: any) {
            if (error.code === "23505") {
                toast({ title: "Ya existe", description: "Ya hay un despacho para esta ruta en esta fecha", variant: "destructive" })
            } else {
                toast({ title: "Error", description: error.message || "No se pudo crear el despacho", variant: "destructive" })
            }
            return null
        }
    }

    const updateDispatchStatus = async (id: string, status: string, date?: string) => {
        try {
            const { error } = await (supabase as any)
                .from("daily_dispatches")
                .update({ status })
                .eq("id", id)
            if (error) throw error
            toast({ title: "Estado actualizado" })
            if (date) fetchDispatches(date)
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        }
    }

    const markClientVisited = async (itemId: string) => {
        try {
            const { error } = await (supabase as any)
                .from("dispatch_items")
                .update({ is_visited: true, visited_at: new Date().toISOString() })
                .eq("id", itemId)
            if (error) throw error
            toast({ title: "Cliente visitado", description: "El cliente fue marcado como visitado" })
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        }
    }

    const deleteDispatch = async (dispatchId: string, date?: string) => {
        try {
            const { error } = await (supabase as any)
                .from("daily_dispatches")
                .delete()
                .eq("id", dispatchId)
            if (error) throw error
            toast({ title: "Despacho eliminado", description: "El despacho fue eliminado correctamente." })
            if (date) fetchDispatches(date)
        } catch (error: any) {
            console.error("Error deleting dispatch:", error)
            toast({ title: "Error", description: error.message || "No se pudo eliminar el despacho", variant: "destructive" })
        }
    }

    // Función para regenerar/agregar paradas a un despacho existente
    const regenerateDispatchItems = async (dispatchId: string, routeId: string, date: string) => {
        if (!dataUserId) return false
        try {
            console.log('🔄 Regenerando dispatch_items para dispatch:', dispatchId, 'ruta:', routeId)

            // Obtener TODOS los clientes asignados a esta ruta
            const { data: assignments, error: assignError } = await (supabase as any)
                .from("client_route_assignments")
                .select("client_id, visit_order")
                .eq("route_id", routeId)
                .eq("user_id", dataUserId)
                .order("visit_order", { ascending: true })

            if (assignError) throw assignError

            if (!assignments || assignments.length === 0) {
                toast({ title: "Sin clientes", description: "No hay clientes asignados a esta ruta. Primero asigne clientes en 'Asignar Clientes'.", variant: "destructive" })
                return false
            }

            // Eliminar items existentes del dispatch
            await (supabase as any)
                .from("dispatch_items")
                .delete()
                .eq("dispatch_id", dispatchId)

            // Crear los nuevos dispatch_items
            const itemsToInsert = assignments.map((a: any, index: number) => ({
                dispatch_id: dispatchId,
                client_id: a.client_id,
                visit_order: a.visit_order || index + 1,
                is_visited: false
            }))

            const { error: itemsError } = await (supabase as any)
                .from("dispatch_items")
                .insert(itemsToInsert)

            if (itemsError) throw itemsError

            toast({ title: "Paradas generadas", description: `Se agregaron ${itemsToInsert.length} paradas al despacho` })
            fetchDispatchItems(dispatchId)
            return true
        } catch (error: any) {
            console.error('Error regenerando dispatch_items:', error)
            toast({ title: "Error", description: error.message || "No se pudieron generar las paradas", variant: "destructive" })
            return false
        }
    }

    return { dispatches, dispatchItems, loading, fetchDispatches, fetchDispatchItems, createDispatch, updateDispatchStatus, markClientVisited, regenerateDispatchItems, deleteDispatch }
}
