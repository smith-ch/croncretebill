// Script para verificar la estructura de subscription_history
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://uhladddzopyimzolwbcb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobGFkZGR6b3B5aW16b2x3YmNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzkwMDI1NiwiZXhwIjoyMDY5NDc2MjU2fQ.mw77YTe5II6IYAdT-yC39IjQpNer0HeEhdfhtk6DGPE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkStructure() {
  console.log('🔍 Verificando estructura de subscription_history...\n')
  
  try {
    const { data, error } = await supabase
      .from('subscription_history')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }

    if (data && data.length > 0) {
      console.log('📊 Columnas disponibles en subscription_history:')
      Object.keys(data[0]).forEach(key => {
        console.log(`   ✓ ${key}`)
      })
    } else {
      console.log('⚠️  No hay registros en subscription_history')
      console.log('   Intentando obtener estructura desde la tabla vacía...')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkStructure()
