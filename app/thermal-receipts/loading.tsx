import { Loader2 } from "lucide-react"

export default function ThermalReceiptsLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-600">Cargando facturas térmicas...</p>
      </div>
    </div>
  )
}
