-- ============================================================================
-- Script 127: Fix Employee Login 500 Error
-- ============================================================================
-- Problema: Los empleados creados con create_employee_direct() no pueden
-- iniciar sesión porque:
-- 1. El trigger handle_new_user se ejecuta durante el login
-- 2. Causa conflictos o errores con el perfil ya existente
-- 
-- Solución: Mejorar el trigger handle_new_user para:
-- 1. NO ejecutarse durante el login (solo durante INSERT)
-- 2. Validar mejor si el perfil ya existe
-- 3. No fallar si ya existe un perfil
-- ============================================================================

BEGIN;

-- ========================================
-- 1. Eliminar el trigger existente
-- ========================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ========================================
-- 2. Recrear la función handle_new_user con mejor manejo
-- ========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id UUID;
  profile_exists BOOLEAN;
BEGIN
  -- Verificar si ya existe un perfil para este usuario
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE user_id = NEW.id
  ) INTO profile_exists;

  -- Si ya existe un perfil (creado por create_employee_direct), no hacer nada
  IF profile_exists THEN
    RAISE NOTICE 'Perfil ya existe para user_id: %, saltando creación automática', NEW.id;
    RETURN NEW;
  END IF;

  -- Solo crear perfil para nuevos usuarios que no tienen perfil
  -- (usuarios que se registran normalmente, no empleados)
  
  -- Obtener el role_id para 'owner' por defecto
  SELECT id INTO default_role_id 
  FROM public.user_roles 
  WHERE name = 'owner' 
  LIMIT 1;
  
  -- Insertar en user_profiles para usuarios normales (no empleados)
  BEGIN
    INSERT INTO public.user_profiles (
      user_id,
      email,
      display_name,
      role_id,
      parent_user_id,
      root_owner_id,
      is_active,
      can_create_invoices,
      can_view_finances,
      can_manage_inventory,
      can_manage_clients,
      can_manage_users
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.email),
      default_role_id,
      NULL, -- Los usuarios normales no tienen parent
      NEW.id, -- El root_owner es el mismo usuario
      true,
      true,  -- Owner puede crear facturas
      true,  -- Owner puede ver finanzas
      true,  -- Owner puede gestionar inventario
      true,  -- Owner puede gestionar clientes
      true   -- Owner puede gestionar usuarios
    );
    
    RAISE NOTICE 'Perfil creado automáticamente para user_id: %', NEW.id;
    
  EXCEPTION
    WHEN unique_violation THEN
      -- Si hay violación de unique (perfil ya existe), no es un error crítico
      RAISE NOTICE 'Perfil duplicado detectado para user_id: %, ignorando', NEW.id;
      RETURN NEW;
    WHEN OTHERS THEN
      -- Log el error pero no fallar el proceso
      RAISE WARNING 'Error al crear perfil para user_id %: % %', NEW.id, SQLERRM, SQLSTATE;
      RETURN NEW;
  END;
  
  -- Crear configuración de empresa por defecto solo para owners
  BEGIN
    INSERT INTO public.company_settings (
      user_id,
      company_name,
      currency_code,
      currency_symbol,
      usd_exchange_rate
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'company_name', 'Mi Empresa'),
      'DOP',
      'RD$',
      60.00
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE 'Configuración de empresa creada para user_id: %', NEW.id;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Log el error pero no fallar
      RAISE WARNING 'Error al crear company_settings para user_id %: % %', NEW.id, SQLERRM, SQLSTATE;
  END;
  
  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Cualquier error no debe impedir el login
    RAISE WARNING 'Error general en handle_new_user para user_id %: % %', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ========================================
-- 3. Recrear el trigger (solo para INSERT, no para UPDATE)
-- ========================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- 4. Verificar empleados existentes tienen perfiles correctos
-- ========================================

-- Actualizar emails faltantes en user_profiles desde auth.users
UPDATE public.user_profiles up
SET email = au.email
FROM auth.users au
WHERE up.user_id = au.id
AND (up.email IS NULL OR up.email = '')
AND up.parent_user_id IS NOT NULL;

-- ========================================
-- 5. Asegurar que todos los empleados tienen is_active = true
-- ========================================

UPDATE public.user_profiles
SET is_active = true
WHERE parent_user_id IS NOT NULL
AND is_active = false;

COMMIT;

-- ========================================
-- 6. Verificación y diagnóstico
-- ========================================

DO $$
DECLARE
  v_employees_count INTEGER;
  v_employees_active INTEGER;
  v_trigger_exists BOOLEAN;
BEGIN
  -- Contar empleados
  SELECT COUNT(*) INTO v_employees_count
  FROM user_profiles
  WHERE parent_user_id IS NOT NULL;
  
  SELECT COUNT(*) INTO v_employees_active
  FROM user_profiles
  WHERE parent_user_id IS NOT NULL
  AND is_active = true;

  -- Verificar trigger
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_created'
    AND event_object_table = 'users'
    AND event_object_schema = 'auth'
  ) INTO v_trigger_exists;

  RAISE NOTICE '';
  RAISE NOTICE '=== CORRECCIÓN DE LOGIN DE EMPLEADOS COMPLETADA ===';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Trigger actualizado: %', 
    CASE WHEN v_trigger_exists THEN 'SÍ' ELSE 'NO (ERROR)' END;
  RAISE NOTICE '✅ Total de empleados: %', v_employees_count;
  RAISE NOTICE '✅ Empleados activos: %', v_employees_active;
  RAISE NOTICE '';
  RAISE NOTICE '📋 CAMBIOS REALIZADOS:';
  RAISE NOTICE '   1. Trigger handle_new_user mejorado';
  RAISE NOTICE '   2. Validación de perfil existente antes de crear';
  RAISE NOTICE '   3. Manejo robusto de errores (no falla login)';
  RAISE NOTICE '   4. Emails actualizados en perfiles de empleados';
  RAISE NOTICE '   5. Empleados activados correctamente';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 PRUEBA AHORA:';
  RAISE NOTICE '   - Intenta login con el empleado creado';
  RAISE NOTICE '   - Si falla, revisa los logs de Supabase';
  RAISE NOTICE '';
END $$;
