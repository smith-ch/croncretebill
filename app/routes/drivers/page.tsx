"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Plus, Search, User, Edit, Trash2, Phone, CreditCard, ArrowLeft } from "lucide-react"
import { useDrivers } from "@/hooks/use-fleet"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

const emptyForm = { full_name: "", cedula: "", phone: "", license_number: "", license_expiry: "", notes: "" }

export default function DriversPage() {
    const { drivers, loading, createDriver, updateDriver, deleteDriver } = useDrivers()
    const [searchTerm, setSearchTerm] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<any>(null)
    const [formData, setFormData] = useState(emptyForm)
    const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string | null }>({ show: false, id: null })
    const [isDeleting, setIsDeleting] = useState(false)
    const { toast } = useToast()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.full_name.trim()) return
        const payload = { ...formData, license_expiry: formData.license_expiry || null }
        if (editing) {
            await updateDriver(editing.id, payload as any)
        } else {
            await createDriver(payload as any)
        }
        setFormData(emptyForm)
        setEditing(null)
        setShowForm(false)
    }

    const handleEdit = (driver: any) => {
        setEditing(driver)
        setFormData({
            full_name: driver.full_name || "",
            cedula: driver.cedula || "",
            phone: driver.phone || "",
            license_number: driver.license_number || "",
            license_expiry: driver.license_expiry || "",
            notes: driver.notes || "",
        })
        setShowForm(true)
    }

    const confirmDelete = async () => {
        if (!deleteConfirm.id) return
        setIsDeleting(true)
        await deleteDriver(deleteConfirm.id)
        setIsDeleting(false)
        setDeleteConfirm({ show: false, id: null })
    }

    const filtered = drivers.filter(
        (d) =>
            d.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.cedula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    )

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
                        <div className="p-2 lg:p-3 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl lg:rounded-2xl shadow-lg">
                            <User className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-4xl font-bold text-slate-200">Choferes</h1>
                            <p className="text-sm lg:text-lg text-slate-400 font-medium">Gestione los conductores de la flota</p>
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
                                <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg">
                                    <Plus className="h-4 w-4 mr-2" /> Nuevo Chofer
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md p-0 bg-slate-900 border-slate-700">
                                <div className="p-6">
                                    <h2 className="text-xl font-bold text-slate-200 mb-4">{editing ? "Editar Chofer" : "Registrar Chofer"}</h2>
                                    <form onSubmit={handleSubmit} className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Nombre Completo *</label>
                                            <Input required placeholder="Juan Pérez" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="border-slate-700 bg-slate-800 text-slate-200" variant="modern" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Cédula</label>
                                                <Input placeholder="001-0000000-0" value={formData.cedula} onChange={(e) => setFormData({ ...formData, cedula: e.target.value })} className="border-slate-700 bg-slate-800 text-slate-200" variant="modern" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Teléfono</label>
                                                <Input placeholder="809-000-0000" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="border-slate-700 bg-slate-800 text-slate-200" variant="modern" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">No. Licencia</label>
                                                <Input placeholder="Licencia" value={formData.license_number} onChange={(e) => setFormData({ ...formData, license_number: e.target.value })} className="border-slate-700 bg-slate-800 text-slate-200" variant="modern" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Vencimiento Lic.</label>
                                                <input type="date" value={formData.license_expiry} onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })} className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-md text-sm p-2 outline-none focus:ring-2 focus:ring-violet-500" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Notas</label>
                                            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Observaciones..." className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-md px-3 py-2 text-sm resize-none h-16 outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-500" />
                                        </div>
                                        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-700">
                                            <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-200 hover:bg-slate-800">Cancelar</Button>
                                            <Button type="submit" className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">{editing ? "Guardar" : "Registrar"}</Button>
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
                            <Input placeholder="Buscar choferes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 border-violet-800 focus:border-violet-400" variant="modern" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {filtered.length === 0 ? (
                            <div className="text-center py-16">
                                <User className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                                <h3 className="text-xl font-bold text-slate-300 mb-2">Sin choferes registrados</h3>
                                <p className="text-slate-500">Agregue choferes para asignarlos a rutas y despachos.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                                {filtered.map((driver, i) => (
                                    <motion.div key={driver.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                                        <Card className="border-0 bg-slate-800/60 border-slate-700 hover:bg-slate-800 transition-colors group">
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-violet-900/50 border border-violet-700 flex items-center justify-center text-violet-300 font-bold text-sm">
                                                            {driver.full_name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-200">{driver.full_name}</p>
                                                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${driver.is_active ? "bg-emerald-900/50 text-emerald-300" : "bg-slate-700 text-slate-400"}`}>
                                                                {driver.is_active ? "Activo" : "Inactivo"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(driver)} className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-700"><Edit className="h-3.5 w-3.5" /></Button>
                                                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ show: true, id: driver.id })} className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-900/20"><Trash2 className="h-3.5 w-3.5" /></Button>
                                                    </div>
                                                </div>
                                                <div className="space-y-1 text-xs text-slate-400 mt-2">
                                                    {driver.cedula && <div className="flex items-center gap-1.5"><CreditCard className="w-3 h-3" /> {driver.cedula}</div>}
                                                    {driver.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {driver.phone}</div>}
                                                    {driver.license_number && <p>Lic: {driver.license_number}</p>}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <ConfirmDialog open={deleteConfirm.show} onOpenChange={(o) => setDeleteConfirm({ show: o, id: null })} title="Eliminar Chofer" description="¿Seguro que deseas eliminar este chofer?" confirmLabel="Eliminar" cancelLabel="Cancelar" onConfirm={confirmDelete} variant="danger" isLoading={isDeleting} />
        </div>
    )
}
