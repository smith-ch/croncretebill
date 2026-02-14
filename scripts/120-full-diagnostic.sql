-- ============================================================================
-- Script 120: Diagnóstico completo y limpieza agresiva
-- ============================================================================

-- Ver TODOS los triggers en TODAS las tablas
SELECT 
  '=== TODOS LOS TRIGGERS ===' as info,
  event_object_schema,
  event_object_table,
  trigger_name,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema IN ('auth', 'public')
ORDER BY event_object_schema, event_object_table;

-- Ver TODAS las funciones relacionadas con user/auth
SELECT 
  '=== FUNCIONES USER/AUTH ===' as info,
  n.nspname as schema,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE (p.proname LIKE '%user%' OR p.proname LIKE '%auth%')
  AND n.nspname = 'public'
ORDER BY p.proname;

-- Verificar usuario test1@gmail.com
SELECT 
  '=== USUARIO TEST1 ===' as info,
  id,
  email,
  encrypted_password IS NOT NULL as has_password,
  email_confirmed_at IS NOT NULL as email_confirmed,
  banned_until,
  deleted_at
FROM auth.users
WHERE email = 'test1@gmail.com';

-- Verificar perfiles
SELECT 
  '=== PERFILES TEST1 ===' as info,
  COUNT(*) as count,
  array_agg(id) as profile_ids,
  array_agg(parent_user_id) as parents
FROM user_profiles
WHERE email = 'test1@gmail.com';
