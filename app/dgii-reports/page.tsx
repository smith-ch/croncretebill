"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Download, Receipt, FileText, TrendingUp, Users, AlertTriangle, Plus, Eye } from "lucide-react"
import { supabase } from "@/lib/supabase"
import * as XLSX from 'xlsx'

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

interface DGIIData {
  compras: any[]
  ventas: any[]
  totalCompras: number
  totalVentas: number
  itbisCompras: number
  itbisVentas: number
}

export default function DGIIReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(formatDateToYearMonth(new Date()))
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
      const totalCompras = expenses?.reduce((sum, exp) => {
        const amount = parseFloat(exp.amount) || 0
        return sum + amount
      }, 0) || 0

      const totalVentas = invoices?.reduce((sum, inv) => {
        const total = parseFloat(inv.total) || 0
        return sum + total
      }, 0) || 0

      // Calcular ITBIS más preciso
      const itbisCompras = expenses?.reduce((sum, exp) => {
        // Si tiene ITBIS explícito, usarlo; sino calcular 18%
        const itbis = exp.itbis_amount ? parseFloat(exp.itbis_amount) : (parseFloat(exp.amount) || 0) * 0.18
        return sum + itbis
      }, 0) || 0

      const itbisVentas = invoices?.reduce((sum, inv) => {
        const itbis = parseFloat(inv.tax_amount) || 0
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

      return company?.company_name || "MI EMPRESA, SRL"
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
      const montoTotal = parseFloat(expense.amount) || 0
      const itbisFac = expense.itbis_amount ? 
                      parseFloat(expense.itbis_amount) : 
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
      
      // Determinar forma de pago
      const paymentMethod = invoice.payment_method || "credito"
      let efectivo = 0, chkTransf = 0, tarjetaCr = 0, credito = 0
      
      // Calcular el monto total con ITBIS para la forma de pago
      const montoConItbis = total + itbis
      
      switch (paymentMethod.toLowerCase()) {
        case 'efectivo':
          efectivo = montoConItbis
          break
        case 'transferencia':
        case 'cheque':
          chkTransf = montoConItbis
          break
        case 'tarjeta':
          tarjetaCr = montoConItbis
          break
        default:
          credito = montoConItbis
      }

      excelData.push([
        rncCliente, 
        id, 
        ncf, 
        "", // NCF modificado
        "01", // Tipo ingresos
        fecha, 
        "", // Fecha retención
        total.toFixed(2), // Total
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
    
    XLSX.utils.book_append_sheet(wb, ws, "Reporte 607")
    
    // Descargar archivo con nombre según el mes
    const [year, month] = selectedMonth.split('-')
    XLSX.writeFile(wb, `607_${year}${month}_ventas.xlsx`)
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
      const montoTotal = parseFloat(expense.amount) || 0
      const montoServicios = montoTotal.toFixed(2) // La mayoría son servicios
      const montoBienes = "0.00" // Bienes físicos
      const totalMonto = montoTotal.toFixed(2)
      
      // ITBIS según reporte oficial - usar campo específico si existe
      const itbisFac = expense.itbis_amount ? 
        parseFloat(expense.itbis_amount).toFixed(2) : 
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
      const total = parseFloat(invoice.total || 0).toFixed(2)
      const itbis = parseFloat(invoice.tax_amount || 0).toFixed(2)
      const itbisRet = "0"
      const itbisPerc = "0"
      const retencIsr = "0"
      const isrPerc = "0"
      const selectivo = "0"
      const otrosImp = "0"
      const propina = "0"
      
      // Formas de pago desglosadas según método de pago
      const montoTotal = parseFloat(invoice.total || 0)
      const montoItbis = parseFloat(invoice.tax_amount || 0)
      const montoConItbis = montoTotal + montoItbis
      const paymentMethod = invoice.payment_method || "credito"
      
      let efectivo = "0"
      let chkTransf = "0"
      let tarjetaCr = "0"
      let credito = "0"
      const bonosGif = "0"
      const permuta = "0"
      const otrosPagos = "0"
      
      // Distribuir según método de pago (usando total + ITBIS)
      switch (paymentMethod.toLowerCase()) {
        case "efectivo":
          efectivo = montoConItbis.toFixed(2)
          break
        case "transferencia":
        case "cheque":
          chkTransf = montoConItbis.toFixed(2)
          break
        case "tarjeta":
        case "tarjeta_credito":
        case "tarjeta_debito":
          tarjetaCr = montoConItbis.toFixed(2)
          break
        default: // credito u otros
          credito = montoConItbis.toFixed(2)
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
        category: "Gastos Generales", // Categoría por defecto
        expense_date: manualExpense.expense_date,
        receipt_number: manualExpense.ncf || null,
        notes: `RNC: ${manualExpense.provider_rnc || 'N/A'}, Proveedor: ${manualExpense.provider_name || 'N/A'}`
      }

      const { error } = await supabase
        .from('expenses')
        .insert(expenseData)

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
        clientId = existingClient.id
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
          })
          .select('id')
          .single()

        if (clientError) {
          console.error('Error al crear cliente:', clientError)
          alert(`Error al crear cliente: ${clientError.message}`)
          return
        }
        
        clientId = newClient.id
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

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select('id')
        .single()

      if (invoiceError) {
        console.error('Error al guardar factura:', invoiceError)
        alert(`Error al guardar la factura: ${invoiceError.message}`)
        return
      }

      // Crear un item de factura genérico
      const { error: itemError } = await supabase
        .from('invoice_items')
        .insert({
          invoice_id: invoice.id,
          description: 'Servicio/Producto Manual',
          quantity: 1,
          unit_price: subtotal,
          total: subtotal,
          unit: 'unidad',
          itbis_rate: taxAmount > 0 ? 18 : 0,
          itbis_amount: taxAmount
        })

      if (itemError) {
        console.error('Error al crear item de factura:', itemError)
        // Eliminar la factura si no se pueden crear los items
        await supabase.from('invoices').delete().eq('id', invoice.id)
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
    <div className="container mx-auto py-8 space-y-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Reportes DGII
          </h1>
          <p className="text-muted-foreground">
            Genera reportes 606 (Compras) y 607 (Ventas) para cumplimiento fiscal
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">Período:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border rounded-md px-3 py-1 text-sm"
            />
          </div>
          <Button onClick={fetchDGIIData} disabled={loading}>
            {loading ? "Cargando..." : "Actualizar"}
          </Button>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Total Compras</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(dgiiData?.totalCompras || 0)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {dgiiData?.compras.length || 0} registros
                </p>
              </div>
              <Receipt className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Ventas</p>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(dgiiData?.totalVentas || 0)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {dgiiData?.ventas.length || 0} facturas
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">ITBIS Compras</p>
                <p className="text-2xl font-bold text-orange-900">
                  {formatCurrency(dgiiData?.itbisCompras || 0)}
                </p>
                <p className="text-xs text-orange-600 mt-1">18% estimado</p>
              </div>
              <FileText className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">ITBIS Ventas</p>
                <p className="text-2xl font-bold text-purple-900">
                  {formatCurrency(dgiiData?.itbisVentas || 0)}
                </p>
                <p className="text-xs text-purple-600 mt-1">Facturado</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advertencia importante */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Importante:</p>
              <p>Los reportes generados son una aproximación basada en los datos del sistema. Verifica que todas las facturas tengan NCF válidos y que los proveedores tengan RNC/Cédula correctos antes de enviar a DGII.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pestañas de reportes */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="606">Reporte 606</TabsTrigger>
          <TabsTrigger value="607">Reporte 607</TabsTrigger>
          <TabsTrigger value="manual-606">➕ Gasto 606</TabsTrigger>
          <TabsTrigger value="manual-607">➕ Factura 607</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
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
                      placeholder="B01000000XX (opcional)"
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
                      placeholder="B01000000XX (requerido)"
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