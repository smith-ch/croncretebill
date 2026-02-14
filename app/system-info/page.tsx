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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 lg:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" onClick={() => router.back()} className="hover:bg-slate-800">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-slate-800 bg-clip-text text-transparent">
              Información del Sistema
            </h1>
            <p className="text-slate-400 mt-1">ConcreteBill - Sistema de Facturación y Gestión Empresarial</p>
          </div>
        </div>

        {/* Migración de Tema y Paleta de Colores */}
        <Card className="border-2 border-blue-500 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl text-blue-300 flex items-center gap-2">
                  <CheckCircle className="h-6 w-6" />
                  Migración de Tema y Paleta de Colores
                </CardTitle>
                <p className="text-blue-400 text-sm mt-1">Sistema completamente renovado con tema oscuro profesional</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Antes del cambio */}
            <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-lg text-slate-200 mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-900/30 text-amber-400 rounded-full text-sm">⚠</span>
                    Situación anterior:
                  </h3>
                  <p className="text-slate-300 mb-3">
                    El sistema utilizaba una <strong>paleta de colores pastel</strong> (azul-50, verde-50, rojo-50, etc.) con fondos claros 
                    que no se ajustaban al tema oscuro del sidebar y navegación.
                  </p>
                  <div className="bg-amber-900/30 border-l-4 border-amber-400 p-4 rounded">
                    <p className="font-semibold text-amber-300 mb-2">Problemas que causaba:</p>
                    <ul className="space-y-1 text-sm text-amber-200">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                        Fondos blancos y claros en páginas (from-blue-50, from-slate-50)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                        Cards con colores pastel (emerald-50, purple-50, cyan-50)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                        Texto oscuro ilegible en tema oscuro (text-gray-700, text-slate-900)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                        Inconsistencia visual entre componentes
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                        Marco blanco visible alrededor del contenido
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Nueva paleta implementada */}
            <div className="bg-slate-800 rounded-lg p-5 border border-blue-400">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-slate-200 mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-900/30 text-blue-400 rounded-full">
                      <CheckCircle className="h-4 w-4" />
                    </span>
                    Nueva paleta de colores Slate:
                  </h3>
                  <p className="text-slate-300 mb-4">
                    Migración completa de <strong>41 páginas</strong> y <strong>36 componentes</strong> a una paleta Slate oscura profesional:
                  </p>

                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Fondos */}
                    <div className="border-2 border-slate-600 rounded-lg p-4 bg-slate-900/50">
                      <h4 className="font-bold text-blue-300 mb-3 flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-950 rounded border border-slate-700"></div>
                        Fondos
                      </h4>
                      <ul className="space-y-2 text-sm text-slate-300">
                        <li className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-slate-950 rounded border border-slate-700"></div>
                          <span>slate-950: Fondo principal</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-slate-900 rounded border border-slate-700"></div>
                          <span>slate-900: Cards primarias</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-slate-800 rounded border border-slate-700"></div>
                          <span>slate-800: Cards anidadas</span>
                        </li>
                      </ul>
                    </div>

                    {/* Textos */}
                    <div className="border-2 border-slate-600 rounded-lg p-4 bg-slate-900/50">
                      <h4 className="font-bold text-emerald-300 mb-3 flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Textos
                      </h4>
                      <ul className="space-y-2 text-sm text-slate-300">
                        <li className="flex items-center gap-2">
                          <span className="text-slate-200 font-semibold">Aa</span>
                          <span>slate-200: Títulos</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-slate-300 font-semibold">Aa</span>
                          <span>slate-300: Texto primario</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-slate-400 font-semibold">Aa</span>
                          <span>slate-400: Texto secundario</span>
                        </li>
                      </ul>
                    </div>

                    {/* Acentos */}
                    <div className="border-2 border-slate-600 rounded-lg p-4 bg-slate-900/50">
                      <h4 className="font-bold text-purple-300 mb-3 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Acentos
                      </h4>
                      <ul className="space-y-2 text-sm text-slate-300">
                        <li className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-blue-500 rounded"></div>
                          <span>blue-400/500: Info</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                          <span>emerald-400: Éxito</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-red-500 rounded"></div>
                          <span>red-400: Error</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-amber-500 rounded"></div>
                          <span>amber-400: Advertencia</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cambios realizados */}
            <div className="bg-slate-800 border-2 border-slate-600 rounded-lg p-5">
              <h3 className="font-bold text-lg text-blue-300 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Cambios aplicados automáticamente:
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                  <p className="font-semibold text-emerald-300 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Fondos principales:
                  </p>
                  <div className="space-y-1 text-sm text-slate-300 font-mono bg-slate-950 p-3 rounded">
                    <p className="text-red-400">- bg-gradient-to-br from-blue-50 via-white</p>
                    <p className="text-green-400">+ bg-gradient-to-br from-slate-950 via-slate-900</p>
                    <p className="text-slate-500 mt-2">✓ Aplicado en 41 páginas</p>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                  <p className="font-semibold text-emerald-300 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Cards y componentes:
                  </p>
                  <div className="space-y-1 text-sm text-slate-300 font-mono bg-slate-950 p-3 rounded">
                    <p className="text-red-400">- from-emerald-50 to-emerald-100</p>
                    <p className="text-green-400">+ from-slate-900 to-slate-800</p>
                    <p className="text-slate-500 mt-2">✓ 36 componentes actualizados</p>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                  <p className="font-semibold text-emerald-300 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Textos legibles:
                  </p>
                  <div className="space-y-1 text-sm text-slate-300 font-mono bg-slate-950 p-3 rounded">
                    <p className="text-red-400">- text-gray-700, text-slate-900</p>
                    <p className="text-green-400">+ text-slate-300, text-slate-400</p>
                    <p className="text-slate-500 mt-2">✓ Contraste optimizado</p>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                  <p className="font-semibold text-emerald-300 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Borders consistentes:
                  </p>
                  <div className="space-y-1 text-sm text-slate-300 font-mono bg-slate-950 p-3 rounded">
                    <p className="text-red-400">- border-gray-300, border-slate-200</p>
                    <p className="text-green-400">+ border-slate-700, border-slate-600</p>
                    <p className="text-slate-500 mt-2">✓ Definición clara</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Beneficios */}
            <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
              <h3 className="font-bold text-lg text-blue-300 mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-400" />
                Mejoras obtenidas:
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-200">Consistencia visual total</p>
                    <p className="text-sm text-slate-400">Todo el sistema en tema oscuro profesional</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-200">Mejor legibilidad</p>
                    <p className="text-sm text-slate-400">Textos claros sobre fondos oscuros</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-200">Reducción de fatiga visual</p>
                    <p className="text-sm text-slate-400">Menos brillo, más confort</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-200">Aspecto profesional moderno</p>
                    <p className="text-sm text-slate-400">Diseño contemporáneo y elegante</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-200">Sin marcos blancos</p>
                    <p className="text-sm text-slate-400">Experiencia inmersiva completa</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-200">Acentos vibrantes efectivos</p>
                    <p className="text-sm text-slate-400">Colores destacan sobre slate oscuro</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Scripts utilizados */}
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
              <h3 className="font-bold text-slate-200 mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-400" />
                Scripts de migración automática:
              </h3>
              <div className="space-y-2 text-sm text-slate-300 font-mono bg-slate-950 p-3 rounded">
                <p className="text-blue-400">✓ apply-dark-theme-all-pages.js</p>
                <p className="text-slate-400 ml-4">→ 41 archivos page.tsx procesados</p>
                <p className="text-blue-400">✓ apply-dark-theme-components.js</p>
                <p className="text-slate-400 ml-4">→ 36 componentes .tsx actualizados</p>
                <p className="text-blue-400">✓ globals.css</p>
                <p className="text-slate-400 ml-4">→ Body background: slate-950</p>
              </div>
            </div>

            {/* Acceso rápido */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                onClick={() => router.push('/dashboard')} 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Ver Dashboard con Nuevo Tema
              </Button>
              <Button 
                onClick={() => router.push('/settings')} 
                variant="outline"
                className="flex-1 h-12"
              >
                <FileText className="h-5 w-5 mr-2" />
                Ir a Configuración
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
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Smith Rodríguez</h3>
                    <p className="text-sm text-slate-400">Desarrollador Full Stack</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium">Experiencia</p>
                    <p className="text-sm text-slate-400">2 años de experiencia en desarrollo</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-slate-400">smithrodriguezz345@gmail.com</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Linkedin className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="font-medium">LinkedIn</p>
                    <p className="text-sm text-slate-400">Perfil de LinkedIn disponible</p>
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
                    <span className="text-slate-400">Versión:</span>
                    <Badge variant="outline">v2.2.0</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tecnología:</span>
                    <Badge variant="outline">Next.js 15</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Base de datos:</span>
                    <Badge variant="outline">Supabase PostgreSQL</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Última actualización:</span>
                    <Badge variant="outline">Enero 2026</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-slate-400">Sistema operativo</span>
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
