"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useDataUserId } from "@/hooks/use-data-user-id"
import { useToast } from "@/hooks/use-toast"

// ---------- Types ----------
export interface Driver {
    id: string
    user_id: string
    full_name: string
    cedula: string | null
    phone: string | null
    license_number: string | null
    license_expiry: string | null
    is_active: boolean
    notes: string | null
    created_at: string
}

export interface FleetVehicle {
    id: string
    user_id: string
    plate_number: string
    brand: string | null
    model: string | null
    year: number | null
    color: string | null
    vehicle_type: string
    capacity: string | null
    is_active: boolean
    last_maintenance_date: string | null
    next_maintenance_date: string | null
    notes: string | null
    created_at: string
}

export interface DeliveryNote {
    id: string
    user_id: string
    dispatch_id: string | null
    driver_id: string | null
    vehicle_id: string | null
    client_id: string | null
    note_number: string
    delivery_date: string
    status: "pendiente" | "en_transito" | "entregado" | "cancelado"
    delivery_address: string | null
    notes: string | null
    created_at: string
    drivers?: { full_name: string }
    fleet_vehicles?: { plate_number: string; brand?: string }
    clients?: { name: string }
}

// ---------- Hook: useDrivers ----------
export function useDrivers() {
    const [drivers, setDrivers] = useState<Driver[]>([])
    const [loading, setLoading] = useState(true)
    const { dataUserId, loading: userIdLoading } = useDataUserId()
    const { toast } = useToast()

    const fetchDrivers = useCallback(async () => {
        if (!dataUserId) return
        setLoading(true)
        try {
            const { data, error } = await (supabase as any)
                .from("drivers")
                .select("*")
                .eq("user_id", dataUserId)
                .order("full_name", { ascending: true })
            if (error) throw error
            setDrivers(data || [])
        } catch (error: any) {
            console.error("Error fetching drivers:", error)
            toast({ title: "Error", description: "No se pudieron cargar los choferes", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }, [dataUserId])

    useEffect(() => {
        if (!userIdLoading && dataUserId) fetchDrivers()
    }, [dataUserId, userIdLoading, fetchDrivers])

    const createDriver = async (driverData: Partial<Driver>) => {
        if (!dataUserId) return null
        try {
            const { data, error } = await (supabase as any)
                .from("drivers")
                .insert({ user_id: dataUserId, ...driverData })
                .select()
                .single()
            if (error) throw error
            toast({ title: "Chofer creado", description: `${driverData.full_name} fue registrado` })
            fetchDrivers()
            return data
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "No se pudo crear el chofer", variant: "destructive" })
            return null
        }
    }

    const updateDriver = async (id: string, updates: Partial<Driver>) => {
        try {
            const { error } = await (supabase as any).from("drivers").update(updates).eq("id", id)
            if (error) throw error
            toast({ title: "Chofer actualizado" })
            fetchDrivers()
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        }
    }

    const deleteDriver = async (id: string) => {
        try {
            const { error } = await (supabase as any).from("drivers").delete().eq("id", id)
            if (error) throw error
            toast({ title: "Chofer eliminado" })
            fetchDrivers()
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        }
    }

    return { drivers, loading, fetchDrivers, createDriver, updateDriver, deleteDriver }
}

// ---------- Hook: useFleetVehicles ----------
export function useFleetVehicles() {
    const [vehicles, setVehicles] = useState<FleetVehicle[]>([])
    const [loading, setLoading] = useState(true)
    const { dataUserId, loading: userIdLoading } = useDataUserId()
    const { toast } = useToast()

    const fetchVehicles = useCallback(async () => {
        if (!dataUserId) return
        setLoading(true)
        try {
            const { data, error } = await (supabase as any)
                .from("fleet_vehicles")
                .select("*")
                .eq("user_id", dataUserId)
                .order("plate_number", { ascending: true })
            if (error) throw error
            setVehicles(data || [])
        } catch (error: any) {
            console.error("Error fetching vehicles:", error)
            toast({ title: "Error", description: "No se pudieron cargar los vehículos", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }, [dataUserId])

    useEffect(() => {
        if (!userIdLoading && dataUserId) fetchVehicles()
    }, [dataUserId, userIdLoading, fetchVehicles])

    const createVehicle = async (vehicleData: Partial<FleetVehicle>) => {
        if (!dataUserId) return null
        try {
            const { data, error } = await (supabase as any)
                .from("fleet_vehicles")
                .insert({ user_id: dataUserId, ...vehicleData })
                .select()
                .single()
            if (error) throw error
            toast({ title: "Vehículo registrado", description: `Placa ${vehicleData.plate_number} agregada` })
            fetchVehicles()
            return data
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "No se pudo registrar el vehículo", variant: "destructive" })
            return null
        }
    }

    const updateVehicle = async (id: string, updates: Partial<FleetVehicle>) => {
        try {
            const { error } = await (supabase as any).from("fleet_vehicles").update(updates).eq("id", id)
            if (error) throw error
            toast({ title: "Vehículo actualizado" })
            fetchVehicles()
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        }
    }

    const deleteVehicle = async (id: string) => {
        try {
            const { error } = await (supabase as any).from("fleet_vehicles").delete().eq("id", id)
            if (error) throw error
            toast({ title: "Vehículo eliminado" })
            fetchVehicles()
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        }
    }

    return { vehicles, loading, fetchVehicles, createVehicle, updateVehicle, deleteVehicle }
}

// ---------- Hook: useDeliveryNotes ----------
export function useDeliveryNotes() {
    const [notes, setNotes] = useState<DeliveryNote[]>([])
    const [loading, setLoading] = useState(true)
    const { dataUserId, loading: userIdLoading } = useDataUserId()
    const { toast } = useToast()

    const fetchNotes = useCallback(async (dateFilter?: string) => {
        if (!dataUserId) return
        setLoading(true)
        try {
            let query = (supabase as any)
                .from("delivery_notes")
                .select("*, drivers(full_name), fleet_vehicles(plate_number, brand), clients(name)")
                .eq("user_id", dataUserId)
                .order("created_at", { ascending: false })
            if (dateFilter) query = query.eq("delivery_date", dateFilter)
            const { data, error } = await query
            if (error) throw error
            setNotes(data || [])
        } catch (error: any) {
            console.error("Error fetching delivery notes:", error)
        } finally {
            setLoading(false)
        }
    }, [dataUserId])

    useEffect(() => {
        if (!userIdLoading && dataUserId) fetchNotes()
    }, [dataUserId, userIdLoading, fetchNotes])

    const createNote = async (noteData: Partial<DeliveryNote>) => {
        if (!dataUserId) return null
        try {
            const noteNumber = `CN-${Date.now().toString(36).toUpperCase()}`
            const { data, error } = await (supabase as any)
                .from("delivery_notes")
                .insert({ user_id: dataUserId, note_number: noteNumber, ...noteData })
                .select("*, drivers(full_name), fleet_vehicles(plate_number, brand), clients(name)")
                .single()
            if (error) throw error
            toast({ title: "Conduce creado", description: `Conduce ${noteNumber} generado` })
            fetchNotes()
            return data
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
            return null
        }
    }

    const updateNoteStatus = async (id: string, status: string) => {
        try {
            const { error } = await (supabase as any).from("delivery_notes").update({ status }).eq("id", id)
            if (error) throw error
            toast({ title: "Estado actualizado" })
            fetchNotes()
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        }
    }

    const deleteNote = async (id: string) => {
        try {
            const { error } = await (supabase as any).from("delivery_notes").delete().eq("id", id)
            if (error) throw error
            toast({ title: "Conduce eliminado" })
            fetchNotes()
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        }
    }

    return { notes, loading, fetchNotes, createNote, updateNoteStatus, deleteNote }
}
