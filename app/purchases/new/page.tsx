"use client"

import { useState } from "react"
import { PurchaseClassificationForm } from "@/components/forms/purchase-classification-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ShoppingCart, FileText } from "lucide-react"
import { useRouter } from "next/navigation"

export default function NewPurchasePage() {
  const router = useRouter()
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSuccess = () => {
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-slate-950 py-8">
      <div className="container max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>

          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-lg bg-slate-800 flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-200">
                Registrar Nueva Compra
              </h1>
              <p className="text-slate-400 mt-1">
                Clasifica tu compra como inventario o gasto operativo
              </p>
            </div>
          </div>
        </div>

        {/* Mensaje de éxito */}
        {showSuccess && (
          <div className="mb-6 p-4 bg-green-900/30 border-2 border-green-300 rounded-lg">
            <div className="flex items-center gap-2 text-green-300">
              <FileText className="h-5 w-5" />
              <p className="font-semibold">¡Compra registrada exitosamente!</p>
            </div>
          </div>
        )}

        {/* Información importante */}
        <Card className="mb-6 border-slate-700 bg-slate-900">
          <CardHeader>
            <CardTitle className="text-blue-300">¿Cómo clasificar tu compra?</CardTitle>
            <CardDescription className="text-blue-400">
              Selecciona la opción correcta según el uso del artículo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-blue-300">
            <div className="flex gap-3">
              <div className="font-semibold">🏪 Producto para Venta:</div>
              <div>Artículos que vas a revender a tus clientes. Se registran en inventario y el costo se reconoce cuando se venden.</div>
            </div>
            <div className="flex gap-3">
              <div className="font-semibold">🔧 Uso Interno/Operación:</div>
              <div>Materiales, servicios o insumos para uso en tu negocio. Se registran como gasto inmediato.</div>
            </div>
          </CardContent>
        </Card>

        {/* Formulario */}
        <div className="bg-slate-900 rounded-lg shadow-sm p-6">
          <PurchaseClassificationForm
            onSuccess={handleSuccess}
            onCancel={() => router.back()}
          />
        </div>

        {/* Ejemplos */}
        <Card className="mt-6 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-200">Ejemplos de Clasificación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-green-400 mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  Inventario (Productos para Venta)
                </h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li>• Cemento, arena, grava (materiales de construcción)</li>
                  <li>• Varillas, blocks, ladrillos</li>
                  <li>• Herramientas para venta</li>
                  <li>• Productos terminados</li>
                  <li>• Mercancía en general</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-orange-400 mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                  Gastos (Uso Interno/Operación)
                </h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li>• Combustible para vehículos</li>
                  <li>• Papelería y material de oficina</li>
                  <li>• Servicios (luz, agua, internet)</li>
                  <li>• Mantenimiento de equipo</li>
                  <li>• Publicidad y marketing</li>
                  <li>• Renta de local</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
