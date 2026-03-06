"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Plus, Search, FileText, ArrowLeft, Trash2, Package, Calendar as CalendarIcon, User, Truck } from "lucide-react"
import { useDeliveryNotes } from "@/hooks/use-fleet"
import { useDrivers, useFleetVehicles } from "@/hooks/use-fleet"
import { useDataUserId } from "@/hooks/use-data-user-id"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useEffect } from "react"

type NoteStatus = "pendiente" | "en_transito" | "entregado" | "cancelado"

const statusStyles: Record<NoteStatus, string> = {
    pendiente: "bg-slate-800 text-slate-300 border-slate-600",
    en_transito: "bg-blue-900/50 text-blue-300 border-blue-700",
    entregado: "bg-emerald-900/50 text-emerald-300 border-emerald-700",
    cancelado: "bg-red-900/50 text-red-300 border-red-700",
}
const statusLabels: Record<NoteStatus, string> = {
    pendiente: "Pendiente",
    en_transito: "En Tránsito",
    entregado: "Entregado",
    cancelado: "Cancelado",
}

export default function DeliveryNotesPage() {
    const { notes, loading, fetchNotes, createNote, updateNoteStatus, deleteNote } = useDeliveryNotes()
    const { drivers } = useDrivers()
    const { vehicles } = useFleetVehicles()
    const { dataUserId } = useDataUserId()

    const [searchTerm, setSearchTerm] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [formData, setFormData] = useState({ driver_id: "", vehicle_id: "", client_id: "", delivery_date: new Date().toISOString().split("T")[0], delivery_address: "", notes: "" })
    const [clientSearch, setClientSearch] = useState("")
    const [clientResults, setClientResults] = useState<any[]>([])
    const [selectedClient, setSelectedClient] = useState<any>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string | null }>({ show: false, id: null })
    const [isDeleting, setIsDeleting] = useState(false)
    const [statusFilter, setStatusFilter] = useState<"ALL" | NoteStatus>("ALL")
    const { toast } = useToast()

    // Búsqueda de clientes
    useEffect(() => {
        if (!dataUserId || clientSearch.length < 2) { setClientResults([]); return }
        const t = setTimeout(async () => {
            const { data } = await supabase
                .from("clients")
                .select("id, name, address")
                .eq("user_id", dataUserId)
                .or(`name.ilike.%${clientSearch}%`)
                .limit(8)
            setClientResults(data || [])
        }, 300)
        return () => clearTimeout(t)
    }, [clientSearch, dataUserId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const payload: any = {
            delivery_date: formData.delivery_date,
            delivery_address: formData.delivery_address || null,
            notes: formData.notes || null,
            driver_id: formData.driver_id || null,
            vehicle_id: formData.vehicle_id || null,
            client_id: formData.client_id || null,
        }
        await createNote(payload)
        setFormData({ driver_id: "", vehicle_id: "", client_id: "", delivery_date: new Date().toISOString().split("T")[0], delivery_address: "", notes: "" })
        setSelectedClient(null)
        setClientSearch("")
        setShowForm(false)
    }

    const confirmDelete = async () => {
        if (!deleteConfirm.id) return
        setIsDeleting(true)
        await deleteNote(deleteConfirm.id)
        setIsDeleting(false)
        setDeleteConfirm({ show: false, id: null })
    }

    const handleStatusChange = async (id: string, newStatus: string) => {
        await updateNoteStatus(id, newStatus)
    }

    const filtered = notes
        .filter((n) => statusFilter === "ALL" || n.status === statusFilter)
        .filter((n) =>
            n.note_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            n.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            n.drivers?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 lg:p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="h-12 w-64 bg-slate-700 rounded skeleton"></div>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-slate-800 rounded-xl skeleton" style={{ animationDelay: `${i * 0.1}s` }}></div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-4 lg:space-y-8">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 lg:p-3 bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl lg:rounded-2xl shadow-lg">
                            <FileText className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-4xl font-bold text-slate-200">Conduces</h1>
                            <p className="text-sm lg:text-lg text-slate-400 font-medium">Notas de entrega y registro de despachos</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/routes">
                            <Button variant="ghost" className="text-slate-400 hover:text-slate-200 hover:bg-slate-800">
                                <ArrowLeft className="h-4 w-4 mr-2" /> Rutas
                            </Button>
                        </Link>
                        <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) { setSelectedClient(null); setClientSearch("") } }}>
                            <DialogTrigger asChild>
                                <Button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg">
                                    <Plus className="h-4 w-4 mr-2" /> Nuevo Conduce
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md p-0 bg-slate-900 border-slate-700">
                                <div className="p-6">
                                    <h2 className="text-xl font-bold text-slate-200 mb-4">Generar Conduce</h2>
                                    <form onSubmit={handleSubmit} className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Fecha de Entrega</label>
                                            <input type="date" value={formData.delivery_date} onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })} className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-md text-sm p-2 outline-none focus:ring-2 focus:ring-amber-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Cliente</label>
                                            {selectedClient ? (
                                                <div className="flex items-center gap-2 p-2 bg-slate-800 rounded-md border border-slate-700">
                                                    <span className="text-sm text-slate-200 flex-1">{selectedClient.name}</span>
                                                    <button type="button" onClick={() => { setSelectedClient(null); setFormData({ ...formData, client_id: "" }); setClientSearch("") }} className="text-xs text-slate-500 hover:text-red-400">✕</button>
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <Input placeholder="Buscar cliente..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="border-slate-700 bg-slate-800 text-slate-200" variant="modern" />
                                                    {clientResults.length > 0 && (
                                                        <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                                            {clientResults.map((c) => (
                                                                <button key={c.id} type="button" onClick={() => { setSelectedClient(c); setFormData({ ...formData, client_id: c.id, delivery_address: c.address || "" }); setClientSearch(""); setClientResults([]) }} className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors">
                                                                    {c.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Dirección de Entrega</label>
                                            <Input placeholder="Dirección..." value={formData.delivery_address} onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })} className="border-slate-700 bg-slate-800 text-slate-200" variant="modern" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Chofer</label>
                                                <select value={formData.driver_id} onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })} className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-md text-sm p-2 outline-none focus:ring-2 focus:ring-amber-500">
                                                    <option value="">— Sin asignar —</option>
                                                    {drivers.filter((d) => d.is_active).map((d) => (
                                                        <option key={d.id} value={d.id}>{d.full_name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Vehículo</label>
                                                <select value={formData.vehicle_id} onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })} className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-md text-sm p-2 outline-none focus:ring-2 focus:ring-amber-500">
                                                    <option value="">— Sin asignar —</option>
                                                    {vehicles.filter((v) => v.is_active).map((v) => (
                                                        <option key={v.id} value={v.id}>{v.plate_number} — {v.brand} {v.model}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Notas</label>
                                            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Observaciones..." className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-md px-3 py-2 text-sm resize-none h-14 outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-slate-500" />
                                        </div>
                                        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-700">
                                            <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-200 hover:bg-slate-800">Cancelar</Button>
                                            <Button type="submit" className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">Generar Conduce</Button>
                                        </div>
                                    </form>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </motion.div>

                <Card className="border-0 shadow-2xl bg-slate-900/80 backdrop-blur-sm border-slate-700">
                    <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input placeholder="Buscar conduces..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 border-amber-800 focus:border-amber-400" variant="modern" />
                            </div>
                            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                                {(["ALL", "pendiente", "en_transito", "entregado", "cancelado"] as const).map((s) => (
                                    <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${statusFilter === s ? "bg-slate-700 text-amber-300 shadow-sm" : "text-slate-500 hover:text-slate-300"}`}>
                                        {s === "ALL" ? "Todos" : statusLabels[s]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {filtered.length === 0 ? (
                            <div className="text-center py-16">
                                <FileText className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                                <h3 className="text-xl font-bold text-slate-300 mb-2">Sin conduces</h3>
                                <p className="text-slate-500">Genere un nuevo conduce para registrar entregas.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs uppercase text-slate-400 bg-slate-800/50 border-b border-slate-700">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">No. Conduce</th>
                                            <th className="px-4 py-3 font-semibold hidden md:table-cell">Cliente</th>
                                            <th className="px-4 py-3 font-semibold hidden lg:table-cell">Chofer</th>
                                            <th className="px-4 py-3 font-semibold hidden lg:table-cell">Vehículo</th>
                                            <th className="px-4 py-3 font-semibold text-center">Fecha</th>
                                            <th className="px-4 py-3 font-semibold text-center">Estado</th>
                                            <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {filtered.map((note, i) => (
                                            <motion.tr key={note.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="hover:bg-slate-800/50 transition-colors group">
                                                <td className="px-4 py-3 font-mono font-medium text-slate-200 text-xs">{note.note_number}</td>
                                                <td className="px-4 py-3 text-slate-300 hidden md:table-cell">{note.clients?.name || "—"}</td>
                                                <td className="px-4 py-3 text-slate-400 hidden lg:table-cell text-xs">
                                                    {note.drivers?.full_name ? <span className="flex items-center gap-1"><User className="w-3 h-3" />{note.drivers.full_name}</span> : "—"}
                                                </td>
                                                <td className="px-4 py-3 text-slate-400 hidden lg:table-cell text-xs">
                                                    {note.fleet_vehicles?.plate_number ? <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{note.fleet_vehicles.plate_number}</span> : "—"}
                                                </td>
                                                <td className="px-4 py-3 text-center text-slate-400 text-xs">{note.delivery_date}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <select value={note.status} onChange={(e) => handleStatusChange(note.id, e.target.value)} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border outline-none cursor-pointer bg-transparent ${statusStyles[note.status]}`}>
                                                        <option value="pendiente" className="bg-slate-800 text-slate-200">Pendiente</option>
                                                        <option value="en_transito" className="bg-slate-800 text-slate-200">En Tránsito</option>
                                                        <option value="entregado" className="bg-slate-800 text-slate-200">Entregado</option>
                                                        <option value="cancelado" className="bg-slate-800 text-slate-200">Cancelado</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ show: true, id: note.id })} className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <ConfirmDialog open={deleteConfirm.show} onOpenChange={(o) => setDeleteConfirm({ show: o, id: null })} title="Eliminar Conduce" description="¿Seguro que deseas eliminar este conduce?" confirmLabel="Eliminar" cancelLabel="Cancelar" onConfirm={confirmDelete} variant="danger" isLoading={isDeleting} />
        </div>
    )
}
