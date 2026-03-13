"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Map, CheckCircle2, Circle, Calendar as CalendarIcon, ChevronRight, ArrowLeft,
    Truck, Play, Pause, User, Package, DollarSign, ClipboardCheck, ChevronLeft,
    PackageOpen, Loader2, Printer, Plus, Minus, Trash2
} from "lucide-react"
import { useDailyDispatch, useRoutes } from "@/hooks/use-routes"
import { useDrivers, useFleetVehicles } from "@/hooks/use-fleet"
import { useDispatchLoading, DispatchInventoryItem } from "@/hooks/use-dispatch-loading"
import { useToast } from "@/hooks/use-toast"
import { useCompanyData } from "@/hooks/use-company-data"
import ConduceSalidaPrint from "@/components/conduce-salida-print"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import Link from "next/link"

type DispatchStatusType = "pendiente" | "en_progreso" | "completada"
type ViewMode = "dashboard" | "loading-wizard"

function StatusBadge({ status }: { status: DispatchStatusType }) {
    const styles: Record<DispatchStatusType, string> = {
        pendiente: "bg-slate-800 text-slate-300 border-slate-600",
        en_progreso: "bg-blue-900/50 text-blue-300 border-blue-700",
        completada: "bg-emerald-900/50 text-emerald-300 border-emerald-700",
    }
    const labels: Record<DispatchStatusType, string> = {
        pendiente: "Pendiente",
        en_progreso: "En Progreso",
        completada: "Completada",
    }
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${styles[status]}`}>
            {labels[status]}
        </span>
    )
}

function DispatchStatusBadge({ status }: { status: string }) {
    const map: Record<string, { bg: string; label: string }> = {
        preparando: { bg: "bg-yellow-900/50 text-yellow-300 border-yellow-700", label: "Preparando" },
        despachado: { bg: "bg-blue-900/50 text-blue-300 border-blue-700", label: "Despachado" },
        en_ruta: { bg: "bg-indigo-900/50 text-indigo-300 border-indigo-700", label: "En Ruta" },
        liquidado: { bg: "bg-emerald-900/50 text-emerald-300 border-emerald-700", label: "Liquidado" },
    }
    const s = map[status] || map.preparando
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${s.bg}`}>{s.label}</span>
}

// ======================== LOADING WIZARD ========================
function LoadingWizard({
    dispatch,
    onClose,
    onSuccess,
}: {
    dispatch: any
    onClose: () => void
    onSuccess: () => void
}) {
    const [step, setStep] = useState(1)
    const { drivers } = useDrivers()
    const { vehicles } = useFleetVehicles()
    const { availableProducts, defaultWarehouseId, confirming, checkAvailability, confirmDispatch } = useDispatchLoading()
    const { toast } = useToast()
    const { company } = useCompanyData()

    // Step 1 state
    const [driverId, setDriverId] = useState(dispatch.driver_id || "")
    const [vehicleId, setVehicleId] = useState(dispatch.vehicle_id || "")

    // Step 2 state
    const [loadItems, setLoadItems] = useState<Record<string, { qty: number; name: string; unit: string }>>({})
    const [pettyCash, setPettyCash] = useState(500)

    // Step 3 state
    const [confirmed, setConfirmed] = useState(false)
    const [generatedNote, setGeneratedNote] = useState("")
    const [showConduce, setShowConduce] = useState(false)

    const totalUnits = Object.values(loadItems).reduce((sum, item) => sum + item.qty, 0)
    const itemCount = Object.values(loadItems).filter((item) => item.qty > 0).length

    const handleLoadStandard = () => {
        const newItems: Record<string, { qty: number; name: string; unit: string }> = {}
        availableProducts.forEach((p) => {
            newItems[p.id] = { qty: Math.min(20, p.available_stock), name: p.name, unit: p.unit }
        })
        setLoadItems(newItems)
        toast({ title: "Carga estándar aplicada", description: `${availableProducts.length} producto(s) cargados con cantidad predeterminada` })
    }

    const updateItemQty = (productId: string, name: string, unit: string, delta: number, maxStock: number) => {
        setLoadItems((prev) => {
            const current = prev[productId]?.qty || 0
            const newQty = Math.max(0, Math.min(maxStock, current + delta))
            return { ...prev, [productId]: { qty: newQty, name, unit } }
        })
    }

    const setItemQty = (productId: string, name: string, unit: string, qty: number, maxStock: number) => {
        const clamped = Math.max(0, Math.min(maxStock, qty))
        setLoadItems((prev) => ({ ...prev, [productId]: { qty: clamped, name, unit } }))
    }

    const handleAdvanceToStep2 = async () => {
        if (!driverId || !vehicleId) {
            toast({ title: "Campos requeridos", description: "Seleccione chofer y vehículo", variant: "destructive" })
            return
        }
        const result = await checkAvailability(driverId, vehicleId, dispatch.dispatch_date)
        if (!result.available) {
            toast({ title: "No disponible", description: result.reason, variant: "destructive" })
            return
        }
        setStep(2)
    }

    const handleAdvanceToStep3 = () => {
        if (itemCount === 0) {
            toast({ title: "Sin productos", description: "Debe cargar al menos un producto al vehículo", variant: "destructive" })
            return
        }
        setStep(3)
    }

    const handleConfirm = async () => {
        if (!defaultWarehouseId) {
            toast({ title: "Error", description: "No se encontró un almacén configurado", variant: "destructive" })
            return
        }
        const items: DispatchInventoryItem[] = Object.entries(loadItems)
            .filter(([, v]) => v.qty > 0)
            .map(([productId, v]) => ({
                product_id: productId,
                product_name: v.name,
                quantity_loaded: v.qty,
                unit: v.unit,
            }))

        const success = await confirmDispatch({
            dispatch_id: dispatch.id,
            route_id: dispatch.route_id,
            driver_id: driverId,
            vehicle_id: vehicleId,
            petty_cash_amount: pettyCash,
            warehouse_id: defaultWarehouseId,
            items,
        })
        if (success) {
            setConfirmed(true)
            setGeneratedNote(`CS-${Date.now().toString(36).toUpperCase()}`)
            onSuccess()
        }
    }

    const selectedDriver = drivers.find((d) => d.id === driverId)
    const selectedVehicle = vehicles.find((v) => v.id === vehicleId)

    return (
        <Card className="border-0 bg-slate-900/80 border-slate-700 overflow-hidden flex flex-col h-full">
            <CardHeader className="bg-gradient-to-r from-orange-900/40 to-amber-900/40 border-b border-slate-700 p-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg">
                            <PackageOpen className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-slate-200">Despacho Matutino</h2>
                            <p className="text-xs text-slate-400">{dispatch.routes?.name || "Ruta"} — {dispatch.dispatch_date}</p>
                        </div>
                    </div>
                    {!confirmed && (
                        <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-300 transition-colors p-1">✕</button>
                    )}
                </div>
                {/* Step indicator */}
                <div className="flex items-center gap-2 mt-4">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center gap-2 flex-1">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? "bg-orange-500 text-white" : "bg-slate-800 text-slate-500 border border-slate-700"}`}>
                                {confirmed && s === 3 ? <CheckCircle2 className="w-4 h-4" /> : s}
                            </div>
                            {s < 3 && <div className={`flex-1 h-0.5 rounded ${step > s ? "bg-orange-500" : "bg-slate-700"}`} />}
                        </div>
                    ))}
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-1">
                    <span>Equipo</span><span>Carga</span><span>Confirmar</span>
                </div>
            </CardHeader>

            <CardContent className="p-4 flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                    {/* STEP 1: Vehicle & Driver Selection */}
                    {step === 1 && (
                        <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5"><User className="w-3 h-3 inline mr-1" />Chofer</label>
                                <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-lg text-sm p-2.5 outline-none focus:ring-2 focus:ring-orange-500">
                                    <option value="">— Seleccione chofer —</option>
                                    {drivers.filter((d) => d.is_active).map((d) => (
                                        <option key={d.id} value={d.id}>{d.full_name} {d.cedula ? `(${d.cedula})` : ""}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5"><Truck className="w-3 h-3 inline mr-1" />Vehículo</label>
                                <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-lg text-sm p-2.5 outline-none focus:ring-2 focus:ring-orange-500">
                                    <option value="">— Seleccione vehículo —</option>
                                    {vehicles.filter((v) => v.is_active).map((v) => (
                                        <option key={v.id} value={v.id}>{v.plate_number} — {v.brand} {v.model} ({v.vehicle_type})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="pt-3">
                                <Button onClick={handleAdvanceToStep2} className="w-full bg-gradient-to-r from-orange-600 to-amber-600 text-white" disabled={!driverId || !vehicleId}>
                                    Siguiente: Cargar Inventario <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: Inventory Loading */}
                    {step === 2 && (
                        <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-slate-400">Productos disponibles en almacén</p>
                                <Button variant="ghost" size="sm" onClick={handleLoadStandard} className="text-[10px] text-orange-400 hover:text-orange-300 hover:bg-orange-900/20 px-2 py-1 h-auto">
                                    <Package className="w-3 h-3 mr-1" /> Cargar Estándar
                                </Button>
                            </div>

                            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                                {availableProducts.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center py-6">No hay productos con stock disponible en el almacén.</p>
                                ) : (
                                    availableProducts.map((product) => {
                                        const currentQty = loadItems[product.id]?.qty || 0
                                        return (
                                            <div key={product.id} className="flex items-center gap-3 p-2.5 bg-slate-800/50 border border-slate-700 rounded-lg">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-slate-200 font-medium truncate">{product.name}</p>
                                                    <p className="text-[10px] text-slate-500">Stock: {product.available_stock} {product.unit}</p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => updateItemQty(product.id, product.name, product.unit, -1, product.available_stock)} className="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center transition-colors">
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={product.available_stock}
                                                        value={currentQty}
                                                        onChange={(e) => setItemQty(product.id, product.name, product.unit, Number(e.target.value), product.available_stock)}
                                                        className="w-14 text-center bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 py-1 outline-none focus:ring-1 focus:ring-orange-500"
                                                    />
                                                    <button onClick={() => updateItemQty(product.id, product.name, product.unit, 1, product.available_stock)} className="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center transition-colors">
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>

                            <div className="border-t border-slate-700 pt-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-400 font-medium">Total de productos cargados</span>
                                    <span className="text-lg font-bold text-orange-400">{totalUnits} <span className="text-xs text-slate-500">unidades ({itemCount} tipos)</span></span>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1.5"><DollarSign className="w-3 h-3 inline mr-1" />Fondo de Caja (RD$)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        step={50}
                                        value={pettyCash}
                                        onChange={(e) => setPettyCash(Number(e.target.value))}
                                        className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-lg text-sm p-2.5 outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button variant="ghost" onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-200 hover:bg-slate-800">
                                    <ChevronLeft className="w-4 h-4 mr-1" /> Atrás
                                </Button>
                                <Button onClick={handleAdvanceToStep3} className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 text-white" disabled={itemCount === 0}>
                                    Siguiente: Confirmar <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: Confirmation */}
                    {step === 3 && !confirmed && (
                        <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
                                <h3 className="text-sm font-bold text-slate-200 mb-2">Resumen del Despacho</h3>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div><span className="text-slate-500">Ruta:</span> <span className="text-slate-200 font-medium">{dispatch.routes?.name}</span></div>
                                    <div><span className="text-slate-500">Fecha:</span> <span className="text-slate-200 font-medium">{dispatch.dispatch_date}</span></div>
                                    <div><span className="text-slate-500">Chofer:</span> <span className="text-slate-200 font-medium">{selectedDriver?.full_name || "—"}</span></div>
                                    <div><span className="text-slate-500">Vehículo:</span> <span className="text-slate-200 font-medium">{selectedVehicle?.plate_number || "—"} {selectedVehicle?.brand}</span></div>
                                </div>
                                <div className="border-t border-slate-700 pt-2">
                                    <p className="text-xs text-slate-500 mb-1">Productos a cargar:</p>
                                    {Object.entries(loadItems).filter(([, v]) => v.qty > 0).map(([id, v]) => (
                                        <div key={id} className="flex justify-between text-xs py-0.5">
                                            <span className="text-slate-300">{v.name}</span>
                                            <span className="text-orange-400 font-medium">{v.qty} {v.unit}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-slate-700 pt-2 flex justify-between text-sm">
                                    <span className="text-slate-400 font-medium">Fondo de Caja</span>
                                    <span className="text-emerald-400 font-bold">RD$ {pettyCash.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button variant="ghost" onClick={() => setStep(2)} className="text-slate-400 hover:text-slate-200 hover:bg-slate-800">
                                    <ChevronLeft className="w-4 h-4 mr-1" /> Atrás
                                </Button>
                                <Button onClick={handleConfirm} className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 text-white" disabled={confirming}>
                                    {confirming ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</> : <><ClipboardCheck className="w-4 h-4 mr-2" /> Confirmar Despacho y Generar Conduce</>}
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: Confirmed Success */}
                    {step === 3 && confirmed && !showConduce && (
                        <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-4">
                            <div className="w-16 h-16 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-200">¡Despacho Confirmado!</h3>
                            <p className="text-sm text-slate-400">El vehículo {selectedVehicle?.plate_number} está en ruta con {totalUnits} unidades.</p>
                            <p className="text-xs text-slate-500">Conduce de salida generado • Inventario descontado del almacén</p>
                            <div className="flex gap-2 justify-center pt-4">
                                <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-slate-200 hover:bg-slate-800">
                                    Cerrar
                                </Button>
                                <Button onClick={() => setShowConduce(true)} className="bg-gradient-to-r from-orange-600 to-amber-600 text-white">
                                    <ClipboardCheck className="w-4 h-4 mr-2" /> Ver Conduce
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* CONDUCE PREVIEW */}
                    {step === 3 && confirmed && showConduce && (
                        <motion.div key="conduce" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Button variant="ghost" size="sm" onClick={() => setShowConduce(false)} className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs">
                                    <ChevronLeft className="w-3 h-3 mr-1" /> Volver
                                </Button>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => window.print()} className="bg-gradient-to-r from-slate-700 to-slate-600 text-white text-xs">
                                        <Printer className="w-3 h-3 mr-1.5" /> Imprimir
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xs">
                                        Cerrar
                                    </Button>
                                </div>
                            </div>
                            <div className="rounded-lg overflow-hidden border border-slate-700 bg-white max-h-[550px] overflow-y-auto">
                                <ConduceSalidaPrint data={{
                                    noteNumber: generatedNote,
                                    date: dispatch.dispatch_date,
                                    departureTime: new Date().toISOString(),
                                    routeName: dispatch.routes?.name || "Ruta",
                                    driverName: selectedDriver?.full_name || "—",
                                    driverCedula: selectedDriver?.cedula || undefined,
                                    vehiclePlate: selectedVehicle?.plate_number || "—",
                                    vehicleBrand: selectedVehicle?.brand || undefined,
                                    vehicleModel: selectedVehicle?.model || undefined,
                                    pettyCash,
                                    items: Object.entries(loadItems).filter(([, v]) => v.qty > 0).map(([, v]) => ({ name: v.name, qty: v.qty, unit: v.unit })),
                                    companyName: company?.company_name,
                                    companyAddress: company?.company_address,
                                    companyPhone: company?.company_phone,
                                    companyRnc: company?.tax_id,
                                }} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    )
}

// ======================== MAIN PAGE ========================
export default function DailyDispatchDashboard() {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
    const [activeTab, setActiveTab] = useState<"ALL" | DispatchStatusType>("ALL")
    const [selectedDispatchId, setSelectedDispatchId] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<ViewMode>("dashboard")
    const [loadingDispatch, setLoadingDispatch] = useState<any>(null)

    const { dispatches, dispatchItems, loading, fetchDispatches, fetchDispatchItems, createDispatch, updateDispatchStatus, markClientVisited, regenerateDispatchItems, deleteDispatch } = useDailyDispatch()
    const { routes } = useRoutes()
    const { drivers } = useDrivers()
    const { vehicles } = useFleetVehicles()
    const { toast } = useToast()
    const [dispatchDriverId, setDispatchDriverId] = useState("")
    const [dispatchVehicleId, setDispatchVehicleId] = useState("")
    const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string | null }>({ show: false, id: null })

    useEffect(() => {
        fetchDispatches(selectedDate)
    }, [selectedDate])

    useEffect(() => {
        if (selectedDispatchId) fetchDispatchItems(selectedDispatchId)
    }, [selectedDispatchId])

    const filteredDispatches = dispatches.filter((d) => activeTab === "ALL" || d.status === activeTab)
    const selectedDispatch = dispatches.find((d) => d.id === selectedDispatchId)

    const visitedCount = dispatchItems.filter((i) => i.is_visited).length
    const totalItems = dispatchItems.length

    const handleGenerateDispatch = async (routeId: string) => {
        await createDispatch(routeId, selectedDate, dispatchDriverId || undefined, dispatchVehicleId || undefined)
        setDispatchDriverId("")
        setDispatchVehicleId("")
    }

    const handleMarkVisited = async (itemId: string) => {
        await markClientVisited(itemId)
        if (selectedDispatchId) fetchDispatchItems(selectedDispatchId)
    }

    const handleToggleStatus = async (dispatchId: string, currentStatus: string) => {
        const nextStatus = currentStatus === "pendiente" ? "en_progreso" : currentStatus === "en_progreso" ? "completada" : "pendiente"
        await updateDispatchStatus(dispatchId, nextStatus, selectedDate)
    }

    const handleStartLoading = (dispatch: any) => {
        setLoadingDispatch(dispatch)
        setViewMode("loading-wizard")
    }

    const handleDeleteDispatch = (e: React.MouseEvent, dispatchId: string) => {
        e.stopPropagation()
        setDeleteConfirm({ show: true, id: dispatchId })
    }

    const confirmDeleteDispatch = async () => {
        if (!deleteConfirm.id) return
        await deleteDispatch(deleteConfirm.id, selectedDate)
        setDeleteConfirm({ show: false, id: null })
        if (selectedDispatchId === deleteConfirm.id) {
            setSelectedDispatchId(null)
        }
    }

    const tabs = [
        { key: "ALL", label: "Todas" },
        { key: "pendiente", label: "Pendientes" },
        { key: "en_progreso", label: "En Progreso" },
        { key: "completada", label: "Completadas" },
    ]

    if (loading && !dispatches.length) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 lg:p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="h-12 w-64 bg-slate-700 rounded skeleton"></div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="h-96 bg-slate-800 rounded-xl skeleton"></div>
                        <div className="lg:col-span-2 h-96 bg-slate-800 rounded-xl skeleton"></div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-4 lg:space-y-8">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 lg:gap-3">
                            <div className="p-2 lg:p-3 bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl lg:rounded-2xl shadow-lg">
                                <Truck className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl lg:text-4xl font-bold text-slate-200">Despacho del Día</h1>
                                <p className="text-sm lg:text-lg text-slate-400 font-medium">Monitoreo, carga y ejecución de rutas</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 shadow-sm">
                            <CalendarIcon className="w-5 h-5 text-slate-400" />
                            <input
                                type="date"
                                className="text-sm font-medium outline-none text-slate-200 bg-transparent"
                                value={selectedDate}
                                onChange={(e) => { setSelectedDate(e.target.value); setSelectedDispatchId(null); setViewMode("dashboard") }}
                            />
                        </div>
                        <Link href="/routes">
                            <Button variant="ghost" className="text-slate-400 hover:text-slate-200 hover:bg-slate-800">
                                <ArrowLeft className="h-4 w-4 mr-2" /> Rutas
                            </Button>
                        </Link>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Lista de Rutas del Día */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key as any)}
                                    className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${activeTab === tab.key ? "bg-slate-700 shadow-sm text-blue-300" : "text-slate-500 hover:text-slate-300"}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-3">
                            {filteredDispatches.length === 0 ? (
                                <Card className="border-0 bg-slate-900/80 border-slate-700">
                                    <CardContent className="p-6 text-center">
                                        <Map className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                                        <p className="text-sm text-slate-400 mb-4">No hay despachos para esta fecha.</p>
                                        {routes.filter((r) => r.is_active).length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs text-slate-500 mb-3">Asignar equipo al despacho:</p>
                                                <div className="space-y-2 mb-3">
                                                    <select value={dispatchDriverId} onChange={(e) => setDispatchDriverId(e.target.value)} className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-md text-xs p-1.5 outline-none focus:ring-1 focus:ring-orange-500">
                                                        <option value="">Chofer (opcional)</option>
                                                        {drivers.filter((d) => d.is_active).map((d) => (
                                                            <option key={d.id} value={d.id}>{d.full_name}</option>
                                                        ))}
                                                    </select>
                                                    <select value={dispatchVehicleId} onChange={(e) => setDispatchVehicleId(e.target.value)} className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-md text-xs p-1.5 outline-none focus:ring-1 focus:ring-orange-500">
                                                        <option value="">Vehículo (opcional)</option>
                                                        {vehicles.filter((v) => v.is_active).map((v) => (
                                                            <option key={v.id} value={v.id}>{v.plate_number} — {v.brand} {v.model}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <p className="text-xs text-slate-500">Generar despacho para:</p>
                                                {routes.filter((r) => r.is_active).map((r) => (
                                                    <Button key={r.id} variant="ghost" size="sm" onClick={() => handleGenerateDispatch(r.id)} className="w-full text-slate-300 hover:bg-slate-800 hover:text-orange-400 border border-slate-700">
                                                        {r.name}
                                                    </Button>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ) : (
                                filteredDispatches.map((dispatch, index) => (
                                    <motion.div key={dispatch.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                                        <Card
                                            onClick={() => { setSelectedDispatchId(dispatch.id); setViewMode("dashboard") }}
                                            className={`border-0 bg-slate-900/80 cursor-pointer transition-all hover:bg-slate-800/80 ${selectedDispatchId === dispatch.id && viewMode === "dashboard" ? "ring-1 ring-orange-500 border-orange-500" : "border-slate-700"}`}
                                        >
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-semibold text-slate-200">{dispatch.routes?.name || "Ruta"}</h3>
                                                    <div className="flex gap-1">
                                                        <StatusBadge status={dispatch.status} />
                                                        {(dispatch as any).dispatch_status && (dispatch as any).dispatch_status !== "preparando" && (
                                                            <DispatchStatusBadge status={(dispatch as any).dispatch_status} />
                                                        )}
                                                    </div>
                                                </div>
                                                {((dispatch as any).drivers?.full_name || (dispatch as any).fleet_vehicles?.plate_number) && (
                                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-2">
                                                        {(dispatch as any).drivers?.full_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{(dispatch as any).drivers.full_name}</span>}
                                                        {(dispatch as any).fleet_vehicles?.plate_number && <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{(dispatch as any).fleet_vehicles.plate_number}</span>}
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleToggleStatus(dispatch.id, dispatch.status) }} className="text-xs text-slate-400 hover:text-orange-400 hover:bg-slate-800 p-1">
                                                            {dispatch.status === "pendiente" && <><Play className="h-3 w-3 mr-1" /> Iniciar</>}
                                                            {dispatch.status === "en_progreso" && <><CheckCircle2 className="h-3 w-3 mr-1" /> Completar</>}
                                                            {dispatch.status === "completada" && <><Pause className="h-3 w-3 mr-1" /> Reabrir</>}
                                                        </Button>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {(!(dispatch as any).dispatch_status || (dispatch as any).dispatch_status === "preparando") && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={(e) => { e.stopPropagation(); handleStartLoading(dispatch) }}
                                                                className="text-[10px] text-orange-400 hover:text-orange-300 hover:bg-orange-900/20 p-1 h-auto"
                                                            >
                                                                <PackageOpen className="h-3 w-3 mr-1" /> Cargar
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => handleDeleteDispatch(e, dispatch.id)}
                                                            className="text-[10px] text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1 h-auto"
                                                            title="Eliminar despacho"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Dashboard Detail OR Loading Wizard */}
                    <div className="lg:col-span-2">
                        {viewMode === "loading-wizard" && loadingDispatch ? (
                            <LoadingWizard
                                dispatch={loadingDispatch}
                                onClose={() => { setViewMode("dashboard"); setLoadingDispatch(null) }}
                                onSuccess={() => fetchDispatches(selectedDate)}
                            />
                        ) : !selectedDispatchId ? (
                            <Card className="border-0 bg-slate-900/80 border-slate-700 h-full min-h-[400px] flex flex-col items-center justify-center">
                                <CardContent className="text-center text-slate-500">
                                    <Map className="w-12 h-12 mb-3 text-slate-600 mx-auto" />
                                    <p>Seleccione un despacho para ver el itinerario de clientes.</p>
                                    <p className="text-xs text-slate-600 mt-2">O haga clic en &quot;Cargar&quot; para iniciar el despacho matutino.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="border-0 bg-slate-900/80 border-slate-700 overflow-hidden flex flex-col h-full">
                                <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 p-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h2 className="font-bold text-lg text-slate-200">{selectedDispatch?.routes?.name}</h2>
                                            <p className="text-sm text-slate-400">
                                                Itinerario de visitas — {visitedCount}/{totalItems} completados
                                            </p>
                                        </div>
                                        <StatusBadge status={selectedDispatch?.status || "pendiente"} />
                                    </div>
                                    {totalItems > 0 && (
                                        <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5">
                                            <div
                                                className={`h-1.5 rounded-full transition-all duration-500 ${visitedCount === totalItems ? "bg-emerald-500" : "bg-orange-500"}`}
                                                style={{ width: `${totalItems > 0 ? (visitedCount / totalItems) * 100 : 0}%` }}
                                            ></div>
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent className="p-0 overflow-y-auto max-h-[600px]">
                                    {totalItems === 0 ? (
                                        <div className="p-8 text-center text-slate-500">
                                            <p>No hay clientes programados para este despacho.</p>
                                            <p className="text-xs mt-2 mb-4">Asigne clientes a esta ruta desde la pantalla de Asignación.</p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={async () => {
                                                    if (selectedDispatch?.route_id) {
                                                        await regenerateDispatchItems(selectedDispatchId!, selectedDispatch.route_id, selectedDate)
                                                    }
                                                }}
                                                className="border-orange-600 text-orange-400 hover:bg-orange-900/20 hover:text-orange-300"
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Generar Paradas desde Clientes Asignados
                                            </Button>
                                        </div>
                                    ) : (
                                        <ul className="divide-y divide-slate-800">
                                            {dispatchItems.map((item) => (
                                                <li key={item.id} className={`p-4 hover:bg-slate-800/50 flex items-start gap-4 transition-colors ${item.is_visited ? "opacity-50" : ""}`}>
                                                    <button
                                                        onClick={() => !item.is_visited && handleMarkVisited(item.id)}
                                                        className={`mt-0.5 flex-shrink-0 transition-colors ${item.is_visited ? "text-emerald-500" : "text-slate-600 hover:text-orange-400"}`}
                                                        disabled={item.is_visited}
                                                    >
                                                        {item.is_visited ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                                                    </button>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`font-medium text-sm ${item.is_visited ? "text-slate-500 line-through" : "text-slate-200"}`}>
                                                            {item.visit_order}. {item.clients?.name || "Cliente"}
                                                        </p>
                                                        <p className="text-xs text-slate-500 mt-0.5 truncate">{item.clients?.address || "Sin dirección"}</p>
                                                        {item.clients?.phone && <p className="text-xs text-slate-600 mt-0.5">{item.clients.phone}</p>}
                                                    </div>
                                                    {!item.is_visited && (
                                                        <button className="text-slate-600 hover:text-orange-400 p-2 rounded-full hover:bg-slate-800 transition">
                                                            <ChevronRight className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmDialog
                open={deleteConfirm.show}
                onOpenChange={(open) => !open && setDeleteConfirm({ show: false, id: null })}
                onConfirm={confirmDeleteDispatch}
                title="Eliminar despacho"
                description="¿Está seguro de eliminar este despacho? Se eliminarán también sus paradas. Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                variant="danger"
            />
        </div>
    )
}
