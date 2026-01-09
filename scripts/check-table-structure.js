// Script para verificar la estructura de subscription_plans
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://uhladddzopyimzolwbcb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobGFkZGR6b3B5aW16b2x3YmNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzkwMDI1NiwiZXhwIjoyMDY5NDc2MjU2fQ.mw77YTe5II6IYAdT-yC39IjQpNer0HeEhdfhtk6DGPE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTableStructure() {
  console.log('🔍 Verificando estructura de subscription_plans...\n')
  
  try {
    // Obtener un plan para ver sus columnas
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .limit(1)
      .single()
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }

    console.log('📊 Columnas disponibles en subscription_plans:')
    Object.keys(data).forEach(key => {
      console.log(`   ✓ ${key}: ${typeof data[key]} = ${data[key]}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkTableStructure()
