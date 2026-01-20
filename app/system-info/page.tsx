"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft,
  User,
  Award,
  Mail,
  Linkedin,
  ShoppingCart,
  Package,
  Receipt,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  DollarSign,
  FileText,
  Info,
  Warehouse
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SystemInfoPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-3 lg:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" onClick={() => router.back()} className="hover:bg-slate-100">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-slate-800 bg-clip-text text-transparent">
              Información del Sistema
            </h1>
            <p className="text-slate-600 mt-1">ConcreteBill - Sistema de Facturación y Gestión Empresarial</p>
          </div>
        </div>

        {/* Nueva Funcionalidad - Sistema de Clasificación de Compras */}
        <Card className="border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl text-green-900 flex items-center gap-2">
                  <CheckCircle className="h-6 w-6" />
                  Nueva Funcionalidad: Clasificación de Compras
                </CardTitle>
                <p className="text-green-700 text-sm mt-1">Sistema inteligente para contabilidad correcta</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Problema que resuelve */}
            <div className="bg-white rounded-lg p-5 border border-green-200">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-red-100 text-red-600 rounded-full text-sm">X</span>
                    Problema que resolvemos:
                  </h3>
                  <p className="text-gray-700 mb-3">
                    <strong>Error contable grave:</strong> Cuando comprabas mercancía para revender (cemento, blocks, productos), 
                    la registrabas como <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-semibold">gasto operativo</span> inmediato.
                  </p>
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                    <p className="font-semibold text-red-900 mb-2">Esto causaba:</p>
                    <ul className="space-y-1 text-sm text-red-800">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        Gastos inflados artificialmente
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        Utilidades subestimadas
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        Inventario sin registrar
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        Contabilidad incorrecta
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        Imposible saber cuánto inventario tienes
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mt-4">
                <p className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Ejemplo del error:
                </p>
                <div className="space-y-2 text-sm text-yellow-800">
                  <p className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></span>
                    Compras <strong>$50,000</strong> en cemento para revender
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></span>
                    Lo registrabas como "gasto" = Tu reporte mostraba <span className="text-red-600 font-bold">-$50,000 de pérdida</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></span>
                    Vendías el cemento por <strong>$70,000</strong> = Utilidad aparente de $70,000
                  </p>
                  <p className="font-bold text-red-600 flex items-center gap-2 mt-2">
                    <AlertCircle className="h-4 w-4" />
                    ERROR: La utilidad real es $20,000, no $70,000
                  </p>
                </div>
              </div>
            </div>

            {/* Solución implementada */}
            <div className="bg-white rounded-lg p-5 border border-green-300">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900 mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full">
                      <CheckCircle className="h-4 w-4" />
                    </span>
                    Solución implementada:
                  </h3>
                  <p className="text-gray-700 mb-4">
                    El sistema <strong>te pregunta al momento de comprar</strong> qué harás con lo que compraste:
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Opción 1: Inventario */}
                    <div className="border-2 border-green-400 rounded-lg p-4 bg-green-50">
                      <div className="flex items-center gap-2 mb-3">
                        <Package className="h-5 w-5 text-green-600" />
                        <h4 className="font-bold text-green-900">Producto para la Venta</h4>
                      </div>
                      <ul className="space-y-2 text-sm text-green-800">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          Lo vas a revender a clientes
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          Se registra en <strong>INVENTARIO</strong> (activo)
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          Se suma al stock disponible
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          El gasto NO se reconoce aún
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          Solo cuando VENDES, se convierte en costo
                        </li>
                      </ul>
                    </div>

                    {/* Opción 2: Gasto */}
                    <div className="border-2 border-orange-400 rounded-lg p-4 bg-orange-50">
                      <div className="flex items-center gap-2 mb-3">
                        <Receipt className="h-5 w-5 text-orange-600" />
                        <h4 className="font-bold text-orange-900">Uso Interno/Operación</h4>
                      </div>
                      <ul className="space-y-2 text-sm text-orange-800">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          Es para usar en tu negocio
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          Gasolina, papelería, servicios
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          Se registra como <strong>GASTO</strong> inmediato
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          Se categoriza correctamente
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          Aparece en reportes de gastos operativos
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Flujo correcto */}
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-5">
              <h3 className="font-bold text-lg text-blue-900 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Flujo Correcto Ahora:
              </h3>
              
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <p className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Compra de mercancía para venta:
                  </p>
                  <div className="space-y-1 text-sm text-gray-700 font-mono bg-gray-50 p-3 rounded">
                    <p>1. Compras $50,000 cemento = <span className="text-green-600 font-bold">Inventario +$50,000</span> (activo)</p>
                    <p>2. Vendes por $70,000 = Gasto $50,000 + Ingreso $70,000</p>
                    <p className="text-green-600 font-bold flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      = Utilidad $20,000
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-orange-200">
                  <p className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Compra de uso interno:
                  </p>
                  <div className="space-y-1 text-sm text-gray-700 font-mono bg-gray-50 p-3 rounded">
                    <p>1. Compras $5,000 gasolina = <span className="text-orange-600 font-bold">Gasto $5,000</span> inmediato</p>
                    <p>2. Aparece en reportes como costo operativo</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Beneficios */}
            <div className="bg-white rounded-lg p-5 border border-blue-200">
              <h3 className="font-bold text-lg text-blue-900 mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                Beneficios del sistema:
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">Contabilidad correcta</p>
                    <p className="text-sm text-gray-600">Separación clara entre activos y gastos</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">Control de inventario</p>
                    <p className="text-sm text-gray-600">Sabes exactamente qué tienes en stock</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">Utilidades reales</p>
                    <p className="text-sm text-gray-600">Reportes financieros precisos</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">Evita errores</p>
                    <p className="text-sm text-gray-600">Interfaz guiada previene confusiones</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">Historial completo</p>
                    <p className="text-sm text-gray-600">Trazabilidad de todas las compras</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">Análisis mejor</p>
                    <p className="text-sm text-gray-600">Inversión en inventario vs operación</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Acceso rápido */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                onClick={() => router.push('/purchases/new')} 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Registrar Nueva Compra
              </Button>
              <Button 
                onClick={() => router.push('/purchases')} 
                variant="outline"
                className="flex-1 h-12"
              >
                <FileText className="h-5 w-5 mr-2" />
                Ver Historial de Compras
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Developer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-6 h-6 text-blue-600" />
              Desarrollador
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Smith Rodríguez</h3>
                    <p className="text-sm text-slate-600">Desarrollador Full Stack</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium">Experiencia</p>
                    <p className="text-sm text-slate-600">2 años de experiencia en desarrollo</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-slate-600">smithrodriguezz345@gmail.com</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Linkedin className="w-5 h-5 text-blue-700" />
                  <div>
                    <p className="font-medium">LinkedIn</p>
                    <p className="text-sm text-slate-600">Perfil de LinkedIn disponible</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-6 h-6 text-purple-600" />
              Características del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg mb-3">Módulos Disponibles:</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span>Facturación electrónica NCF</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-green-500" />
                    <span>Gestión de productos y servicios</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Warehouse className="h-4 w-4 text-orange-500" />
                    <span>Control de inventario multi-almacén</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ShoppingCart className="h-4 w-4 text-purple-500" />
                    <span>Sistema de clasificación de compras</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-red-500" />
                    <span>Gestión de gastos operativos</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Receipt className="h-4 w-4 text-indigo-500" />
                    <span>Recibos térmicos</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg mb-3">Información Técnica:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Versión:</span>
                    <Badge variant="outline">v2.2.0</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tecnología:</span>
                    <Badge variant="outline">Next.js 15</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Base de datos:</span>
                    <Badge variant="outline">Supabase PostgreSQL</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Última actualización:</span>
                    <Badge variant="outline">Enero 2026</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-slate-600">Sistema operativo</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 pb-8">
          <Button asChild variant="outline" size="lg">
            <a href="mailto:smithrodriguezz345@gmail.com">
              <Mail className="h-4 w-4 mr-2" />
              Contactar al Desarrollador
            </a>
          </Button>
          <Button size="lg" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
