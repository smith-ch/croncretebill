/**
 * Script para verificar el estado del empleado
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkEmployee() {
  console.log('\n=================================================================');
  console.log('VERIFICANDO ESTADO DE EMPLEADOS');
  console.log('=================================================================\n');

  // Verificar empleados
  const { data: employees, error } = await supabase
    .from('user_profiles')
    .select(`
      user_id,
      email,
      display_name,
      parent_user_id,
      root_owner_id,
      is_active,
      user_roles(name)
    `)
    .not('parent_user_id', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error consultando empleados:', error.message);
    return;
  }

  console.log(`Empleados encontrados: ${employees.length}\n`);

  for (const emp of employees) {
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`Email: ${emp.email}`);
    console.log(`Nombre: ${emp.display_name}`);
    console.log(`ID: ${emp.user_id}`);
    console.log(`Parent (Owner): ${emp.parent_user_id}`);
    console.log(`Root Owner: ${emp.root_owner_id}`);
    console.log(`Estado: ${emp.is_active ? '✅ ACTIVO' : '❌ INACTIVO'}`);
    console.log(`Rol: ${emp.user_roles?.name || 'N/A'}`);
    
    // Verificar si existe en auth.users
    const { data: authUser, error: authError } = await supabase
      .from('auth.users')
      .select('id, email, email_confirmed_at')
      .eq('email', emp.email)
      .single();

    if (authError) {
      console.log(`⚠️  NO EXISTE en auth.users - PROBLEMA!`);
    } else {
      console.log(`✅ Existe en auth.users`);
      console.log(`   Email confirmado: ${authUser.email_confirmed_at ? 'Sí' : 'No'}`);
    }
    console.log('');
  }

  console.log('=================================================================');
  console.log('\n💡 SOLUCIONES:');
  console.log('');
  console.log('Si el empleado está INACTIVO:');
  console.log('  UPDATE user_profiles SET is_active = true WHERE email = \'email@example.com\';');
  console.log('');
  console.log('Si NO existe en auth.users:');
  console.log('  Necesitas recrear el empleado con create_employee_direct()');
  console.log('');
}

checkEmployee().catch(console.error);
