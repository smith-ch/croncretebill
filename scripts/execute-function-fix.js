// Script para ejecutar el fix de create_manual_subscription
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'https://uhladddzopyimzolwbcb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobGFkZGR6b3B5aW16b2x3YmNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzkwMDI1NiwiZXhwIjoyMDY5NDc2MjU2fQ.mw77YTe5II6IYAdT-yC39IjQpNer0HeEhdfhtk6DGPE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeFix() {
  console.log('🔧 Ejecutando fix para create_manual_subscription...\n')
  
  try {
    console.log('📝 Paso 1: Actualizando función create_manual_subscription...')
    
    const functionSQL = `
CREATE OR REPLACE FUNCTION create_manual_subscription(
  p_user_email VARCHAR(255),
  p_plan_name VARCHAR(100),
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_status VARCHAR(50) DEFAULT 'active',
  p_billing_cycle VARCHAR(50) DEFAULT 'monthly',
  p_manager_email VARCHAR(255) DEFAULT 'smithrodriguez345@gmail.com',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_plan_id UUID;
  v_manager_id UUID;
  v_subscription_id UUID;
  v_result JSON;
BEGIN
  -- Buscar usuario
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_user_email;

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Usuario no encontrado: ' || p_user_email
    );
  END IF;

  -- Buscar plan
  SELECT id INTO v_plan_id
  FROM subscription_plans
  WHERE name = p_plan_name AND is_active = true;

  IF v_plan_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Plan no encontrado o inactivo: ' || p_plan_name
    );
  END IF;

  -- Buscar manager
  SELECT id INTO v_manager_id
  FROM auth.users
  WHERE email = p_manager_email;

  -- Crear o actualizar suscripción
  INSERT INTO user_subscriptions (
    user_id,
    plan_id,
    start_date,
    end_date,
    status,
    billing_cycle,
    managed_by,
    notes,
    current_max_users,
    current_max_invoices,
    current_max_products,
    current_max_clients
  )
  SELECT
    v_user_id,
    v_plan_id,
    p_start_date,
    p_end_date,
    p_status,
    p_billing_cycle,
    v_manager_id,
    p_notes,
    sp.max_users,
    sp.max_invoices,
    sp.max_products,
    sp.max_clients
  FROM subscription_plans sp
  WHERE sp.id = v_plan_id
  ON CONFLICT (user_id) DO UPDATE SET
    plan_id = v_plan_id,
    start_date = p_start_date,
    end_date = p_end_date,
    status = p_status,
    billing_cycle = p_billing_cycle,
    managed_by = v_manager_id,
    notes = p_notes,
    updated_at = NOW()
  RETURNING id INTO v_subscription_id;

  -- Registrar en historial
  INSERT INTO subscription_history (
    subscription_id,
    user_id,
    action,
    new_status,
    reason,
    changed_by,
    changed_by_email
  )
  VALUES (
    v_subscription_id,
    v_user_id,
    'created',
    p_status,
    p_notes,
    v_manager_id,
    p_manager_email
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Suscripción creada correctamente',
    'subscription_id', v_subscription_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`

    // Nota: Supabase JS client no puede ejecutar CREATE FUNCTION directamente
    // Este SQL debe ejecutarse en el SQL Editor de Supabase
    console.log('⚠️  La función SQL debe ejecutarse en Supabase SQL Editor')
    console.log('   Ve a: https://app.supabase.com → SQL Editor')
    console.log('   Y ejecuta el archivo: FIX-CREATE-MANUAL-SUBSCRIPTION-FUNCTION.sql\n')

    console.log('📝 Paso 2: Probando la función corregida...')
    
    // Probar con un usuario real
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('email')
      .limit(1)
      .single()
    
    if (profileError) {
      console.error('❌ Error obteniendo perfil:', profileError)
      return
    }

    console.log(`   Probando con usuario: ${profiles.email}`)
    
    const { data: testData, error: testError } = await supabase.rpc('create_manual_subscription', {
      p_user_email: profiles.email,
      p_plan_name: 'free',
      p_start_date: new Date().toISOString(),
      p_end_date: null,
      p_status: 'active',
      p_billing_cycle: 'monthly',
      p_manager_email: 'smithrodriguez345@gmail.com',
      p_notes: 'Test de función corregida'
    })
    
    if (testError) {
      console.error('❌ Error probando función:', testError)
      console.log('\n📋 Detalles del error:')
      console.log('   Código:', testError.code)
      console.log('   Mensaje:', testError.message)
      console.log('\n⚠️  La función aún no se ha actualizado. Ejecuta el SQL en Supabase.')
    } else {
      console.log('✅ Función funcionando correctamente!')
      console.log('   Respuesta:', testData)
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

console.log('═══════════════════════════════════════════════════════════')
console.log('  FIX PARA CREAR SUSCRIPCIONES')
console.log('═══════════════════════════════════════════════════════════')
console.log('')
console.log('🔍 Problema detectado:')
console.log('   La función create_manual_subscription usa max_invoices_per_month')
console.log('   pero la columna real se llama max_invoices')
console.log('')
console.log('✅ Solución:')
console.log('   1. Ejecuta FIX-CREATE-MANUAL-SUBSCRIPTION-FUNCTION.sql en Supabase')
console.log('   2. O copia el contenido en SQL Editor y ejecútalo')
console.log('')
console.log('═══════════════════════════════════════════════════════════')
console.log('')

executeFix()
