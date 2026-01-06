-- ============================================================================
-- Script 79: Diagnóstico de permisos y políticas
-- Propósito: Verificar que todo esté configurado correctamente
-- ============================================================================

-- 1. Verificar políticas actuales en user_subscriptions
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
WHERE tablename = 'user_subscriptions'
ORDER BY policyname;

-- 2. Verificar si las funciones helper existen
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname IN ('is_super_admin', 'is_subscription_manager')
ORDER BY proname;

-- 3. Verificar el user_id del usuario actual
SELECT 
  auth.uid() as current_user_id,
  auth.email() as current_email;

-- 4. Verificar si el usuario es subscription_manager
SELECT 
  id as user_id,
  email,
  raw_user_meta_data->>'role' as user_role,
  raw_user_meta_data
FROM auth.users
WHERE id = auth.uid();

-- 5. Probar las funciones directamente
SELECT 
  'is_super_admin' as test,
  is_super_admin(auth.uid()) as result
UNION ALL
SELECT 
  'is_subscription_manager' as test,
  is_subscription_manager(auth.uid()) as result;

-- 6. Verificar permisos de la tabla user_subscriptions
SELECT 
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'user_subscriptions';

-- 7. Verificar que RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'user_subscriptions';
