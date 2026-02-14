/**
 * Script para ejecutar la recreación de empleados en auth.users
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

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

    // 2. Procesar cada empleado
    for (const emp of employees) {
      console.log(`Procesando: ${emp.display_name} (${emp.email})`);

      // Verificar si ya existe en auth usando Admin API
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.log(`  ❌ Error verificando usuarios: ${listError.message}\n`);
        continue;
      }

      const existingUser = users.find(u => u.email === emp.email);

      if (existingUser) {
        console.log('  ℹ️  Ya existe en auth.users, saltando...\n');
        continue;
      }

      // Usar la Admin API para crear el usuario
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

      console.log(`  ✅ Creado exitosamente con ID: ${newUser.user.id}`);
      
      // Actualizar el user_id en user_profiles si es necesario
      if (newUser.user.id !== emp.user_id) {
        console.log('  ⚠️  El ID generado es diferente al de user_profiles');
        console.log(`     Antiguo: ${emp.user_id}`);
        console.log(`     Nuevo: ${newUser.user.id}`);
        
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ user_id: newUser.user.id })
          .eq('user_id', emp.user_id);

        if (updateError) {
          console.log(`  ❌ Error actualizando user_profiles: ${updateError.message}`);
        } else {
          console.log('  ✅ user_profiles actualizado');
        }
      }
      
      console.log('');
    }

    console.log('=================================================================');
    console.log('VERIFICACIÓN FINAL');
    console.log('={ users: allUsers } } = await supabase.auth.admin.listUsers();
    
    for (const emp of finalCheck) {
      const exists = allUsers.some(u => u.email === emp.email);
      const status = exists)
        .single();

      const status = authCheck ? '✅ OK' : '❌ FALTA';
      console.log(`${status} ${emp.display_name} (${emp.email})`);
    }

    console.log('\n=================================================================');
    console.log('✅ PROCESO COMPLETADO');
    console.log('=================================================================\n');
    console.log('Ahora puedes probar el login en:');
    console.log('  http://localhost:3000/temp-access\n');
    console.log('Credenciales:');
    finalCheck.forEach(emp => {
      console.log(`  Email: ${emp.email}`);
    });
    console.log(`  Password: ${TEMP_PASSWORD}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

recreateEmployees().catch(console.error);
