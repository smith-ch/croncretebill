"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  MessageCircle, 
  X, 
  HelpCircle,
  FileText,
  CreditCard,
  Package,
  Settings,
  Users,
  ChevronRight,
  Search,
  Sparkles
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { generateChatResponse, isGrokAvailable } from "@/lib/grok-ai"

interface FAQ {
  id: string
  category: string
  icon: React.ComponentType<{ className?: string }>
  question: string
  answer: string
}

const FAQS: FAQ[] = [
  {
    id: "1",
    category: "Facturas",
    icon: FileText,
    question: "¿Cómo crear una factura?",
    answer: "Ve a la sección 'Facturas' en el menú lateral, haz clic en 'Nueva Factura', selecciona el cliente, agrega productos/servicios y guarda. La factura se generará automáticamente con tu logo y datos de empresa."
  },
  {
    id: "2",
    category: "Facturas",
    icon: FileText,
    question: "¿Cómo personalizar el formato de facturas?",
    answer: "En 'Configuración' → 'Empresa', encontrarás la sección 'Personalización de Facturas' donde puedes cambiar colores, formato, mensaje de pie de página y más."
  },
  {
    id: "2b",
    category: "Facturas",
    icon: FileText,
    question: "¿Qué formatos de factura están disponibles?",
    answer: "Hay 4 formatos disponibles:\n\n• Estándar: Diseño clásico profesional con bordes y tabla tradicional\n• Moderno: Estilo contemporáneo con fondo degradado, sombras y bordes redondeados\n• Compacto: Tamaño reducido ideal para ahorrar papel, con espaciado optimizado\n• Detallado: Texto grande y espacios amplios, perfecto para mejor legibilidad\n\nCambia el formato en Configuración → Empresa → Personalización de Facturas."
  },
  {
    id: "2c",
    category: "Facturas",
    icon: FileText,
    question: "¿Cómo cambiar los colores de las facturas?",
    answer: "Para personalizar colores:\n1. Ve a Configuración → Empresa\n2. Busca 'Personalización de Facturas'\n3. Usa el selector de 'Color Principal' para títulos y encabezados\n4. Usa 'Color Secundario' para fondos y secciones\n5. Los cambios se aplican inmediatamente al descargar facturas\n\nLos colores se usan en títulos, bordes de tablas, encabezados NCF y sección de notas."
  },
  {
    id: "2d",
    category: "Facturas",
    icon: FileText,
    question: "¿Cómo agregar un mensaje personalizado en facturas?",
    answer: "Para agregar un mensaje al pie de página:\n1. Ve a Configuración → Empresa\n2. En 'Personalización de Facturas'\n3. Completa el campo 'Mensaje de Pie de Página'\n4. Puedes incluir: agradecimientos, información de contacto, términos\n\nEjemplo: 'Gracias por su confianza - Tel: 809-123-4567 - Horario: Lun-Vie 8am-6pm'\n\nEl mensaje aparecerá en todas las facturas descargadas."
  },
  {
    id: "2e",
    category: "Facturas",
    icon: FileText,
    question: "¿Cómo ocultar/mostrar el logo en facturas?",
    answer: "Para controlar la visibilidad del logo:\n1. Ve a Configuración → Empresa\n2. En 'Personalización de Facturas'\n3. Activa/desactiva el switch 'Mostrar Logo en Facturas'\n4. Cuando está desactivado, el logo no aparecerá en los PDF\n\nEl logo principal se configura en la sección 'Información de la Empresa' más arriba."
  },
  {
    id: "3",
    category: "Clientes",
    icon: Users,
    question: "¿Cómo agregar un nuevo cliente?",
    answer: "Ve a 'Clientes' en el menú, haz clic en '+ Nuevo Cliente', completa los datos (nombre, RNC, teléfono, email) y guarda. Podrás usar este cliente en tus facturas."
  },
  {
    id: "4",
    category: "Productos",
    icon: Package,
    question: "¿Cómo gestionar el inventario?",
    answer: "En 'Inventario' puedes agregar productos, establecer precios, cantidad en stock, alertas de stock bajo y categorías. Cada venta actualiza automáticamente el inventario."
  },
  {
    id: "5",
    category: "Pagos",
    icon: CreditCard,
    question: "¿Cómo registrar pagos?",
    answer: "Al crear o editar una factura, puedes marcarla como 'Pagada' y seleccionar el método de pago (efectivo, transferencia, tarjeta). También puedes registrar pagos parciales."
  },
  {
    id: "6",
    category: "Configuración",
    icon: Settings,
    question: "¿Cómo cambiar la información de mi empresa?",
    answer: "Ve a 'Configuración' → 'Empresa' para actualizar nombre, logo, dirección, RNC, teléfono, email y otros datos que aparecerán en tus facturas."
  },
  {
    id: "7",
    category: "Reportes",
    icon: FileText,
    question: "¿Dónde veo mis reportes?",
    answer: "En el 'Dashboard' verás un resumen. Para reportes detallados ve a 'Reportes Mensuales' donde encontrarás análisis de ingresos, gastos, productos más vendidos y más."
  },
  {
    id: "8",
    category: "Configuración",
    icon: Settings,
    question: "¿Puedo cambiar la moneda?",
    answer: "Sí, en 'Configuración' → 'Empresa' → 'Configuración de Moneda' puedes elegir entre DOP, USD, EUR y otras monedas. Todas las facturas usarán la moneda seleccionada."
  }
]

const CATEGORIES = [
  { name: "Facturas", icon: FileText, color: "text-blue-600 bg-blue-100" },
  { name: "Clientes", icon: Users, color: "text-green-600 bg-green-100" },
  { name: "Productos", icon: Package, color: "text-purple-600 bg-purple-100" },
  { name: "Pagos", icon: CreditCard, color: "text-orange-600 bg-orange-100" },
  { name: "Configuración", icon: Settings, color: "text-slate-600 bg-slate-100" },
  { name: "Reportes", icon: FileText, color: "text-pink-600 bg-pink-100" },
]

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
  relatedFAQ?: FAQ
}

export function MiniChat() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedFAQ, setSelectedFAQ] = React.useState<FAQ | null>(null)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null)
  const [showChat, setShowChat] = React.useState(false)
  const [userName, setUserName] = React.useState<string>("")
  const [messages, setMessages] = React.useState<Message[]>([])
  const [inputValue, setInputValue] = React.useState("")
  const [isTyping, setIsTyping] = React.useState(false)
  const [grokEnabled, setGrokEnabled] = React.useState(false)
  const [isUsingGrok, setIsUsingGrok] = React.useState(false)
  const [quickSuggestions] = React.useState([
    "¿Cómo crear una factura?",
    "¿Cómo agregar un cliente?",
    "¿Cómo personalizar mis facturas?",
    "¿Cómo ver mis reportes?"
  ])
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // Obtener información del usuario al montar
  React.useEffect(() => {
    // Verificar si Grok está disponible
    setGrokEnabled(isGrokAvailable())
    
    const loadUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        if (user) {
          const firstName = user.user_metadata?.first_name || user.email?.split('@')[0] || 'Usuario'
          setUserName(firstName)
          
          // Obtener hora actual para saludo personalizado
          const hour = new Date().getHours()
          let greeting = '¡Hola'
          if (hour < 12) {
            greeting = '¡Buenos días'
          } else if (hour < 19) {
            greeting = '¡Buenas tardes'
          } else {
            greeting = '¡Buenas noches'
          }
          
          setMessages([{
            id: '0',
            text: `${greeting}, ${firstName}! 👋\n\nSoy tu asistente virtual de ConcreteBill. Estoy aquí para ayudarte con:\n\n• Crear y gestionar facturas\n• Administrar clientes y productos\n• Configurar tu empresa\n• Responder tus dudas\n\n¿En qué puedo ayudarte hoy?`,
            sender: 'bot',
            timestamp: new Date()
          }])
        }
      } catch (error) {
        console.error('Error loading user:', error)
        setMessages([{
          id: '0',
          text: '¡Hola! 👋 Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?',
          sender: 'bot',
          timestamp: new Date()
        }])
      }
    }

    loadUser()
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  const filteredFAQs = FAQS.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || faq.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const findBestMatch = (userMessage: string): { faq: FAQ | null; confidence: number; context: string } => {
    const normalizedMessage = userMessage.toLowerCase().trim()
    
    // Palabras clave expandidas con sinónimos y variaciones
    const keywords: Record<string, string[]> = {
      'factura': ['factura', 'invoice', 'cobrar', 'cobro', 'crear factura', 'nueva factura', 'generar factura', 'emitir', 'documento'],
      'personalizar': ['personalizar', 'formato', 'diseño', 'colores', 'logo factura', 'estilo', 'cambiar apariencia', 'modificar diseño'],
      'cliente': ['cliente', 'agregar cliente', 'nuevo cliente', 'gestionar cliente', 'contacto', 'añadir cliente'],
      'inventario': ['inventario', 'stock', 'producto', 'cantidad', 'existencia', 'almacén', 'productos'],
      'pago': ['pago', 'cobro', 'pagar', 'registrar pago', 'método pago', 'efectivo', 'transferencia'],
      'empresa': ['empresa', 'información', 'datos empresa', 'cambiar empresa', 'rnc', 'configurar empresa'],
      'moneda': ['moneda', 'divisa', 'dólar', 'peso', 'cambiar moneda', 'currency'],
      'reporte': ['reporte', 'análisis', 'estadística', 'dashboard', 'gráfico', 'ver datos', 'métricas']
    }

    // Patrones de preguntas comunes
    const intentPatterns = [
      { pattern: /(?:cómo|como)\s+(?:creo|crear|hago|hacer)\s+(?:una|un)?\s*factura/i, intent: 'crear_factura' },
      { pattern: /(?:cómo|como)\s+(?:agrego|agregar|añado|añadir)\s+cliente/i, intent: 'agregar_cliente' },
      { pattern: /(?:cómo|como)\s+(?:personalizo|personalizar|cambio|cambiar)\s+factura/i, intent: 'personalizar_factura' },
      { pattern: /(?:cómo|como)\s+(?:veo|ver)\s+reporte/i, intent: 'ver_reportes' },
      { pattern: /(?:inventario|stock|productos)/i, intent: 'gestionar_inventario' },
      { pattern: /(?:pago|cobro|registrar)/i, intent: 'registrar_pago' },
    ]

    // Detectar intención directa
    for (const { pattern, intent } of intentPatterns) {
      if (pattern.test(normalizedMessage)) {
        const matchingFAQ = FAQS.find(faq => 
          faq.id === intent.split('_')[0] || 
          faq.question.toLowerCase().includes(intent.replace('_', ' '))
        )
        if (matchingFAQ) {
          return { faq: matchingFAQ, confidence: 95, context: 'intent_match' }
        }
      }
    }

    let bestMatch: FAQ | null = null
    let highestScore = 0

    for (const faq of FAQS) {
      let score = 0
      const messageWords = normalizedMessage.split(/\s+/)

      // Coincidencia exacta de pregunta (altísimo score)
      if (faq.question.toLowerCase() === normalizedMessage) {
        return { faq, confidence: 100, context: 'exact_match' }
      }

      // Coincidencia parcial de pregunta
      if (faq.question.toLowerCase().includes(normalizedMessage) || 
          normalizedMessage.includes(faq.question.toLowerCase())) {
        score += 8
      }

      // Palabras clave en pregunta
      for (const word of messageWords) {
        if (word.length < 3) continue
        
        if (faq.question.toLowerCase().includes(word)) {
          score += 3
        }
        if (faq.answer.toLowerCase().includes(word)) {
          score += 1.5
        }
      }

      // Bonus por categoría relevante
      for (const [key, words] of Object.entries(keywords)) {
        const keywordMatches = words.filter(kw => normalizedMessage.includes(kw)).length
        if (keywordMatches > 0) {
          if (faq.question.toLowerCase().includes(key) || 
              faq.category.toLowerCase().includes(key) ||
              faq.answer.toLowerCase().includes(key)) {
            score += keywordMatches * 2.5
          }
        }
      }

      if (score > highestScore) {
        highestScore = score
        bestMatch = faq
      }
    }

    const confidence = Math.min(Math.round((highestScore / 15) * 100), 100)
    return { faq: bestMatch, confidence, context: confidence > 60 ? 'high_confidence' : 'low_confidence' }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const userQuestion = inputValue
    setInputValue("")
    setIsTyping(true)

    // Simular tiempo de respuesta más natural (500-1200ms)
    const responseDelay = 500 + Math.random() * 700
    
    setTimeout(async () => {
      const { faq, confidence, context } = findBestMatch(userQuestion)
      
      let botResponse: Message

      // Si tenemos alta confianza con FAQs, usarlas directamente
      if (faq && confidence > 70) {
        // Respuesta con alta confianza
        let responseText = faq.answer
        
        // Agregar contexto adicional según la confianza
        if (confidence === 100) {
          responseText = `¡Exacto! ${responseText}`
        } else if (confidence > 85) {
          responseText = `Creo que te refieres a esto:\n\n${responseText}`
        } else if (confidence > 70) {
          responseText = `Basándome en tu pregunta:\n\n${responseText}`
        }
        
        // Agregar sugerencias de seguimiento
        const followUp = getFollowUpSuggestion(faq.category)
        if (followUp) {
          responseText += `\n\n💡 ${followUp}`
        }

        botResponse = {
          id: (Date.now() + 1).toString(),
          text: responseText,
          sender: 'bot',
          timestamp: new Date(),
          relatedFAQ: faq
        }
        
        setIsTyping(false)
        setMessages(prev => [...prev, botResponse])
      } 
      // Si confianza media, intentar con Grok si está disponible
      else if (grokEnabled && confidence < 70) {
        setIsUsingGrok(true)
        try {
          console.log('🤖 Llamando a Groq AI con pregunta:', userQuestion)
          
          // Obtener historial reciente de conversación para contexto
          const recentHistory = messages.slice(-4).map(msg => ({
            role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
            content: msg.text
          }))

          console.log('📝 Historial enviado a Groq:', recentHistory)

          const grokResponse = await generateChatResponse(userQuestion, recentHistory)
          
          console.log('✅ Respuesta de Groq recibida:', grokResponse)
          
          botResponse = {
            id: (Date.now() + 1).toString(),
            text: `${grokResponse}\n\n✨ _Respuesta generada por Groq AI (Llama 3.3)_`,
            sender: 'bot',
            timestamp: new Date()
          }
        } catch (error) {
          console.error('❌ Error detallado con Groq AI:', error)
          if (error instanceof Error) {
            console.error('Error name:', error.name)
            console.error('Error message:', error.message)
            console.error('Error stack:', error.stack)
          }
          
          // Fallback a respuesta FAQ con confianza media si Grok falla
          if (faq && confidence > 40) {
            botResponse = {
              id: (Date.now() + 1).toString(),
              text: `No estoy 100% seguro, pero ¿te refieres a esto?\n\n${faq.answer}\n\nSi no es lo que buscabas, intenta reformular tu pregunta o explora las FAQs.`,
              sender: 'bot',
              timestamp: new Date(),
              relatedFAQ: faq
            }
          } else {
            // Respuesta por defecto si todo falla
            const suggestions = getSuggestedQuestions(userQuestion)
            let suggestionText = suggestions.length > 0 
              ? `\n\n¿Quizás te interesa alguna de estas preguntas?\n${suggestions.map(s => `• ${s}`).join('\n')}`
              : ''

            botResponse = {
              id: (Date.now() + 1).toString(),
              text: `Disculpa, tuve problemas técnicos al consultar la IA. 😔${suggestionText}\n\nPuedes:\n• Ver las preguntas frecuentes (botón arriba)\n• Reformular tu pregunta\n• Preguntar sobre: facturas, clientes, productos, gastos, reportes\n\n¿En qué más puedo ayudarte?`,
              sender: 'bot',
              timestamp: new Date()
            }
          }
        } finally {
          setIsUsingGrok(false)
        }
        
        setIsTyping(false)
        setMessages(prev => [...prev, botResponse])
      }
      // Fallback tradicional si Grok no está disponible
      else if (faq && confidence > 40) {
        // Respuesta con confianza media - preguntar si es lo correcto
        botResponse = {
          id: (Date.now() + 1).toString(),
          text: `No estoy 100% seguro, pero ¿te refieres a esto?\n\n${faq.answer}\n\nSi no es lo que buscabas, intenta reformular tu pregunta o explora las FAQs.`,
          sender: 'bot',
          timestamp: new Date(),
          relatedFAQ: faq
        }
        
        setIsTyping(false)
        setMessages(prev => [...prev, botResponse])
      } else {
        // Respuesta por defecto con sugerencias inteligentes
        const suggestions = getSuggestedQuestions(userQuestion)
        let suggestionText = suggestions.length > 0 
          ? `\n\n¿Quizás te interesa alguna de estas preguntas?\n${suggestions.map(s => `• ${s}`).join('\n')}`
          : ''

        botResponse = {
          id: (Date.now() + 1).toString(),
          text: `No encontré una respuesta exacta a "${userQuestion}".${suggestionText}\n\nTambién puedes:\n• Explorar las preguntas frecuentes\n• Reformular con otras palabras\n• Preguntarme sobre facturas, clientes, inventario o reportes\n\n¿En qué más puedo ayudarte?`,
          sender: 'bot',
          timestamp: new Date()
        }
        
        setIsTyping(false)
        setMessages(prev => [...prev, botResponse])
      }
    }, responseDelay)
  }

  const getFollowUpSuggestion = (category: string): string => {
    const suggestions: Record<string, string> = {
      'Facturas': '¿Te gustaría saber cómo personalizar el formato de tus facturas?',
      'Clientes': '¿Necesitas ayuda para gestionar la información de tus clientes?',
      'Productos': '¿Quieres aprender a configurar alertas de stock bajo?',
      'Pagos': '¿Te interesa saber sobre los diferentes métodos de pago?',
      'Configuración': '¿Necesitas cambiar alguna otra configuración?',
      'Reportes': '¿Te gustaría ver cómo analizar tus métricas de ventas?'
    }
    return suggestions[category] || ''
  }

  const getSuggestedQuestions = (userQuestion: string): string[] => {
    const lowerQuestion = userQuestion.toLowerCase()
    const suggestions: string[] = []

    if (lowerQuestion.includes('factura') || lowerQuestion.includes('cobrar')) {
      suggestions.push('¿Cómo crear una factura?', '¿Cómo personalizar facturas?')
    }
    if (lowerQuestion.includes('cliente')) {
      suggestions.push('¿Cómo agregar un nuevo cliente?')
    }
    if (lowerQuestion.includes('producto') || lowerQuestion.includes('inventario')) {
      suggestions.push('¿Cómo gestionar el inventario?')
    }
    if (lowerQuestion.includes('reporte') || lowerQuestion.includes('análisis')) {
      suggestions.push('¿Dónde veo mis reportes?')
    }

    return suggestions.slice(0, 3)
  }

  const handleQuickSuggestion = (suggestion: string) => {
    setInputValue(suggestion)
    setTimeout(() => handleSendMessage(), 100)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFAQClick = (faq: FAQ) => {
    setSelectedFAQ(faq)
  }

  const handleBack = () => {
    setSelectedFAQ(null)
  }

  const switchToChat = () => {
    setShowChat(true)
    setSelectedFAQ(null)
  }

  const switchToFAQs = () => {
    setShowChat(false)
  }

  // Función para renderizar texto con formato markdown simple
  const renderFormattedText = (text: string) => {
    // Dividir por líneas para mantener la estructura
    const lines = text.split('\n')
    
    return lines.map((line, index) => {
      // Encabezados con **texto**
      if (line.includes('**')) {
        const parts = line.split(/(\*\*.*?\*\*)/)
        return (
          <p key={index} className="mb-2">
            {parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>
              }
              return <span key={i}>{part}</span>
            })}
          </p>
        )
      }
      
      // Listas con * o +
      if (line.trim().startsWith('*') || line.trim().startsWith('+') || line.trim().startsWith('-')) {
        const content = line.trim().substring(1).trim()
        return (
          <li key={index} className="ml-4 mb-1 text-sm leading-relaxed">
            {content}
          </li>
        )
      }
      
      // Paso numerado
      if (/^\d+\./.test(line.trim())) {
        return (
          <li key={index} className="ml-4 mb-1 text-sm leading-relaxed list-decimal">
            {line.trim().replace(/^\d+\.\s*/, '')}
          </li>
        )
      }
      
      // Líneas vacías
      if (line.trim() === '') {
        return <div key={index} className="h-2" />
      }
      
      // Texto normal
      return <p key={index} className="mb-1 text-sm leading-relaxed">{line}</p>
    })
  }

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-40"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 relative group"
            >
              <MessageCircle className="h-6 w-6 text-white" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full animate-pulse" />
              
              {/* Tooltip */}
              <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="bg-slate-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap shadow-xl">
                  ¿Necesitas ayuda?
                  <div className="absolute top-full right-4 -mt-1">
                    <div className="border-4 border-transparent border-t-slate-900" />
                  </div>
                </div>
              </div>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="fixed bottom-20 right-4 left-4 md:left-auto md:right-6 z-40 w-auto md:w-full md:max-w-md"
          >
            <Card className="border-0 shadow-2xl h-[70vh] md:h-[600px] flex flex-col">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Asistente Virtual
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:bg-white/20 h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
                {/* Tabs */}
                <div className="flex border-b">
                  <button
                    onClick={switchToChat}
                    className={cn(
                      "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
                      showChat 
                        ? "border-blue-600 text-blue-600 bg-blue-50" 
                        : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    💬 Chat
                  </button>
                  <button
                    onClick={switchToFAQs}
                    className={cn(
                      "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
                      !showChat 
                        ? "border-blue-600 text-blue-600 bg-blue-50" 
                        : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    📚 FAQs
                  </button>
                </div>

                {showChat ? (
                  <>
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                      {messages.length === 1 && (
                        <div className="space-y-2 mb-4">
                          <p className="text-xs text-slate-500 text-center mb-2">Preguntas frecuentes:</p>
                          <div className="grid grid-cols-1 gap-2">
                            {quickSuggestions.map((suggestion, idx) => (
                              <motion.button
                                key={idx}
                                onClick={() => handleQuickSuggestion(suggestion)}
                                className="text-left p-2 text-xs bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                {suggestion}
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      )}

                      {messages.map((message, index) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className={cn(
                            "flex",
                            message.sender === 'user' ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[80%] rounded-lg px-4 py-3 shadow-sm",
                              message.sender === 'user'
                                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                                : "bg-white text-slate-900 border border-slate-200"
                            )}
                          >
                            {message.sender === 'bot' ? (
                              <div className="text-sm leading-relaxed">
                                {renderFormattedText(message.text)}
                              </div>
                            ) : (
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>
                            )}
                            {message.relatedFAQ && (
                              <button
                                onClick={() => handleFAQClick(message.relatedFAQ!)}
                                className={cn(
                                  "mt-2 text-xs hover:underline flex items-center gap-1 font-medium",
                                  message.sender === 'user' ? "text-blue-100" : "text-blue-600"
                                )}
                              >
                                📖 Ver detalles completos
                                <ChevronRight className="h-3 w-3" />
                              </button>
                            )}
                            <p className={cn(
                              "text-xs mt-1",
                              message.sender === 'user' ? "opacity-80" : "opacity-60"
                            )}>
                              {message.timestamp.toLocaleTimeString('es', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        </motion.div>
                      ))}

                      {/* Typing Indicator */}
                      {isTyping && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex justify-start"
                        >
                          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm">
                            <div className="flex gap-1">
                              <motion.div
                                className="w-2 h-2 bg-slate-400 rounded-full"
                                animate={{ y: [0, -6, 0] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                              />
                              <motion.div
                                className="w-2 h-2 bg-slate-400 rounded-full"
                                animate={{ y: [0, -6, 0] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                              />
                              <motion.div
                                className="w-2 h-2 bg-slate-400 rounded-full"
                                animate={{ y: [0, -6, 0] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="border-t p-3 bg-white">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Escribe tu pregunta aquí..."
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyPress={handleKeyPress}
                          className="flex-1"
                          disabled={isTyping}
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!inputValue.trim() || isTyping}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          {isTyping ? (
                            <>
                              {isUsingGrok ? (
                                <>
                                  <Sparkles className="h-3 w-3 text-purple-500 animate-pulse" />
                                  Consultando Groq AI...
                                </>
                              ) : (
                                '🤖 Escribiendo...'
                              )}
                            </>
                          ) : (
                            'Presiona Enter para enviar'
                          )}
                        </p>
                        {grokEnabled && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-purple-500" />
                            Groq AI
                          </Badge>
                        )}
                        {messages.length > 2 && (
                          <button
                            onClick={() => setMessages(messages.slice(0, 1))}
                            className="text-xs text-slate-500 hover:text-slate-700"
                          >
                            🗑️ Limpiar chat
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                ) : !selectedFAQ ? (
                  /* FAQ List View */
                  <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                    <div className="space-y-3">
                      {Object.entries(
                        FAQS.reduce((acc, faq) => {
                          if (!acc[faq.category]) acc[faq.category] = []
                          acc[faq.category].push(faq)
                          return acc
                        }, {} as Record<string, typeof FAQS>)
                      ).map(([category, faqs]) => (
                        <div key={category} className="space-y-2">
                          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            {category}
                          </h3>
                          <div className="space-y-2">
                            {faqs.map((faq) => (
                              <button
                                key={faq.id}
                                onClick={() => handleFAQClick(faq)}
                                className="w-full text-left p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-sm"
                              >
                                {faq.question}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* FAQ Detail View */
                  <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-4"
                    >
                      <ChevronRight className="h-4 w-4 rotate-180" />
                      Volver
                    </button>
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                      <h3 className="font-semibold text-lg text-slate-900 mb-2">
                        {selectedFAQ.question}
                      </h3>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {selectedFAQ.answer}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>

              {/* Footer - Only show in FAQ views */}
              {!showChat && (
                <div className="border-t p-3 bg-white">
                  <button
                    onClick={switchToChat}
                    className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    💬 Ir al Chat
                  </button>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
