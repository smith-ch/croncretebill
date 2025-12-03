"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Download, Receipt, FileText, TrendingUp, AlertTriangle, Users, Plus, Eye } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useUserPermissions } from "@/hooks/use-user-permissions-simple"
import * as XLSX from 'xlsx'

// Types
interface Expense {
  id: string
  amount: number
  expense_date: string
  description: string
  itbis_amount?: number
  ncf?: string
  provider_name?: string
  provider_rnc?: string
  clients?: {
    id: string
    name: string
    rnc: string
    id_number: string
    email: string
    phone: string
    tipo_id: string
    is_provider: boolean
  }
  expense_categories?: {
    name: string
    color: string
  }
  user_id: string
  created_at: string
  // Additional fields for compatibility with existing data
  fecha?: string
  date?: string
  monto?: number
  tax_amount?: number
  itbis?: number
  tipo_gasto?: string
  descripcion?: string
}

interface Invoice {
  id: string
  invoice_number: string
  created_at: string
  total: number
  subtotal: number
  tax_amount: number
  ncf?: string
  user_id: string
  payment_method: string
  monto_bienes?: number
  monto_servicios?: number
  monto_exento?: number
  tipo_comprobante?: string
  indicador_anulacion?: boolean
  due_date?: string
  invoice_date?: string
  issue_date?: string
  status?: string
  include_itbis?: boolean
  notes?: string
  client_id?: string
  client_rnc?: string
  client_name?: string
  // Additional fields for compatibility with existing data
  fecha?: string
  date?: string
  monto?: number
  itbis?: number
  clients?: {
    id: string
    name: string
    email: string
    phone: string
    rnc: string
    id_number: string
    tipo_id: string
    address?: string
  }
}

interface PaymentMethodStat {
  count: number
  total: number
  name: string
  invoices: Invoice[]
  monthlyTotals?: number[]
}


// Catálogos oficiales DGII
const TIPOS_GASTO_DGII = {
  "01": "Gastos de Personal",
  "02": "Gastos por Trabajo, Suministro y Servicios", 
  "03": "Arrendamientos",
  "04": "Gastos de Activos Fijos",
  "05": "Gastos de Representación",
  "06": "Otras Deducciones Admitidas",
  "07": "Gastos Financieros",
  "08": "Gastos Extraordinarios", 
  "09": "Compras y Gastos que forman parte del Costo de Venta",
  "10": "Adquisiciones de Activos",
  "11": "Gastos de Seguros"
}

const TIPOS_COMPROBANTE_FISCAL = {
  "B01": "Crédito Fiscal",
  "B02": "Consumo", 
  "B03": "Regímenes Especiales",
  "B04": "Gubernamentales",
  "B11": "Exportaciones",
  "B12": "Proveedores Informales",
  "B13": "Gastos Menores",
  "B14": "Especiales de Pagos",
  "B15": "Regímenes Especiales de Tributación Única",
  "B16": "Gubernamentales de Retenciones",
  "B17": "Registro Único de Ingresos"
}

const FORMAS_PAGO_DGII = {
  "01": "Efectivo",
  "02": "Cheque",
  "03": "Tarjeta de Crédito/Débito",
  "04": "Transferencia Bancaria",
  "05": "Crédito",
  "06": "Bonos o Certificados de Regalo",
  "07": "Permuta",
  "08": "Otras Formas"
}

// Funciones helper para determinar tipos automáticamente
const determinarTipoGasto = (descripcion: string): string => {
  const desc = descripcion.toLowerCase()
  
  // Gastos de personal (específicos)
  if (desc.includes("salario") || desc.includes("sueldo") || desc.includes("nomina") || desc.includes("empleado")) {
    return "01"
  }
  
  // Servicios específicos (profesionales, mantenimiento, etc.)
  if (desc.includes("servicio profesional") || desc.includes("consultoria") || desc.includes("auditoria") || 
      desc.includes("reparacion especializada") || desc.includes("mantenimiento profesional") || desc.includes("limpieza")) {
    return "02"
  }
  
  // Arrendamientos específicos
  if (desc.includes("alquiler") || desc.includes("renta") || desc.includes("arriendo") || desc.includes("local")) {
    return "03"
  }
  
  // Gastos de activos fijos
  if (desc.includes("activo fijo") || desc.includes("maquinaria") || desc.includes("vehiculo") || 
      desc.includes("computadora") || desc.includes("mobiliario")) {
    return "04"
  }
  
  // Viáticos y representación específicos
  if (desc.includes("representacion") || desc.includes("cliente") || desc.includes("reunion") || 
      desc.includes("viatico") || desc.includes("viaje") || desc.includes("hotel")) {
    return "05"
  }
  
  // Gastos financieros específicos
  if (desc.includes("financiero") || desc.includes("interes") || desc.includes("banco") || 
      desc.includes("prestamo") || desc.includes("comision bancaria")) {
    return "07"
  }
  
  // Seguros específicos
  if (desc.includes("seguro") || desc.includes("poliza")) {
    return "11"
  }
  
  // TODAS las demás compras y gastos operativos -> TIPO 09
  // Esto incluye: combustible, herramientas, suministros, materiales, 
  // insumos, equipos menores, gastos de oficina, etc.
  return "09" // Compras y Gastos que forman parte del Costo de Venta
}

// Función para obtener la descripción del tipo de bien
const obtenerDescripcionTipoGasto = (codigo: string): string => {
  return TIPOS_GASTO_DGII[codigo as keyof typeof TIPOS_GASTO_DGII] || "Otro Tipo de Gasto"
}

const validarRNC = (rnc: string): boolean => {
  if (!rnc) {
    return false
  }
  const cleaned = rnc.replace(/\D/g, '')
  return cleaned.length === 9 || cleaned.length === 11
}

const validarNCF = (ncf: string): boolean => {
  if (!ncf) {
    return false
  }
  const cleaned = ncf.toUpperCase().trim()
  return cleaned.length === 11 && (cleaned.startsWith("B") || cleaned.startsWith("E"))
}

// Utility functions for date formatting
const formatDateToYearMonth = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const formatDateToDayMonthYear = (dateString: string): string => {
  const date = new Date(dateString)
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

const formatMonthYear = (yearMonth: string): string => {
  const [year, month] = yearMonth.split('-')
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ]
  return `${months[parseInt(month) - 1]} ${year}`
}

// Funciones para generar Excel exactos según las imágenes
const generarExcel607Compras = async (mes: number, anio: number) => {
  try {
    const fechaInicio = new Date(anio, mes - 1, 1)
    const fechaFin = new Date(anio, mes, 0)

    // Obtener datos de compras (expenses)
    const { data: compras, error } = await supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', fechaInicio.toISOString())
      .lte('expense_date', fechaFin.toISOString())

    if (error) { throw error }

    // Crear workbook
    const wb = XLSX.utils.book_new()
    
    // Datos para el Excel según formato 607
    const datosExcel = compras?.map((compra: any, index: number) => ({
      'No. Línea': index + 1,
      'Tipo Identificación': '2', // Por defecto cédula
      'RNC/Cédula': compra.supplier_rnc || compra.rnc || '',
      'Tipo Bienes y Servicios': determinarTipoGasto(compra.description || compra.supplier || ''),
      'NCF': compra.ncf || compra.receipt_number || '',
      'NCF Modificado': '',
      'Fecha Comprobante': compra.expense_date ? new Date(compra.expense_date).toLocaleDateString('es-DO') : '',
      'Fecha Pago': compra.expense_date ? new Date(compra.expense_date).toLocaleDateString('es-DO') : '',
      'Monto Facturado': parseFloat(compra.amount) || 0,
      'ITBIS Facturado': compra.itbis_amount ? parseFloat(compra.itbis_amount) : (parseFloat(compra.amount) * 0.18) || 0,
      'ITBIS Retenido por Terceros': 0,
      'ITBIS Percibido en Compras': 0,
      'Tipo de Retención ISR': 0,
      'Monto Retención Renta': 0,
      'ISR Percibido en Compras': 0,
      'Impuesto Selectivo al Consumo': 0,
      'Otros Impuestos/Tasas': 0,
      'Monto Propina Legal': 0,
      'Forma de Pago': '01' // Efectivo por defecto
    })) || []

    // Crear hoja de cálculo
    const ws = XLSX.utils.json_to_sheet(datosExcel)
    
    // Agregar la hoja al workbook
    XLSX.utils.book_append_sheet(wb, ws, '607 Compras')
    
    // Generar archivo
    const nombreArchivo = `607_Compras_${String(mes).padStart(2, '0')}_${anio}.xlsx`
    XLSX.writeFile(wb, nombreArchivo)
    
    console.log(`Generado: ${nombreArchivo}`)
    
  } catch (error: any) {
    console.error('Error generando Excel 607:', error)
    alert('Error al generar el Excel 607: ' + error.message)
  }
}

const generarExcel608Ventas = async (mes: number, anio: number) => {
  try {
    const fechaInicio = new Date(anio, mes - 1, 1)
    const fechaFin = new Date(anio, mes, 0)

    // Obtener datos de ventas (invoices)
    const { data: ventas, error } = await supabase
      .from('invoices')
      .select('*')
      .gte('created_at', fechaInicio.toISOString())
      .lte('created_at', fechaFin.toISOString())

    if (error) { throw error }

    // Crear workbook
    const wb = XLSX.utils.book_new()
    
    // Datos para el Excel según formato 608
    const datosExcel = ventas?.map((venta: any, index: number) => ({
      'No. Línea': index + 1,
      'Tipo Identificación': '2', // Por defecto cédula
      'RNC/Cédula': venta.client_rnc || '',
      'NCF': venta.ncf || venta.invoice_number || '',
      'NCF Modificado': '',
      'Fecha Comprobante': venta.created_at ? new Date(venta.created_at).toLocaleDateString('es-DO') : '',
      'Fecha Vencimiento': venta.due_date ? new Date(venta.due_date).toLocaleDateString('es-DO') : '', 
      'Monto Facturado': parseFloat(venta.total) || 0,
      'ITBIS Facturado': parseFloat(venta.tax_amount) || 0,
      'ITBIS Retenido': 0,
      'ITBIS Percibido': 0,
      'Retención Renta por Terceros': 0,
      'ISR Percibido': 0,
      'Impuesto Selectivo al Consumo': 0,
      'Otros Impuestos/Tasas': 0,
      'Monto Propina Legal': 0,
      'Efectivo': venta.payment_method === 'efectivo' ? parseFloat(venta.total) || 0 : 0,
      'Cheque': venta.payment_method === 'cheque' ? parseFloat(venta.total) || 0 : 0,
      'Tarjeta': venta.payment_method === 'tarjeta' ? parseFloat(venta.total) || 0 : 0,
      'Transferencia': venta.payment_method === 'transferencia' ? parseFloat(venta.total) || 0 : 0,
      'Otras Formas': 0
    })) || []

    // Crear hoja de cálculo
    const ws = XLSX.utils.json_to_sheet(datosExcel)
    
    // Agregar la hoja al workbook
    XLSX.utils.book_append_sheet(wb, ws, '608 Ventas')
    
    // Generar archivo
    const nombreArchivo = `608_Ventas_${String(mes).padStart(2, '0')}_${anio}.xlsx`
    XLSX.writeFile(wb, nombreArchivo)
    
    console.log(`Generado: ${nombreArchivo}`)
    
  } catch (error: any) {
    console.error('Error generando Excel 608:', error)
    alert('Error al generar el Excel 608: ' + error.message)
  }
}

interface DGIIData {
  compras: Expense[]
  ventas: Invoice[]
  totalCompras: number
  totalVentas: number
  itbisCompras: number
  itbisVentas: number
}

export default function DGIIReportsPage() {
  const { permissions } = useUserPermissions()
  
  const [selectedMonth, setSelectedMonth] = useState(formatDateToYearMonth(new Date()))
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [loading, setLoading] = useState(false)
  const [dgiiData, setDgiiData] = useState<DGIIData | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  // Estados para creación manual
  const [manualExpense, setManualExpense] = useState({
    description: '',
    amount: '',
    provider_name: '',
    provider_rnc: '',
    ncf: '',
    expense_date: new Date().toISOString().split('T')[0],
    itbis_amount: ''
  })

  const [manualInvoice, setManualInvoice] = useState({
    client_name: '',
    client_rnc: '',
    ncf: '',
    total: '',
    tax_amount: '',
    payment_method: 'credito',
    created_at: new Date().toISOString().split('T')[0]
  })

  // Estados de loading para los formularios
  const [savingExpense, setSavingExpense] = useState(false)
  const [savingInvoice, setSavingInvoice] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const fetchDGIIData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      // Calcular fechas correctas del mes seleccionado
      const [year, month] = selectedMonth.split('-')
      const startDate = `${year}-${month}-01`
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
      const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`

      console.log(`Buscando datos del ${startDate} al ${endDate}`)

      // Obtener datos de gastos con todas las columnas DGII necesarias
      const { data: expenses, error: expensesError } = await supabase
        .from("expenses")
        .select(`
          *,
          expense_categories(name, color),
          clients(id, name, rnc, id_number, email, phone, tipo_id, is_provider)
        `)
        .eq("user_id", user.id)
        .gte("expense_date", startDate)
        .lte("expense_date", endDate)
        .order("expense_date", { ascending: true })

      // Obtener datos de ventas con información completa del cliente DGII
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          created_at,
          total,
          subtotal,
          tax_amount,
          ncf,
          user_id,
          payment_method,
          monto_bienes,
          monto_servicios,
          monto_exento,
          tipo_comprobante,
          indicador_anulacion,
          clients!inner(
            id,
            name,
            email,
            phone,
            rnc,
            id_number,
            tipo_id
          )
        `)
        .eq("user_id", user.id)
        .gte("created_at", startDate + " 00:00:00")
        .lte("created_at", endDate + " 23:59:59")
        .order("created_at", { ascending: true })

      console.log(`Encontrados: ${expenses?.length || 0} gastos, ${invoices?.length || 0} facturas`)

      if (expensesError) {
        console.error("Error en gastos:", expensesError)
        throw new Error("Error al obtener gastos: " + expensesError.message)
      }
      if (invoicesError) {
        console.error("Error en facturas:", invoicesError)
        throw new Error("Error al obtener facturas: " + invoicesError.message)
      }

      // Calcular totales con mejor precisión
      const totalCompras = expenses?.reduce((sum, exp: Expense) => {
        const amount = parseFloat(exp.amount.toString()) || 0
        return sum + amount
      }, 0) || 0

      const totalVentas = invoices?.reduce((sum, inv: Invoice) => {
        const total = parseFloat(inv.total.toString()) || 0
        return sum + total
      }, 0) || 0

      // Calcular ITBIS más preciso
      const itbisCompras = expenses?.reduce((sum, exp: Expense) => {
        // Si tiene ITBIS explícito, usarlo; sino calcular 18%
        const itbis = exp.itbis_amount ? parseFloat(exp.itbis_amount.toString()) : (parseFloat(exp.amount.toString()) || 0) * 0.18
        return sum + itbis
      }, 0) || 0

      const itbisVentas = invoices?.reduce((sum, inv: Invoice) => {
        const itbis = parseFloat(inv.tax_amount.toString()) || 0
        return sum + itbis
      }, 0) || 0

      console.log("Totales calculados:", { totalCompras, totalVentas, itbisCompras, itbisVentas })

      setDgiiData({
        compras: expenses || [],
        ventas: invoices || [],
        totalCompras,
        totalVentas,
        itbisCompras,
        itbisVentas
      })

    } catch (error) {
      console.error("Error fetching DGII data:", error)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => {
    fetchDGIIData()
  }, [fetchDGIIData])

  // Función para obtener datos anuales completos
  const fetchAnnualDGIIData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      // Calcular fechas del año completo
      const startDate = `${selectedYear}-01-01`
      const endDate = `${selectedYear}-12-31`

      console.log(`Buscando datos anuales del ${startDate} al ${endDate}`)

      // Obtener datos de gastos del año completo
      const { data: expenses, error: expensesError } = await supabase
        .from("expenses")
        .select(`
          *,
          expense_categories(name, color),
          clients(id, name, rnc, id_number, email, phone, tipo_id, is_provider)
        `)
        .eq("user_id", user.id)
        .gte("expense_date", startDate)
        .lte("expense_date", endDate)
        .order("expense_date", { ascending: true })

      // Obtener datos de ventas del año completo
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          created_at,
          total,
          subtotal,
          tax_amount,
          ncf,
          user_id,
          payment_method,
          monto_bienes,
          monto_servicios,
          monto_exento,
          tipo_comprobante,
          indicador_anulacion,
          clients!inner(
            id,
            name,
            email,
            phone,
            rnc,
            id_number,
            tipo_id
          )
        `)
        .eq("user_id", user.id)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: true })

      console.log(`Encontrados: ${expenses?.length || 0} gastos anuales, ${invoices?.length || 0} facturas anuales`)

      if (expensesError) {
        console.error("Error en gastos anuales:", expensesError)
        throw new Error("Error al obtener gastos anuales: " + expensesError.message)
      }
      if (invoicesError) {
        console.error("Error en facturas anuales:", invoicesError)
        throw new Error("Error al obtener facturas anuales: " + invoicesError.message)
      }

      // Calcular totales anuales
      const totalCompras = expenses?.reduce((sum, exp: Expense) => {
        const amount = parseFloat(exp.amount.toString()) || 0
        return sum + amount
      }, 0) || 0

      const totalVentas = invoices?.reduce((sum, inv: Invoice) => {
        const total = parseFloat(inv.total.toString()) || 0
        return sum + total
      }, 0) || 0

      const itbisCompras = expenses?.reduce((sum, exp: Expense) => {
        const itbis = exp.itbis_amount ? parseFloat(exp.itbis_amount.toString()) : (parseFloat(exp.amount.toString()) || 0) * 0.18
        return sum + itbis
      }, 0) || 0

      const itbisVentas = invoices?.reduce((sum, inv: Invoice) => {
        const itbis = parseFloat(inv.tax_amount.toString()) || 0
        return sum + itbis
      }, 0) || 0

      console.log("Totales anuales calculados:", { totalCompras, totalVentas, itbisCompras, itbisVentas })

      setDgiiData({
        compras: expenses || [],
        ventas: invoices || [],
        totalCompras,
        totalVentas,
        itbisCompras,
        itbisVentas
      })

    } catch (error) {
      console.error("Error fetching annual DGII data:", error)
    } finally {
      setLoading(false)
    }
  }, [selectedYear])

  // Effect para cargar datos anuales cuando se selecciona la pestaña anual
  useEffect(() => {
    if (activeTab === "annual") {
      fetchAnnualDGIIData()
    } else {
      fetchDGIIData()
    }
  }, [activeTab, selectedYear, fetchAnnualDGIIData, fetchDGIIData])

  // Effect adicional para refrescar datos cuando cambia el año en pestaña anual
  useEffect(() => {
    if (activeTab === "annual") {
      fetchAnnualDGIIData()
    }
  }, [selectedYear, activeTab, fetchAnnualDGIIData])

  // Check if user has permission to view financial reports
  if (!permissions.canViewFinances) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-3 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-2 border-red-200 bg-red-50">
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-red-800 mb-2">Acceso Restringido</h2>
                <p className="text-red-600">
                  No tienes permisos para acceder a los reportes DGII. Esta función requiere permisos financieros.
                </p>
              </div>
              <Button 
                onClick={() => window.history.back()} 
                className="bg-red-600 hover:bg-red-700"
              >
                Volver
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Función para obtener configuración de empresa
  const getCompanyName = async (): Promise<string> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return "MI EMPRESA, SRL"
      }

      const { data: company } = await supabase
        .from("company_settings")
        .select("company_name")
        .eq("user_id", user.id)
        .single()

      return (company as any)?.company_name || "MI EMPRESA, SRL"
    } catch (error) {
      console.log("Usando nombre por defecto")
      return "MI EMPRESA, SRL"
    }
  }

  const generateExcel606 = async () => {
    if (!dgiiData?.compras.length) {
      alert("No hay datos de compras para el período seleccionado")
      return
    }

    // Obtener nombre de la empresa
    const companyName = await getCompanyName()

    // Crear datos para Excel según formato oficial DGII 606
    const excelData = []
    
    // Encabezado de empresa (primera fila, columna A)
    excelData.push([companyName])
    
    // Título del reporte (segunda fila)
    excelData.push(["Consulta Facturas para Envío del 606"])
    
    // Fila vacía
    excelData.push([])
    
    // Encabezados de columnas según imagen de referencia
    excelData.push([
      "Rnc", "Tipo", "Nombre_prc", "Tipo_bienes", "Ncf", "Ncf_modificado", "Añomes", "Dia", 
      "Monto_serv", "Monto_bien", "Total_monto", "Itbis_fac", "Itbis_ret", "Itbis_prop", 
      "Itbis_costo", "Itbis_adel", "Itbis_compr", "Tipo_isr", "Isr_ret", "Isr_compras", 
      "Selectivo", "Otros_imp", "Propina"
    ])
    
    // Datos de compras - usando TODOS los datos disponibles de la BD
    dgiiData.compras.forEach((expense) => {
      // RNC del proveedor - usar TODOS los campos disponibles
      const rncProveedor = expense.clients?.rnc || // RNC del cliente relacionado
                          expense.provider_rnc ||  // RNC directo del proveedor
                          expense.clients?.id_number || // ID number como fallback
                          "" // Vacío si no hay datos
      
      // Nombre del proveedor - usar TODOS los campos disponibles
      const nombreProveedor = expense.clients?.name ||     // Nombre del cliente relacionado
                              expense.provider_name ||    // Nombre directo del proveedor
                              expense.description ||      // Descripción como fallback
                              "SIN NOMBRE"               // Último recurso
      
      // Tipo de bienes según descripción (automático) con descripción
      const codigoTipo = determinarTipoGasto(expense.description || "")
      const descripcionTipo = obtenerDescripcionTipoGasto(codigoTipo)
      const tipoBienes = `${codigoTipo} - ${descripcionTipo}`
      
      // NCF - usar el que esté guardado
      const ncf = expense.ncf || ""
      
      // Fecha del gasto
      const fechaExpense = new Date(expense.expense_date)
      const añomes = parseInt(`${fechaExpense.getFullYear()}${String(fechaExpense.getMonth() + 1).padStart(2, '0')}`)
      const dia = fechaExpense.getDate()
      
      // Montos - usar los campos reales de la BD
      const montoTotal = parseFloat(expense.amount.toString()) || 0
      const itbisFac = expense.itbis_amount ? 
                      parseFloat(expense.itbis_amount.toString()) : 
                      (montoTotal * 0.18) // Calcular si no está guardado

      excelData.push([
        rncProveedor, 
        expense.clients?.tipo_id || "1", // Tipo desde la BD o default 1
        nombreProveedor, 
        tipoBienes, 
        ncf, 
        "", // NCF modificado (vacío por defecto)
        añomes, 
        dia, 
        montoTotal.toFixed(2), // Monto servicios
        "0.00", // Monto bienes (por defecto 0)
        montoTotal.toFixed(2), // Total
        itbisFac.toFixed(2), // ITBIS facturado
        0, 0, 0, 0, // ITBIS ret, prop, costo, adelantado (por defecto 0)
        itbisFac.toFixed(2), // ITBIS compras
        "", // Tipo ISR (vacío por defecto)
        0, 0, 0, 0, 0 // ISR ret, compras, selectivo, otros, propina (por defecto 0)
      ])
    })

    // Crear workbook con formato mejorado
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(excelData)
    
    XLSX.utils.book_append_sheet(wb, ws, "Reporte 606")
    
    // Descargar archivo con nombre según el mes
    const [year, month] = selectedMonth.split('-')
    XLSX.writeFile(wb, `606_${year}${month}_compras.xlsx`)
  }

  const generateExcel607 = async () => {
    if (!dgiiData?.ventas.length) {
      alert("No hay datos de ventas para el período seleccionado")
      return
    }

    // Obtener nombre de la empresa
    const companyName = await getCompanyName()

    // Crear datos para Excel según formato oficial DGII 607
    const excelData = []
    
    // Encabezado de empresa (primera fila, columna A)
    excelData.push([companyName])
    
    // Título del reporte (segunda fila)
    excelData.push(["Consulta Facturas para Envío del 607"])
    
    // Fila vacía
    excelData.push([])
    
    // Encabezados de columnas según imagen de referencia 607
    excelData.push([
      "Rnc", "Id", "Ncf", "Ncf_modifico", "Tipo_ingresos", "Fecha", "Fecha_ret", 
      "Total", "Itbis", "Itbis_ret", "Itbis_perc", "Retenc_isr", "Isr_perc", 
      "Selectivo", "Otros_imp", "Propina", "Efectivo", "Chk_transf", "Tarjeta_cr", 
      "Credito", "Bonos_gif", "Permuta", "Otros_pagos"
    ])
    
    // Datos de ventas - Filtrar solo facturas válidas para DGII
    dgiiData.ventas
      .filter((invoice: any) => {
        const rncCliente = invoice.clients?.rnc || ""
        const ncf = invoice.ncf || ""
        
        // Excluir registros sin NCF o sin RNC (requeridos por DGII)
        if (!ncf || ncf.trim() === "") {
          console.log(`Excluido por falta de NCF: Factura ${invoice.invoice_number}`)
          return false
        }
        
        if (!rncCliente || rncCliente.trim() === "") {
          console.log(`Excluido por falta de RNC: Factura ${invoice.invoice_number}`)
          return false
        }
        
        return true
      })
      .forEach((invoice: any, index: number) => {
      // Usar RNC del cliente guardado (ya validado en el filter)
      const rncCliente = invoice.clients?.rnc || ""
      const id = index + 1
      const ncf = invoice.ncf || ""
      
      const fechaFactura = new Date(invoice.created_at)
      const fecha = parseInt(`${fechaFactura.getFullYear()}${String(fechaFactura.getMonth() + 1).padStart(2, '0')}${String(fechaFactura.getDate()).padStart(2, '0')}`)
      
      const total = parseFloat(invoice.total || 0)
      const itbis = parseFloat(invoice.tax_amount || 0)
      
      // CORREGIDO: El total YA incluye el ITBIS, no se debe sumar dos veces
      const subtotal = total - itbis  // Subtotal sin ITBIS
      
      console.log(`Factura ${invoice.invoice_number}: Total=${total}, ITBIS=${itbis}, Subtotal=${subtotal}`)
      
      // Determinar forma de pago
      const paymentMethod = invoice.payment_method || "credito"
      let efectivo = 0, chkTransf = 0, tarjetaCr = 0, credito = 0
      
      // CORREGIDO: Usar el total que YA incluye el ITBIS (no sumar de nuevo)
      const montoFactura = total  // El total ya incluye todo
      
      switch (paymentMethod.toLowerCase()) {
        case 'efectivo':
          efectivo = montoFactura
          break
        case 'transferencia':
        case 'cheque':
          chkTransf = montoFactura
          break
        case 'tarjeta':
          tarjetaCr = montoFactura
          break
        default:
          credito = montoFactura
      }

      excelData.push([
        rncCliente, 
        id, 
        ncf, 
        "", // NCF modificado
        "01", // Tipo ingresos
        fecha, 
        "", // Fecha retención
        subtotal.toFixed(2), // CORREGIDO: Total sin ITBIS (subtotal)
        itbis.toFixed(2), // ITBIS
        0, 0, 0, 0, 0, 0, 0, // Ret, perc, ISR, selectivo, otros, propina
        efectivo.toFixed(2), 
        chkTransf.toFixed(2), 
        tarjetaCr.toFixed(2), 
        credito.toFixed(2), 
        0, 0, 0 // Bonos, permuta, otros
      ])
    })

    // Crear workbook con formato mejorado
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(excelData)
    
    // Log de resumen para verificar cálculos Excel 607
    const facturasValidas = dgiiData.ventas.filter((invoice: any) => {
      const rncCliente = invoice.clients?.rnc || ""
      const ncf = invoice.ncf || ""
      return ncf && ncf.trim() !== "" && rncCliente && rncCliente.trim() !== ""
    })
    
    const excelTotalSubtotal = facturasValidas.reduce((sum: number, invoice: any) => {
      const montoTotal = parseFloat(invoice.total || 0)
      const montoItbis = parseFloat(invoice.tax_amount || 0)
      return sum + (montoTotal - montoItbis)
    }, 0)
    
    const excelTotalItbis = facturasValidas.reduce((sum: number, invoice: any) => {
      return sum + parseFloat(invoice.tax_amount || 0)
    }, 0)
    
    const excelTotalFacturacion = facturasValidas.reduce((sum: number, invoice: any) => {
      return sum + parseFloat(invoice.total || 0)
    }, 0)

    console.log('=== RESUMEN REPORTE 607 EXCEL ===')
    console.log(`Facturas válidas: ${facturasValidas.length}`)
    console.log(`Total Subtotal (sin ITBIS): RD$${excelTotalSubtotal.toFixed(2)}`)
    console.log(`Total ITBIS: RD$${excelTotalItbis.toFixed(2)}`)
    console.log(`Total Facturación completa: RD$${excelTotalFacturacion.toFixed(2)}`)
    console.log(`Verificación Excel: ${excelTotalSubtotal.toFixed(2)} + ${excelTotalItbis.toFixed(2)} = ${(excelTotalSubtotal + excelTotalItbis).toFixed(2)}`)
    
    XLSX.utils.book_append_sheet(wb, ws, "Reporte 607")
    
    // Descargar archivo con nombre según el mes
    const [year, month] = selectedMonth.split('-')
    XLSX.writeFile(wb, `607_${year}${month}_ventas.xlsx`)
  }

  const generatePaymentMethodsReport = async () => {
    try {
      // Obtener todas las facturas del usuario
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching invoices:', error)
        return
      }

      // Agrupar por método de pago
      const paymentMethodStats: Record<string, PaymentMethodStat> = {}
      
      // Inicializar con todos los métodos de pago DGII
      Object.entries(FORMAS_PAGO_DGII).forEach(([code, name]) => {
        paymentMethodStats[code] = {
          name,
          count: 0,
          total: 0,
          invoices: []
        }
      })

      // Mapear métodos de pago del sistema a códigos DGII
      const paymentMethodMapping = {
        'efectivo': '01',
        'cheque': '02', 
        'tarjeta': '03',
        'transferencia': '04',
        'credito': '05',
        'cash': '01',
        'card': '03',
        'transfer': '04',
        'credit': '05'
      }

      // Procesar facturas
      invoices?.forEach((invoice: Invoice) => {
        const paymentMethod = invoice.payment_method || 'credito'
        const dgiiCode = paymentMethodMapping[paymentMethod as keyof typeof paymentMethodMapping] || '05' // Default a crédito
        
        paymentMethodStats[dgiiCode].count++
        paymentMethodStats[dgiiCode].total += parseFloat(invoice.total.toString() || '0')
        paymentMethodStats[dgiiCode].invoices.push(invoice)
      })

      // Crear datos para Excel
      const excelData = []
      
      // Título
      excelData.push(['REPORTE DE MÉTODOS DE PAGO - DGII'])
      excelData.push([`Período: ${selectedMonth || 'Todos los registros'}`])
      excelData.push([`Generado: ${new Date().toLocaleDateString()}`])
      excelData.push([]) // Fila vacía

      // Encabezados
      excelData.push([
        'Código DGII',
        'Método de Pago', 
        'Cantidad Facturas',
        'Monto Total',
        'Porcentaje %'
      ])

      // Calcular total general
      const totalGeneral = Object.values(paymentMethodStats).reduce((sum: number, stat: PaymentMethodStat) => sum + stat.total, 0)

      // Datos por método de pago
      Object.entries(paymentMethodStats).forEach(([code, stats]: [string, PaymentMethodStat]) => {
        const percentage = totalGeneral > 0 ? ((stats.total / totalGeneral) * 100).toFixed(2) : '0'
        
        excelData.push([
          code,
          stats.name,
          stats.count,
          stats.total.toFixed(2),
          `${percentage}%`
        ])
      })

      // Fila de totales
      excelData.push([]) // Fila vacía
      excelData.push([
        'TOTAL',
        '',
        Object.values(paymentMethodStats).reduce((sum: number, stat: PaymentMethodStat) => sum + stat.count, 0),
        totalGeneral.toFixed(2),
        '100.00%'
      ])

      // Crear workbook
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(excelData)
      
      // Aplicar estilos básicos
      ws['!cols'] = [
        { width: 12 }, // Código
        { width: 30 }, // Método
        { width: 15 }, // Cantidad
        { width: 15 }, // Monto
        { width: 12 }  // Porcentaje
      ]

      XLSX.utils.book_append_sheet(wb, ws, 'Métodos de Pago')
      
      // Descargar archivo
      const [year, month] = (selectedMonth || '2025-01').split('-')
      XLSX.writeFile(wb, `metodos_pago_${year}${month}.xlsx`)

    } catch (error) {
      console.error('Error generating payment methods report:', error)
      alert('Error al generar el reporte de métodos de pago')
    }
  }

  const generateAnnualPaymentMethodsReport = async () => {
    if (!selectedYear) {
      alert('Por favor selecciona un año')
      return
    }

    try {
      // Obtener todas las facturas del año seleccionado
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      const startDate = `${selectedYear}-01-01`
      const endDate = `${selectedYear}-12-31`
      
      console.log(`Generando reporte anual de métodos de pago del ${startDate} al ${endDate}`)

      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate + ' 00:00:00')
        .lte('created_at', endDate + ' 23:59:59')

      if (error) {
        console.error('Error fetching annual invoices for payment methods:', error)
        return
      }

      if (!invoices || invoices.length === 0) {
        alert(`No se encontraron facturas para el año ${selectedYear}`)
        return
      }

      console.log(`Procesando ${invoices.length} facturas anuales para métodos de pago`)

      // Agrupar por método de pago
      const paymentMethodStats: Record<string, PaymentMethodStat & { monthlyTotals: number[] }> = {}
      
      // Inicializar con todos los métodos de pago DGII
      Object.entries(FORMAS_PAGO_DGII).forEach(([code, name]) => {
        paymentMethodStats[code] = {
          name,
          count: 0,
          total: 0,
          invoices: [],
          monthlyTotals: Array(12).fill(0) // Para desglose mensual
        }
      })

      // Mapear métodos de pago del sistema a códigos DGII
      const paymentMethodMapping = {
        'efectivo': '01',
        'cheque': '02', 
        'tarjeta': '03',
        'transferencia': '04',
        'credito': '05',
        'cash': '01',
        'card': '03',
        'transfer': '04',
        'credit': '05'
      }

      // Procesar facturas
      invoices?.forEach((invoice: Invoice) => {
        const paymentMethod = invoice.payment_method || 'credito'
        const dgiiCode = paymentMethodMapping[paymentMethod as keyof typeof paymentMethodMapping] || '05' // Default a crédito
        const total = parseFloat(invoice.total.toString() || '0')
        const mes = new Date(invoice.created_at).getMonth() // 0-11
        
        paymentMethodStats[dgiiCode].count++
        paymentMethodStats[dgiiCode].total += total
        paymentMethodStats[dgiiCode].invoices.push(invoice)
        paymentMethodStats[dgiiCode].monthlyTotals[mes] += total
      })

      // Crear datos para Excel
      const excelData = []
      
      // Título
      excelData.push([`REPORTE ANUAL DE MÉTODOS DE PAGO - ${selectedYear} - DGII`])
      excelData.push([`Período: Enero a Diciembre ${selectedYear}`])
      excelData.push([`Generado: ${new Date().toLocaleDateString()}`])
      excelData.push([]) // Fila vacía

      // Encabezados principales
      excelData.push([
        'Código DGII',
        'Método de Pago', 
        'Cantidad Facturas',
        'Monto Total Anual',
        'Porcentaje %',
        'Promedio por Factura'
      ])

      // Calcular total general
      const totalGeneral = Object.values(paymentMethodStats).reduce((sum: number, stat: any) => sum + stat.total, 0)
      const totalFacturas = Object.values(paymentMethodStats).reduce((sum: number, stat: any) => sum + stat.count, 0)

      // Datos por método de pago
      Object.entries(paymentMethodStats).forEach(([code, stats]: [string, any]) => {
        const percentage = totalGeneral > 0 ? ((stats.total / totalGeneral) * 100).toFixed(2) : 0
        const promedio = stats.count > 0 ? (stats.total / stats.count).toFixed(2) : 0
        
        excelData.push([
          code,
          stats.name,
          stats.count,
          stats.total.toFixed(2),
          `${percentage}%`,
          promedio
        ])
      })

      // Fila de totales
      excelData.push([]) // Fila vacía
      excelData.push([
        'TOTAL',
        '',
        totalFacturas,
        totalGeneral.toFixed(2),
        '100.00%',
        totalFacturas > 0 ? (totalGeneral / totalFacturas).toFixed(2) : 0
      ])

      // Agregar desglose mensual
      excelData.push([]) // Fila vacía
      excelData.push(['DESGLOSE MENSUAL POR MÉTODO DE PAGO'])
      excelData.push([]) // Fila vacía

      // Encabezados mensuales
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      excelData.push(['Método de Pago', ...meses, 'Total Anual'])

      // Datos mensuales por método
      Object.entries(paymentMethodStats).forEach(([, stats]) => {
        if (stats.count > 0) { // Solo mostrar métodos con actividad
          excelData.push([
            stats.name,
            ...stats.monthlyTotals.map((monto: number) => monto.toFixed(2)),
            stats.total.toFixed(2)
          ])
        }
      })

      // Crear workbook
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(excelData)
      
      // Aplicar estilos y anchos
      ws['!cols'] = [
        { width: 12 }, // Código
        { width: 35 }, // Método
        { width: 15 }, // Cantidad
        { width: 18 }, // Monto
        { width: 12 }, // Porcentaje
        { width: 15 }  // Promedio
      ]

      XLSX.utils.book_append_sheet(wb, ws, 'Métodos de Pago Anual')
      
      // Descargar archivo
      XLSX.writeFile(wb, `metodos_pago_anual_${selectedYear}.xlsx`)

      console.log(`Reporte anual de métodos de pago generado: ${totalFacturas} facturas, RD$${totalGeneral.toFixed(2)}`)

    } catch (error) {
      console.error('Error generating annual payment methods report:', error)
      alert('Error al generar el reporte anual de métodos de pago')
    }
  }

  const generateAnnualFiscalInvoicesReport = async () => {
    if (!selectedYear) {
      alert('Por favor selecciona un año')
      return
    }

    try {
      // Obtener todas las facturas fiscales del año seleccionado
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      const startDate = `${selectedYear}-01-01`
      const endDate = `${selectedYear}-12-31`
      
      console.log(`Generando reporte fiscal anual del ${startDate} al ${endDate}`)

      const { data: fiscalInvoices, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients (name, rnc, address, phone, email)
        `)
        .eq('user_id', user.id)
        .eq('include_itbis', true)
        .not('ncf', 'is', null)
        .neq('ncf', '')
        .gte('created_at', startDate + ' 00:00:00')
        .lte('created_at', endDate + ' 23:59:59')
        .order('invoice_date', { ascending: true })

      if (error) {
        console.error('Error fetching annual fiscal invoices:', error)
        return
      }

      if (!fiscalInvoices || fiscalInvoices.length === 0) {
        alert(`No se encontraron facturas fiscales para el año ${selectedYear}`)
        return
      }

      console.log(`Procesando ${fiscalInvoices.length} facturas fiscales anuales`)

      // Estructura EXACTA según imagen oficial DGII (códigos 1-9)
      const codigosOficiales = {
        '1': { descripcion: 'FACTURA CON VALOR FISCAL', ncfTypes: [] as string[] },
        '2': { descripcion: 'FACTURA CON VALOR FISCAL PARA CONSUMIDOR FINAL', ncfTypes: ['B01'] as string[] },
        '3': { descripcion: 'FACTURA GUBERNAMENTAL', ncfTypes: ['B14'] as string[] },
        '4': { descripcion: 'REGISTRO UNICO DE INGRESOS', ncfTypes: ['B12'] as string[] },
        '5': { descripcion: 'EMPRESAS CON REGÍMENES ESPECIALES', ncfTypes: ['B13', 'B15'] as string[] },
        '6': { descripcion: 'REGISTRO PROVEEDORES INFORMALES', ncfTypes: ['B11'] as string[] },
        '7': { descripcion: 'NOTA DE DEBITO', ncfTypes: ['B03'] as string[] },
        '8': { descripcion: 'NOTA DE CREDITO', ncfTypes: ['B04'] as string[] },
        '9': { descripcion: 'REGISTRO DE GASTOS MENORES', ncfTypes: [] as string[] }
      }

      // Inicializar todos los códigos oficiales con valores cero
      const gruposPorCodigo: any = {}
      Object.keys(codigosOficiales).forEach(codigo => {
        gruposPorCodigo[codigo] = {
          codigo: parseInt(codigo),
          descripcion: codigosOficiales[codigo as keyof typeof codigosOficiales].descripcion,
          count: 0,
          totalValue: 0,
          facturas: []
        }
      })
      
      // Procesar cada factura y asignarla al código correcto
      fiscalInvoices.forEach((invoice: any) => {
        const ncf = invoice.ncf || ''
        const total = parseFloat(invoice.total || 0)
        
        if (ncf && ncf.length >= 11) {
          const ncfType = ncf.substring(0, 3).toUpperCase()
          
          // Buscar a qué código oficial pertenece este tipo de NCF
          let codigoAsignado = null
          Object.keys(codigosOficiales).forEach(codigo => {
            const config = codigosOficiales[codigo as keyof typeof codigosOficiales]
            if (config.ncfTypes.includes(ncfType)) {
              codigoAsignado = codigo
            }
          })
          
          if (codigoAsignado) {
            gruposPorCodigo[codigoAsignado].count += 1
            gruposPorCodigo[codigoAsignado].totalValue += total
            gruposPorCodigo[codigoAsignado].facturas.push(invoice)
          }
        }
      })

      // Calcular totales generales
      const totalFacturas = Object.values(gruposPorCodigo).reduce((sum: number, grupo: any) => sum + grupo.count, 0)
      const totalValor = Object.values(gruposPorCodigo).reduce((sum: number, grupo: any) => sum + grupo.totalValue, 0)

      // Crear estructura Excel
      const excelData = []
      
      // Encabezado del reporte anual
      excelData.push([`Reporte Anual de Ventas por Tipo de NCF - ${selectedYear}`])
      excelData.push([`Desde: 01/01/${selectedYear} Hasta: 31/12/${selectedYear}`])
      excelData.push([])
      excelData.push(['Código', 'Descripción', 'Cantidad', 'Valor'])

      // Agregar todos los códigos oficiales (1-9)
      Object.keys(gruposPorCodigo)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach(codigo => {
          const grupo = gruposPorCodigo[codigo]
          excelData.push([
            grupo.codigo,
            grupo.descripcion,
            grupo.count,
            grupo.totalValue.toFixed(2)
          ])
        })

      // Agregar fila de totales
      excelData.push([
        '',
        'TOTAL',
        totalFacturas,
        totalValor.toFixed(2)
      ])

      // Crear workbook
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(excelData)
      
      // Configurar anchos de columna
      ws['!cols'] = [
        { width: 8 },   // Código
        { width: 50 },  // Descripción
        { width: 12 },  // Cantidad
        { width: 15 }   // Valor
      ]
      
      XLSX.utils.book_append_sheet(wb, ws, 'Facturas Fiscales Anual')
      XLSX.writeFile(wb, `Reporte_Ventas_NCF_Anual_${selectedYear}.xlsx`)

      console.log(`Reporte anual generado: ${totalFacturas} facturas, RD$${totalValor.toFixed(2)}`)

    } catch (error) {
      console.error('Error generating annual fiscal invoices report:', error)
      alert('Error al generar el reporte anual de facturas fiscales')
    }
  }

  const generateFiscalInvoicesReport = async () => {
    try {
      // Obtener todas las facturas fiscales (con NCF) del usuario
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      // Filtrar facturas por mes si está seleccionado
      let query = supabase
        .from('invoices')
        .select(`
          *,
          clients (name, rnc, address, phone, email)
        `)
        .eq('user_id', user.id)
        .eq('include_itbis', true)  // Solo facturas con ITBIS (fiscales)
        .not('ncf', 'is', null)     // Que tengan NCF
        .neq('ncf', '')             // NCF no vacío

      // Filtrar por mes si está seleccionado
      if (selectedMonth) {
        const [year, month] = selectedMonth.split('-')
        const startDate = `${year}-${month}-01`
        // Calcular el último día del mes correctamente
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
        const endDate = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`
        console.log(`Filtrando facturas del ${startDate} al ${endDate}`)
        query = query.gte('created_at', startDate + ' 00:00:00').lte('created_at', endDate + ' 23:59:59')
      }

      const { data: fiscalInvoices, error } = await query.order('invoice_date', { ascending: true })

      if (error) {
        console.error('Error fetching fiscal invoices:', error)
        return
      }

      if (!fiscalInvoices || fiscalInvoices.length === 0) {
        alert('No se encontraron facturas fiscales para el período seleccionado')
        return
      }

      console.log(`Procesando ${fiscalInvoices.length} facturas fiscales:`)
      
      // Mostrar TODOS los NCF únicos encontrados en bruto
      const todosLosNCF = fiscalInvoices.map((inv: any) => inv.ncf).filter((ncf: any) => ncf)
      const ncfUnicos = [...new Set(todosLosNCF)]
      console.log(`NCF únicos encontrados en la consulta (${ncfUnicos.length}):`, ncfUnicos)
      
      // Análisis rápido de tipos
      const tiposEncontrados = ncfUnicos.map((ncf: string) => ncf.substring(0, 3)).filter((tipo: string, index: number, arr: string[]) => arr.indexOf(tipo) === index)
      console.log(`Tipos de NCF únicos detectados:`, tiposEncontrados)
      
      fiscalInvoices.forEach((invoice: any, index) => {
        console.log(`Factura ${index + 1}: NCF=${invoice.ncf}, Total=${invoice.total}, Fecha=${invoice.created_at}`)
      })

      // Estructura EXACTA según imagen oficial DGII (códigos 1-9)
      const codigosOficiales = {
        '1': { descripcion: 'FACTURA CON VALOR FISCAL', ncfTypes: [] as string[] }, // Sin NCF específico
        '2': { descripcion: 'FACTURA CON VALOR FISCAL PARA CONSUMIDOR FINAL', ncfTypes: ['B01'] as string[] },
        '3': { descripcion: 'FACTURA GUBERNAMENTAL', ncfTypes: ['B14'] as string[] },
        '4': { descripcion: 'REGISTRO UNICO DE INGRESOS', ncfTypes: ['B12'] as string[] },
        '5': { descripcion: 'EMPRESAS CON REGÍMENES ESPECIALES', ncfTypes: ['B13', 'B15'] as string[] },
        '6': { descripcion: 'REGISTRO PROVEEDORES INFORMALES', ncfTypes: ['B11'] as string[] },
        '7': { descripcion: 'NOTA DE DEBITO', ncfTypes: ['B03'] as string[] },
        '8': { descripcion: 'NOTA DE CREDITO', ncfTypes: ['B04'] as string[] },
        '9': { descripcion: 'REGISTRO DE GASTOS MENORES', ncfTypes: [] as string[] } // Sin NCF específico
      }

      console.log('=== ANÁLISIS DETALLADO DE NCF SEGÚN CÓDIGOS OFICIALES ===')
      console.log(`Total de facturas encontradas: ${fiscalInvoices.length}`)
      
      // Inicializar todos los códigos oficiales con valores cero
      const gruposPorCodigo: any = {}
      Object.keys(codigosOficiales).forEach(codigo => {
        gruposPorCodigo[codigo] = {
          codigo: parseInt(codigo),
          descripcion: codigosOficiales[codigo as keyof typeof codigosOficiales].descripcion,
          count: 0,
          totalValue: 0,
          facturas: []
        }
      })
      
      // Procesar cada factura y asignarla al código correcto
      fiscalInvoices.forEach((invoice: any, invoiceIndex) => {
        const ncf = invoice.ncf || ''
        const total = parseFloat(invoice.total || 0)
        
        console.log(`Procesando factura ${invoiceIndex + 1}: NCF="${ncf}", Total=${total}`)
        
        if (ncf && ncf.length >= 11) {
          const ncfType = ncf.substring(0, 3).toUpperCase() // B01, B02, etc.
          console.log(`Tipo NCF detectado: ${ncfType}`)
          
          // Buscar a qué código oficial pertenece este tipo de NCF
          let codigoAsignado = null
          Object.keys(codigosOficiales).forEach(codigo => {
            const config = codigosOficiales[codigo as keyof typeof codigosOficiales]
            if (config.ncfTypes.includes(ncfType)) {
              codigoAsignado = codigo
            }
          })
          
          if (codigoAsignado) {
            gruposPorCodigo[codigoAsignado].count += 1
            gruposPorCodigo[codigoAsignado].totalValue += total
            gruposPorCodigo[codigoAsignado].facturas.push(invoice)
            console.log(`✓ Asignado al código ${codigoAsignado}: ${gruposPorCodigo[codigoAsignado].descripcion}`)
          } else {
            console.log(`⚠️  NCF tipo ${ncfType} no mapeado a ningún código oficial`)
          }
        } else {
          console.log(`❌ NCF inválido: "${ncf}"`)
        }
      })

      console.log('=== RESUMEN POR CÓDIGO OFICIAL ===')
      Object.keys(gruposPorCodigo).forEach(codigo => {
        const grupo = gruposPorCodigo[codigo]
        console.log(`Código ${codigo}: ${grupo.descripcion}`)
        console.log(`  Facturas: ${grupo.count}, Total: RD$${grupo.totalValue.toFixed(2)}`)
      })
      
      // Calcular totales generales
      const totalFacturas = Object.values(gruposPorCodigo).reduce((sum: number, grupo: any) => sum + grupo.count, 0)
      const totalValor = Object.values(gruposPorCodigo).reduce((sum: number, grupo: any) => sum + grupo.totalValue, 0)
      console.log(`=== TOTALES GENERALES ===`)
      console.log(`Total facturas: ${totalFacturas}, Total valor: RD$${totalValor.toFixed(2)}`)

      // Crear estructura EXACTAMENTE como el documento DGII
      const excelData = []
      
      // Encabezado del reporte
      const [year, month] = (selectedMonth || new Date().toISOString().slice(0, 7)).split('-')
      
      // Fila 1: Título EXACTO como la imagen
      excelData.push(['Reporte de Ventas por Tipo de NCF'])
      
      // Fila 2: Fecha desde - hasta con último día correcto del mes
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
      excelData.push([`Desde: 01/${month}/${year} Hasta: ${lastDay.toString().padStart(2, '0')}/${month}/${year}`])
      
      // Fila 3: Vacía
      excelData.push([])
      
      // Fila 4: Encabezados EXACTOS según imagen oficial DGII
      excelData.push(['Código', 'Descripción', 'Cantidad', 'Valor'])

      // Procesar TODOS los códigos oficiales (1-9) según estructura DGII
      Object.keys(gruposPorCodigo)
        .sort((a, b) => parseInt(a) - parseInt(b)) // Ordenar por código numérico
        .forEach(codigo => {
          const grupo = gruposPorCodigo[codigo]
          
          // Una fila por cada código oficial DGII
          const rowData = [
            grupo.codigo,                               // Código oficial (1, 2, 3... 9)
            grupo.descripcion,                          // Descripción oficial
            grupo.count,                                // CANTIDAD de facturas
            grupo.totalValue.toFixed(2)                 // VALOR TOTAL
          ]
          
          console.log(`Agregando fila código ${codigo}:`, rowData)
          excelData.push(rowData)
        })

      // Agregar fila de TOTALES al final
      excelData.push([
        '', // Columna vacía para código
        'TOTAL', // Descripción = TOTAL
        totalFacturas, // Total cantidad de facturas
        totalValor.toFixed(2) // Total valor
      ])

      console.log('Datos completos para Excel:', excelData)

      // Crear workbook exactamente como la imagen
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(excelData)
      
      // Configurar anchos de columna para estructura oficial DGII
      ws['!cols'] = [
        { width: 8 },   // Código
        { width: 50 },  // Descripción (más ancho para texto completo)
        { width: 12 },  // Cantidad
        { width: 15 }   // Valor
      ]
      
      // Agregar hoja con nombre específico
      XLSX.utils.book_append_sheet(wb, ws, 'Facturas Fiscales')
      
      // Descargar con formato oficial DGII
      const monthForFile = selectedMonth ? selectedMonth.replace('-', '') : new Date().toISOString().slice(0, 7).replace('-', '')
      XLSX.writeFile(wb, `Reporte_Ventas_NCF_${monthForFile}.xlsx`)

    } catch (error) {
      console.error('Error generating fiscal invoices report:', error)
      alert('Error al generar el reporte de facturas fiscales')
    }
  }



  const generateReport606 = () => {
    if (!dgiiData?.compras.length) {
      alert("No hay datos de compras para el período seleccionado")
      return
    }

    // Encabezado según formato oficial DGII 606 (basado en el reporte real)
    let txtContent = "Rnc|Tipo|Nombre_prc|Tipo_bienes|Ncf|Ncf_modificado|Añomes|Dia|Monto_serv|Monto_bien|Total_monto|Itbis_fac|Itbis_ret|Itbis_prop|Itbis_costo|Itbis_adel|Itbis_compr|Tipo_isr|Isr_ret|Isr_compras|Selectivo|Otros_imp|Propina\n"
    
    dgiiData.compras.forEach((expense) => {
      // RNC del proveedor - usar TODOS los campos disponibles (igual que Excel)
      const rncProveedor = expense.clients?.rnc || 
                          expense.provider_rnc || 
                          expense.clients?.id_number || 
                          ""
      if (rncProveedor && !validarRNC(rncProveedor)) {
        console.warn(`RNC inválido para ${expense.description}: ${rncProveedor}`)
      }
      
      const tipo = expense.clients?.tipo_id || "1" // Usar tipo de la BD o default 1
      
      // Nombre del proveedor - usar TODOS los campos disponibles (igual que Excel)
      const nombreProveedor = expense.clients?.name || 
                              expense.provider_name || 
                              expense.description || 
                              "SIN NOMBRE"
      
      // Tipo de bienes - determinar automáticamente según descripción  
      const tipoBienes = determinarTipoGasto(expense.description || "")
      
      // NCF del comprobante
      const ncf = expense.ncf || ""
      if (ncf && !validarNCF(ncf)) {
        console.warn(`NCF inválido: ${ncf}`)
      }
      
      const ncfModificado = "" // NCF modificado si aplica
      
      // Fechas en formato específico
      const fechaExpense = new Date(expense.expense_date)
      const añomes = `${fechaExpense.getFullYear()}${String(fechaExpense.getMonth() + 1).padStart(2, '0')}`
      const dia = fechaExpense.getDate()
      
      // Montos según especificación DGII
      const montoTotal = parseFloat(expense.amount.toString()) || 0
      const montoServicios = montoTotal.toFixed(2) // La mayoría son servicios
      const montoBienes = "0.00" // Bienes físicos
      const totalMonto = montoTotal.toFixed(2)
      
      // ITBIS según reporte oficial - usar campo específico si existe
      const itbisFac = expense.itbis_amount ? 
        parseFloat(expense.itbis_amount.toString()).toFixed(2) : 
        (montoTotal * 0.18).toFixed(2)
      const itbisRet = "0"
      const itbisProp = "0"
      const itbisCosto = "0"
      const itbisAdel = "0"
      const itbisCompr = itbisFac // ITBIS de compras
      
      // ISR según reporte oficial
      const tipoIsr = ""
      const isrRet = "0"
      const isrCompras = "0"
      
      // Otros impuestos
      const selectivo = "0"
      const otrosImp = "0"
      const propina = "0"

      const line = [
        rncProveedor,
        tipo,
        nombreProveedor,
        tipoBienes,
        ncf,
        ncfModificado,
        añomes,
        dia,
        montoServicios,
        montoBienes,
        totalMonto,
        itbisFac,
        itbisRet,
        itbisProp,
        itbisCosto,
        itbisAdel,
        itbisCompr,
        tipoIsr,
        isrRet,
        isrCompras,
        selectivo,
        otrosImp,
        propina
      ].join("|")
      
      txtContent += line + "\n"
    })

    // Descargar archivo TXT
    const blob = new Blob([txtContent], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `606_${selectedMonth.replace("-", "")}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const generateReport607 = () => {
    if (!dgiiData?.ventas.length) {
      alert("No hay datos de ventas para el período seleccionado")
      return
    }

    // Encabezado según formato oficial DGII 607 (basado en el reporte real)
    let txtContent = "Rnc|Id|Ncf|Ncf_modifico|Tipo_ingresos|Fecha|Fecha_ret|Total|Itbis|Itbis_ret|Itbis_perc|Retenc_isr|Isr_perc|Selectivo|Otros_imp|Propina|Efectivo|Chk_transf|Tarjeta_cr|Credito|Bonos_gif|Permuta|Otros_pagos\n"
    
    dgiiData.ventas
      .filter((invoice: any) => {
        const rncCliente = invoice.clients?.rnc || ""
        const ncf = invoice.ncf || ""
        
        // Excluir registros sin NCF o sin RNC (requeridos por DGII)
        if (!ncf || ncf.trim() === "") {
          console.log(`Excluido TXT por falta de NCF: Factura ${invoice.invoice_number}`)
          return false
        }
        
        if (!rncCliente || rncCliente.trim() === "") {
          console.log(`Excluido TXT por falta de RNC: Factura ${invoice.invoice_number}`)
          return false
        }
        
        return true
      })
      .forEach((invoice: any, index: number) => {
      // RNC del cliente (vacío para consumidor final)
      const rncCliente = invoice.clients?.rnc || ""
      if (rncCliente && !validarRNC(rncCliente)) {
        console.warn(`RNC inválido para factura ${invoice.invoice_number}: ${rncCliente}`)
      }
      
      // ID interno de la factura
      const id = invoice.id || index + 1
      
      // NCF del comprobante
      const ncf = invoice.ncf || ""
      if (ncf && !validarNCF(ncf)) {
        console.warn(`NCF inválido: ${ncf}`)
      }
      
      const ncfModifico = "" // NCF modificado si aplica
      
      // Tipo de ingresos (01 = normal)
      const tipoIngresos = "01"
      
      // Fechas en formato específico  
      const fechaFactura = new Date(invoice.created_at)
      const fecha = `${fechaFactura.getFullYear()}${String(fechaFactura.getMonth() + 1).padStart(2, '0')}${String(fechaFactura.getDate()).padStart(2, '0')}`
      const fechaRet = "" // Fecha de retención si aplica
      
      // Montos según especificación DGII - usar campos específicos si existen
      const montoTotal = parseFloat(invoice.total || 0)
      const montoItbis = parseFloat(invoice.tax_amount || 0)
      
      // CORREGIDO: El total YA incluye el ITBIS, calcular subtotal
      const subtotal = montoTotal - montoItbis  // Total sin ITBIS
      
      const total = subtotal.toFixed(2)  // CORREGIDO: Total sin ITBIS para DGII 607
      const itbis = montoItbis.toFixed(2)
      const itbisRet = "0"
      const itbisPerc = "0"
      const retencIsr = "0"
      const isrPerc = "0"
      const selectivo = "0"
      const otrosImp = "0"
      const propina = "0"
      
      console.log(`Factura 607 TXT ${invoice.invoice_number}: MontoCompleto=${montoTotal}, Subtotal=${subtotal}, ITBIS=${montoItbis}`)
      
      // Formas de pago desglosadas según método de pago
      const paymentMethod = invoice.payment_method || "credito"
      
      let efectivo = "0"
      let chkTransf = "0"
      let tarjetaCr = "0"
      let credito = "0"
      const bonosGif = "0"
      const permuta = "0"
      const otrosPagos = "0"
      
      // CORREGIDO: Usar el total completo (que YA incluye ITBIS) para las formas de pago
      switch (paymentMethod.toLowerCase()) {
        case "efectivo":
          efectivo = montoTotal.toFixed(2)
          break
        case "transferencia":
        case "cheque":
          chkTransf = montoTotal.toFixed(2)
          break
        case "tarjeta":
        case "tarjeta_credito":
        case "tarjeta_debito":
          tarjetaCr = montoTotal.toFixed(2)
          break
        default: // credito u otros
          credito = montoTotal.toFixed(2)
      }

      const line = [
        rncCliente,
        id,
        ncf,
        ncfModifico,
        tipoIngresos,
        fecha,
        fechaRet,
        total,
        itbis,
        itbisRet,
        itbisPerc,
        retencIsr,
        isrPerc,
        selectivo,
        otrosImp,
        propina,
        efectivo,
        chkTransf,
        tarjetaCr,
        credito,
        bonosGif,
        permuta,
        otrosPagos
      ].join("|")
      
      txtContent += line + "\n"
    })

    // Log de resumen para verificar cálculos
    const facturasProcesadas = dgiiData.ventas.filter((invoice: any) => {
      const rncCliente = invoice.clients?.rnc || ""
      const ncf = invoice.ncf || ""
      return ncf && ncf.trim() !== "" && rncCliente && rncCliente.trim() !== ""
    })
    
    const totalSubtotal = facturasProcesadas.reduce((sum: number, invoice: any) => {
      const montoTotal = parseFloat(invoice.total || 0)
      const montoItbis = parseFloat(invoice.tax_amount || 0)
      return sum + (montoTotal - montoItbis)
    }, 0)
    
    const totalItbis = facturasProcesadas.reduce((sum: number, invoice: any) => {
      return sum + parseFloat(invoice.tax_amount || 0)
    }, 0)
    
    const totalFacturacion = facturasProcesadas.reduce((sum: number, invoice: any) => {
      return sum + parseFloat(invoice.total || 0)
    }, 0)

    console.log('=== RESUMEN REPORTE 607 TXT ===')
    console.log(`Facturas procesadas: ${facturasProcesadas.length}`)
    console.log(`Total Subtotal (sin ITBIS): RD$${totalSubtotal.toFixed(2)}`)
    console.log(`Total ITBIS: RD$${totalItbis.toFixed(2)}`)
    console.log(`Total Facturación completa: RD$${totalFacturacion.toFixed(2)}`)
    console.log(`Verificación: ${totalSubtotal.toFixed(2)} + ${totalItbis.toFixed(2)} = ${(totalSubtotal + totalItbis).toFixed(2)} (debe ser igual a ${totalFacturacion.toFixed(2)})`)

    // Descargar archivo TXT
    const blob = new Blob([txtContent], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `607_${selectedMonth.replace("-", "")}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Función para descargar reporte anual
  const downloadAnnualReport = (type: '606' | '607' | 'consolidado' | 'fiscal-ncf' | 'payment-methods') => {
    if (!dgiiData) {
      alert("No hay datos disponibles para el año seleccionado")
      return
    }

    // Dispatch to existing functions for specific reports
    if (type === 'fiscal-ncf') {
      generateAnnualFiscalInvoicesReport()
    } else if (type === 'payment-methods') {
      generateAnnualPaymentMethodsReport()
    } else {
      alert(`Función de reporte anual ${type} estará disponible próximamente`)
    }
  }

  // Función para guardar gasto manual en la base de datos
  const saveManualExpense = async () => {
    setSavingExpense(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert("Error: Usuario no autenticado")
        return
      }

      // Validaciones básicas
      if (!manualExpense.description || !manualExpense.amount) {
        alert("Error: Descripción y monto son campos requeridos")
        return
      }

      const amount = parseFloat(manualExpense.amount)
      if (amount <= 0) {
        alert("Error: El monto debe ser mayor a 0")
        return
      }

      // Crear el gasto usando la estructura correcta del sistema
      const expenseData = {
        user_id: user.id,
        description: manualExpense.description,
        amount: amount,
        expense_date: manualExpense.expense_date,
        ncf: manualExpense.ncf || null,
        provider_name: manualExpense.provider_name || null,
        provider_rnc: manualExpense.provider_rnc || null,
        itbis_amount: manualExpense.itbis_amount ? parseFloat(manualExpense.itbis_amount) : null
      }

      const { error } = await supabase
        .from('expenses')
        .insert(expenseData as any)

      if (error) {
        console.error('Error al guardar gasto:', error)
        alert(`Error al guardar el gasto: ${error.message}`)
        return
      }

      alert("✅ Gasto guardado exitosamente")
      
      // Limpiar formulario
      setManualExpense({
        description: '',
        amount: '',
        provider_name: '',
        provider_rnc: '',
        ncf: '',
        expense_date: new Date().toISOString().split('T')[0],
        itbis_amount: ''
      })

      // Refrescar datos DGII
      await fetchDGIIData()

    } catch (error) {
      console.error('Error:', error)
      alert("Error inesperado al guardar el gasto")
    } finally {
      setSavingExpense(false)
    }
  }

  // Función para guardar factura manual en la base de datos
  const saveManualInvoice = async () => {
    setSavingInvoice(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert("Error: Usuario no autenticado")
        return
      }

      // Validaciones básicas
      if (!manualInvoice.client_name || !manualInvoice.client_rnc || !manualInvoice.ncf || !manualInvoice.total) {
        alert("Error: Nombre del cliente, RNC, NCF y total son campos requeridos")
        return
      }

      const total = parseFloat(manualInvoice.total)
      if (total <= 0) {
        alert("Error: El total debe ser mayor a 0")
        return
      }

      // Validar RNC
      const cleanRnc = manualInvoice.client_rnc.replace(/\D/g, '')
      if (cleanRnc.length !== 9 && cleanRnc.length !== 11) {
        alert("Error: RNC debe tener 9 u 11 dígitos")
        return
      }

      // Validar NCF
      if (manualInvoice.ncf.length !== 11 || !manualInvoice.ncf.match(/^[BE]\d{10}$/)) {
        alert("Error: NCF debe tener 11 caracteres y empezar con B o E")
        return
      }

      // Calcular ITBIS si no se especificó
      const taxAmount = manualInvoice.tax_amount ? 
        parseFloat(manualInvoice.tax_amount) : 
        total * 0.18

      const subtotal = total - taxAmount

      // Generar número de factura único
      const invoiceNumber = `INV-${Date.now()}`

      // Primero crear/obtener el cliente
      let clientId = null
      
      // Buscar si el cliente ya existe
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('rnc', cleanRnc)
        .eq('user_id', user.id)
        .single()

      if (existingClient) {
        clientId = (existingClient as any)?.id
      } else {
        // Crear nuevo cliente usando la estructura correcta
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            user_id: user.id,
            name: manualInvoice.client_name,
            rnc: cleanRnc,
            email: '',
            phone: '',
            address: ''
          } as any)
          .select('id')
          .single()

        if (clientError) {
          console.error('Error al crear cliente:', clientError)
          alert(`Error al crear cliente: ${clientError.message}`)
          return
        }
        
        clientId = (newClient as any)?.id
      }

      // Crear la factura usando la estructura correcta del sistema
      const invoiceData = {
        user_id: user.id,
        client_id: clientId,
        invoice_number: invoiceNumber,
        invoice_date: manualInvoice.created_at,
        issue_date: manualInvoice.created_at,
        due_date: manualInvoice.created_at,
        subtotal: subtotal,
        tax_rate: taxAmount > 0 ? 18 : 0,
        tax_amount: taxAmount,
        total: total,
        status: 'paid',
        include_itbis: taxAmount > 0,
        ncf: manualInvoice.ncf,
        payment_method: manualInvoice.payment_method,
        notes: 'Factura creada desde DGII Reports'
      }

      // @ts-ignore - Supabase type issue
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoiceData as any)
        .select('id')
        .single()

      if (invoiceError) {
        console.error('Error al guardar factura:', invoiceError)
        alert(`Error al guardar la factura: ${invoiceError.message}`)
        return
      }

      // Crear un item de factura genérico
      // @ts-ignore - Supabase type issue
      const { error: itemError } = await supabase
        .from('invoice_items')
        .insert({
          invoice_id: (invoice as any)?.id,
          description: 'Servicio/Producto Manual',
          quantity: 1,
          unit_price: subtotal,
          total: subtotal,
          unit: 'unidad',
          itbis_rate: taxAmount > 0 ? 18 : 0,
          itbis_amount: taxAmount
        } as any)

      if (itemError) {
        console.error('Error al crear item de factura:', itemError)
        // Eliminar la factura si no se pueden crear los items
        await supabase.from('invoices').delete().eq('id', (invoice as any)?.id)
        alert(`Error al crear los items de la factura: ${itemError.message}`)
        return
      }

      alert("✅ Factura guardada exitosamente")
      
      // Limpiar formulario
      setManualInvoice({
        client_name: '',
        client_rnc: '',
        ncf: '',
        total: '',
        tax_amount: '',
        payment_method: 'credito',
        created_at: new Date().toISOString().split('T')[0]
      })

      // Refrescar datos DGII
      await fetchDGIIData()

    } catch (error) {
      console.error('Error:', error)
      alert("Error inesperado al guardar la factura")
    } finally {
      setSavingInvoice(false)
    }
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 lg:space-y-8 max-w-7xl px-3 sm:px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Reportes DGII
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Genera reportes 606 (Compras) y 607 (Ventas) para cumplimiento fiscal
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap">Período:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border rounded-md px-2 py-1 text-sm w-full sm:w-auto"
            />
          </div>
          <Button onClick={fetchDGIIData} disabled={loading} className="w-full sm:w-auto">
            {loading ? "Cargando..." : "Actualizar"}
          </Button>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-green-700">Total Compras</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-900 truncate">
                  {formatCurrency(dgiiData?.totalCompras || 0)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {dgiiData?.compras.length || 0} registros
                </p>
              </div>
              <Receipt className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-green-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-blue-700">Total Ventas</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900 truncate">
                  {formatCurrency(dgiiData?.totalVentas || 0)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {dgiiData?.ventas.length || 0} facturas
                </p>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-blue-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-orange-700">ITBIS Compras</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-900 truncate">
                  {formatCurrency(dgiiData?.itbisCompras || 0)}
                </p>
                <p className="text-xs text-orange-600 mt-1">18% estimado</p>
              </div>
              <FileText className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-orange-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-purple-700">ITBIS Ventas</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-900 truncate">
                  {formatCurrency(dgiiData?.itbisVentas || 0)}
                </p>
                <p className="text-xs text-purple-600 mt-1">Facturado</p>
              </div>
              <Users className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-purple-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advertencia importante */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs sm:text-sm text-yellow-800">
              <p className="font-medium">Importante:</p>
              <p>Los reportes generados son una aproximación basada en los datos del sistema. Verifica que todas las facturas tengan NCF válidos y que los proveedores tengan RNC/Cédula correctos antes de enviar a DGII.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pestañas de reportes */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full overflow-x-auto flex lg:grid lg:grid-cols-9 bg-slate-100 p-1">
          <TabsTrigger value="overview" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Resumen</TabsTrigger>
          <TabsTrigger value="606" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Reporte 606</TabsTrigger>
          <TabsTrigger value="607" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Reporte 607</TabsTrigger>
          <TabsTrigger value="payment-methods" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Métodos Pago</TabsTrigger>
          <TabsTrigger value="fiscal-invoices" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Facturas Fiscales</TabsTrigger>
          <TabsTrigger value="annual" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Resumen Anual</TabsTrigger>
          <TabsTrigger value="manual-606" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">➕ Gasto 606</TabsTrigger>
          <TabsTrigger value="manual-607" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">➕ Factura 607</TabsTrigger>
          <TabsTrigger value="info" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Info</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Resumen de Compras (606)
                </CardTitle>
                <CardDescription>
                  Período: {formatMonthYear(selectedMonth)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total de registros:</span>
                  <Badge variant="secondary">{dgiiData?.compras.length || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Monto total:</span>
                  <span className="font-semibold">{formatCurrency(dgiiData?.totalCompras || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>ITBIS estimado:</span>
                  <span className="font-semibold">{formatCurrency(dgiiData?.itbisCompras || 0)}</span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={generateReport606} 
                    className="flex-1"
                    disabled={!dgiiData?.compras.length}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    TXT
                  </Button>
                  <Button 
                    onClick={generateExcel606} 
                    variant="outline"
                    className="flex-1"
                    disabled={!dgiiData?.compras.length}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Resumen de Ventas (607)
                </CardTitle>
                <CardDescription>
                  Período: {formatMonthYear(selectedMonth)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total de facturas:</span>
                  <Badge variant="secondary">{dgiiData?.ventas.length || 0}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Monto total:</span>
                  <span className="font-semibold">{formatCurrency(dgiiData?.totalVentas || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>ITBIS facturado:</span>
                  <span className="font-semibold">{formatCurrency(dgiiData?.itbisVentas || 0)}</span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={generateReport607} 
                    className="flex-1"
                    disabled={!dgiiData?.ventas.length}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    TXT
                  </Button>
                  <Button 
                    onClick={generateExcel607} 
                    variant="outline"
                    className="flex-1"
                    disabled={!dgiiData?.ventas.length}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reportes IR-2 Simplificados */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📊 Reportes IR-2 para DGII
              </CardTitle>
              <CardDescription>
                Generar archivos Excel 607 (Compras) y 608 (Ventas) según formato oficial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={() => {
                    const mes = new Date().getMonth() + 1
                    const anio = new Date().getFullYear()
                    generarExcel607Compras(mes, anio)
                  }}
                  className="flex-1"
                  size="lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Excel 607 (Compras)
                </Button>
                <Button 
                  onClick={() => {
                    const mes = new Date().getMonth() + 1
                    const anio = new Date().getFullYear()
                    generarExcel608Ventas(mes, anio)
                  }}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Excel 608 (Ventas)
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Los archivos se generarán con los datos del mes actual y se descargarán automáticamente.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="606" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Compras - Formato 606</CardTitle>
              <CardDescription>
                Listado de gastos y compras del período seleccionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dgiiData?.compras.length ? (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    Total de registros: {dgiiData.compras.length}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <div className="space-y-2">
                      {dgiiData.compras.map((expense, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">
                              {expense.description || "Gasto sin descripción"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDateToDayMonthYear(expense.expense_date)} • 
                              NCF: {expense.ncf || "Sin NCF"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(expense.amount)}</p>
                            <p className="text-xs text-gray-500">
                              ITBIS: {formatCurrency(expense.amount * 0.18)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={generateReport606} className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      TXT
                    </Button>
                    <Button onClick={generateExcel606} variant="outline" className="flex-1">
                      <FileText className="h-4 w-4 mr-2" />
                      Excel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No hay registros de compras para el período seleccionado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="607" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Ventas - Formato 607</CardTitle>
              <CardDescription>
                Listado de facturas y ventas del período seleccionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dgiiData?.ventas.length ? (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    Total de facturas: {dgiiData.ventas.length}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <div className="space-y-2">
                      {dgiiData.ventas.map((invoice, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">
                              Factura #{invoice.invoice_number} - {invoice.clients?.name || "Cliente sin nombre"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDateToDayMonthYear(invoice.created_at)} • 
                              NCF: {invoice.ncf || "Sin NCF"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(invoice.total)}</p>
                            <p className="text-xs text-gray-500">
                              ITBIS: {formatCurrency(invoice.tax_amount || 0)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={generateReport607} className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      TXT
                    </Button>
                    <Button onClick={generateExcel607} variant="outline" className="flex-1">
                      <FileText className="h-4 w-4 mr-2" />
                      Excel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No hay facturas para el período seleccionado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="annual" className="space-y-6">
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold">Resumen Anual DGII</h2>
                <p className="text-muted-foreground">Consolidado de Reportes 606 y 607 por año fiscal</p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="year-select">Año:</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - i
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resumen Anual 606 - Compras */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Resumen Anual de Compras (606)
                </CardTitle>
                <CardDescription>
                  Consolidado del año {selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-4">Cargando datos anuales...</div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="text-sm text-blue-600 font-medium">Total Compras</div>
                          <div className="text-lg font-bold text-blue-900">
                            {(dgiiData?.compras || []).reduce((sum, expense) => {
                              const expenseYear = new Date(expense.created_at || expense.fecha || expense.date).getFullYear().toString()
                              return expenseYear === selectedYear ? sum + (expense.amount || expense.monto || 0) : sum
                            }, 0).toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}
                          </div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="text-sm text-green-600 font-medium">ITBIS Pagado</div>
                          <div className="text-lg font-bold text-green-900">
                            {(dgiiData?.compras || []).reduce((sum, expense) => {
                              const expenseYear = new Date(expense.created_at || expense.fecha || expense.date).getFullYear().toString()
                              return expenseYear === selectedYear ? sum + (expense.tax_amount || expense.itbis || 0) : sum
                            }, 0).toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">Por Tipo de Gasto</h4>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {Object.entries(
                            (dgiiData?.compras || [])
                              .filter(expense => new Date(expense.created_at || expense.fecha || expense.date).getFullYear().toString() === selectedYear)
                              .reduce((acc, expense) => {
                                const tipo = expense.tipo_gasto || determinarTipoGasto(expense.description || expense.descripcion || '')
                                if (!acc[tipo]) {
                                  acc[tipo] = 0
                                }
                                acc[tipo] += expense.amount || expense.monto || 0
                                return acc
                              }, {} as Record<string, number>)
                          ).map(([tipo, monto]) => (
                            <div key={tipo} className="flex justify-between text-sm">
                              <span>{TIPOS_GASTO_DGII[tipo as keyof typeof TIPOS_GASTO_DGII] || tipo}</span>
                              <span className="font-medium">{monto.toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Resumen Anual 607 - Ventas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Resumen Anual de Ventas (607)
                </CardTitle>
                <CardDescription>
                  Consolidado del año {selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-4">Cargando datos anuales...</div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <div className="text-sm text-purple-600 font-medium">Total Ventas</div>
                          <div className="text-lg font-bold text-purple-900">
                            {(dgiiData?.ventas || []).reduce((sum, invoice) => {
                              const invoiceYear = new Date(invoice.created_at || invoice.fecha || invoice.date).getFullYear().toString()
                              return invoiceYear === selectedYear ? sum + (invoice.total || invoice.monto || 0) : sum
                            }, 0).toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}
                          </div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <div className="text-sm text-orange-600 font-medium">ITBIS Cobrado</div>
                          <div className="text-lg font-bold text-orange-900">
                            {(dgiiData?.ventas || []).reduce((sum, invoice) => {
                              const invoiceYear = new Date(invoice.created_at || invoice.fecha || invoice.date).getFullYear().toString()
                              return invoiceYear === selectedYear ? sum + (invoice.tax_amount || invoice.itbis || 0) : sum
                            }, 0).toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium">Por Tipo de Comprobante</h4>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {Object.entries(
                            (dgiiData?.ventas || [])
                              .filter(invoice => new Date(invoice.created_at || invoice.fecha || invoice.date).getFullYear().toString() === selectedYear)
                              .reduce((acc, invoice) => {
                                const tipo = invoice.tipo_comprobante || 'B02'
                                if (!acc[tipo]) {
                                  acc[tipo] = 0
                                }
                                acc[tipo] += invoice.total || invoice.monto || 0
                                return acc
                              }, {} as Record<string, number>)
                          ).map(([tipo, monto]) => (
                            <div key={tipo} className="flex justify-between text-sm">
                              <span>{TIPOS_COMPROBANTE_FISCAL[tipo as keyof typeof TIPOS_COMPROBANTE_FISCAL] || tipo}</span>
                              <span className="font-medium">{monto.toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resumen Consolidado */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Resumen Consolidado Anual
              </CardTitle>
              <CardDescription>
                Balance general del año fiscal {selectedYear}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg text-center">
                  <div className="text-sm text-slate-600 font-medium">Ingresos Brutos</div>
                  <div className="text-xl font-bold text-slate-900">
                    {(dgiiData?.ventas || [])
                      .filter(invoice => new Date(invoice.created_at || invoice.fecha || invoice.date).getFullYear().toString() === selectedYear)
                      .reduce((sum, invoice) => sum + (invoice.total || invoice.monto || 0), 0)
                      .toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg text-center">
                  <div className="text-sm text-slate-600 font-medium">Gastos Deducibles</div>
                  <div className="text-xl font-bold text-slate-900">
                    {(dgiiData?.compras || [])
                      .filter(expense => new Date(expense.created_at || expense.fecha || expense.date).getFullYear().toString() === selectedYear)
                      .reduce((sum, expense) => sum + (expense.amount || expense.monto || 0), 0)
                      .toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-sm text-green-600 font-medium">Balance ITBIS</div>
                  <div className="text-xl font-bold text-green-900">
                    {((dgiiData?.ventas || [])
                      .filter(invoice => new Date(invoice.created_at || invoice.fecha || invoice.date).getFullYear().toString() === selectedYear)
                      .reduce((sum, invoice) => sum + (invoice.tax_amount || invoice.itbis || 0), 0) -
                    (dgiiData?.compras || [])
                      .filter(expense => new Date(expense.created_at || expense.fecha || expense.date).getFullYear().toString() === selectedYear)
                      .reduce((sum, expense) => sum + (expense.tax_amount || expense.itbis || 0), 0))
                      .toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-sm text-blue-600 font-medium">Utilidad Bruta</div>
                  <div className="text-xl font-bold text-blue-900">
                    {((dgiiData?.ventas || [])
                      .filter(invoice => new Date(invoice.created_at || invoice.fecha || invoice.date).getFullYear().toString() === selectedYear)
                      .reduce((sum, invoice) => sum + (invoice.total || invoice.monto || 0), 0) -
                    (dgiiData?.compras || [])
                      .filter(expense => new Date(expense.created_at || expense.fecha || expense.date).getFullYear().toString() === selectedYear)
                      .reduce((sum, expense) => sum + (expense.amount || expense.monto || 0), 0))
                      .toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Button 
                  onClick={() => downloadAnnualReport('606')}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Descargar 606 Anual
                </Button>
                <Button 
                  onClick={() => downloadAnnualReport('607')}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Descargar 607 Anual
                </Button>
                <Button 
                  onClick={() => downloadAnnualReport('fiscal-ncf')}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Facturas Fiscales Anual
                </Button>
                <Button 
                  onClick={() => downloadAnnualReport('payment-methods')}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Receipt className="h-4 w-4" />
                  Métodos de Pago Anual
                </Button>
                <Button 
                  onClick={() => downloadAnnualReport('consolidado')}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Descargar Consolidado
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-methods" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Reporte de Métodos de Pago DGII
              </CardTitle>
              <CardDescription>
                Análisis de facturas agrupadas por método de pago según catálogo DGII
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={generatePaymentMethodsReport}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Generar Reporte Excel - Métodos de Pago
              </Button>
              <div className="text-sm text-gray-600">
                <p>Este reporte genera un Excel con:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Cantidad de facturas por método de pago</li>
                  <li>Monto total por método de pago</li>
                  <li>Porcentaje de participación</li>
                  <li>Clasificación según códigos DGII</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal-invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Reporte de Facturas Fiscales (Con NCF)
              </CardTitle>
              <CardDescription>
                Reporte mensual de todas las facturas con valor fiscal que requieren NCF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={generateFiscalInvoicesReport}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Generar Reporte Excel - Facturas Fiscales
              </Button>
              <div className="text-sm text-gray-600">
                <p>Este reporte genera un Excel con:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Todas las facturas con NCF del período seleccionado</li>
                  <li>Información completa del cliente y factura</li>
                  <li>Desglose de valores según estructura DGII</li>
                  <li>Validación automática de NCF y datos fiscales</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tipos de Gasto (606)</CardTitle>
                <CardDescription>Catálogo oficial DGII para clasificar compras</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {Object.entries(TIPOS_GASTO_DGII).map(([codigo, descripcion]) => (
                    <div key={codigo} className="flex justify-between">
                      <span className="font-mono text-blue-600">{codigo}</span>
                      <span className="text-gray-700">{descripcion}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tipos de Comprobante Fiscal (607)</CardTitle>
                <CardDescription>Catálogo oficial DGII para clasificar ventas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {Object.entries(TIPOS_COMPROBANTE_FISCAL).map(([codigo, descripcion]) => (
                    <div key={codigo} className="flex justify-between">
                      <span className="font-mono text-blue-600">{codigo}</span>
                      <span className="text-gray-700">{descripcion}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Formas de Pago</CardTitle>
                <CardDescription>Catálogo oficial DGII para métodos de pago</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {Object.entries(FORMAS_PAGO_DGII).map(([codigo, descripcion]) => (
                    <div key={codigo} className="flex justify-between">
                      <span className="font-mono text-blue-600">{codigo}</span>
                      <span className="text-gray-700">{descripcion}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Validaciones Implementadas</CardTitle>
                <CardDescription>Controles automáticos según normativas DGII</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium">Validación de RNC/Cédula</p>
                      <p className="text-gray-600">9 dígitos para RNC, 11 para cédula</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium">Validación de NCF</p>
                      <p className="text-gray-600">11 caracteres con prefijo B o E</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium">Clasificación Automática</p>
                      <p className="text-gray-600">Tipos de gasto según descripción</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium">Formato DGII</p>
                      <p className="text-gray-600">Estructura oficial para archivos TXT</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pestaña para crear gasto 606 manual */}
        <TabsContent value="manual-606" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulario de creación */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Crear Gasto 606 Manual
                </CardTitle>
                <CardDescription>
                  Agrega un nuevo gasto para el reporte 606 con vista previa en tiempo real
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expense-description">Descripción del Gasto</Label>
                    <Input
                      id="expense-description"
                      value={manualExpense.description}
                      onChange={(e) => setManualExpense({...manualExpense, description: e.target.value})}
                      placeholder="Ej: Combustible, Herramientas, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="expense-amount">Monto</Label>
                    <Input
                      id="expense-amount"
                      type="number"
                      value={manualExpense.amount}
                      onChange={(e) => setManualExpense({...manualExpense, amount: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="provider-name">Nombre del Proveedor</Label>
                    <Input
                      id="provider-name"
                      value={manualExpense.provider_name}
                      onChange={(e) => setManualExpense({...manualExpense, provider_name: e.target.value})}
                      placeholder="Nombre del proveedor"
                    />
                  </div>
                  <div>
                    <Label htmlFor="provider-rnc">RNC del Proveedor</Label>
                    <Input
                      id="provider-rnc"
                      value={manualExpense.provider_rnc}
                      onChange={(e) => setManualExpense({...manualExpense, provider_rnc: e.target.value})}
                      placeholder="123456789 (opcional)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expense-ncf">NCF</Label>
                    <Input
                      id="expense-ncf"
                      value={manualExpense.ncf}
                      onChange={(e) => setManualExpense({...manualExpense, ncf: e.target.value})}
                      placeholder="B0100000001 (opcional)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="expense-date">Fecha</Label>
                    <Input
                      id="expense-date"
                      type="date"
                      value={manualExpense.expense_date}
                      onChange={(e) => setManualExpense({...manualExpense, expense_date: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="itbis-amount">ITBIS (opcional)</Label>
                  <Input
                    id="itbis-amount"
                    type="number"
                    value={manualExpense.itbis_amount}
                    onChange={(e) => setManualExpense({...manualExpense, itbis_amount: e.target.value})}
                    placeholder="Se calculará automáticamente si está vacío"
                  />
                </div>

                <Button className="w-full" size="lg" onClick={saveManualExpense} disabled={savingExpense}>
                  {savingExpense ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Gasto a la Base de Datos
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Vista previa en tiempo real */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Vista Previa 606
                </CardTitle>
                <CardDescription>
                  Cómo aparecerá este gasto en el reporte 606
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><strong>RNC:</strong> {manualExpense.provider_rnc || "Sin RNC"}</div>
                    <div><strong>Tipo:</strong> {manualExpense.description ? `${determinarTipoGasto(manualExpense.description)} - ${obtenerDescripcionTipoGasto(determinarTipoGasto(manualExpense.description))}` : "09 - Compras y Gastos"}</div>
                    <div><strong>Proveedor:</strong> {manualExpense.provider_name || manualExpense.description || "Sin nombre"}</div>
                    <div><strong>NCF:</strong> {manualExpense.ncf || "Sin NCF"}</div>
                    <div><strong>Fecha:</strong> {manualExpense.expense_date ? new Date(manualExpense.expense_date).toLocaleDateString('es-DO') : ""}</div>
                    <div><strong>Monto:</strong> RD$ {parseFloat(manualExpense.amount || "0").toFixed(2)}</div>
                    <div><strong>ITBIS:</strong> RD$ {manualExpense.itbis_amount ? parseFloat(manualExpense.itbis_amount).toFixed(2) : (parseFloat(manualExpense.amount || "0") * 0.18).toFixed(2)}</div>
                    <div><strong>Total:</strong> RD$ {parseFloat(manualExpense.amount || "0").toFixed(2)}</div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Clasificación Automática:</h4>
                  <p className="text-sm text-blue-700">
                    {manualExpense.description ? 
                      `"${manualExpense.description}" → Tipo ${determinarTipoGasto(manualExpense.description)} (${obtenerDescripcionTipoGasto(determinarTipoGasto(manualExpense.description))})` :
                      "Ingresa una descripción para ver la clasificación automática"
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pestaña para crear factura 607 manual */}
        <TabsContent value="manual-607" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulario de creación */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Crear Factura 607 Manual
                </CardTitle>
                <CardDescription>
                  Agrega una nueva factura para el reporte 607 con vista previa en tiempo real
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client-name">Nombre del Cliente</Label>
                    <Input
                      id="client-name"
                      value={manualInvoice.client_name}
                      onChange={(e) => setManualInvoice({...manualInvoice, client_name: e.target.value})}
                      placeholder="Nombre completo del cliente"
                    />
                  </div>
                  <div>
                    <Label htmlFor="client-rnc">RNC del Cliente</Label>
                    <Input
                      id="client-rnc"
                      value={manualInvoice.client_rnc}
                      onChange={(e) => setManualInvoice({...manualInvoice, client_rnc: e.target.value})}
                      placeholder="123456789 (requerido)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="invoice-ncf">NCF</Label>
                    <Input
                      id="invoice-ncf"
                      value={manualInvoice.ncf}
                      onChange={(e) => setManualInvoice({...manualInvoice, ncf: e.target.value})}
                      placeholder="B0100000001 (requerido)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoice-date">Fecha</Label>
                    <Input
                      id="invoice-date"
                      type="date"
                      value={manualInvoice.created_at}
                      onChange={(e) => setManualInvoice({...manualInvoice, created_at: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="invoice-total">Total</Label>
                    <Input
                      id="invoice-total"
                      type="number"
                      value={manualInvoice.total}
                      onChange={(e) => setManualInvoice({...manualInvoice, total: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoice-itbis">ITBIS</Label>
                    <Input
                      id="invoice-itbis"
                      type="number"
                      value={manualInvoice.tax_amount}
                      onChange={(e) => setManualInvoice({...manualInvoice, tax_amount: e.target.value})}
                      placeholder="Se calculará automáticamente"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="payment-method">Forma de Pago</Label>
                  <Select 
                    value={manualInvoice.payment_method} 
                    onValueChange={(value) => setManualInvoice({...manualInvoice, payment_method: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona forma de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="credito">Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full" size="lg" onClick={saveManualInvoice} disabled={savingInvoice}>
                  {savingInvoice ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Factura a la Base de Datos
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Vista previa en tiempo real */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Vista Previa 607
                </CardTitle>
                <CardDescription>
                  Cómo aparecerá esta factura en el reporte 607
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><strong>RNC Cliente:</strong> {manualInvoice.client_rnc || "REQUERIDO"}</div>
                    <div><strong>Cliente:</strong> {manualInvoice.client_name || "Sin nombre"}</div>
                    <div><strong>NCF:</strong> {manualInvoice.ncf || "REQUERIDO"}</div>
                    <div><strong>Fecha:</strong> {manualInvoice.created_at ? new Date(manualInvoice.created_at).toLocaleDateString('es-DO') : ""}</div>
                    <div><strong>Total:</strong> RD$ {parseFloat(manualInvoice.total || "0").toFixed(2)}</div>
                    <div><strong>ITBIS:</strong> RD$ {manualInvoice.tax_amount ? parseFloat(manualInvoice.tax_amount).toFixed(2) : (parseFloat(manualInvoice.total || "0") * 0.18).toFixed(2)}</div>
                    <div><strong>Forma Pago:</strong> {manualInvoice.payment_method || "credito"}</div>
                    <div><strong>Monto en {manualInvoice.payment_method}:</strong> RD$ {(parseFloat(manualInvoice.total || "0") + (manualInvoice.tax_amount ? parseFloat(manualInvoice.tax_amount) : parseFloat(manualInvoice.total || "0") * 0.18)).toFixed(2)}</div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Validación:</h4>
                  <div className="text-sm space-y-1">
                    <div className={`flex items-center gap-2 ${manualInvoice.client_rnc ? 'text-green-700' : 'text-red-700'}`}>
                      <div className={`w-2 h-2 rounded-full ${manualInvoice.client_rnc ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      RNC del cliente {manualInvoice.client_rnc ? '✓' : '(Requerido)'}
                    </div>
                    <div className={`flex items-center gap-2 ${manualInvoice.ncf ? 'text-green-700' : 'text-red-700'}`}>
                      <div className={`w-2 h-2 rounded-full ${manualInvoice.ncf ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      NCF {manualInvoice.ncf ? '✓' : '(Requerido)'}
                    </div>
                    <div className={`flex items-center gap-2 ${parseFloat(manualInvoice.total || "0") > 0 ? 'text-green-700' : 'text-red-700'}`}>
                      <div className={`w-2 h-2 rounded-full ${parseFloat(manualInvoice.total || "0") > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      Total mayor a 0 {parseFloat(manualInvoice.total || "0") > 0 ? '✓' : '(Requerido)'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}