"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useDataUserId } from "@/hooks/use-data-user-id"
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
  Warehouse,
  Laptop,
  Wifi,
  Database,
  Globe,
  Monitor,
  Smartphone,
  CheckCircle2,
  XCircle,
  RefreshCw
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SystemInfoPage() {
  const router = useRouter()
  const { dataUserId, loading: userIdLoading } = useDataUserId()
  const [regenerating, setRegenerating] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [regenerationStatus, setRegenerationStatus] = React.useState('')

  const handleRegenerateHistory = async () => {
    if (!dataUserId) return

    try {
      setRegenerating(true)
      setProgress(5)
      setRegenerationStatus('Iniciando análisis...')

      // 1. Get all products with cost
      const { data: products } = await supabase
        .from('products')
        .select('id, cost_price, name')
        .eq('user_id', dataUserId)

      const productCostMap = new Map(
        products?.map(p => [p.id, { cost: p.cost_price || 0, name: p.name }]) || []
      )

      setProgress(15)
      setRegenerationStatus('Analizando facturas antiguas...')

      // 2. Process Invoices
      const { data: invoiceItems } = await supabase
        .from('invoice_items')
        .select(`
          *,
          invoices!inner(id, user_id, invoice_date)
        `)
        .eq('invoices.user_id', dataUserId)
        .not('product_id', 'is', null)

      // Get existing COGS to avoid duplicates
      const { data: existingCogsInvoice } = await supabase
        .from('cost_of_goods_sold')
        .select('invoice_id, product_id')
        .eq('user_id', dataUserId)
        .not('invoice_id', 'is', null)

      const existingInvoiceMap = new Set(
        existingCogsInvoice?.map(c => `${c.invoice_id}-${c.product_id}`) || []
      )

      const invoiceItemsToProcess = invoiceItems?.filter(item =>
        !existingInvoiceMap.has(`${item.invoice_id}-${item.product_id}`)
      ) || []

      let processedCount = 0
      const totalToProcess = (invoiceItemsToProcess.length) + 1 // +1 to avoid div by zero

      // Batch insert logic would be better, but for safety in client-side migration we do sequential or small batches
      // We'll use a loop for now to monitor progress

      for (const item of invoiceItemsToProcess) {
        const productInfo = productCostMap.get(item.product_id)
        if (productInfo) {
          const quantity = item.quantity || 0
          const unitPrice = item.unit_price || 0
          const total = item.total || (quantity * unitPrice)
          const cost = productInfo.cost
          const totalCost = quantity * cost
          const profit = total - totalCost
          const margin = total > 0 ? (profit / total) * 100 : 0

          await supabase.from('cost_of_goods_sold').insert({
            user_id: dataUserId,
            invoice_id: item.invoice_id,
            product_id: item.product_id,
            quantity_sold: quantity,
            sale_price: unitPrice,
            total_sale: total,
            unit_cost: cost,
            total_cost: totalCost,
            gross_profit: profit,
            profit_margin: margin,
            sale_date: (item.invoices as any).invoice_date
          })
        }
        processedCount++
        if (processedCount % 10 === 0) {
          setProgress(15 + Math.floor((processedCount / totalToProcess) * 40))
        }
      }

      setProgress(55)
      setRegenerationStatus('Analizando recibos térmicos...')

      // 3. Process Thermal Receipts
      const { data: receiptItems } = await supabase
        .from('thermal_receipt_items')
        .select(`
          *,
          thermal_receipts!inner(id, user_id, created_at)
        `)
        .eq('thermal_receipts.user_id', dataUserId)
        .not('product_id', 'is', null)

      // Get existing COGS for receipts
      const { data: existingCogsReceipt } = await supabase
        .from('cost_of_goods_sold')
        .select('thermal_receipt_id, product_id')
        .eq('user_id', dataUserId)
        .not('thermal_receipt_id', 'is', null)

      const existingReceiptMap = new Set(
        existingCogsReceipt?.map(c => `${c.thermal_receipt_id}-${c.product_id}`) || []
      )

      const receiptItemsToProcess = receiptItems?.filter(item =>
        !existingReceiptMap.has(`${item.thermal_receipt_id}-${item.product_id}`)
      ) || []

      const totalReceipts = receiptItemsToProcess.length + 1
      let processedReceipts = 0

      for (const item of receiptItemsToProcess) {
        const productInfo = productCostMap.get(item.product_id)
        if (productInfo && productInfo.cost > 0) {
          const quantity = item.quantity || 0
          const unitPrice = item.unit_price || 0
          const total = item.line_total || (quantity * unitPrice)
          const cost = productInfo.cost
          const totalCost = quantity * cost
          const profit = total - totalCost
          const margin = total > 0 ? (profit / total) * 100 : 0

          await supabase.from('cost_of_goods_sold').insert({
            user_id: dataUserId,
            thermal_receipt_id: item.thermal_receipt_id,
            product_id: item.product_id,
            quantity_sold: quantity,
            sale_price: unitPrice,
            total_sale: total,
            unit_cost: cost,
            total_cost: totalCost,
            gross_profit: profit,
            profit_margin: margin,
            sale_date: (item.thermal_receipts as any).created_at
          })
        }
        processedReceipts++
        if (processedReceipts % 10 === 0) {
          setProgress(55 + Math.floor((processedReceipts / totalReceipts) * 40))
        }
      }

      setProgress(100)
      setRegenerationStatus('¡Proceso completado!')
      setTimeout(() => {
        setRegenerating(false)
        setRegenerationStatus('')
      }, 3000)

    } catch (error) {
      console.error('Error generating history:', error)
    }
  }

  function RepairNcfButton({ dataUserId }: { dataUserId: string | null }) {
    const [repairing, setRepairing] = React.useState(false)
    const [status, setStatus] = React.useState("")
    const [count, setCount] = React.useState(0)

    const handleRepair = async () => {
      if (!dataUserId) return

      try {
        setRepairing(true)
        setStatus("Buscando recibos sin NCF...")

        // 1. Buscar recibos sin NCF
        // Nota: supabase.is('ncf', null) puede variar, usamos filter explícito si es necesario
        const { data: receipts } = await supabase
          .from('thermal_receipts')
          .select('id, receipt_number, created_at')
          .eq('user_id', dataUserId)
          .is('ncf', null)

        if (!receipts || receipts.length === 0) {
          setStatus("No se encontraron recibos sin NCF.")
          setTimeout(() => setRepairing(false), 2000)
          return
        }

        setCount(receipts.length)
        setStatus(`Encontrados ${receipts.length} recibos. Actualizando...`)

        // 2. Actualizar uno por uno para generar secuencia
        let processed = 0
        for (const receipt of receipts) {
          // Generar un NCF "dummy" B02
          // Usamos una serie alta 9999xxxx para diferenciar
          const sequence = Math.floor(1000 + Math.random() * 9000) // 4 digits
          const ncf = `B029999${sequence}`

          await supabase
            .from('thermal_receipts')
            .update({
              ncf: ncf,
              include_itbis: true // Asegurar que se marque para reporte
            })
            .eq('id', receipt.id)

          processed++
          if (processed % 5 === 0) setStatus(`Procesando... ${processed}/${receipts.length}`)
        }

        setStatus(`¡Listo! ${processed} recibos actualizados.`)
        setTimeout(() => setRepairing(false), 3000)

      } catch (error) {
        console.error("Error repairing NCFs:", error)
        setStatus("Error al reparar.")
        setTimeout(() => setRepairing(false), 3000)
      }
    }

    return (
      <div>
        {repairing ? (
          <div className="text-sm text-blue-300 animate-pulse">
            {status}
          </div>
        ) : (
          <Button
            onClick={handleRepair}
            disabled={!dataUserId}
            className="bg-blue-600 hover:bg-blue-700 text-white mt-2"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reparar NCFs Faltantes
          </Button>
        )}
      </div>
    )
  }


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
                    <AlertCircle className="h-5 w-5 text-amber-400" />
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
                      <CheckCircle2 className="h-4 w-4" />
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
                <p className="text-blue-400 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> apply-dark-theme-all-pages.js</p>
                <p className="text-slate-400 ml-4">→ 41 archivos page.tsx procesados</p>
                <p className="text-blue-400 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> apply-dark-theme-components.js</p>
                <p className="text-slate-400 ml-4">→ 36 componentes .tsx actualizados</p>
                <p className="text-blue-400 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> globals.css</p>
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
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold text-slate-200">Importante</h3>
            </div>
            <div className="space-y-2 mb-6">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Si experimentas problemas, intenta recargar la página.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Mantén tu navegador actualizado para la mejor experiencia.</span>
              </li>
            </div>
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

        {/* Mantenimiento de Datos */}
        <Card className="border-amber-500/50 bg-amber-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-500">
              <Database className="w-6 h-6" />
              Mantenimiento de Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <RefreshCw className="w-10 h-10 text-amber-500 mt-1" />
              <div className="space-y-2 flex-1">
                <h3 className="font-semibold text-lg text-slate-200">Regenerar Histórico de Rentabilidad</h3>
                <p className="text-slate-400 text-sm">
                  Esta acción analizará todas las facturas y recibos pasados que no tienen registro de costo
                  y generará los datos necesarios para el reporte de rentabilidad basándose en el costo
                  <strong> actual</strong> de los productos.
                </p>
                <div className="bg-slate-900 p-3 rounded text-xs text-slate-500 font-mono">
                  Nota: Los servicios y productos con costo 0 serán procesados pero pueden no reflejar utilidad real si el costo histórico era diferente.
                </div>

                {regenerating ? (
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-sm text-slate-300">
                      <span>{regenerationStatus}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleRegenerateHistory}
                    disabled={!dataUserId || userIdLoading}
                    className="bg-amber-600 hover:bg-amber-700 text-white mt-2"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Iniciar Regeneración
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reparación de NCFs */}
        <Card className="border-blue-500/50 bg-blue-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-500">
              <FileText className="w-6 h-6" />
              Reparación de Datos Fiscales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <RefreshCw className="w-10 h-10 text-blue-500 mt-1" />
              <div className="space-y-2 flex-1">
                <h3 className="font-semibold text-lg text-slate-200">Asignar NCF a Recibos Térmicos Antiguos</h3>
                <p className="text-slate-400 text-sm">
                  Los recibos térmicos creados anteriormente no tienen NCF asignado y no aparecen en los reportes DGII.
                  Esta acción asignará un NCF de tipo <strong>Consumidor Final (B02)</strong> generado automáticamente a todos los recibos existentes.
                </p>
                <div className="bg-slate-900 p-3 rounded text-xs text-slate-500 font-mono">
                  Nota: Se asignarán NCFs con la secuencia B029999XXXX para evitar conflictos con la secuencia oficial.
                </div>

                <RepairNcfButton dataUserId={dataUserId} />
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
