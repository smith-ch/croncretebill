// Script para actualizar la numeración de comprobantes
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Leer variables de entorno
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno de Supabase no encontradas')
  console.log('Asegúrate de que .env.local tenga:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL')
  console.log('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateReceiptNumbering() {
  try {
    console.log('🔄 Ejecutando script para simplificar numeración...')
    
    // Leer el script SQL
    const sqlScript = fs.readFileSync(
      path.join(__dirname, 'scripts', '23-simplify-receipt-numbering.sql'), 
      'utf8'
    )
    
    // Ejecutar la función de numeración actualizada
    const { error } = await supabase.rpc('exec', { sql: sqlScript })
    
    if (error) {
      console.error('❌ Error ejecutando script:', error.message)
      return
    }
    
    console.log('✅ Función de numeración actualizada exitosamente')
    console.log('📝 Formato nuevo: CPG-NNNN (empezando desde 1)')
    console.log('💡 Los próximos comprobantes usarán el nuevo formato')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

updateReceiptNumbering()