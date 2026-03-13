import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

function getGroqApiKey(): string | undefined {
  return process.env.GROQ_API_KEY || 
         process.env.NEXT_PUBLIC_GROQ_API_KEY
}

async function generateQuoteWithGroq(): Promise<string> {
  const apiKey = getGroqApiKey()
  
  if (!apiKey) {
    throw new Error('Groq API key no configurada')
  }

  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentSecond = now.getSeconds()
  
  // Generar variación con timestamp para evitar cache
  const randomSeed = Math.floor(Math.random() * 1000)
  const timestamp = `${currentHour}:${currentMinute}:${currentSecond}:${randomSeed}`
  
  // Temas variados para mayor diversidad
  const themes = [
    'éxito empresarial y perseverancia',
    'ventas y relaciones con clientes',
    'innovación y creatividad en negocios',
    'liderazgo y gestión de equipos',
    'productividad y organización',
    'crecimiento personal y profesional',
    'estrategia y visión empresarial',
    'superación de obstáculos',
    'oportunidades y acción',
    'excelencia y calidad en el servicio'
  ]
  
  const randomTheme = themes[Math.floor(Math.random() * themes.length)]
  
  let timeContext = ''
  if (currentHour < 12) {
    timeContext = 'Buenos días! Es una mañana perfecta para comenzar con energía.'
  } else if (currentHour < 18) {
    timeContext = 'Buenas tardes! La jornada continúa con buen ritmo.'
  } else {
    timeContext = 'Buenas noches! Es momento de cerrar el día con éxito.'
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente motivacional para emprendedores y dueños de negocios. Genera frases ÚNICAS, inspiradoras y positivas relacionadas con negocios. Cada frase debe ser completamente diferente a las anteriores. Las frases deben ser en español, máximo 15 palabras, sin comillas y directas. Sé creativo y varía mucho el contenido.'
          },
          {
            role: 'user',
            content: `${timeContext} Tema: ${randomTheme}. ID único: ${timestamp}. Dame UNA frase motivacional COMPLETAMENTE DIFERENTE para un empresario. Solo la frase, sin comillas ni formato adicional.`
          }
        ],
        temperature: 1.2,
        max_tokens: 100,
        top_p: 0.95,
      }),
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No se recibió respuesta de Groq AI')
    }

    return data.choices[0].message.content.trim()
  } catch (error) {
    console.error('Error al generar frase con Groq:', error)
    throw error
  }
}

// Frases de respaldo en caso de fallo de la IA
const fallbackQuotes = [
  'Cada venta es una oportunidad para construir relaciones duraderas.',
  'El éxito es la suma de pequeños esfuerzos repetidos día tras día.',
  'Tu negocio crece cuando tú creces como empresario.',
  'La excelencia no es un acto, es un hábito en tu negocio.',
  'Hoy es el día perfecto para superar tus metas de ventas.',
  'La innovación distingue a los líderes de los seguidores.',
  'Cada cliente satisfecho es tu mejor publicidad.',
  'El éxito no es final, el fracaso no es fatal: es el coraje para continuar lo que cuenta.',
  'La mejor inversión es la que haces en mejorar tu negocio.',
  'Las grandes cosas en los negocios nunca son hechas por una sola persona, sino por un equipo.',
]

export async function GET() {
  try {
    // Intentar generar frase con Groq AI
    try {
      const quote = await generateQuoteWithGroq()
      return NextResponse.json({ 
        quote,
        source: 'groq-ai',
        timestamp: new Date().toISOString()
      })
    } catch (groqError) {
      console.warn('Groq AI no disponible, usando frase de respaldo:', groqError)
      // Si falla, usar frase de respaldo aleatoria
      const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)]
      return NextResponse.json({ 
        quote: randomQuote,
        source: 'fallback',
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('Error al obtener frase del día:', error)
    return NextResponse.json(
      { error: 'Error al generar frase del día' },
      { status: 500 }
    )
  }
}
