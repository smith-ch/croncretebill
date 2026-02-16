"use client"


import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileBarChart, ArrowRight, Calculator, TrendingUp } from "lucide-react"

export default function DGIIReportsRedirect() {
  const router = useRouter()

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center">
            <FileBarChart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Reportes DGII
            </h1>
            <p className="text-sm text-gray-600">
              Selecciona el tipo de reporte que necesitas generar
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              Reportes IR-2 (Recomendado)
            </CardTitle>
            <CardDescription>
              Reportes resumidos 607 (Compras) y 608 (Ventas) necesarios para la declaración del Impuesto sobre la Renta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Clasificación automática de gastos e ingresos
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Exportación en Excel y XML
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Validaciones según normativas DGII
              </div>
              <Button 
                onClick={() => router.push('/dgii-reports/ir2')}
                className="w-full mt-4"
              >
                Acceder a Reportes IR-2
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Reportes Acumulativos
            </CardTitle>
            <CardDescription>
              Seguimiento mensual progresivo con totales acumulados anuales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Progreso mes a mes con acumulados
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Totales por categorías DGII
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Exportación de año completo
              </div>
              <Button 
                onClick={() => router.push('/dgii-reports/acumulativo')}
                className="w-full mt-4"
                variant="outline"
              >
                Ver Reportes Acumulativos
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="opacity-75">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileBarChart className="h-5 w-5 text-gray-500" />
              Reportes Detallados (En desarrollo)
            </CardTitle>
            <CardDescription>
              Reportes detallados y análisis avanzados de datos fiscales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                Análisis de tendencias
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                Reportes personalizados
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                Comparativas anuales
              </div>
              <Button 
                disabled
                variant="outline"
                className="w-full mt-4"
              >
                Próximamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Información adicional */}
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">i</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-blue-300 mb-2">
                Sobre los Reportes IR-2
              </h3>
              <p className="text-blue-300 text-sm leading-relaxed">
                Los reportes IR-2 son los formatos oficiales requeridos por la DGII para la 
                declaración del Impuesto sobre la Renta. Incluyen el reporte 607 (compras y servicios) 
                y el reporte 608 (ventas), que resumen todas las transacciones del período fiscal 
                y son necesarios para completar tu declaración anual.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}