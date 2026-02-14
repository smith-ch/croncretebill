-- ============================================================================
-- Script 130: Verificar configuración de Auth y triggers
-- ============================================================================

-- ========================================
-- 1. Ver todos los triggers en auth.users
-- ========================================

SELECT 
  '=== TRIGGERS EN auth.users ===' as info,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND event_object_schema = 'auth'
ORDER BY trigger_name;

-- ========================================
-- 2. Ver funciones que usan auth.users
-- ========================================

SELECT 
  '=== FUNCIONES EN public ===' as info,
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%user%'
  OR routine_name LIKE '%auth%'
  OR routine_name LIKE '%employee%'
ORDER BY routine_name;

-- ========================================
-- 3. Ver si existe la función handle_new_user
-- ========================================

SELECT 
  '=== handle_new_user ===' as info,
  proname as function_name,
  prosrc as function_code
FROM pg_proc
WHERE proname = 'handle_new_user';

-- ========================================
-- 4. Ver políticas RLS en user_profiles
-- ========================================

SELECT 
  '=== POLÍTICAS RLS user_profiles ===' as info,
  policyname,
  cmd,
  qual::text as using_clause,
  with_check::text as with_check_clause
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- ========================================
-- 5. Verificar estado RLS
-- ========================================

SELECT 
  '=== ESTADO RLS ===' as info,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_profiles', 'auth', 'company_settings')
ORDER BY tablename;

-- ========================================
-- 6. Ver empleados existentes
-- ========================================

SELECT 
  '=== EMPLEADOS ===' as info,
  up.email,
  up.display_name,
  up.is_active,
  up.parent_user_id IS NOT NULL as is_employee,
  au.email_confirmed_at IS NOT NULL as email_verified
FROM user_profiles up
LEFT JOIN auth.users au ON au.id = up.user_id
WHERE up.parent_user_id IS NOT NULL
ORDER BY up.created_at DESC;
