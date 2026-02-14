-- ============================================================================
-- Script 131: Reactivar RLS y ELIMINAR trigger completamente
-- ============================================================================
-- El problema NO son las políticas RLS
-- El problema ES el trigger handle_new_user que se ejecuta durante login
-- Solución: Eliminar el trigger completamente
-- ============================================================================

BEGIN;

-- ========================================
-- 1. ELIMINAR COMPLETAMENTE el trigger problemático
-- ========================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ========================================
-- 2. Reactivar RLS en user_profiles
-- ========================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 3. Crear políticas RLS SIMPLES y seguras
-- ========================================

-- Permitir a usuarios autenticados leer su propio perfil
CREATE POLICY "user_profiles_select_own"
ON user_profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Permitir a owners leer perfiles de sus empleados
CREATE POLICY "user_profiles_select_employees"
ON user_profiles FOR SELECT
TO authenticated
USING (
  parent_user_id = auth.uid() OR
  root_owner_id = auth.uid()
);

-- Permitir a usuarios actualizar su propio perfil
CREATE POLICY "user_profiles_update_own"
ON user_profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Permitir a owners actualizar perfiles de sus empleados
CREATE POLICY "user_profiles_update_employees"
ON user_profiles FOR UPDATE
TO authenticated
USING (
  parent_user_id = auth.uid() OR
  root_owner_id = auth.uid()
);

-- Permitir insertar perfiles (para create_employee_direct)
CREATE POLICY "user_profiles_insert"
ON user_profiles FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir a owners eliminar empleados
CREATE POLICY "user_profiles_delete_employees"
ON user_profiles FOR DELETE
TO authenticated
USING (
  parent_user_id = auth.uid() OR
  root_owner_id = auth.uid()
);

COMMIT;

-- ========================================
-- 4. Verificación
-- ========================================

DO $$
DECLARE
  v_trigger_exists BOOLEAN;
  v_function_exists BOOLEAN;
  v_rls_enabled BOOLEAN;
  v_policy_count INTEGER;
BEGIN
  -- Verificar que el trigger NO existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_created'
    AND event_object_table = 'users'
    AND event_object_schema = 'auth'
  ) INTO v_trigger_exists;

  -- Verificar que la función NO existe
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'handle_new_user'
  ) INTO v_function_exists;

  -- Verificar RLS
  SELECT rowsecurity INTO v_rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = 'user_profiles';

  -- Contar políticas
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'user_profiles';

  RAISE NOTICE '';
  RAISE NOTICE '=== CORRECCIÓN COMPLETADA ===';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Trigger eliminado: %', CASE WHEN NOT v_trigger_exists THEN 'SÍ ✓' ELSE 'NO (ERROR!)' END;
  RAISE NOTICE '✅ Función eliminada: %', CASE WHEN NOT v_function_exists THEN 'SÍ ✓' ELSE 'NO (ERROR!)' END;
  RAISE NOTICE '✅ RLS reactivado: %', CASE WHEN v_rls_enabled THEN 'SÍ ✓' ELSE 'NO (ERROR!)' END;
  RAISE NOTICE '✅ Políticas creadas: %', v_policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '📋 CAMBIOS REALIZADOS:';
  RAISE NOTICE '   1. Trigger on_auth_user_created ELIMINADO';
  RAISE NOTICE '   2. Función handle_new_user ELIMINADA';
  RAISE NOTICE '   3. RLS reactivado en user_profiles';
  RAISE NOTICE '   4. Políticas simples recreadas';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE:';
  RAISE NOTICE '   - Los nuevos OWNERS deben crearse con signup normal';
  RAISE NOTICE '   - Después del signup, ejecutar script para crear company_settings';
  RAISE NOTICE '   - Los EMPLEADOS se crean con create_employee_direct()';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 INTENTA LOGIN AHORA CON:';
  RAISE NOTICE '   Email: test0@gmail.com';
  RAISE NOTICE '   Password: 123456';
  RAISE NOTICE '';
END $$;

-- Mostrar políticas creadas
SELECT 
  '=== POLÍTICAS ACTIVAS ===' as info,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;
