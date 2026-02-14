/**
 * Script para recrear empleados en auth.users usando Admin API
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const TEMP_PASSWORD = 'Empleado123!';

async function recreateEmployees() {
  console.log('\n=================================================================');
  console.log('RECREANDO EMPLEADOS EN AUTH.USERS');
  console.log('=================================================================\n');
  console.log(`⚠️  Contraseña temporal: ${TEMP_PASSWORD}\n`);

  try {
    // 1. Obtener empleados de user_profiles
    const { data: employees, error: empError } = await supabase
      .from('user_profiles')
      .select('user_id, email, display_name, parent_user_id')
      .not('parent_user_id', 'is', null);

    if (empError) {
      console.error('❌ Error consultando empleados:', empError.message);
      return;
    }

    console.log(`Empleados a procesar: ${employees.length}\n`);

    // 2. Listar usuarios existentes en auth
    const { data: authData, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listando usuarios:', listError.message);
      return;
    }

    const existingEmails = authData.users.map(u => u.email);

    // 3. Procesar cada empleado
    for (const emp of employees) {
      console.log(`Procesando: ${emp.display_name} (${emp.email})`);

      if (existingEmails.includes(emp.email)) {
        console.log('  ℹ️  Ya existe en auth.users, saltando...\n');
        continue;
      }

      // Crear usuario con Admin API
      console.log('  🔧 Creando en auth.users...');
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: emp.email,
        password: TEMP_PASSWORD,
        email_confirm: true,
        user_metadata: {
          display_name: emp.display_name
        }
      });

      if (createError) {
        console.log(`  ❌ Error: ${createError.message}\n`);
        continue;
      }

      console.log(`  ✅ Creado exitosamente con ID: ${newUser.user.id}\n`);
    }

    console.log('=================================================================');
    console.log('VERIFICACIÓN FINAL');
    console.log('=================================================================\n');

    // Verificar estado final
    const { data: finalAuthData } = await supabase.auth.admin.listUsers();
    const finalEmails = finalAuthData.users.map(u => u.email);
    
    for (const emp of employees) {
      const exists = finalEmails.includes(emp.email);
      const status = exists ? '✅ OK' : '❌ FALTA';
      console.log(`${status} ${emp.display_name} (${emp.email})`);
    }

    console.log('\n=================================================================');
    console.log('✅ PROCESO COMPLETADO');
    console.log('=================================================================\n');
    console.log('Ahora puedes probar el login en:');
    console.log('  http://localhost:3000/temp-access\n');
    console.log('Credenciales:');
    employees.forEach(emp => {
      console.log(`  Email: ${emp.email}`);
    });
    console.log(`  Password: ${TEMP_PASSWORD}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

recreateEmployees();
