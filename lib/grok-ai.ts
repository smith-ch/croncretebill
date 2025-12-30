/**
 * Groq AI Integration
 * Servicio para integrar Groq AI en el sistema de facturación
 * Utilizado para mejorar insights, chat de soporte y análisis inteligentes
 * Groq ofrece inferencia ultra-rápida de modelos como Llama 3 y Mixtral
 */

interface GrokMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface GrokResponse {
  id: string
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Configuración de Groq AI
 */
const GROK_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROK_MODEL = 'llama-3.3-70b-versatile' // Modelo actualizado y activo de Groq

/**
 * Obtiene la API key de Groq desde las variables de entorno
 */
function getGrokApiKey(): string | undefined {
  // Prioridad: variable específica > variable pública > hardcoded (desarrollo)
  return process.env.GROQ_API_KEY || 
         process.env.NEXT_PUBLIC_GROQ_API_KEY || 
         process.env.GROK_API_KEY ||
         process.env.NEXT_PUBLIC_GROK_API_KEY ||
         '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' // Fallback para desarrollo
}

/**
 * Verifica si Groq AI está configurado y disponible
 */
export function isGrokAvailable(): boolean {
  return !!getGrokApiKey()
}

/**
 * Llama a la API de Groq para generar una respuesta
 */
async function callGrokAPI(messages: GrokMessage[], temperature: number = 0.7): Promise<string> {
  const apiKey = getGrokApiKey()
  
  if (!apiKey) {
    throw new Error('Groq API key no está configurada. Define GROQ_API_KEY en tus variables de entorno.')
  }

  try {
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        messages,
        temperature,
        max_tokens: 1000,
        stream: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Groq API error response:', response.status, errorText)
      throw new Error(`Groq API error: ${response.status} - ${errorText}`)
    }

    const data: GrokResponse = await response.json()
    console.log('Groq API success:', data)
    
    if (!data.choices || data.choices.length === 0) {
      console.error('No choices in Groq response:', data)
      throw new Error('No se recibió respuesta de Groq AI')
    }

    return data.choices[0].message.content
  } catch (error) {
    console.error('Error completo al llamar a Groq API:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    throw error
  }
}

/**
 * Genera una respuesta inteligente para el chat de soporte
 * usando el contexto del sistema de facturación
 */
export async function generateChatResponse(
  userQuestion: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<string> {
  const systemPrompt = `Eres un asistente virtual experto en ConcreteBill, un sistema PWA de facturación para República Dominicana. Tienes conocimiento completo del sistema.

═══════════════════════════════════════════
📋 MÓDULOS Y FUNCIONALIDADES PRINCIPALES
═══════════════════════════════════════════

1. FACTURAS (/invoices)
   ✅ Crear, editar, eliminar facturas
   ✅ Facturas con NCF (obligatorio para empresas) o sin NCF
   ✅ 4 formatos: Estándar, Moderno, Compacto, Detallado
   ✅ Seleccionar cliente de la lista o crear nuevo
   ✅ Agregar múltiples productos/servicios con cantidades
   ✅ Cálculo automático de ITBIS (18%)
   ✅ Descuentos por línea o global
   ✅ Estados: Borrador, Pendiente, Pagada, Vencida, Cancelada
   ✅ Búsqueda por número, cliente, fecha, estado
   ✅ Filtros por período, cliente, estado de pago
   ✅ Descargar PDF personalizado con logo
   ✅ Envío por email (si configurado)
   ✅ Duplicar facturas existentes
   ✅ Imprimir en impresora térmica (58mm/80mm)
   ✅ Notas y términos personalizables
   ✅ Fecha de vencimiento configurable
   ✅ Modo offline (sincroniza después)

2. CLIENTES (/clients)
   ✅ CRUD completo de clientes
   ✅ Información: Nombre, RNC/Cédula, Email, Teléfono, Dirección
   ✅ Tipo de cliente: Persona física o jurídica
   ✅ Historial de facturas por cliente
   ✅ Total facturado por cliente
   ✅ Búsqueda y filtrado rápido
   ✅ Exportar lista a CSV
   ✅ Clientes frecuentes destacados
   ✅ Notas adicionales

3. PRODUCTOS E INVENTARIO (/products, /inventory)
   ✅ Gestión de productos y servicios
   ✅ Código SKU único
   ✅ Precio de venta y costo
   ✅ Control de stock (cantidad disponible)
   ✅ Alertas de stock bajo (configurable)
   ✅ Categorías personalizadas
   ✅ Unidades de medida (unidad, kg, litro, caja, etc.)
   ✅ Productos con ITBIS incluido o excluido
   ✅ Descuentos por producto
   ✅ Imágenes de productos (opcional)
   ✅ Productos activos/inactivos
   ✅ Búsqueda por nombre, SKU, categoría
   ✅ Actualización automática de stock al facturar
   ✅ Historial de movimientos de inventario
   ✅ Reportes de productos más vendidos

4. GASTOS (/expenses)
   ✅ Registro de gastos operativos
   ✅ Categorías: Servicios, Productos, Salarios, Alquiler, Otros
   ✅ Fecha, monto, descripción, proveedor
   ✅ Recibos/facturas adjuntos (opcional)
   ✅ Gastos fijos vs variables
   ✅ Búsqueda y filtrado por período
   ✅ Total de gastos por categoría
   ✅ Comparación mes a mes
   ✅ Alertas de gastos inusuales

5. GASTOS FIJOS (/agenda - sección de gastos fijos)
   ✅ Configurar gastos recurrentes automáticos
   ✅ Frecuencias: Mensual, Trimestral, Anual
   ✅ Nombre, monto, categoría, fecha de vencimiento
   ✅ Se replican automáticamente cada período
   ✅ Generan eventos en la agenda sin intervención manual
   ✅ Marcar como pagado actualiza fecha del próximo pago
   ✅ Editar o desactivar gastos fijos
   ✅ Ejemplos: Alquiler, internet, luz, agua, seguros

6. AGENDA (/agenda)
   ✅ Calendario de eventos y recordatorios
   ✅ Tipos: Facturas vencidas, Gastos, Pagos, Tareas, Recordatorios
   ✅ Vista de calendario mensual
   ✅ Lista de eventos pendientes/completados/vencidos
   ✅ Crear eventos personalizados
   ✅ Integración automática de gastos fijos (se crean solos)
   ✅ Notificaciones de eventos próximos
   ✅ Marcar como completado
   ✅ Prioridades: Alta, Media, Baja
   ✅ Filtros por tipo y estado

7. REPORTES MENSUALES (/monthly-reports)
   ✅ Dashboard financiero con gráficos
   ✅ Ingresos vs Gastos por mes
   ✅ Ganancia neta y margen de ganancia
   ✅ KPIs: Crecimiento, ROI, consistencia
   ✅ Mejor y peor mes del período
   ✅ Predicciones con IA (Groq/Llama 3.1)
   ✅ Recomendaciones estratégicas inteligentes
   ✅ Identificación de riesgos y oportunidades
   ✅ Análisis de tendencias
   ✅ Score de salud del negocio
   ✅ Gráficos interactivos (últimos 6-12 meses)
   ✅ Exportar a CSV/PDF
   ✅ Comparación período anterior
   ✅ Promedio de valor por factura

8. CONFIGURACIÓN (/settings)
   ✅ Información de la empresa:
      - Nombre, RNC, dirección, teléfono, email
      - Logo (se muestra en facturas)
      - Moneda (DOP, USD, EUR, etc.)
   ✅ Personalización de facturas:
      - Formato: Estándar, Moderno, Compacto, Detallado
      - Color principal y secundario
      - Mostrar/ocultar logo
      - Mensaje de pie de página personalizado
      - Prefijo de numeración de facturas
      - Términos y condiciones predeterminados
   ✅ Configuración de ITBIS:
      - Tasa de ITBIS (18% por defecto)
      - Incluir ITBIS por defecto
   ✅ Comprobantes fiscales (NCF):
      - Series de NCF disponibles
      - Secuencias actuales
      - Alertas de NCF por agotarse
   ✅ Configuración de impresora térmica:
      - Ancho de papel (58mm/80mm)
      - Tamaño de texto
      - Imprimir logo
      - Texto de encabezado/pie
   ✅ Usuarios y permisos:
      - Crear empleados con acceso limitado
      - Propietario tiene acceso total
      - Empleados: ver facturas, crear clientes, etc.
   ✅ Respaldo y exportación de datos
   ✅ Modo oscuro/claro
   ✅ Idioma (español/inglés)

9. RECIBOS DE PAGO (/payment-receipts)
   ✅ Generar recibos de pago oficiales
   ✅ Asociar a facturas
   ✅ Métodos: Efectivo, transferencia, tarjeta, cheque
   ✅ Imprimir en térmica o PDF
   ✅ Numeración automática

10. NOTAS DE ENTREGA (/delivery-notes)
    ✅ Crear albaranes/remitos
    ✅ Control de entregas
    ✅ Convertir a factura después
    ✅ Firmas digitales

11. REPORTES DGII (/dgii-reports)
    ✅ Reporte 606 (compras)
    ✅ Reporte 607 (ventas)
    ✅ Formato IR-2 para impuestos
    ✅ Exportar según formato DGII
    ✅ Validación de NCF

12. MODO OFFLINE (PWA)
    ✅ Funciona sin internet
    ✅ Crea facturas offline
    ✅ Se sincroniza automáticamente al reconectar
    ✅ Indicador de estado de conexión
    ✅ Base de datos local

═══════════════════════════════════════════
🔧 FUNCIONALIDADES TÉCNICAS
═══════════════════════════════════════════

- PWA instalable (como app de escritorio/móvil)
- Búsqueda global con Ctrl+K / Cmd+K
- Atajos de teclado para acciones rápidas
- Temas claro/oscuro
- Notificaciones push (opcional)
- Multi-usuario con roles (propietario/empleado)
- Backup automático en la nube (Supabase)
- Impresión térmica compatible con ESC/POS
- Responsivo (móvil, tablet, desktop)
- Chat de soporte con IA (Groq/Llama 3.1) - ¡Este chat!

═══════════════════════════════════════════
📝 NORMATIVAS DOMINICANAS
═══════════════════════════════════════════

NCF (Número de Comprobante Fiscal):
- Serie B01: Facturas con crédito fiscal (empresas)
- Serie B02: Facturas consumidor final (sin RNC)
- Serie B14: Notas de crédito
- Serie B15: Notas de débito
- Serie B16: Compras
ITBIS: 18% (impuesto valor agregado)
RNC: Registro Nacional del Contribuyente (9-11 dígitos)

═══════════════════════════════════════════
💡 CÓMO RESPONDER
═══════════════════════════════════════════

1. Sé específico y paso a paso
2. Usa ejemplos prácticos dominicanos
3. Menciona la ruta del menú (ej: "Ve a Facturas → Nueva Factura")
4. Si hay múltiples formas, menciona la más fácil primero
5. Usa emojis para claridad visual
6. Formato amigable para República Dominicana (pesos, términos locales)
7. Si no sabes algo específico del negocio del usuario, pregunta o sugiere verificar en la sección correspondiente

Responde SIEMPRE en español dominicano, de forma clara, amigable y profesional.`

  const messages: GrokMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: msg.content
    })),
    { role: 'user', content: userQuestion }
  ]

  try {
    const response = await callGrokAPI(messages, 0.7)
    return response
  } catch (error) {
    console.error('Error generando respuesta de chat:', error)
    return 'Lo siento, hubo un problema al procesar tu pregunta. Por favor intenta de nuevo o reformula tu pregunta.'
  }
}

/**
 * Genera insights inteligentes basados en datos financieros
 * para los reportes mensuales
 */
export async function generateFinancialInsights(data: {
  monthlyRevenue: number[]
  monthlyExpenses: number[]
  profitMargin: number
  growthRate: number
  totalClients: number
  avgInvoiceValue: number
  currentMonth: string
  previousMonth: string
}): Promise<{
  summary: string
  recommendations: string[]
  predictions: string
  risks: string[]
  opportunities: string[]
}> {
  const systemPrompt = `Eres un analista financiero experto especializado en pequeñas y medianas empresas en República Dominicana. Analiza datos financieros y proporciona insights accionables, recomendaciones estratégicas y predicciones.

Contexto del sistema: ConcreteBill, sistema de facturación usado por negocios locales.

Proporciona respuestas en formato JSON estructurado con:
- summary: Resumen ejecutivo (2-3 oraciones)
- recommendations: Array de 3-5 recomendaciones específicas y accionables
- predictions: Predicción para el próximo mes (1 párrafo)
- risks: Array de 2-4 riesgos potenciales identificados
- opportunities: Array de 2-4 oportunidades de mejora

Usa lenguaje profesional pero accesible, y contexto dominicano (pesos dominicanos, realidad local).`

  const userPrompt = `Analiza estos datos financieros y genera insights:

Datos del negocio:
- Mes actual: ${data.currentMonth}
- Mes anterior: ${data.previousMonth}
- Ingresos últimos 6 meses: ${data.monthlyRevenue.join(', ')} DOP
- Gastos últimos 6 meses: ${data.monthlyExpenses.join(', ')} DOP
- Margen de ganancia actual: ${data.profitMargin.toFixed(1)}%
- Tasa de crecimiento: ${data.growthRate.toFixed(1)}%
- Total de clientes: ${data.totalClients}
- Valor promedio de factura: ${data.avgInvoiceValue.toFixed(0)} DOP

Genera un análisis completo con insights accionables. Responde SOLO con el JSON, sin texto adicional.`

  const messages: GrokMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]

  try {
    const response = await callGrokAPI(messages, 0.6)
    
    // Intentar parsear la respuesta JSON
    try {
      // Limpiar la respuesta si tiene markdown code blocks
      const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleanedResponse)
      
      return {
        summary: parsed.summary || 'Análisis generado por IA',
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        predictions: parsed.predictions || 'Predicciones no disponibles',
        risks: Array.isArray(parsed.risks) ? parsed.risks : [],
        opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : []
      }
    } catch (parseError) {
      console.error('Error parseando respuesta JSON de Grok:', parseError)
      
      // Fallback: retornar la respuesta como texto en summary
      return {
        summary: response,
        recommendations: ['Continuar monitoreando el desempeño financiero'],
        predictions: 'Análisis en progreso',
        risks: [],
        opportunities: []
      }
    }
  } catch (error) {
    console.error('Error generando insights financieros:', error)
    throw error
  }
}

/**
 * Analiza un texto de pregunta y determina si es apropiado
 * para el contexto del sistema de facturación
 */
export async function analyzeQuestion(question: string): Promise<{
  isRelevant: boolean
  category: string
  confidence: number
  suggestedResponse?: string
}> {
  const systemPrompt = `Eres un clasificador de preguntas para el sistema ConcreteBill. 
Determina si una pregunta es relevante para un sistema de facturación y clasifícala.

Categorías válidas:
- facturas: Creación, edición, envío de facturas
- clientes: Gestión de clientes
- productos: Inventario, precios, stock
- reportes: Análisis, estadísticas, reportes
- pagos: Procesamiento de pagos, métodos de pago
- configuracion: Ajustes del sistema, empresa
- gastos: Registro y control de gastos
- dgii: Comprobantes fiscales, normativas RD
- soporte: Ayuda general del sistema
- irrelevant: Pregunta no relacionada con facturación

Responde en JSON: { "isRelevant": boolean, "category": string, "confidence": 0-100 }`

  const messages: GrokMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Clasifica esta pregunta: "${question}"` }
  ]

  try {
    const response = await callGrokAPI(messages, 0.3)
    const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleanedResponse)
    
    return {
      isRelevant: parsed.isRelevant !== false && parsed.category !== 'irrelevant',
      category: parsed.category || 'general',
      confidence: parsed.confidence || 50,
      suggestedResponse: parsed.suggestedResponse
    }
  } catch (error) {
    console.error('Error analizando pregunta:', error)
    // Fallback optimista: asumir que es relevante
    return {
      isRelevant: true,
      category: 'general',
      confidence: 50
    }
  }
}

/**
 * Genera sugerencias de preguntas relacionadas
 */
export async function generateSuggestedQuestions(context: string): Promise<string[]> {
  const systemPrompt = `Genera 3-4 preguntas frecuentes relacionadas con el contexto dado.
Las preguntas deben ser sobre el sistema de facturación ConcreteBill.
Responde con un array JSON de strings, sin explicaciones adicionales.`

  const messages: GrokMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Contexto: ${context}. Genera preguntas relacionadas.` }
  ]

  try {
    const response = await callGrokAPI(messages, 0.8)
    const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleanedResponse)
    
    if (Array.isArray(parsed)) {
      return parsed.slice(0, 4)
    }
    
    return []
  } catch (error) {
    console.error('Error generando preguntas sugeridas:', error)
    return []
  }
}

const grokService = {
  isGrokAvailable,
  generateChatResponse,
  generateFinancialInsights,
  analyzeQuestion,
  generateSuggestedQuestions
}

export default grokService
