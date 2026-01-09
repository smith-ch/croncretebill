// Script para verificar las funciones RPC en Supabase
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://uhladddzopyimzolwbcb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobGFkZGR6b3B5aW16b2x3YmNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzkwMDI1NiwiZXhwIjoyMDY5NDc2MjU2fQ.mw77YTe5II6IYAdT-yC39IjQpNer0HeEhdfhtk6DGPE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testRPCFunctions() {
  console.log('🔍 Verificando funciones RPC en Supabase...\n')
  
  try {
    // Test 1: Verificar que la función existe
    console.log('📝 Test 1: Verificar función create_manual_subscription')
    
    const { data: testData, error: testError } = await supabase.rpc('create_manual_subscription', {
      p_user_email: 'test@example.com',
      p_plan_name: 'free',
      p_start_date: new Date().toISOString(),
      p_end_date: null,
      p_status: 'active',
      p_billing_cycle: 'monthly',
      p_manager_email: 'smithrodriguez345@gmail.com',
      p_notes: 'Test de verificación'
    })
    
    if (testError) {
      console.error('❌ Error llamando a la función:', testError)
      console.log('\n📋 Detalles del error:')
      console.log('   Código:', testError.code)
      console.log('   Mensaje:', testError.message)
      console.log('   Detalles:', testError.details)
      console.log('   Hint:', testError.hint)
    } else {
      console.log('✅ Función ejecutada (puede que el usuario no exista, pero la función funciona)')
      console.log('   Respuesta:', testData)
    }

    // Test 2: Verificar que existe la tabla user_profiles con email
    console.log('\n📝 Test 2: Verificar estructura de user_profiles')
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, email, display_name')
      .limit(5)
    
    if (profilesError) {
      console.error('❌ Error consultando user_profiles:', profilesError)
    } else {
      console.log(`✅ Tabla user_profiles accesible (${profiles.length} registros)`)
      profiles.forEach(p => {
        console.log(`   - ${p.email || 'SIN EMAIL'} (${p.display_name})`)
      })
    }

    // Test 3: Verificar usuarios en auth.users
    console.log('\n📝 Test 3: Verificar usuarios en auth.users')
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Error consultando auth.users:', authError)
    } else {
      console.log(`✅ Usuarios en auth.users: ${authData.users.length}`)
      authData.users.slice(0, 5).forEach(u => {
        console.log(`   - ${u.email}`)
      })
    }

    // Test 4: Verificar planes
    console.log('\n📝 Test 4: Verificar planes de suscripción')
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('id, name, display_name, is_active')
    
    if (plansError) {
      console.error('❌ Error consultando planes:', plansError)
    } else {
      console.log(`✅ Planes disponibles: ${plans.length}`)
      plans.forEach(p => {
        console.log(`   - ${p.name} (${p.display_name}) - ${p.is_active ? 'Activo' : 'Inactivo'}`)
      })
    }

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

testRPCFunctions()
