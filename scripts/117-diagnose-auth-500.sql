-- ============================================================================
-- Script 117: Diagnosticar Error 500 en Autenticación
-- Verificar qué está causando el error 500 en /auth/v1/token
-- ============================================================================

-- ========================================
-- 1. Verificar estado de triggers
-- ========================================
SELECT 
  '=== TRIGGERS EN auth.users ===' as info,
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND event_object_schema = 'auth';

-- ========================================
-- 2. Verificar políticas RLS que puedan causar problemas
-- ========================================
SELECT 
  '=== POLÍTICAS RLS PROBLEMÁTICAS ===' as info,
  schemaname,
  tablename,
  policyname,
  qual as using_expression
FROM pg_policies
WHERE tablename IN ('user_profiles', 'company_settings', 'invoices')
  AND qual LIKE '%user_profiles%'
ORDER BY tablename, policyname;

-- ========================================
-- 3. Verificar si el usuario de prueba existe
-- ========================================
SELECT 
  '=== USUARIO TEST1@GMAIL.COM ===' as info,
  id,
  email,
  email_confirmed_at,
  encrypted_password IS NOT NULL as has_password,
  is_super_admin,
  deleted_at
FROM auth.users
WHERE email = 'test1@gmail.com';

-- ========================================
-- 4. Verificar perfiles de test1@gmail.com
-- ========================================
SELECT 
  '=== PERFILES DE TEST1@GMAIL.COM ===' as info,
  id,
  user_id,
  email,
  parent_user_id,
  is_active
FROM user_profiles
WHERE email = 'test1@gmail.com';

-- ========================================
-- 5. Verificar funciones que se ejecutan en SECURITY DEFINER
-- ========================================
SELECT 
  '=== FUNCIONES SECURITY DEFINER ===' as info,
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc
WHERE prosecdef = true
  AND proname LIKE '%user%'
ORDER BY proname;
