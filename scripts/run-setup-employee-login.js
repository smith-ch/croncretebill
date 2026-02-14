/**
 * Script para crear las funciones de employee login
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function runScript() {
  console.log('\n=================================================================');
  console.log('CREANDO FUNCIONES PARA LOGIN ALTERNATIVO DE EMPLEADOS');
  console.log('=================================================================\n');

  const sqlPath = path.join(__dirname, '143-employee-login-functions.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  console.log('📄 Contenido del script SQL:');
  console.log('─'.repeat(65));
  console.log(sqlContent);
  console.log('─'.repeat(65));
  console.log('');
  console.log('⚠️  IMPORTANTE: Este script debe ejecutarse en Supabase SQL Editor');
  console.log('');
  console.log('📋 INSTRUCCIONES:');
  console.log('');
  console.log('1. Ve a: https://uhladddzopyimzolwbcb.supabase.co/project/_/sql/new');
  console.log('');
  console.log('2. Copia el contenido del archivo:');
  console.log('   scripts/143-employee-login-functions.sql');
  console.log('');
  console.log('3. Pégalo en el SQL Editor y ejecuta (RUN)');
  console.log('');
  console.log('4. Verifica que no haya errores');
  console.log('');
  console.log('5. Prueba el login alternativo en:');
  console.log('   http://localhost:3000/temp-access');
  console.log('');
  console.log('=================================================================');
  console.log('');
  console.log('💡 EMPLEADOS DISPONIBLES:');
  console.log('  • test0@gmail.com (chepi)');
  console.log('  • smith_18r@test.com (ds)');
  console.log('');
  console.log('Usa sus contraseñas reales que configuraste al crearlos.');
  console.log('');
}

runScript().catch(console.error);
