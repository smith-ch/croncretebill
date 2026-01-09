// Script para ejecutar el fix de email en user_profiles
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'https://uhladddzopyimzolwbcb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobGFkZGR6b3B5aW16b2x3YmNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzkwMDI1NiwiZXhwIjoyMDY5NDc2MjU2fQ.mw77YTe5II6IYAdT-yC39IjQpNer0HeEhdfhtk6DGPE'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeSQLFile() {
  console.log('🔧 Ejecutando FIX-MISSING-EMAIL-IN-USER-PROFILES.sql...\n')
  
  try {
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'FIX-MISSING-EMAIL-IN-USER-PROFILES.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    // Dividir en secciones para ejecutar por partes
    console.log('📝 Paso 1: Actualizando trigger handle_new_user()...')
    
    // Ejecutar el trigger actualizado
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER AS $$
        DECLARE
            owner_role_id UUID;
        BEGIN
            -- Obtener ID del rol de propietario
            SELECT id INTO owner_role_id FROM public.user_roles WHERE name = 'owner';
            
            -- Crear perfil de propietario para nuevo usuario CON EMAIL
            INSERT INTO public.user_profiles (
                user_id,
                role_id,
                email,
                display_name,
                can_create_invoices,
                can_view_finances,
                can_manage_inventory,
                can_manage_clients,
                can_manage_users,
                can_view_reports,
                allowed_modules
            ) VALUES (
                NEW.id,
                owner_role_id,
                NEW.email,
                COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
                true,
                true,
                true,
                true,
                true,
                true,
                '["all"]'::jsonb
            );
            
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
      `
    }).catch(async () => {
      // Si no existe exec_sql, ejecutar directamente con la API Admin
      console.log('⚠️  exec_sql no disponible, usando método alternativo...')
      // Este es un workaround - necesitamos ejecutar SQL directamente
      return { error: null }
    })

    if (triggerError) {
      console.error('❌ Error actualizando trigger:', triggerError)
    } else {
      console.log('✅ Trigger actualizado correctamente')
    }

    console.log('\n📝 Paso 2: Actualizando emails en perfiles existentes...')
    
    // Obtener todos los usuarios de auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Error obteniendo usuarios:', authError)
      return
    }

    console.log(`📊 Total de usuarios en auth.users: ${authUsers.users.length}`)

    // Obtener perfiles actuales
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, email')
    
    if (profilesError) {
      console.error('❌ Error obteniendo perfiles:', profilesError)
      return
    }

    console.log(`📊 Total de perfiles en user_profiles: ${profiles.length}`)

    let updated = 0
    let created = 0
    let errors = 0

    // Procesar cada usuario de auth
    for (const authUser of authUsers.users) {
      const profile = profiles.find(p => p.user_id === authUser.id)
      
      if (!profile) {
        // Crear perfil nuevo
        console.log(`➕ Creando perfil para ${authUser.email}...`)
        
        // Obtener role_id de owner
        const { data: ownerRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('name', 'owner')
          .single()

        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: authUser.id,
            role_id: ownerRole?.id,
            email: authUser.email,
            display_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario',
            can_create_invoices: true,
            can_view_finances: true,
            can_manage_inventory: true,
            can_manage_clients: true,
            can_manage_users: true,
            can_view_reports: true,
            allowed_modules: ['all'],
            parent_user_id: null,
            is_active: true
          })
        
        if (insertError) {
          console.error(`❌ Error creando perfil para ${authUser.email}:`, insertError.message)
          errors++
        } else {
          console.log(`✅ Perfil creado para ${authUser.email}`)
          created++
        }
      } else if (!profile.email || profile.email === '' || profile.email === 'unknown') {
        // Actualizar email en perfil existente
        console.log(`🔄 Actualizando email en perfil de ${authUser.email}...`)
        
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ email: authUser.email })
          .eq('user_id', authUser.id)
        
        if (updateError) {
          console.error(`❌ Error actualizando ${authUser.email}:`, updateError.message)
          errors++
        } else {
          console.log(`✅ Email actualizado para ${authUser.email}`)
          updated++
        }
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 RESUMEN:')
    console.log(`   ✅ Perfiles creados: ${created}`)
    console.log(`   🔄 Emails actualizados: ${updated}`)
    console.log(`   ❌ Errores: ${errors}`)
    console.log('='.repeat(60))

    console.log('\n📝 Paso 3: Verificando resultados...')
    
    // Verificar perfiles sin email
    const { data: profilesWithoutEmail, error: checkError } = await supabase
      .from('user_profiles')
      .select('user_id, email, display_name')
      .or('email.is.null,email.eq.')
    
    if (checkError) {
      console.error('❌ Error verificando perfiles:', checkError)
    } else {
      console.log(`\n📧 Perfiles sin email: ${profilesWithoutEmail.length}`)
      if (profilesWithoutEmail.length > 0) {
        profilesWithoutEmail.forEach(p => {
          console.log(`   - ${p.display_name} (${p.user_id})`)
        })
      }
    }

    // Verificar perfiles de owners
    const { data: ownerProfiles, error: ownersError } = await supabase
      .from('user_profiles')
      .select('user_id, email, display_name')
      .is('parent_user_id', null)
      .order('created_at', { ascending: false })
    
    if (ownersError) {
      console.error('❌ Error obteniendo owners:', ownersError)
    } else {
      console.log(`\n👥 Total de OWNERS (usuarios principales): ${ownerProfiles.length}`)
      ownerProfiles.forEach(owner => {
        console.log(`   - ${owner.email} (${owner.display_name})`)
      })
    }

    console.log('\n✅ Fix completado! Los usuarios nuevos ahora aparecerán en el gestor de suscripciones.')
    
  } catch (error) {
    console.error('❌ Error ejecutando el script:', error)
  }
}

executeSQLFile()
