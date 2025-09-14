"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Users,
  Package,
  Calculator,
  Settings,
  TrendingUp,
} from "lucide-react"

const systemFAQs = [
  {
    id: "1",
    category: "Facturas",
    question: "¿Cómo crear una nueva factura?",
    answer:
      "Para crear una nueva factura:\n1. Ve a la sección 'Facturas' en el menú lateral\n2. Haz clic en 'Nueva Factura'\n3. Completa la información del cliente, fechas y productos/servicios\n4. Revisa los totales y guarda la factura\n5. Puedes descargar el PDF o marcarla como pagada cuando corresponda",
  },
  {
    id: "2",
    category: "Facturas",
    question: "¿Cómo marcar una factura como pagada?",
    answer:
      "Para marcar una factura como pagada:\n1. Ve a la lista de facturas\n2. Busca la factura que deseas marcar como pagada\n3. Haz clic en el botón de confirmación de pago (ícono de check verde)\n4. Confirma la acción en el diálogo que aparece\n5. La factura cambiará su estado a 'Pagada' y se contabilizará como ingreso real",
  },
  {
    id: "3",
    category: "Facturas",
    question: "¿Cómo editar una factura existente?",
    answer:
      "Para editar una factura:\n1. Ve a la lista de facturas\n2. Haz clic en el botón de editar (ícono de lápiz) junto a la factura\n3. Modifica los campos necesarios\n4. Los productos y servicios pueden cambiarse usando los dropdowns\n5. Guarda los cambios para actualizar la factura",
  },
  {
    id: "4",
    category: "Facturas",
    question: "¿Qué significa ITBIS y cuándo debo incluirlo?",
    answer:
      "ITBIS es el Impuesto sobre la Transferencia de Bienes Industrializados y Servicios (18% en República Dominicana).\n\nDebes incluirlo cuando:\n- Tu empresa está registrada para facturar con ITBIS\n- El cliente requiere factura fiscal\n- Es obligatorio proporcionar un NCF (Número de Comprobante Fiscal) cuando incluyes ITBIS",
  },
  {
    id: "5",
    category: "Clientes",
    question: "¿Cómo agregar un nuevo cliente?",
    answer:
      "Para agregar un cliente:\n1. Ve a la sección 'Clientes' en el menú\n2. Haz clic en 'Nuevo Cliente'\n3. Completa la información: nombre, email, teléfono, dirección\n4. Agrega el RNC si es una empresa\n5. Guarda la información\n6. El cliente estará disponible para usar en facturas y presupuestos",
  },
  {
    id: "6",
    category: "Clientes",
    question: "¿Qué es el RNC y por qué es importante?",
    answer:
      "RNC significa Registro Nacional del Contribuyente. Es el número de identificación fiscal de empresas en República Dominicana.\n\nEs importante porque:\n- Se requiere para facturas fiscales\n- Aparece en los PDFs de facturas y presupuestos\n- Es necesario para el cumplimiento tributario\n- Facilita la identificación correcta del cliente",
  },
  {
    id: "7",
    category: "Productos",
    question: "¿Cómo gestionar mi catálogo de productos?",
    answer:
      "Para gestionar productos:\n1. Ve a 'Productos' en el menú lateral\n2. Usa 'Nuevo Producto' para agregar items\n3. Completa: nombre, descripción, precio unitario, unidad de medida\n4. Agrega información técnica como tipo de mezcla o resistencia si aplica\n5. Los productos aparecerán automáticamente en facturas y presupuestos",
  },
  {
    id: "8",
    category: "Productos",
    question: "¿Cuál es la diferencia entre productos y servicios?",
    answer:
      "Productos vs Servicios:\n\nProductos:\n- Bienes físicos (materiales, equipos, etc.)\n- Se miden en unidades específicas (m³, kg, unidades)\n- Tienen características técnicas\n\nServicios:\n- Trabajo o labor realizada\n- Se miden en horas, días, o servicios completos\n- Describen el tipo de trabajo a realizar\n\nAmbos pueden incluirse en facturas y presupuestos",
  },
  {
    id: "9",
    category: "Presupuestos",
    question: "¿Cómo crear y gestionar presupuestos?",
    answer:
      "Para trabajar con presupuestos:\n1. Ve a 'Productos' → 'Presupuestos'\n2. Crea un nuevo presupuesto seleccionando cliente y proyecto\n3. Agrega productos/servicios con cantidades y precios\n4. El sistema calcula automáticamente subtotales e ITBIS\n5. Genera PDF para enviar al cliente\n6. Convierte a factura cuando sea aprobado",
  },
  {
    id: "10",
    category: "Presupuestos",
    question: "¿Cómo convertir un presupuesto en factura?",
    answer:
      "Actualmente, para convertir un presupuesto en factura:\n1. Abre el presupuesto aprobado\n2. Copia la información del cliente y productos\n3. Ve a 'Nueva Factura'\n4. Ingresa la misma información del presupuesto\n5. Ajusta fechas y términos según corresponda\n6. Guarda como factura oficial",
  },
  {
    id: "11",
    category: "Dashboard",
    question: "¿Cómo usar el nuevo dashboard mejorado?",
    answer:
      "El dashboard renovado incluye:\n\n✨ Diseño Premium: Cards con gradientes y animaciones modernas\n📊 Métricas Avanzadas: Indicadores de tendencias y crecimiento\n🎯 Meta Inteligente: Progreso visual con alertas y proyecciones\n⚡ Alertas Dinámicas: Notificaciones importantes destacadas\n📈 Analytics Mejorados: Comparativas de clientes y gastos\n🔄 Actualización Automática: Datos en tiempo real cada 5 minutos\n\nCada card muestra tendencias, porcentajes de cambio y métricas específicas para mejor análisis.",
  },
  {
    id: "12",
    category: "Dashboard",
    question: "¿Qué significan los indicadores de tendencia en las cards?",
    answer:
      "Los indicadores de tendencia muestran:\n\n🔺 Flecha Verde Arriba: Crecimiento positivo comparado con el promedio\n🔻 Flecha Roja Abajo: Disminución comparada con el promedio\n📊 Porcentaje: Muestra el cambio exacto en números\n🏷️ Badges: Estado actual (Positivo, Negativo, Excelente, etc.)\n\nEstos indicadores te ayudan a:\n- Identificar tendencias rápidamente\n- Tomar decisiones informadas\n- Monitorear el rendimiento del negocio\n- Detectar áreas de mejora",
  },
  {
    id: "13",
    category: "Dashboard",
    question: "¿Cómo funciona la meta mensual mejorada?",
    answer:
      "La nueva meta mensual incluye:\n\n🎯 Progreso Visual: Barra de progreso con colores dinámicos\n📈 Métricas Detalladas: Monto actual vs meta, cantidad faltante\n⚙️ Configuración Fácil: Edita tu meta directamente desde el dashboard\n📋 Ingresos Pendientes: Muestra facturas emitidas pero no cobradas\n🏆 Indicadores de Logro: Badges que cambian según tu progreso\n\nColores del progreso:\n- Verde (75-100%): Excelente progreso\n- Amarillo (50-74%): Buen progreso\n- Rojo (0-49%): Necesita atención",
  },
  {
    id: "14",
    category: "Reportes IA",
    question: "¿Cómo funcionan los reportes con inteligencia artificial?",
    answer:
      "Los reportes con IA incluyen:\n\n🤖 Análisis Automático: El sistema analiza tus datos financieros\n📊 KPIs Inteligentes: 12+ métricas calculadas automáticamente\n🔮 Predicciones: Proyecciones de ingresos usando algoritmos avanzados\n📈 Tendencias: Identificación automática de patrones de crecimiento\n⚠️ Alertas Inteligentes: Recomendaciones basadas en tu rendimiento\n💡 Insights: Sugerencias para mejorar tu negocio\n\nFuncionalidades IA:\n- Predicción del próximo mes\n- Análisis de consistencia\n- Cálculo de ROI automático\n- Identificación de mejores/peores períodos",
  },
  {
    id: "15",
    category: "Reportes IA",
    question: "¿Qué métricas incluye el desglose mensual detallado?",
    answer:
      "El desglose mensual muestra por cada mes:\n\n💰 Ingresos vs Gastos: Comparativa completa con márgenes\n📊 ROI Calculado: Retorno de inversión automático\n📈 Tendencias de Crecimiento: Comparación mes a mes\n🎯 Eficiencia: Métricas de productividad\n💳 Promedios: Ticket promedio y gasto promedio\n📋 Volumen: Cantidad de facturas y gastos\n\nVisualización:\n- Cards individuales por mes\n- Gráficos de barras de progreso\n- Indicadores de crecimiento\n- Comparativas automáticas",
  },
  {
    id: "16",
    category: "Reportes IA",
    question: "¿Cómo interpretar las predicciones de IA?",
    answer:
      "Las predicciones de IA se basan en:\n\n📊 Datos Históricos: Análisis de patrones pasados\n📈 Tendencias Actuales: Comportamiento reciente del negocio\n🔄 Estacionalidad: Variaciones según épocas del año\n📉 Volatilidad: Consistencia en el rendimiento\n\nTipos de predicciones:\n- Ingresos del próximo mes\n- Proyección de gastos\n- Estimación de crecimiento\n- Recomendaciones de metas\n\nFactores considerados:\n- Promedio de ingresos mensuales\n- Tendencia de crecimiento\n- Variabilidad histórica\n- Época del año",
  },
  {
    id: "17",
    category: "Gastos",
    question: "¿Cómo registrar y categorizar gastos?",
    answer:
      "Para gestionar gastos:\n1. Ve a la sección 'Gastos'\n2. Haz clic en 'Nuevo Gasto'\n3. Completa: descripción, monto, fecha, categoría\n4. Las categorías te ayudan a organizar y analizar gastos\n5. Puedes editar o eliminar gastos existentes\n6. Los gastos se reflejan automáticamente en reportes y dashboard",
  },
  {
    id: "18",
    category: "Gastos Fijos",
    question: "¿Cómo gestionar gastos fijos recurrentes?",
    answer:
      "Los gastos fijos son gastos que se repiten mensualmente:\n\n💡 Ejemplos: Alquiler, servicios, seguros, sueldos\n📅 Configuración: Define monto, fecha de vencimiento y frecuencia\n🔔 Recordatorios: Alertas automáticas antes del vencimiento\n📊 Seguimiento: Aparecen en tu agenda y reportes\n⚡ Automatización: Opción de registro automático cada mes\n\nPara configurar:\n1. Ve a 'Gastos' → 'Gastos Fijos'\n2. Agrega nombre, monto y fecha de vencimiento\n3. Configura la frecuencia (mensual, trimestral, etc.)\n4. Activa recordatorios automáticos",
  },
  {
    id: "19",
    category: "Agenda",
    question: "¿Cómo usar la nueva agenda de negocio?",
    answer:
      "La agenda centraliza todas tus fechas importantes:\n\n📅 Calendario Visual: Vista mensual con todos los eventos\n🔔 Recordatorios: Alertas de facturas por vencer, gastos fijos\n💳 Cuentas por Pagar: Seguimiento de proveedores y pagos\n📊 Cierre de Mes: Tareas automáticas para fin de mes\n📈 Metas y Objetivos: Recordatorios de seguimiento\n\nAcceso rápido:\n- Desde el dashboard: widget de próximas fechas\n- Menú principal: sección 'Agenda'\n- Alertas en tiempo real en toda la aplicación",
  },
  {
    id: "20",
    category: "Agenda",
    question: "¿Qué incluye el widget de recordatorios de fin de mes?",
    answer:
      "El recordatorio de fin de mes incluye:\n\n📋 Tareas Pendientes:\n- Facturas por cobrar\n- Gastos fijos por pagar\n- Cuentas por pagar a proveedores\n- Seguimiento de metas mensuales\n\n📊 Métricas de Cierre:\n- Resumen de ingresos del mes\n- Total de gastos registrados\n- Balance mensual\n- Comparación con metas\n\n🔔 Alertas Automáticas:\n- 5 días antes del fin de mes\n- Facturas con vencimiento próximo\n- Recordatorios de gastos fijos\n- Tareas de administración pendientes",
  },
  {
    id: "21",
    category: "Cuentas por Pagar",
    question: "¿Cómo gestionar cuentas por pagar a proveedores?",
    answer:
      "Las cuentas por pagar te ayudan a gestionar deudas:\n\n👥 Proveedores: Registra información de contacto y términos\n💰 Montos: Controla cuánto debes y fechas límite\n📅 Vencimientos: Alertas automáticas antes del vencimiento\n📊 Historial: Seguimiento de pagos realizados\n🔔 Recordatorios: Notificaciones en dashboard y agenda\n\nPara agregar:\n1. Ve a 'Agenda' → 'Cuentas por Pagar'\n2. Agrega proveedor, monto y fecha de vencimiento\n3. Incluye referencia (número de factura, concepto)\n4. Marca como pagada cuando realices el pago",
  },
  {
    id: "22",
    category: "General",
    question: "¿Cómo personalizar las notificaciones y alertas?",
    answer:
      "Puedes configurar alertas para:\n\n🔔 Facturas: Vencimientos, pagos recibidos, recordatorios de cobro\n💰 Gastos Fijos: Recordatorios antes del vencimiento\n🎯 Metas: Progreso mensual, alertas de rendimiento\n📅 Agenda: Eventos próximos, tareas pendientes\n📊 Reportes: Nuevos insights de IA, cambios importantes\n\nConfiguraciones:\n- Días de anticipación para alertas\n- Tipos de notificaciones activas\n- Frecuencia de recordatorios\n- Canales de notificación (email, dashboard)\n\nAcceso: Configuración → Notificaciones",
  },
  {
    id: "23",
    category: "General",
    question: "¿Cómo hacer backup de mi información?",
    answer:
      "Tu información se guarda automáticamente en la nube. Para mayor seguridad:\n\n1. Exporta reportes regularmente en PDF\n2. Descarga facturas importantes\n3. Mantén una copia de tu lista de clientes\n4. Los datos se sincronizan automáticamente entre dispositivos\n5. El sistema mantiene historial de cambios para recuperación",
  },
  {
    id: "24",
    category: "General",
    question: "¿El sistema funciona en dispositivos móviles?",
    answer:
      "Sí, el sistema es completamente responsivo:\n\n✓ Funciona en teléfonos y tablets\n✓ Interfaz adaptada para pantallas pequeñas\n✓ Todas las funciones disponibles en móvil\n✓ Sincronización automática entre dispositivos\n✓ Puedes crear facturas, ver reportes y gestionar clientes desde cualquier lugar",
  },
  {
    id: "25",
    category: "General",
    question: "¿Cómo obtener soporte técnico?",
    answer:
      "Para obtener ayuda:\n\n1. Revisa estas preguntas frecuentes primero\n2. Usa la función de búsqueda para encontrar respuestas específicas\n3. Para soporte directo, contacta a través de:\n   - Email de soporte del sistema\n   - Chat en vivo (si está disponible)\n   - Documentación en línea\n4. Incluye detalles específicos del problema para mejor asistencia",
  },
]

export default function FAQPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [openItems, setOpenItems] = useState<string[]>([])

  const toggleItem = (id: string) => {
    setOpenItems((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const filteredFaqs = systemFAQs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.category?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const categories = [...new Set(systemFAQs.map((faq) => faq.category).filter(Boolean))]

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Facturas":
        return <FileText className="h-5 w-5" />
      case "Clientes":
        return <Users className="h-5 w-5" />
      case "Productos":
        return <Package className="h-5 w-5" />
      case "Presupuestos":
        return <Calculator className="h-5 w-5" />
      case "Dashboard":
        return <TrendingUp className="h-5 w-5" />
      case "Gastos":
        return <Settings className="h-5 w-5" />
      default:
        return <HelpCircle className="h-5 w-5" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Facturas":
        return "from-blue-500 to-blue-600"
      case "Clientes":
        return "from-emerald-500 to-emerald-600"
      case "Productos":
        return "from-purple-500 to-purple-600"
      case "Presupuestos":
        return "from-amber-500 to-amber-600"
      case "Dashboard":
        return "from-green-500 to-green-600"
      case "Gastos":
        return "from-red-500 to-red-600"
      default:
        return "from-slate-500 to-slate-600"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-lg">
              <HelpCircle className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-slate-800 bg-clip-text text-transparent">
            Preguntas Frecuentes
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Encuentra respuestas a las preguntas más comunes sobre cómo usar el sistema de facturación
          </p>
        </motion.div>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar Preguntas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Buscar preguntas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </CardContent>
        </Card>

        {filteredFaqs.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="p-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <HelpCircle className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No se encontraron preguntas</h3>
              <p className="text-slate-600">Intenta con otros términos de búsqueda</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {categories.map((category) => {
              const categoryFaqs = filteredFaqs.filter((faq) => faq.category === category)
              if (categoryFaqs.length === 0) return null

              return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className={`bg-gradient-to-r ${getCategoryColor(category)} rounded-lg p-4 shadow-lg`}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg">{getCategoryIcon(category)}</div>
                      <h2 className="text-2xl font-bold text-white">{category}</h2>
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                        {categoryFaqs.length} preguntas
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {categoryFaqs.map((faq, index) => (
                      <motion.div
                        key={faq.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Collapsible open={openItems.includes(faq.id)} onOpenChange={() => toggleItem(faq.id)}>
                          <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white">
                            <CollapsibleTrigger asChild>
                              <CardHeader className="cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-slate-50 transition-all duration-300 rounded-t-lg">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-semibold text-left text-slate-900 hover:text-blue-900 transition-colors">
                                    {faq.question}
                                  </h3>
                                  <div className="flex items-center gap-2">
                                    {openItems.includes(faq.id) ? (
                                      <ChevronDown className="h-5 w-5 text-blue-600" />
                                    ) : (
                                      <ChevronRight className="h-5 w-5 text-slate-400" />
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <CardContent className="pt-0 pb-6 px-6">
                                <div className="border-t border-slate-100 pt-4">
                                  <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{faq.answer}</p>
                                </div>
                              </CardContent>
                            </CollapsibleContent>
                          </Card>
                        </Collapsible>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
