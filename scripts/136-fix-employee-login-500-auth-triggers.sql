-- ============================================================================
-- Script 136: Corregir error 500 en login de empleados
-- ============================================================================
-- Problema: Los empleados reciben "Database error querying schema" y 500
--           al intentar iniciar sesión (POST /auth/v1/token)
--
-- Causa típica: Triggers o hooks en auth.users que fallan durante el login.
--               Supabase actualiza auth.users (last_sign_in_at) al hacer login,
--               y cualquier trigger UPDATE puede causar el fallo.
--
-- Solución: Eliminar TODOS los triggers personalizados en auth.users
-- ============================================================================

-- ========================================
-- 1. Ver triggers actuales (diagnóstico)
-- ========================================
SELECT 
  tgname AS trigger_name,
  CASE tgtype::integer & 2 WHEN 2 THEN 'BEFORE' ELSE 'AFTER' END AS timing,
  CASE tgtype::integer & 28 
    WHEN 4 THEN 'INSERT' 
    WHEN 8 THEN 'DELETE' 
    WHEN 16 THEN 'UPDATE'
    ELSE 'MIXED'
  END AS event
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'users' 
  AND n.nspname = 'auth'
  AND NOT t.tgisinternal;

-- ========================================
-- 2. Eliminar TODOS los triggers conocidos
-- ========================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_simple_trigger ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_login ON auth.users;

-- Eliminar funciones huérfanas
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_simple() CASCADE;

-- ========================================
-- 3. Eliminar CUALQUIER trigger personalizado en auth.users
--    (excepto los internos de Supabase)
-- ========================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT t.tgname, c.relname, n.nspname
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = 'users' 
      AND n.nspname = 'auth'
      AND NOT t.tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', r.tgname);
    RAISE NOTICE 'Eliminado trigger: %', r.tgname;
  END LOOP;
END $$;

-- ========================================
-- 4. Verificar integridad de auth.users
-- ========================================
-- Comprobar que los empleados existen y tienen estructura correcta
SELECT 
  au.id,
  au.email,
  au.last_sign_in_at,
  up.parent_user_id IS NOT NULL AS is_employee
FROM auth.users au
LEFT JOIN public.user_profiles up ON up.user_id = au.id
WHERE au.email IN ('test0@gmail.com', 'test1@gmail.com', 'smithrodriguez345@gmail.com')
ORDER BY au.email;

-- ========================================
-- 5. Verificación final
-- ========================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE c.relname = 'users' AND n.nspname = 'auth' AND NOT t.tgisinternal;

  RAISE NOTICE '';
  RAISE NOTICE '=== RESULTADO ===';
  RAISE NOTICE 'Triggers personalizados restantes en auth.users: %', v_count;
  RAISE NOTICE '';
  IF v_count = 0 THEN
    RAISE NOTICE 'OK: No hay triggers que puedan interferir con el login.';
    RAISE NOTICE '';
    RAISE NOTICE 'Si el error 500 persiste, verifica en Supabase Dashboard:';
    RAISE NOTICE '  1. Authentication > Providers > Email (habilitado)';
    RAISE NOTICE '  2. Database > Logs (buscar errores en el momento del login)';
    RAISE NOTICE '  3. Project Settings > Auth > Auth Hooks (deshabilitar temporalmente)';
  ELSE
    RAISE NOTICE 'ADVERTENCIA: Aún hay % trigger(s). Revisa el listado arriba.', v_count;
  END IF;
  RAISE NOTICE '';
END $$;
