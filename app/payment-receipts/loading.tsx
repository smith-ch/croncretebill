import { Loader2 } from "lucide-react"

export default function PaymentReceiptsLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm text-slate-400">Cargando comprobantes de pago...</p>
      </div>
    </div>
  )
}
