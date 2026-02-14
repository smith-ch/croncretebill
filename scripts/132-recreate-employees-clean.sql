-- ============================================================================
-- Script 132: Recrear empleados correctamente usando auth admin
-- ============================================================================
-- El problema: Los usuarios en auth.users no se pueden autenticar (error 500)
-- La solución: Eliminar los usuarios problemáticos y recrearlos correctamente
-- ============================================================================

BEGIN;

-- ========================================
-- 1. Identificar empleados problemáticos
-- ========================================

SELECT 
  '=== EMPLEADOS ACTUALES ===' as info,
  up.user_id,
  up.email,
  up.display_name,
  au.email_confirmed_at,
  au.created_at
FROM user_profiles up
LEFT JOIN auth.users au ON au.id = up.user_id
WHERE up.parent_user_id IS NOT NULL
ORDER BY up.created_at DESC;

-- ========================================
-- 2. ELIMINAR empleados problemáticos
-- ========================================

-- Primero eliminar de user_profiles
DELETE FROM user_profiles
WHERE parent_user_id IS NOT NULL
AND email IN ('test0@gmail.com', 'test1@gmail.com', 'smith_1@rotest.com');

-- Luego eliminar de auth.users
DELETE FROM auth.users
WHERE email IN ('test0@gmail.com', 'test1@gmail.com', 'smith_1@rotest.com');

COMMIT;

-- ========================================
-- 3. Verificación
-- ========================================

DO $$
DECLARE
  v_remaining_employees INTEGER;
  v_remaining_auth_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_remaining_employees
  FROM user_profiles
  WHERE parent_user_id IS NOT NULL;
  
  SELECT COUNT(*) INTO v_remaining_auth_users
  FROM auth.users
  WHERE email IN ('test0@gmail.com', 'test1@gmail.com', 'smith_1@rotest.com');

  RAISE NOTICE '';
  RAISE NOTICE '=== LIMPIEZA COMPLETADA ===';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Empleados eliminados de user_profiles';
  RAISE NOTICE '✅ Usuarios eliminados de auth.users';
  RAISE NOTICE '✅ Empleados restantes: %', v_remaining_employees;
  RAISE NOTICE '✅ Auth users restantes (problemáticos): %', v_remaining_auth_users;
  RAISE NOTICE '';
  RAISE NOTICE '📋 SIGUIENTE PASO:';
  RAISE NOTICE '   1. Ir a la aplicación';
  RAISE NOTICE '   2. Crear un nuevo empleado desde el formulario';
  RAISE NOTICE '   3. Intentar login con el nuevo empleado';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Si sigue fallando, el problema está en Supabase Auth';
  RAISE NOTICE '   Puede ser un hook, webhook o configuración de Auth';
  RAISE NOTICE '';
END $$;

-- Ver configuración de Auth
SELECT 
  '=== NOTA IMPORTANTE ===' as info,
  'Verifica en Supabase Dashboard > Authentication > Providers' as step1,
  'Verifica que Email provider esté habilitado' as step2,
  'Verifica Hooks en Authentication > Hooks' as step3,
  'Cualquier hook puede estar causando el error 500' as warning;
