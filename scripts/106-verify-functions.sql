-- =====================================================
-- Script 106: Verificar que las funciones existen y funcionan
-- =====================================================

-- Verificar que las funciones existen
SELECT 
  proname as function_name,
  pg_get_function_result(oid) as return_type,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN ('is_employee', 'get_employee_owner', 'check_user_subscription_access')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Probar is_employee con un UUID de ejemplo (esto no debe fallar)
DO $$
BEGIN
  PERFORM is_employee('00000000-0000-0000-0000-000000000000');
  RAISE NOTICE '✅ Función is_employee() existe y puede ejecutarse';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error al ejecutar is_employee(): %', SQLERRM;
END $$;

-- Probar get_employee_owner con un UUID de ejemplo
DO $$
BEGIN
  PERFORM get_employee_owner('00000000-0000-0000-0000-000000000000');
  RAISE NOTICE '✅ Función get_employee_owner() existe y puede ejecutarse';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error al ejecutar get_employee_owner(): %', SQLERRM;
END $$;

-- Listar todos los triggers activos en auth.users
SELECT 
  tgname AS trigger_name,
  pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
AND tgisinternal = false;

-- Verificar RLS policies que podrían afectar el login
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('user_profiles', 'user_subscriptions', 'user_roles')
ORDER BY tablename, policyname;
