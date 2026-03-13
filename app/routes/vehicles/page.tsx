"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Plus, Search, Truck, Edit, Trash2, ArrowLeft, Wrench, Calendar } from "lucide-react"
import { useFleetVehicles } from "@/hooks/use-fleet"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

const emptyForm = { plate_number: "", brand: "", model: "", year: "", color: "", vehicle_type: "camion", capacity: "", last_maintenance_date: "", next_maintenance_date: "", notes: "" }

const vehicleTypeLabels: Record<string, string> = { camion: "Camión", camioneta: "Camioneta", moto: "Moto", furgon: "Furgón", otro: "Otro" }

export default function VehiclesPage() {
    const { vehicles, loading, createVehicle, updateVehicle, deleteVehicle } = useFleetVehicles()
    const [searchTerm, setSearchTerm] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<any>(null)
    const [formData, setFormData] = useState(emptyForm)
    const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string | null }>({ show: false, id: null })
    const [isDeleting, setIsDeleting] = useState(false)
    const { toast } = useToast()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.plate_number.trim()) return
        const payload = {
            ...formData,
            year: formData.year ? parseInt(formData.year) : null,
            last_maintenance_date: formData.last_maintenance_date || null,
            next_maintenance_date: formData.next_maintenance_date || null,
        }
        if (editing) {
            await updateVehicle(editing.id, payload as any)
        } else {
            await createVehicle(payload as any)
        }
        setFormData(emptyForm)
        setEditing(null)
        setShowForm(false)
    }

    const handleEdit = (v: any) => {
        setEditing(v)
        setFormData({
            plate_number: v.plate_number || "",
            brand: v.brand || "",
            model: v.model || "",
            year: v.year?.toString() || "",
            color: v.color || "",
            vehicle_type: v.vehicle_type || "camion",
            capacity: v.capacity || "",
            last_maintenance_date: v.last_maintenance_date || "",
            next_maintenance_date: v.next_maintenance_date || "",
            notes: v.notes || "",
        })
        setShowForm(true)
    }

    const confirmDelete = async () => {
        if (!deleteConfirm.id) return
        setIsDeleting(true)
        await deleteVehicle(deleteConfirm.id)
        setIsDeleting(false)
        setDeleteConfirm({ show: false, id: null })
    }

    const filtered = vehicles.filter(
        (v) =>
            v.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.model?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const needsMaintenance = (v: any) => {
        if (!v.next_maintenance_date) return false
        return new Date(v.next_maintenance_date) <= new Date()
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 lg:p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="h-12 w-64 bg-slate-700 rounded skeleton"></div>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-slate-800 rounded-xl skeleton" style={{ animationDelay: `${i * 0.1}s` }}></div>
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
                        <div className="p-2 lg:p-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl lg:rounded-2xl shadow-lg">
                            <Truck className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-4xl font-bold text-slate-200">Vehículos</h1>
                            <p className="text-sm lg:text-lg text-slate-400 font-medium">Fichaje y control de la flota vehicular</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/routes">
                            <Button variant="ghost" className="text-slate-400 hover:text-slate-200 hover:bg-slate-800">
                                <ArrowLeft className="h-4 w-4 mr-2" /> Rutas
                            </Button>
                        </Link>
                        <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) { setEditing(null); setFormData(emptyForm) } }}>
                            <DialogTrigger asChild>
                                <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg">
                                    <Plus className="h-4 w-4 mr-2" /> Nuevo Vehículo
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg p-0 bg-slate-900 border-slate-700">
                                <div className="p-6">
                                    <h2 className="text-xl font-bold text-slate-200 mb-4">{editing ? "Editar Vehículo" : "Registrar Vehículo"}</h2>
                                    <form onSubmit={handleSubmit} className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Placa *</label>
                                                <Input required placeholder="A000000" value={formData.plate_number} onChange={(e) => setFormData({ ...formData, plate_number: e.target.value.toUpperCase() })} className="border-slate-700 bg-slate-800 text-slate-200" variant="modern" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Tipo</label>
                                                <select value={formData.vehicle_type} onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })} className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-md text-sm p-2 outline-none focus:ring-2 focus:ring-cyan-500">
                                                    <option value="camion">Camión</option>
                                                    <option value="camioneta">Camioneta</option>
                                                    <option value="moto">Moto</option>
                                                    <option value="furgon">Furgón</option>
                                                    <option value="otro">Otro</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Marca</label>
                                                <Input placeholder="Toyota" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="border-slate-700 bg-slate-800 text-slate-200" variant="modern" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Modelo</label>
                                                <Input placeholder="Hilux" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} className="border-slate-700 bg-slate-800 text-slate-200" variant="modern" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Año</label>
                                                <Input placeholder="2024" type="number" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} className="border-slate-700 bg-slate-800 text-slate-200" variant="modern" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Color</label>
                                                <Input placeholder="Blanco" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="border-slate-700 bg-slate-800 text-slate-200" variant="modern" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Capacidad</label>
                                                <Input placeholder="3 Ton" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} className="border-slate-700 bg-slate-800 text-slate-200" variant="modern" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Último Mantenimiento</label>
                                                <input type="date" value={formData.last_maintenance_date} onChange={(e) => setFormData({ ...formData, last_maintenance_date: e.target.value })} className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-md text-sm p-2 outline-none focus:ring-2 focus:ring-cyan-500" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Próx. Mantenimiento</label>
                                                <input type="date" value={formData.next_maintenance_date} onChange={(e) => setFormData({ ...formData, next_maintenance_date: e.target.value })} className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-md text-sm p-2 outline-none focus:ring-2 focus:ring-cyan-500" />
                                            </div>
                                        </div>
                                        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-700">
                                            <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-200 hover:bg-slate-800">Cancelar</Button>
                                            <Button type="submit" className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white">{editing ? "Guardar" : "Registrar"}</Button>
                                        </div>
                                    </form>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </motion.div>

                <Card className="border-0 shadow-2xl bg-slate-900/80 backdrop-blur-sm border-slate-700">
                    <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input placeholder="Buscar por placa, marca..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 border-cyan-800 focus:border-cyan-400" variant="modern" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {filtered.length === 0 ? (
                            <div className="text-center py-16">
                                <Truck className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                                <h3 className="text-xl font-bold text-slate-300 mb-2">Sin vehículos registrados</h3>
                                <p className="text-slate-500">Agregue vehículos para asignarlos a los despachos diarios.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                                {filtered.map((v, i) => (
                                    <motion.div key={v.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                                        <Card className={`border-0 bg-slate-800/60 border-slate-700 hover:bg-slate-800 transition-colors group ${needsMaintenance(v) ? "ring-1 ring-amber-600" : ""}`}>
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className="font-bold text-lg text-slate-200 tracking-wider">{v.plate_number}</p>
                                                        <p className="text-xs text-slate-400">{v.brand} {v.model} {v.year ? `(${v.year})` : ""}</p>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(v)} className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-700"><Edit className="h-3.5 w-3.5" /></Button>
                                                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ show: true, id: v.id })} className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-900/20"><Trash2 className="h-3.5 w-3.5" /></Button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${v.is_active ? "bg-emerald-900/50 text-emerald-300" : "bg-slate-700 text-slate-400"}`}>
                                                        {v.is_active ? "Activo" : "Inactivo"}
                                                    </span>
                                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-cyan-900/50 text-cyan-300 border border-cyan-800">
                                                        {vehicleTypeLabels[v.vehicle_type] || v.vehicle_type}
                                                    </span>
                                                    {v.color && <span className="text-[10px] text-slate-500">{v.color}</span>}
                                                    {v.capacity && <span className="text-[10px] text-slate-500">• {v.capacity}</span>}
                                                </div>
                                                {needsMaintenance(v) && (
                                                    <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-400">
                                                        <Wrench className="h-3 w-3" /> Mantenimiento pendiente
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <ConfirmDialog open={deleteConfirm.show} onOpenChange={(o) => setDeleteConfirm({ show: o, id: null })} title="Eliminar Vehículo" description="¿Seguro que deseas eliminar este vehículo?" confirmLabel="Eliminar" cancelLabel="Cancelar" onConfirm={confirmDelete} variant="danger" isLoading={isDeleting} />
        </div>
    )
}
