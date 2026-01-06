// Script para verificar cuántas suscripciones hay en la base de datos
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://uhladdzdqpyimzolwbcb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobGFkZHpkcXB5aW16b2x3YmNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQyODU4OTAsImV4cCI6MjA0OTg2MTg5MH0.RDHPE0M0qGWgjVaFw0xcmkxj0ygE06ld_LxZY5l3c1A'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSubscriptions() {
  console.log('🔍 Verificando suscripciones...\n')

  // 1. Ver todos los owners
  const { data: owners, error: ownersError } = await supabase
    .from('user_profiles')
    .select('user_id, email, display_name, parent_user_id')
    .is('parent_user_id', null)

  if (ownersError) {
    console.error('❌ Error al cargar owners:', ownersError)
    return
  }

  console.log(`📊 Total de OWNERS (usuarios principales): ${owners.length}`)
  owners.forEach(owner => {
    console.log(`   - ${owner.email} (ID: ${owner.user_id})`)
  })

  // 2. Ver todas las suscripciones
  const { data: allSubs, error: allSubsError } = await supabase
    .from('user_subscriptions')
    .select('*')

  if (allSubsError) {
    console.error('❌ Error al cargar suscripciones:', allSubsError)
    return
  }

  console.log(`\n📊 Total de SUSCRIPCIONES: ${allSubs.length}`)
  allSubs.forEach(sub => {
    console.log(`   - User ID: ${sub.user_id}, Status: ${sub.status}, Plan ID: ${sub.plan_id}`)
  })

  // 3. Ver suscripciones de owners
  const ownerIds = owners.map(o => o.user_id)
  
  const { data: ownerSubs, error: ownerSubsError } = await supabase
    .from('user_subscriptions')
    .select('*')
    .in('user_id', ownerIds)

  if (ownerSubsError) {
    console.error('❌ Error al cargar suscripciones de owners:', ownerSubsError)
    return
  }

  console.log(`\n📊 Suscripciones de OWNERS: ${ownerSubs.length}`)
  ownerSubs.forEach(sub => {
    const owner = owners.find(o => o.user_id === sub.user_id)
    console.log(`   - ${owner?.email}: ${sub.status} (${sub.billing_cycle})`)
  })

  // 4. Ver owners SIN suscripción
  const ownersWithSubs = new Set(ownerSubs.map(s => s.user_id))
  const ownersWithoutSubs = owners.filter(o => !ownersWithSubs.has(o.user_id))

  console.log(`\n📊 Owners SIN suscripción: ${ownersWithoutSubs.length}`)
  ownersWithoutSubs.forEach(owner => {
    console.log(`   - ${owner.email}`)
  })

  console.log('\n✅ Verificación completa')
}

checkSubscriptions().catch(console.error)
