"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Plus, Search, Map, Edit, Trash2, PowerOff, Power, Users } from "lucide-react"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import { useToast } from "@/hooks/use-toast"
import { useRoutes } from "@/hooks/use-routes"
import Link from "next/link"

export default function RoutesPage() {
    const { routes, loading, createRoute, updateRoute, deleteRoute, toggleRoute } = useRoutes()
    const [searchTerm, setSearchTerm] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [editingRoute, setEditingRoute] = useState<any>(null)
    const [formData, setFormData] = useState({ name: "", description: "" })
    const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string | null; count: number }>({ show: false, id: null, count: 0 })
    const [isDeleting, setIsDeleting] = useState(false)
    const { canDelete, canEdit, permissions } = useUserPermissions()
    const { toast } = useToast()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name.trim()) return

        if (editingRoute) {
            await updateRoute(editingRoute.id, { name: formData.name, description: formData.description || null } as any)
        } else {
            await createRoute(formData.name, formData.description)
        }
        setFormData({ name: "", description: "" })
        setEditingRoute(null)
        setShowForm(false)
    }

    const handleEdit = (route: any) => {
        setEditingRoute(route)
        setFormData({ name: route.name, description: route.description || "" })
        setShowForm(true)
    }

    const handleDeleteClick = (id: string, count: number) => {
        if (count > 0) {
            toast({
                title: "No se puede eliminar",
                description: `Esta ruta tiene ${count} cliente(s) asignados. Remuévalos primero.`,
                variant: "destructive",
            })
            return
        }
        setDeleteConfirm({ show: true, id, count })
    }

    const confirmDelete = async () => {
        if (!deleteConfirm.id) return
        setIsDeleting(true)
        await deleteRoute(deleteConfirm.id)
        setIsDeleting(false)
        setDeleteConfirm({ show: false, id: null, count: 0 })
    }

    const filteredRoutes = routes.filter(
        (r) =>
            r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 lg:p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-slate-700 rounded-xl skeleton"></div>
                        <div>
                            <div className="h-8 w-48 bg-slate-700 rounded skeleton mb-2"></div>
                            <div className="h-4 w-64 bg-slate-800 rounded skeleton"></div>
                        </div>
                    </div>
                    <Card className="border-0 shadow-lg bg-slate-900/80">
                        <CardContent className="p-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-16 bg-slate-800 rounded-lg mb-3 skeleton" style={{ animationDelay: `${i * 0.1}s` }}></div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-4 lg:space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0 gap-4 lg:gap-6"
                >
                    <div className="space-y-2 lg:space-y-3">
                        <div className="flex items-center gap-2 lg:gap-3">
                            <div className="p-2 lg:p-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl lg:rounded-2xl shadow-lg">
                                <Map className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl lg:text-4xl xl:text-5xl font-bold text-slate-200">
                                    Gestión de Rutas
                                </h1>
                                <p className="text-sm lg:text-lg text-slate-400 font-medium">Administre las rutas de logística y distribución</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/routes/dispatch">
                            <Button className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700">
                                Despacho del Día
                            </Button>
                        </Link>
                        <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) { setEditingRoute(null); setFormData({ name: "", description: "" }) } }}>
                            <DialogTrigger asChild>
                                <Button className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-white border-0">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Nueva Ruta
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md p-0 bg-slate-900 border-slate-700">
                                <div className="p-6">
                                    <h2 className="text-xl font-bold text-slate-200 mb-4">{editingRoute ? "Editar Ruta" : "Crear Nueva Ruta"}</h2>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Nombre de la Ruta *</label>
                                            <Input
                                                autoFocus
                                                required
                                                placeholder="Ej. Ruta Zona Norte"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="border-slate-700 bg-slate-800 text-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                                                variant="modern"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Descripción</label>
                                            <textarea
                                                className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none h-24 placeholder:text-slate-500"
                                                placeholder="Detalles sobre esta ruta logística..."
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
                                            <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-200 hover:bg-slate-800">
                                                Cancelar
                                            </Button>
                                            <Button type="submit" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
                                                {editingRoute ? "Guardar Cambios" : "Crear Ruta"}
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </motion.div>

                <Card className="border-0 shadow-2xl bg-slate-900/80 backdrop-blur-sm border-slate-700">
                    <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
                        <div className="flex items-center gap-4">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                    placeholder="Buscar rutas..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 border-emerald-800 focus:border-emerald-400 focus:ring-emerald-400"
                                    variant="modern"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {filteredRoutes.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="mb-6 mx-auto w-24 h-24 bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-full flex items-center justify-center">
                                    <Map className="h-12 w-12 text-emerald-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-200 mb-3">No hay rutas registradas</h3>
                                <p className="text-slate-400 mb-6 max-w-md mx-auto">Comience creando su primera ruta de distribución</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs uppercase text-slate-400 bg-slate-800/50 border-b border-slate-700">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Nombre de la Ruta</th>
                                            <th className="px-6 py-4 font-semibold hidden md:table-cell">Descripción</th>
                                            <th className="px-6 py-4 font-semibold text-center">Estado</th>
                                            <th className="px-6 py-4 font-semibold text-center">Clientes</th>
                                            <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {filteredRoutes.map((route, index) => (
                                            <motion.tr
                                                key={route.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="hover:bg-slate-800/50 transition-colors group"
                                            >
                                                <td className="px-6 py-4 font-medium text-slate-200">
                                                    <Link href={`/routes/assign?routeId=${route.id}`} className="hover:text-emerald-400 transition-colors">
                                                        {route.name}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 hidden md:table-cell">{route.description || "—"}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${route.is_active ? "bg-emerald-900/50 text-emerald-300 border border-emerald-700" : "bg-slate-800 text-slate-400 border border-slate-600"}`}>
                                                        {route.is_active ? "Activa" : "Inactiva"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-1 text-slate-300">
                                                        <Users className="h-4 w-4 text-slate-500" />
                                                        <span className="font-medium">{route.assignment_count || 0}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        {(permissions.isOwner || canEdit('clients')) && (
                                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(route)} className="hover:bg-slate-800 hover:text-blue-400 text-slate-400" title="Editar">
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button variant="ghost" size="sm" onClick={() => toggleRoute(route.id, route.is_active)} className="hover:bg-slate-800 hover:text-amber-400 text-slate-400" title={route.is_active ? "Desactivar" : "Activar"}>
                                                            {route.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                                        </Button>
                                                        {(permissions.isOwner || canDelete('clients')) && (
                                                            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(route.id, route.assignment_count || 0)} className="text-red-500 hover:bg-red-900/30 hover:text-red-400" title="Eliminar">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
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

            <ConfirmDialog
                open={deleteConfirm.show}
                onOpenChange={(isOpen) => setDeleteConfirm({ show: isOpen, id: null, count: 0 })}
                title="Eliminar Ruta"
                description="¿Estás seguro de que quieres eliminar esta ruta? Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={confirmDelete}
                variant="danger"
                isLoading={isDeleting}
            />
        </div>
    )
}
