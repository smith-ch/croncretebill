/**
 * Script para diagnosticar y reparar el error 500 en login de empleados
 * Ejecuta: node scripts/run-fix-employee-login.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runScript() {
  console.log('\n=================================================================');
  console.log('EJECUTANDO DIAGNÓSTICO Y REPARACIÓN DE LOGIN DE EMPLEADOS');
  console.log('=================================================================\n');

  // Leer el script SQL
  const sqlPath = path.join(__dirname, '141-diagnose-and-fix-employee-login-500.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  try {
    // El script tiene 2 bloques DO $$, necesitamos ejecutarlos por separado
    const blocks = sqlContent.split('-- PARTE 2: REPARACIÓN');
    
    // Ejecutar PARTE 1: DIAGNÓSTICO
    console.log('📊 EJECUTANDO PARTE 1: DIAGNÓSTICO...\n');
    const { error: diagError } = await supabase.rpc('exec_sql', { 
      sql_query: blocks[0] 
    });
    
    if (diagError) {
      // Intentar método alternativo
      console.log('Método RPC no disponible, ejecutando directamente...\n');
      
      // Ejecutar diagnóstico directo
      const { data: employees, error: empError } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          email,
          display_name,
          parent_user_id,
          is_active
        `)
        .not('parent_user_id', 'is', null);
      
      if (empError) {
        console.error('❌ Error consultando empleados:', empError.message);
        return;
      }
      
      console.log(`\nEncontrados ${employees.length} empleados en user_profiles\n`);
      
      for (const emp of employees) {
        console.log(`Empleado: ${emp.email}`);
        console.log(`  - ID: ${emp.user_id}`);
        console.log(`  - Nombre: ${emp.display_name}`);
        console.log(`  - Activo: ${emp.is_active ? 'Sí' : 'No'}`);
        console.log(`  - Parent ID: ${emp.parent_user_id}`);
        console.log('');
      }
    }
    
    console.log('\n=================================================================');
    console.log('INSTRUCCIONES PARA REPARAR');
    console.log('=================================================================\n');
    console.log('Para reparar los empleados, necesitas ejecutar el SQL directamente');
    console.log('en Supabase Dashboard:\n');
    console.log('1. Ve a: https://uhladddzopyimzolwbcb.supabase.co/project/_/sql/new');
    console.log('2. Copia y pega el contenido del archivo:');
    console.log('   scripts/141-diagnose-and-fix-employee-login-500.sql');
    console.log('3. Ejecuta el script completo');
    console.log('4. Revisa los mensajes de diagnóstico y reparación\n');
    
    console.log('ALTERNATIVA: Usar psql directamente');
    console.log('Si tienes psql instalado y la DATABASE_URL:\n');
    console.log('psql $DATABASE_URL -f scripts/141-diagnose-and-fix-employee-login-500.sql\n');
    
  } catch (error) {
    console.error('❌ Error ejecutando script:', error.message);
  }
}

// Ejecutar
runScript().catch(console.error);
